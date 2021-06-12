const ChatRepository = require('../repositories/chat_repository');
const HobbieRepository = require('../repositories/hobbie_repository');
const IntroRepository = require('../repositories/intro_repository');
const LocationRepository = require('../repositories/location_repository');
const MatchRepository = require('../repositories/match_repository');
const MediaRepository = require('../repositories/media_repository');
const NotificationRepository = require('../repositories/notification_repository');
const OnboardingRepository = require('../repositories/onboarding_repository');
const PageRepository = require('../repositories/page_repository');
const ProfileQuestionsRepository = require('../repositories/profile_questions_repository');
const QuizRepository = require('../repositories/quiz_repository');
const ReportRepository = require('../repositories/report_repository');
const SearchPreferenceRepository = require('../repositories/search_preference_repository');
const SessionTokenRepository = require('../repositories/session_token_repository');
const UserRepository = require('../repositories/user_repository');
const VerificationRequestRepository = require('../repositories/verification_request_repository');
const ViewsRepository = require('../repositories/views_repository');
const AuthService = require('../services/auth_service');
const ChatService = require('../services/chat_service');
const HobbieService = require('../services/hobbie_service');
const IntroService = require('../services/intro_service');
const LocationService = require('../services/location_service');
const MatchService = require('../services/match_service');
const NotificationService = require('../services/notification_service');
const QuizService = require('../services/quiz_service');
const UserService = require('../services/user_service');

const SERVICE_NAME_DB_CLIENT = 'db_connection';

const DEPENDENCIES = {
  user_repository: { cls: UserRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  page_repository: { cls: PageRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  quiz_repository: { cls: QuizRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  onboarding_repository: { cls: OnboardingRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  session_token_repository: { cls: SessionTokenRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  views_repository: { cls: ViewsRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  verification_request_repository: { cls: VerificationRequestRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  search_preference_repository: { cls: SearchPreferenceRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  hobbie_repository: { cls: HobbieRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  notification_repository: { cls: NotificationRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  location_repository: { cls: LocationRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  intro_repository: { cls: IntroRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  match_repository: { cls: MatchRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  chat_repository: { cls: ChatRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  report_repository: { cls: ReportRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  media_repository: { cls: MediaRepository, depends: [SERVICE_NAME_DB_CLIENT]},
  profile_questions_repository: { cls: ProfileQuestionsRepository, depends: [SERVICE_NAME_DB_CLIENT] },
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
  auth_service: { cls: AuthService, depends: [SERVICE_NAME_DB_CLIENT]},
  chat_service: { cls: ChatService, depends: ['chat_repository', 'user_repository', 'page_repository']},
  hobbie_service: { cls: HobbieService, depends: ['hobbie_repository']},
  match_service: { cls: MatchService, depends: ['match_repository']},
};

class ServiceDiscovery {
  constructor(controller) {
    this.controller = controller;
    this.services = {};
  }

  async get(name) {
    if (!this.services[name]) {
      this.services[name] = await this.create(name);
    }

    return this.services[name];
  }

  async create(name) {
    if (SERVICE_NAME_DB_CLIENT === name) {
      return await this.controller.getConnection();
    }

    const dependecies = [];
    for (const i of DEPENDENCIES[name].depends) {
      dependecies.push(await this.get(i));
    }

    const inst = new DEPENDENCIES[name].cls(...dependecies);
    this.services[name] = dependecies;

    return inst;
  }
}

ServiceDiscovery.SERVICE_NAME_DB_CLIENT = SERVICE_NAME_DB_CLIENT;

module.exports = ServiceDiscovery;
