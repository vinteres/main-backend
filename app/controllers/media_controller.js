const { Controller } = require('./controller')
const fs = require('fs')
const path = require('path')
const formidable = require('formidable')
const MediaService = require('../services/media_service')

const parseForm = (req) => {
  const form = new formidable.IncomingForm()

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

class MediaController extends Controller {
  // dev only usage
  async get(req, response) {
    const targetMediaId = req.params.id

    const introRepository = await this.serviceDiscovery.get('intro_repository')

    const a = targetMediaId.split('_')
    let mediaId
    let size = ''
    if (a.length === 2) {
      size = `${a[0]}_`
      mediaId = a[1]
    } else {
      mediaId = a[0]
    }

    const media = await introRepository.getMediaMetadata(mediaId)
    const filePath = path.join(__dirname, `/../../uploads/${size}${mediaId}`)
    const stat = fs.statSync(filePath)

    response.writeHead(200, {
      'Content-Type': media.mime_type,
      'Content-Length': stat.size
    })

    const readStream = fs.createReadStream(filePath)
    readStream.pipe(response)
  }

  async uploadImage(req, res) {
    const token = this.getAuthToken(req)
    const position = req.query.position

    const mediaRepository = await this.serviceDiscovery.get('media_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const con = await this.serviceDiscovery.get('db_connection')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    try {
      con.query('BEGIN')

      const userImage = await mediaRepository.getUserImage(loggedUserId, position)
      if (userImage) {
        await mediaRepository.deleteUserImage(loggedUserId, position)
        if (1 == position) {
          await userRepository.setUserProfileImage(loggedUserId, null)
        }
        await mediaRepository.deleteMediaMetadata([userImage.image_id])
        await new MediaService().deleteMedia(['big', 'small'].map(size => `${size}_${userImage.image_id}`))
      }

      const { fields, files } = await parseForm(req);

      const media = await mediaRepository.createMediaMetadata('image', files['image'].type)
      await mediaRepository.createUserImage(loggedUserId, media.id, position)
      const userImages = await mediaRepository.getUserImages(loggedUserId)

      if (1 == position) {
        await userRepository.setUserProfileImage(loggedUserId, media.id)
      }
      const oldpath = files['image'].path

      await new MediaService().resizeAndStore(oldpath, media.id, files['image'].type)

      con.query('COMMIT')

      res.json({
        images: MediaService.mapImages(userImages)
      })
    } catch (e) {
      con.query('ROLLBACK')

      throw e
    }
  }

  async deleteImage(req, res) {
    const token = this.getAuthToken(req)
    const position = req.query.position

    const con = await this.serviceDiscovery.get('db_connection')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const mediaRepository = await this.serviceDiscovery.get('media_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')

    try {
      con.query('BEGIN')
      const loggedUserId = await sessionTokenRepository.getUserId(token)

      const userImage = await mediaRepository.getUserImage(loggedUserId, position)
      if (userImage) {
        if (1 == position) {
          const nextImage = await mediaRepository.getUserImage(loggedUserId, +position + 1)
          const imageId = nextImage ? nextImage.image_id : null
          await userRepository.setUserProfileImage(loggedUserId, imageId)
        }
        await mediaRepository.deleteUserImage(loggedUserId, position)
        await mediaRepository.deleteMediaMetadata([userImage.image_id])
        await new MediaService().deleteMedia(['big', 'small'].map(size => `${size}_${userImage.image_id}`))
        await mediaRepository.changeUserImagePosition(loggedUserId, position)
      } else {
        res.json({ images: [] })

        return
      }
      con.query('COMMIT')

      const userImages = await mediaRepository.getUserImages(loggedUserId)

      res.json({
        images: MediaService.mapImages(userImages)
      })
    } catch (e) {
      con.query('ROLLBACK')

      throw e
    }
  }
}

module.exports = MediaController
