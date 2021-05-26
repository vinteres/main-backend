const { currentTimeMs } = require('../utils');

class ViewsRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findFor(viewedUserId) {
    const result = await this.conn.query(
      'SELECT * FROM user_views WHERE viewed_user_id = $1 ORDER BY last_viewed_at DESC',
      [viewedUserId]
    );

    return result.rows;
  }

  async find(viewerUserId, viewedUserId) {
    const result = await this.conn.query(
      'SELECT * FROM user_views WHERE viewer_user_id = $1 AND viewed_user_id = $2',
      [viewerUserId, viewedUserId]
    );

    return result.rows[0];
  }

  async incrementView(viewerUserId, viewedUserId) {
    const lastViewedAt = currentTimeMs();

    await this.conn.query(
      'UPDATE user_views SET count = count + 1, last_viewed_at = $1 WHERE viewer_user_id = $2 AND viewed_user_id = $3',
      [lastViewedAt, viewerUserId, viewedUserId]
    );
  }

  async create(viewerUserId, viewedUserId) {
    const count = 1;
    const lastViewedAt = currentTimeMs();

    await this.conn.query(
      'INSERT INTO user_views (viewer_user_id, viewed_user_id, count, last_viewed_at) VALUES ($1, $2, $3, $4)',
      [viewerUserId, viewedUserId, count, lastViewedAt]
    );

    return { viewerUserId, viewedUserId, count, lastViewedAt };
  }
}

module.exports = ViewsRepository;
