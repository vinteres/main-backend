const { send } = require('./ws_service');
const { mapByKey } = require('../utils');
const MediaService = require('./media_service');
const { NOTIF } = require('../models/enums/ws_message_type');

class NotificationService {
  constructor(notificationRepository, userRepository) {
    this.notificationRepository = notificationRepository;
    this.userRepository = userRepository;
  }

  async getAllForUser(userId) {
    await this.seeNotifs(userId);
    const notifications = await this.notificationRepository.getAllForUser(userId);
    const fromUserIds = notifications.map(notification => notification.from_user_id);
    let users = await this.userRepository.getUsersById(fromUserIds);
    users = users.map(user => {
      user.profileImage = MediaService.getProfileImagePath(user);

      return user;
    });
    users = mapByKey(users, 'id');

    return notifications.map(notification => {
      notification.user = users[notification.from_user_id];

      return notification;
    });
  }

  async notSeenVisitsCountFor(userId) {
    const notSeenNotifCount = await this.notificationRepository.notSeenVisitsCountFor(userId);

    return notSeenNotifCount;
  }

  async notSeenMatchesCountFor(userId) {
    const notSeenNotifCount = await this.notificationRepository.notSeenMatchesCountFor(userId);

    return notSeenNotifCount;
  }

  async getNotSeenCountFor(userId) {
    const notSeenNotifCount = await this.notificationRepository.notSeenCountFor(userId);

    return notSeenNotifCount;
  }

  async seeNotifs(userId) {
    await this.notificationRepository.seeNotifs(userId);

    send(userId, { type: 'see_notifs' });
  }

  async create(fromUserId, toUserId, relId, type) {
    const notification = await this.notificationRepository.create(fromUserId, toUserId, relId, type);

    send(toUserId, {
      type: NOTIF,
      notification
    });
  }

  async delete(relId) {
    const relType = 'friend_request';

    return await this.notificationRepository.delete(relId, relType);
  }
}

module.exports = NotificationService;
