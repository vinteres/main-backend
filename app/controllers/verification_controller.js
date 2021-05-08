const { Controller } = require('./controller')
const MediaService = require('../services/media_service')
const formidable = require('formidable')
const { isProd } = require('../utils')
const fs = require('fs').promises

const formParse = (req) => {
  const form = new formidable.IncomingForm()

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(err)

        return
      }

      resolve({ fields, files })
    })
  })
}

class VerificationController extends Controller {
  async status(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const { profile_image_id, verification_status } = await userRepository.findById(
      ['profile_image_id', 'verification_status'],
      loggedUserId
    )

    res.json({
      profileImageId: profile_image_id,
      verificationStatus: verification_status
    })
  }

  async create(req, res) {
    const token = this.getAuthToken(req)

    const con = await this.serviceDiscovery.get('db_connection')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introRepository = await this.serviceDiscovery.get('intro_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const verificationRequestrepository = await this.serviceDiscovery.get('verification_request_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    try {
      const { files } = await formParse(req)

      con.query('BEGIN')

      const mediaFile = files['media-blob']
      const media = await introRepository.createMediaMetadata('image', mediaFile.type)
      const oldpath = mediaFile.path

      const mediaContent = await fs.readFile(oldpath)

      if (isProd()) {
        await new MediaService().s3Upload(media.id, mediaFile.type, mediaContent)
      } else {
        const newpath = `./uploads/${media.id}`
        await fs.rename(oldpath, newpath)
      }

      await verificationRequestrepository.create({
        userId: loggedUserId,
        imageId: media.id,
        status: 'pending'
      });
      await userRepository.setVerificationStatus(loggedUserId, 'pending');

      con.query('COMMIT')

      res.status(201).end()
    } catch (e) {
      con.query('ROLLBACK')

      throw e
    }
  }
}

module.exports = VerificationController
