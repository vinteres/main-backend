const { Controller } = require('./controller');

class LikeController extends Controller {
  async like(req, res) {
    const token = this.getAuthToken(req);

    const userId = req.params.id;
    let { message } = req.body;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const introService = await this.serviceDiscovery.get('intro_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const relationStatus = await introService.relationBetween(loggedUserId, userId);

    if (relationStatus) {
      return res.status(500).end();
    }

    let type;
    if ('string' === typeof message && '' !== message.trim()) {
      type = 'message';
    } else {
      type = 'smile';
      message = null;
    }

    await introService.create({
      fromUserId: loggedUserId,
      toUserId: userId,
      type,
      message
    });

    res.status(201).end();
  }
}

module.exports = LikeController;
