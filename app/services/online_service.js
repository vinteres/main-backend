const { currentTimeMs } = require("../utils");

const onlineUpdates = {};

const online = (userId) => {
  if (onlineUpdates[userId]) return false;

  onlineUpdates[userId] = true;

  setTimeout(() => delete onlineUpdates[userId], 10000);

  return true;
};

class OnlineService {
  constructor(con) {
    this.con = con;
  }

  async updateLastOnline(userId) {
    if (!online(userId)) return;

    await this.setLastOnline(userId, true);
  }

  async setLastOnline(userId, isOnline) {
    const lastOnlineAt = currentTimeMs();

    await this.con.query(
      'UPDATE users SET is_online = $1, last_online_at = $2 WHERE id = $3',
      [isOnline, lastOnlineAt, userId]
    );
  }
}

module.exports = OnlineService;
