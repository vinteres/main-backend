const { Controller } = require('../core/controller');
const MediaService = require('../services/media_service');
const formidable = require('formidable');
const { isProd } = require('../utils');
const VerificationStatus = require('../models/enums/verification_status');

const formParse = (req) => {
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);

        return;
      }

      resolve({ fields, files });
    });
  });
};

class VerificationController extends Controller {
  async status(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { profile_image_id, verification_status } = await userRepository.findById(
      ['profile_image_id', 'verification_status'],
      loggedUserId
    );

    res.json({
      profileImageId: profile_image_id,
      verificationStatus: verification_status
    });
  }

  async create(req, res) {
    const token = this.getAuthToken(req);

    const con = await this.getConnection();
    const sessionTokenRepository = await this.getService('session_token_repository');
    const introRepository = await this.getService('intro_repository');
    const userRepository = await this.getService('user_repository');
    const verificationService = await this.getService('verification_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const [
      { files },
      { verification_status }
    ] = await Promise.all([
      formParse(req),
      userRepository.findById('verification_status', loggedUserId)
    ]);

    if ([VerificationStatus.PENDING, VerificationStatus.VERIFIED].includes(verification_status)) {
      res.status(201).end();

      return;
    }

    try {
      con.query('BEGIN');

      const mediaFile = files['media-blob'];
      const media = await introRepository.createMediaMetadata('image', mediaFile.type);
      const oldpath = mediaFile.path;

      await verificationService.requestVerification(loggedUserId, media.id)

      if (isProd()) {
        await MediaService.storeS3(oldpath, media.id, MediaService.SIZE_BIG, mediaFile.type);
      } else {
        await MediaService.storeLocaly(oldpath, media.id, MediaService.SIZE_BIG);
      }

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}

module.exports = VerificationController;
