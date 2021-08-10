const { Controller } = require('../core/controller');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const MediaService = require('../services/media_service');
const InappropriateImageError = require('../errors/inappropriate_image_error');

const parseForm = (req) => {
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

class MediaController extends Controller {
  handleError(err) {
    if (err instanceof InappropriateImageError) {
      return { code: 400, msg: err.message };
    }

    return { code: 500, msg: 'Error uploading image' };
  }

  // dev only usage
  async get(req, response) {
    const targetMediaId = req.params.id;

    const introRepository = await this.getService('intro_repository');

    const a = targetMediaId.split('_');
    let mediaId;
    let size = '';
    if (a.length === 2) {
      size = `${a[0]}_`;
      mediaId = a[1];
    } else {
      mediaId = a[0];
    }

    const media = await introRepository.getMediaMetadata(mediaId);
    const filePath = path.join(__dirname, `/../../uploads/${size}${mediaId}`);
    const stat = fs.statSync(filePath);

    response.writeHead(200, {
      'Content-Type': media.mime_type,
      'Content-Length': stat.size
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(response);
  }

  async uploadImage(req, res) {
    const token = this.getAuthToken(req);
    const position = req.query.position;

    const mediaRepository = await this.getService('media_repository');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const userMediaService = await this.getService('user_media_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      const userImage = await mediaRepository.getUserImage(loggedUserId, position);

      const promises = [parseForm(req)];
      if (userImage) {
        if (1 == position) {
          await userRepository.setUserProfileImage(loggedUserId, null);
        }
        promises.push(
          mediaRepository.deleteUserImage(loggedUserId, position),
          mediaRepository.deleteMediaMetadata([userImage.image_id]),
        );
      }

      const [{ files }] = await Promise.all(promises);

      const media = await mediaRepository.createMediaMetadata('image', files['image'].type);
      await mediaRepository.createUserImage(loggedUserId, media.id, position);
      const userImages = await mediaRepository.getUserImages(loggedUserId);

      if (1 == position) {
        await Promise.all([
          userRepository.setUserProfileImage(loggedUserId, media.id),
          userMediaService.scheduleForVerification(loggedUserId, media.id)
        ]);
      }
      const oldpath = files['image'].path;

      const a = [MediaService.resizeAndStore(oldpath, media.id, files['image'].type)];
      if (userImage) {
        a.push(MediaService.deleteImages(userImage.image_id));
      }

      await Promise.all(a);

      con.query('COMMIT');

      res.json({
        images: MediaService.mapImages(userImages)
      });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async deleteImage(req, res) {
    const token = this.getAuthToken(req);
    const position = req.query.position;

    const con = await this.getConnection();
    const mediaRepository = await this.getService('media_repository');
    const userMediaService = await this.getService('user_media_service');
    const sessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const userImage = await mediaRepository.getUserImage(loggedUserId, position);
    if (!userImage) {
      res.json({ images: [] });

      return;
    }

    try {
      con.query('BEGIN');

      await userMediaService.deleteUserImage(loggedUserId, userImage.image_id, position);

      con.query('COMMIT');

      const userImages = await mediaRepository.getUserImages(loggedUserId);

      res.json({
        images: MediaService.mapImages(userImages)
      });
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}

module.exports = MediaController;
