const ChatRepository = require('../repositories/chat_repository')
const HobbieRepository = require('../repositories/hobbie_repository')
const IntroRepository = require('../repositories/intro_repository')
const LocationRepository = require('../repositories/location_repository')
const MatchRepository = require('../repositories/match_repository')
const MediaRepository = require('../repositories/media_repository')
const NotificationRepository = require('../repositories/notification_repository')
const OnboardingRepository = require('../repositories/onboarding_repository')
const QuizRepository = require('../repositories/quiz_repository')
const ReportRepository = require('../repositories/report_repository')
const SearchPreferenceRepository = require('../repositories/search_preference_repository')
const SessionTokenRepository = require('../repositories/session_token_repository')
const UserRepository = require('../repositories/user_repository')
const VerificationRequestRepository = require('../repositories/verification_request_repository')
const ViewsRepository = require('../repositories/views_repository')
const AuthService = require('../services/auth_service')
const ChatService = require('../services/chat_service')
const HobbieService = require('../services/hobbie_service')
const IntroService = require('../services/intro_service')
const LocationService = require('../services/location_service')
const MatchService = require('../services/match_service')
const NotificationService = require('../services/notification_service')
const QuizService = require('../services/quiz_service')
const UserService = require('../services/user_service')

const DEPENDENCIES = {
  user_repository: { cls: UserRepository, depends: ['db_connection']},
  quiz_repository: { cls: QuizRepository, depends: ['db_connection']},
  onboarding_repository: { cls: OnboardingRepository, depends: ['db_connection']},
  session_token_repository: { cls: SessionTokenRepository, depends: ['db_connection']},
  views_repository: { cls: ViewsRepository, depends: ['db_connection']},
  verification_request_repository: { cls: VerificationRequestRepository, depends: ['db_connection']},
  search_preference_repository: { cls: SearchPreferenceRepository, depends: ['db_connection']},
  hobbie_repository: { cls: HobbieRepository, depends: ['db_connection']},
  notification_repository: { cls: NotificationRepository, depends: ['db_connection']},
  location_repository: { cls: LocationRepository, depends: ['db_connection']},
  intro_repository: { cls: IntroRepository, depends: ['db_connection']},
  match_repository: { cls: MatchRepository, depends: ['db_connection']},
  chat_repository: { cls: ChatRepository, depends: ['db_connection']},
  report_repository: { cls: ReportRepository, depends: ['db_connection']},
  media_repository: { cls: MediaRepository, depends: ['db_connection']},
  user_service: { cls: UserService, depends: [
    'user_repository',
    'views_repository',
    'search_preference_repository',
    'onboarding_repository',
    'hobbie_repository',
    'notification_service',
    'location_service'
  ]},
  quiz_service: { cls: QuizService, depends: ['quiz_repository', 'user_repository', 'onboarding_repository']},
  notification_service: { cls: NotificationService, depends: ['notification_repository', 'user_repository']},
  location_service: { cls: LocationService, depends: ['location_repository']},
  intro_service: { cls: IntroService, depends: ['intro_repository', 'match_repository']},
  auth_service: { cls: AuthService, depends: ['db_connection']},
  chat_service: { cls: ChatService, depends: ['chat_repository']},
  hobbie_service: { cls: HobbieService, depends: ['hobbie_repository']},
  match_service: { cls: MatchService, depends: ['match_repository']},
}

class ServiceDiscovery {
  constructor(controller) {
    this.controller = controller
    this.services = {}
  }

  async get(name) {
    if (!this.services[name]) {
      this.services[name] = await this.create(name)
    }

    return this.services[name]
  }

  async create(name) {
    if ('db_connection' === name) {
      return await this.controller.getConnection()
    }

    const dependecies = []
    for (const i of DEPENDENCIES[name].depends) {
      dependecies.push(await this.get(i))
    }

    const inst = new DEPENDENCIES[name].cls(...dependecies)
    this.services[name] = dependecies

    return inst
  }
}

module.exports = ServiceDiscovery
