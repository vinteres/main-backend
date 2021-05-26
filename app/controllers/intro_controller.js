const { Controller } = require('./controller');
const MediaService = require('../services/media_service');
const { timeAgo } = require('../utils');
const { sendData } = require('../services/ws_service');
const { isConnected } = require('../services/ws_service');

class IntroController extends Controller {
  async like(req, res) {
    const token = this.getAuthToken(req);
    const introId = req.params.id;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const introRepository = await this.serviceDiscovery.get('intro_repository');
    const introService = await this.serviceDiscovery.get('intro_service');
    const matchRepository = await this.serviceDiscovery.get('match_repository');
    const notificationService = await this.serviceDiscovery.get('notification_service');
    const chatService = await this.serviceDiscovery.get('chat_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const intro = await introRepository.getIntroById(introId);

    if (intro.to_user_id !== loggedUserId) {
      return res.status(404).end();
    }
    if (intro.liked_at) {
      const relationStatus = await introService.relationBetween(intro.from_user_id, intro.to_user_id);

      return res.json({ status: 'already_liked', relationStatus });
    }

    await introRepository.likeIntro(intro.id);
    await matchRepository.create(intro.from_user_id, intro.to_user_id);

    await chatService.createChatIfNotExists(intro.from_user_id, intro.to_user_id);

    await notificationService.create(loggedUserId, intro.from_user_id, intro.id, 'intro_like');
    await notificationService.create(intro.from_user_id, loggedUserId, intro.id, 'matched');

    return res.json({ relationStatus: 'matched' });
  }

  async unmatch(req, res) {
    const token = this.getAuthToken(req);
    const userId = req.params.id;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const introService = await this.serviceDiscovery.get('intro_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await introService.unmatch(loggedUserId, userId);

    return res.status(201).end();
  }

  async getForUser(req, res) {
    const token = this.getAuthToken(req);
    const page = req.query.page;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const introRepository = await this.serviceDiscovery.get('intro_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await introRepository.seeIntros(loggedUserId);
    sendData(loggedUserId, { type: 'see_intros' });

    const intros = await introRepository.getForUser(loggedUserId, page);

    const fromUserIds = intros.map(intro => intro.from_user_id);
    const fromUsers = await userRepository.findByIds([
      'id', 'name', 'age', 'profile_image_id', 'verified'
    ], fromUserIds);

    const result = intros.map(intro => {
      const user = fromUsers.filter(user => user.id === intro.from_user_id)[0];

      return {
        id: user.id,
        profile_image: MediaService.getProfileImagePath(user),
        name: user.name,
        age: user.age,
        verified: user.verified,
        online: !!isConnected(user.id),
        intro: {
          timeAgo: timeAgo(intro.created_at),
          type: intro.type,
          message: intro.message,
        }
      };
    });

    res.json(result);
  }
}

module.exports = IntroController;
