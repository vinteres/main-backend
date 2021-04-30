const { Controller } = require('./controller')
const formidable = require('formidable')
const fs = require('fs')
const path = require('path')
const MediaService = require('../services/media_service')
const { timeAgo, isProd } = require('../utils')
const { sendData } = require('../services/ws_service')

const fsPromises = fs.promises

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

class IntroController extends Controller {
  async create(req, res) {
    const token = this.getAuthToken(req)

    const con = await this.serviceDiscovery.get('db_connection')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introRepository = await this.serviceDiscovery.get('intro_repository')
    const introService = await this.serviceDiscovery.get('intro_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    try {
      const { fields, files } = await formParse(req)

      const relationStatus = await introService.relationBetween(loggedUserId, fields.userId)

      if (relationStatus) {
        return res.status(500).end()
      }

      if ('smile' === fields.introType) {
        await introService.create({
          fromUserId: loggedUserId,
          toUserId: fields.userId,
          type: fields.introType
        })

        return res.status(201).end()
      } else if ('message' === fields.introType) {
        await introService.create({
          fromUserId: loggedUserId,
          toUserId: fields.userId,
          type: fields.introType,
          message: fields.message
        })

        return res.status(201).end()
      }

      con.query('BEGIN')

      const mediaFile = files['media-blob']
      const media = await introRepository.createMediaMetadata('video', mediaFile.type)
      const oldpath = mediaFile.path

      const mediaContent = await fsPromises.readFile(oldpath)

      if (isProd()) {
        await new MediaService().s3Upload(media.id, mediaFile.type, mediaContent)
      } else {
        const newpath = `./uploads/${media.id}`
        await fsPromises.rename(oldpath, newpath)
      }

      await introService.create({
        fromUserId: loggedUserId,
        toUserId: fields.userId,
        type: fields.introType,
        mediaMetadataId: media.id
      })

      con.query('COMMIT')

      res.status(201).end()
    } catch (e) {
      con.query('ROLLBACK')

      throw e
    }
  }

  async smile(req, res) {
    const token = this.getAuthToken(req)
    const { userId, introType } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introService = await this.serviceDiscovery.get('intro_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const relationStatus = await introService.relationBetween(loggedUserId, userId)

    if (relationStatus) {
      return res.status(500).end()
    }
    if ('smile' !== introType) {
      return res.status(400).end()
    }

    await introService.create({
      fromUserId: loggedUserId,
      toUserId: userId,
      type: introType,
    })

    res.status(201).end()
  }

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

  async like(req, res) {
    const token = this.getAuthToken(req)
    const introId = req.params.id

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introRepository = await this.serviceDiscovery.get('intro_repository')
    const introService = await this.serviceDiscovery.get('intro_service')
    const matchRepository = await this.serviceDiscovery.get('match_repository')
    const notificationService = await this.serviceDiscovery.get('notification_service')
    const chatService = await this.serviceDiscovery.get('chat_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const intro = await introRepository.getIntroById(introId)

    if (intro.to_user_id !== loggedUserId) {
      return res.status(404).end()
    }
    if (intro.liked_at) {
      const relationStatus = await introService.relationBetween(intro.from_user_id, intro.to_user_id)

      return res.json({ status: 'already_liked', relationStatus })
    }

    await introRepository.likeIntro(intro.id)
    await matchRepository.create(intro.from_user_id, intro.to_user_id)

    await chatService.createChatIfNotExists(intro.from_user_id, intro.to_user_id)

    await notificationService.create(loggedUserId, intro.from_user_id, intro.id, 'intro_like')
    await notificationService.create(intro.from_user_id, loggedUserId, intro.id, 'matched')

    return res.json({ status: 'success', relationStatus: 'matched' })
  }

  async unmatch(req, res) {
    const token = this.getAuthToken(req)
    const userId = req.params.id

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introService = await this.serviceDiscovery.get('intro_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await introService.unmatch(loggedUserId, userId)

    return res.json({ status: 'success' })
  }

  async getForUser(req, res) {
    const token = this.getAuthToken(req)
    const page = req.query.page

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const introRepository = await this.serviceDiscovery.get('intro_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const reportRepository = await this.serviceDiscovery.get('report_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await introRepository.seeIntros(loggedUserId)
    sendData(loggedUserId, { type: 'see_intros' })

    const intros = await introRepository.getForUser(loggedUserId, page)

    const fromUserIds = intros.map(intro => intro.from_user_id)
    const fromUsers = await userRepository.getUsersById(fromUserIds)

    let result = intros.map(intro => {
      const user = fromUsers.filter(user => user.id === intro.from_user_id)[0]
      const data = {
        user: {
          id: user.id,
          profileImagePath: MediaService.getProfileImagePath(user),
          name: user.name,
          age: user.age,
          title: user.title,
        },
        id: intro.id,
        liked_at: intro.liked_at,
        fromUserId: intro.from_user_id,
        timeAgo: timeAgo(intro.created_at),
        type: intro.type,
        message: intro.message,
        mediaPath: MediaService.mediaPath(intro.media_metadata_id)
      }

      return data
    })

    const hasReported = await reportRepository.hasReported(loggedUserId, result.map(i => i.user.id))

    result = result.map(intro => {
      intro.user.reported = hasReported[intro.user.id]

      return intro
    })

    res.json(result)
  }
}

module.exports = IntroController
