const { currentTimeMs } = require('../utils');

class VerificationRequestRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async create({ userId, imageId, status }) {
    const createdAt = currentTimeMs();

    await this.conn.query(
      'INSERT INTO verification_requests (user_id, image_id, status, created_at) VALUES ($1, $2, $3, $4)',
      [userId, imageId, status, createdAt]
    );

    return { userId, imageId, status, createdAt };
  }

  async deleteForUser(userId) {
    await this.conn.query(
      'DELETE FROM verification_requests WHERE user_id = $1',
      [userId]
    );
  }

  async updateStatusForUser(userId, status) {
    await this.conn.query(
      'UPDATE verification_requests set status = $1 WHERE user_id = $2',
      [status, userId]
    );
  }
}

module.exports = VerificationRequestRepository;
