const path = require('path')
const ChatController = require('./controllers/chat_controller')
const HobbieController = require('./controllers/hobbie_controller')
const UserController = require('./controllers/user_controller')
const AuthController = require('./controllers/auth_controller')
const NotificationController = require('./controllers/notification_controller')
const IntroController = require('./controllers/intro_controller')
const LocationController = require('./controllers/location_controller')
const OnboardingController = require('./controllers/onboarding_controller')
const QuizController = require('./controllers/quiz_controller')
const { Controller } = require('./controllers/controller')
const { handle } = require('./controllers/controller')
const { getConnection } = require('./db')
const SessionTokenRepository = require('./repositories/session_token_repository')
const UserRepository = require('./repositories/user_repository')

const sendError = Controller.sendError

const SESSION_LIFETIME = 1800000 // 30 min

const auth = (req, res, next, statuses = []) => {
  const token = req.headers['x-auth-token']
  if (!token) return sendError(res, 401, 'Unauthenticated')

  getConnection(async (client) => {
    const sessionTokenRepository = new SessionTokenRepository(client)
    const sessionInfo = await sessionTokenRepository.getByToken(token)
    if (!sessionInfo) {
      return sendError(res, 401, 'Unauthenticated')
    }
    if (!sessionInfo.remember && SESSION_LIFETIME < Date.now() - sessionInfo.created_at) {
      await sessionTokenRepository.removeByToken(token)

      return sendError(res, 401, 'Unauthenticated')
    }

    const userId = sessionInfo.user_id

    const userRepository = new UserRepository(client)
    const { user_status } = await userRepository.getUserById(userId)

    const hasStatusRules = statuses.length > 0
    if (hasStatusRules && !statuses.includes(user_status)) {
      return sendError(res, 403, 'Unauthorized')
    }

    return next()
  }, () => sendError(res, 500, 'Internal server error'))
}

const authOnboarding = (...args) => auth(...args, ['onboarding'])
const authActive = (...args) => auth(...args, ['active'])

const initRoutes = (app) => {
  app.get('/api/media/:id', handle(IntroController, 'get'))
  app.get('/api/intros-to', authActive, handle(IntroController, 'getForUser'))
  app.post('/api/intros/:id/like', authActive, handle(IntroController, 'like'))
  app.post('/api/users/:id/unmatch', authActive, handle(IntroController, 'unmatch'))
  app.post('/api/media/upload', handle(IntroController, 'create'))
  app.post('/api/smile', handle(IntroController, 'smile'))
  app.post('/api/image/upload', handle(UserController, 'uploadImage'))
  app.delete('/api/image', auth, handle(UserController, 'deleteImage'))
  app.get('/api/hobbies', handle(HobbieController, 'getAll'))
  app.get('/api/locations/search', handle(LocationController, 'search'))
  app.get('/api/locations/cities', handle(LocationController, 'cities'))
  app.get('/api/activities', handle(HobbieController, 'getAllActivities'))
  app.post('/api/hobbies/user', authActive, handle(HobbieController, 'set'))
  app.post('/api/activities/user', authActive, handle(HobbieController, 'setActivities'))
  app.post('/api/login', handle(AuthController, 'login'))
  app.post('/api/sign-up', handle(UserController, 'signUp'))
  app.post('/api/logout', auth, handle(AuthController, 'logout'))
  app.get('/api/user/:id', authActive, handle(UserController, 'get'))
  app.get('/api/users', authActive, handle(UserController, 'getUsers'))
  app.get('/api/settings', authActive, handle(UserController, 'getSettings'))
  app.post('/api/user/location/:locationId', authActive, handle(UserController, 'setLocation'))
  app.post('/api/account-settings', authActive, handle(UserController, 'setAccountSettings'))
  app.post('/api/profile-settings', authActive, handle(UserController, 'setProfileSettings'))
  app.get('/api/matches', authActive, handle(UserController, 'getFriends'))
  app.get('/api/views', authActive, handle(UserController, 'getViewers'))
  app.get('/api/compatabilities', authActive, handle(UserController, 'getCompatabilities'))
  app.get('/api/compatability-count', authActive, handle(UserController, 'getCompatabilityCount'))
  app.get('/api/notifications', authActive, handle(NotificationController, 'getAll'))
  app.get('/api/chats', authActive, handle(ChatController, 'members'))
  app.get('/api/chat/:userId', authActive, handle(ChatController, 'get'))
  app.get('/api/chat/:userId/older', authActive, handle(ChatController, 'loadOlder'))
  app.post('/api/report', auth, handle(UserController, 'report'))
  app.post('/api/feedback', auth, handle(UserController, 'feedback'))
  app.post('/api/settings/change-password', auth, handle(UserController, 'changePassword'))
  app.post('/api/settings/deactivate', auth, handle(UserController, 'deactivate'))
  app.get('/api/email-exists', handle(UserController, 'emailExists'))

  app.get('/api/onboarding/step', auth, handle(OnboardingController, 'getStep'))
  app.post('/api/onboarding/account-info', authOnboarding, handle(OnboardingController, 'setAccountInfo'))
  app.post('/api/onboarding/profile-info', authOnboarding, handle(OnboardingController, 'setProfileInfo'))
  app.post('/api/onboarding/interests', authOnboarding, handle(OnboardingController, 'setInterests'))
  app.get('/api/onboarding/quiz', authOnboarding, handle(QuizController, 'getQuiz'))
  app.post('/api/onboarding/quiz', authOnboarding, handle(OnboardingController, 'setQuizAnswers'))
  app.post('/api/onboarding/image-pass', authOnboarding, handle(OnboardingController, 'setImageStepPassed'))
  app.post('/api/onboarding/complete', authOnboarding, handle(OnboardingController, 'completeOnboarding'))
  app.get('/api/search-preferences', authActive, handle(UserController, 'getSearchPreferences'))
  app.post('/api/search-preferences', authActive, handle(UserController, 'setSearchPreferences'))

  app.get('*', (req, res) => {
    const dir = path.resolve(process.cwd() + '/dist/index.html')
    res.sendFile(dir)
  })
}

module.exports = {
  initRoutes
}
