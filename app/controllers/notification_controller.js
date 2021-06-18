const { Controller } = require('../core/controller');

class NotificationController extends Controller {
  async getAll(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const notificationService = await this.getService('notification_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const notifications = await notificationService.getAllForUser(loggedUserId);

    res.json(notifications);
  }
}

module.exports = NotificationController;
