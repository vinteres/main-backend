const UserRepository = require('../repositories/user_repository')
const { Controller } = require('./controller')
const formidable = require('formidable')
const MediaService = require('../services/media_service')
const { item } = require('../data_builders/intro_builder')
const { compareHash } = require('../utils')
const { hash } = require('../utils')
const SearchPereferenceValidator = require('../models/validators/search_pereference_validator')
const SignUpValidator = require('../models/validators/sign_up_validator')

const mapImages = (images) => images.map(image => ({
  position: image.position,
  small: MediaService.mediaPath(image.image_id, 'small'),
  big: MediaService.mediaPath(image.image_id, 'big'),
}))

class UserController extends Controller {
  async get(req, res) {
    const token = this.getAuthToken(req)
    const userId = req.params.id

    const quizService = await this.serviceDiscovery.get('quiz_service')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const userService = await this.serviceDiscovery.get('user_service')
    const hobbieService = await this.serviceDiscovery.get('hobbie_service')
    const mediaRepository = await this.serviceDiscovery.get('media_repository')
    const introRepository = await this.serviceDiscovery.get('intro_repository')
    const introService = await this.serviceDiscovery.get('intro_service')
    const reportRepository = await this.serviceDiscovery.get('report_repository')
    const locationService = await this.serviceDiscovery.get('location_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const user = await userRepository.getUserProfileById(userId)

    if (!user) {
      return res.status(404).end()
    }

    const images = await mediaRepository.getUserImages(userId)
    const location = await locationService.getLocationById(user.city_id)
    user.location = location
    user.images = mapImages(images)

    if (loggedUserId !== userId) {
      user.relation_status = await introService.relationBetween(loggedUserId, userId)
      if ('intro_to_me' === user.relation_status) {
        const intro = await introRepository.getIntroFor(loggedUserId, userId)
        user.intro = item(intro)
      } else if (!user.relation_status) {
        const loggedUser = await userRepository.getUserInfoById(loggedUserId)

        if (loggedUser.gender !== user.interested_in || loggedUser.interested_in !== user.gender) {
          user.relation_status = 'uncompatible'
        }
      }
    }

    user.profile_image = MediaService.getProfileImagePath(user)
    user.interests = await hobbieService.getForUser(userId)
    user.activities = await hobbieService.getActivitiesForUser(userId)
    user.reported = await reportRepository.isReported(loggedUserId, user.id)

    if (loggedUserId !== userId && 'uncompatible' !== user.relation_status) {
      user.compatability = await quizService.getOrCreateCompatabilityFor(loggedUserId, userId)
    }

    userService.view(loggedUserId, userId)

    res.json(user)
  }

  async getUsers(req, res) {
    const token = this.getAuthToken(req)
    const page = req.query.page

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userService = await this.serviceDiscovery.get('user_service')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const quizService = await this.serviceDiscovery.get('quiz_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const loggedUser = await userRepository.getUserById(loggedUserId)
    const { users, totalCount } = await userService.getUsers(page, loggedUser)

    const compatabilities = await quizService.getCompatabilityForUsers(loggedUserId, users.map(user => user.id))
    const compatabilityMap = {}
    compatabilities.forEach(item => {
      const tId = item.user_one_id === loggedUserId ? item.user_two_id : item.user_one_id
      compatabilityMap[tId] = item.percent
    })

    users.forEach(user => {
      user.profile_image = MediaService.getProfileImagePath(user)
      user.compatability = compatabilityMap[user.id]
    })

    await userService.setMutualInterests(loggedUserId, users)

    const responseData = {
      users,
      totalPages: Math.ceil(totalCount / UserRepository.usersPerPage())
    }

    res.json(responseData)
  }

  async getSettings(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const {
      name, title, description, birthday, email, gender, interested_in,
      smoking, drinking, height, body, children_status, pet_status
    } = await userRepository.getUserProfileById(loggedUserId)

    const day = birthday.getDate() < 10 ? `0${birthday.getDate()}` : birthday.getDate()
    const month = birthday.getMonth() < 10 ? `0${birthday.getMonth() + 1}` : (birthday.getMonth() + 1)
    const bd = `${birthday.getFullYear()}/${month}/${day}`

    const settings = {
      accountSettings: {
        name, title, description, birthday: bd, email, gender, interested_in
      },
      profileSettings: {
        smoking, drinking, height, body, children_status, pet_status
      }
    }

    res.json(settings)
  }

  async setAccountSettings(req, res) {
    const token = this.getAuthToken(req)
    const { name, title, description, birthday, email, gender, interested_in } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const user = await userRepository.setAccountSettings(
      loggedUserId,
      { name, title, description, birthday, email, gender, interested_in }
    )

    res.json(user)
  }

  async setProfileSettings(req, res) {
    const token = this.getAuthToken(req)
    const { smoking, drinking, height, body, children_status, pet_status } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const user = await userRepository.setProfileSettings(
      loggedUserId,
      { smoking, drinking, height, body, children_status, pet_status }
    )

    res.json(user)
  }

  async getFriends(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const matchService = await this.serviceDiscovery.get('match_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const userIds = await matchService.matchIds(loggedUserId)
    const users = await userRepository.getUsersById(userIds)

    res.json(users.map(user => {
      user.profile_image = MediaService.getProfileImagePath(user)

      return user
    }))
  }

  async getViewers(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const viewsRepository = await this.serviceDiscovery.get('views_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const viewers = await viewsRepository.findFor(loggedUserId)
    const viewerIds = viewers.map(viewer => viewer.viewer_user_id)
    const users = await userRepository.getUsersById(viewerIds)

    res.json(viewerIds.map(viewerId => {
      const user = users.find(u => u.id === viewerId)
      user.profile_image = MediaService.getProfileImagePath(user)

      return user
    }))
  }

  async getCompatabilities(req, res) {
    const token = this.getAuthToken(req)

    const quizService = await this.serviceDiscovery.get('quiz_service')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const userService = await this.serviceDiscovery.get('user_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const compatabilities = await quizService.getHighCompatabilitiesForUser(loggedUserId)
    const compatabilityMap = {}
    compatabilities.forEach(item => {
      const tId = item.user_one_id === loggedUserId ? item.user_two_id : item.user_one_id
      compatabilityMap[tId] = item.percent
    })
    const users = await userRepository.getUsersById(Object.keys(compatabilityMap))

    users.map(user => {
      user.profile_image = MediaService.getProfileImagePath(user)
      user.compatability = compatabilityMap[user.id]

      return user
    })

    await userService.setMutualInterests(loggedUserId, users)
    await userService.setLocations(users)

    res.json(users)
  }

  async getCompatabilityCount(req, res) {
    const token = this.getAuthToken(req)

    const quizService = await this.serviceDiscovery.get('quiz_service')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const compatabilityCount = await quizService.getHighCompatabilityCountForUser(loggedUserId)

    res.json({ compatabilityCount })
  }

  async uploadImage(req, res) {
    const token = this.getAuthToken(req)
    const position = req.query.position

    const mediaRepository = await this.serviceDiscovery.get('media_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    const userImage = await mediaRepository.getUserImage(loggedUserId, position)
    if (userImage) {
      await mediaRepository.deleteUserImage(loggedUserId, position)
      if (1 == position) {
        await userRepository.setUserProfileImage(loggedUserId, null)
      }
      await mediaRepository.deleteMediaMetadata([userImage.image_id])
      await new MediaService().deleteMedia(['big', 'small'].map(size => `${size}_${userImage.image_id}`))
    }

    const form = new formidable.IncomingForm()
    form.parse(req, async (err, fields, files) => {
      const media = await mediaRepository.createMediaMetadata('image', files['image'].type)
      await mediaRepository.createUserImage(loggedUserId, media.id, position)
      const userImages = await mediaRepository.getUserImages(loggedUserId)

      if (1 == position) {
        await userRepository.setUserProfileImage(loggedUserId, media.id)
      }
      const oldpath = files['image'].path

      await new MediaService().resizeAndStore(oldpath, media.id, files['image'].type)

      res.json({
        images: mapImages(userImages)
      })
    })
  }

  async deleteImage(req, res) {
    const token = this.getAuthToken(req)
    const position = req.query.position

    const conn = await this.serviceDiscovery.get('db_connection')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const mediaRepository = await this.serviceDiscovery.get('media_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')

    try {
      conn.query('BEGIN')
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
      conn.query('COMMIT')

      const userImages = await mediaRepository.getUserImages(loggedUserId)


      res.json({
        images: mapImages(userImages)
      })
    } finally {
      conn.query('ROLLBACK')
    }
  }

  async report(req, res) {
    const token = this.getAuthToken(req)
    const { type, details, toUserId } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const reportRepository = await this.serviceDiscovery.get('report_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await reportRepository.createReport({ fromUserId: loggedUserId, toUserId, type, details })

    res.status(201).end()
  }

  async feedback(req, res) {
    const token = this.getAuthToken(req)
    const { type, details } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const reportRepository = await this.serviceDiscovery.get('report_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await reportRepository.createFeedback({ userId: loggedUserId, type, details })

    res.status(201).end()
  }

  async changePassword(req, res) {
    const token = this.getAuthToken(req)
    const { password, newPassword } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const passwordHash = await userRepository.getUserPasswordById(loggedUserId)

    const matches = await compareHash(password, passwordHash)
    if (!matches) {
      return res.status(400).end()
    }
    const newPasswordHash = await hash(newPassword)
    await userRepository.setPassword(loggedUserId, newPasswordHash)

    res.status(201).end()
  }

  async deactivate(req, res) {
    const token = this.getAuthToken(req)
    const { password } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const authService = await this.serviceDiscovery.get('auth_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const passwordHash = await userRepository.getUserPasswordById(loggedUserId)
    const matches = await compareHash(password, passwordHash)
    if (!matches) {
      return res.status(400).end()
    }
    await userRepository.setStatus(loggedUserId, 'deleted')
    await authService.removeAuthToken(token)

    res.status(201).end()
  }

  async setLocation(req, res) {
    const token = this.getAuthToken(req)
    const { locationId } = req.params

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await userRepository.setCityId(loggedUserId, locationId)

    res.status(201).end()
  }

  async signUp(req, res) {
    const { email, name, password } = req.body

    const validator = new SignUpValidator({ email, name, password })
    if (!validator.validate()) {
      return res.status(400).json(validator.errors)
    }

    const userService = await this.serviceDiscovery.get('user_service')
    const authService = await this.serviceDiscovery.get('auth_service')

    const result = await userService.signUp({ email, name, password })
    const token = await authService.createAuthTokenForUser(result.user.id, false)
    result.user.token = token

    res.json(result)
  }

  async emailExists(req, res) {
    const { email } = req.query

    const userRepository = await this.serviceDiscovery.get('user_repository')
    const exists = await userRepository.emailExists(email)

    if (exists) return res.json({ exists })

    res.status(201).end()
  }

  async getSearchPreferences(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const searchPreferenceRepository = await this.serviceDiscovery.get('search_preference_repository')
    const locationService = await this.serviceDiscovery.get('location_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const searchPreferences = await searchPreferenceRepository.getForUser(loggedUserId)

    const location = await locationService.getLocationById(searchPreferences.city_id)

    return res.json({
      fromAge: searchPreferences.from_age,
      toAge: searchPreferences.to_age,
      location: {
        cityId: location.id,
        name: '',
        fullName: location.fullName
      }
    })
  }

  async setSearchPreferences(req, res) {
    const token = this.getAuthToken(req)
    const { fromAge, toAge, cityId } = req.body

    const validator = new SearchPereferenceValidator({ fromAge, toAge, cityId })
    if (!validator.validate()) {
      return res.status(400).json(validator.errors)
    }

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const searchPreferenceRepository = await this.serviceDiscovery.get('search_preference_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await searchPreferenceRepository.setForUser(loggedUserId, { fromAge, toAge, cityId })

    res.status(201).end()
  }
}

module.exports = UserController
