const sharp = require('sharp')
const AWS = require('aws-sdk')
const { DOMAIN_MANE, S3_BUCKET_NAME, AWS_ACCESS_KEY, AWS_SECRET_KEY, CDN_PATH } = require('../config/config')
const { isProd } = require('../utils')
const fs = require('fs').promises

const IMAGE_SIZES = [
  {
    size: 'small',
    height: 200, width: 200
  },
  {
    size: 'big',
    height: 600, width: 600
  }
]

class MediaService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_KEY
    })
  }

  async resizeAndStore(imagePath, media, contentType) {
    for (const size of IMAGE_SIZES) {
      if (isProd()) {
        await this.storeS3(imagePath, media, size, contentType)
      } else {
        await this.storeLocaly(imagePath, media, size)
      }
    }
  }

  async storeLocaly(imagePath, media, size) {
    const newpath = `./uploads/${size.size}_${media}`
    await sharp(imagePath).resize({ height: size.height, width: size.width }).toFile(newpath)
  }

  async storeS3(imagePath, media, size, contentType) {
    const buffer = await sharp(imagePath).resize({ height: size.height, width: size.width }).toBuffer()

    await this.s3Upload(`${size.size}_${media}`, contentType, buffer)
  }

  s3Upload(Key, ContentType, Body) {
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key,
      Body,
      ContentType,
      ACL: 'public-read'
    }

    return new Promise((resolve, reject) => {
      this.s3.upload(params, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async resize(imagePath) {
    const imageData = await sharp(imagePath).resize({ height: 200, width: 200 }).toBuffer()

    await fs.writeFile(imageData)
  }

  deleteMedia(mediaKeys) {
    const params = {
      Bucket: S3_BUCKET_NAME,
      Delete: {
        Objects: mediaKeys.map(Key => ({ Key }))
      }
    }

    return new Promise((resolve, reject) => {
      this.s3.deleteObjects(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  static mediaPath(mediaId, size = '') {
    if (isProd()) {
      return `${CDN_PATH}/${size ? `${size}_` : ''}${mediaId}`
    }

    return `${DOMAIN_MANE}/api/media/${size ? `${size}_` : ''}${mediaId}`
  }

  static getProfileImagePath(user) {
    if (user.profile_image_id) {
      return MediaService.mediaPath(user.profile_image_id, 'small')
    }

    if ('male' === user.gender) {
      return '/assets/man.jpg'
    }

    return '/assets/female.jpg'
  }
}

module.exports = MediaService
