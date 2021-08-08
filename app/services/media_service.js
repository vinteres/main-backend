const sharp = require('sharp');
const AWS = require('aws-sdk');
const {
  DOMAIN_MANE,
  S3_BUCKET_NAME,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  CDN_PATH
} = require('../config/config');
const { isProd } = require('../utils');
const fs = require('fs').promises;
const { detectFaces, detectInappropriate } = require('./img_recognition_service');
const InappropriateImageError = require('../errors/inappropriate_image_error');

const SIZE_SMALL = 'small';
const SIZE_BIG = 'big';

const ALL_SIZES = [SIZE_SMALL, SIZE_BIG];

const SIZES = {
  [SIZE_SMALL]: {
    size: SIZE_SMALL,
    height: 200,
    width: 200
  },
  [SIZE_BIG]: {
    size: SIZE_BIG,
    height: 600,
    width: 600
  }
};

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

class MediaService {
  static async resizeAndStore(imagePath, mediaId, contentType) {
    if (isProd()) {
      const bigImageName = await MediaService.storeS3(
        imagePath,
        mediaId,
        SIZES[SIZE_BIG],
        contentType
      );

      const valid = await MediaService.validateImage(bigImageName);
      if (!valid) {
        await MediaService.deleteMedia(bigImageName);

        throw new InappropriateImageError();
      }

      await this.storeS3(
        imagePath,
        mediaId,
        SIZES[SIZE_SMALL],
        contentType
      );
    } else {
      for (const size of ALL_SIZES) {
        await MediaService.storeLocaly(imagePath, mediaId, SIZES[size]);
      }
    }
  }

  static async validateImage(imageName) {
    const hasFaces = await detectFaces(imageName);
    if (!hasFaces) {
      return false;
    }

    const isInappropriate = await detectInappropriate(imageName);
    if (isInappropriate) {
      return false;
    }

    return true;
  }

  static async storeLocaly(imagePath, mediaId, size) {
    const newpath = `./uploads/${size.size}_${mediaId}`;

    await MediaService.resizeImage(imagePath, size).toFile(newpath);
  }

  static async storeS3(imagePath, mediaId, size, contentType) {
    const buffer = await MediaService.resizeImage(imagePath, size).toBuffer();

    const imageName = `${size.size}_${mediaId}`;
    await MediaService.s3Upload(imageName, contentType, buffer);

    return imageName;
  }

  static resizeImage(imagePath, { width, height }) {
    return sharp(imagePath).resize({ height, width });
  }

  static s3Upload(Key, ContentType, Body) {
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key,
      Body,
      ContentType,
      ACL: 'public-read'
    };

    return new Promise((resolve, reject) => {
      s3.upload(params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async resize(imagePath) {
    const imageData = await sharp(imagePath).resize({ height: 200, width: 200 }).toBuffer();

    await fs.writeFile(imageData);
  }

  static async deleteImages(imageId) {
    if (!isProd()) return;

    return await MediaService.deleteMedia(MediaService.getImageNames(imageId));
  }

  static deleteMedia(mediaKeys) {
    mediaKeys = Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys];

    const params = {
      Bucket: S3_BUCKET_NAME,
      Delete: {
        Objects: mediaKeys.map(Key => ({ Key }))
      }
    };

    return new Promise((resolve, reject) => {
      s3.deleteObjects(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  static mapImages(images) {
    return images.map(image => ({
      position: image.position,
      small: MediaService.mediaPath(image.image_id, SIZE_SMALL),
      big: MediaService.mediaPath(image.image_id, SIZE_BIG),
    }));
  }

  static getProfileImagePath(user) {
    if (user.profile_image_id) {
      return MediaService.mediaPath(user.profile_image_id, SIZE_SMALL);
    }

    if ('male' === user.gender) {
      return '/assets/man.jpg';
    }

    return '/assets/female.jpg';
  }

  static mediaPath(mediaId, size = '') {
    if (isProd()) {
      return `${CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`;
    }

    return `${DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`;
  }

  static getImageNames(imageId) {
    return ALL_SIZES.map(size => MediaService.createImageName(size, imageId));
  }

  static createImageName(size, imageId) {
    return `${size}_${imageId}`;
  }
}

MediaService.SIZE_SMALL = SIZE_SMALL;
MediaService.SIZE_BIG = SIZE_BIG;

module.exports = MediaService;
