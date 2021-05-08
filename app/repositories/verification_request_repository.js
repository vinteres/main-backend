const uuid = require('uuid');
const { currentTimeMs } = require('../utils');

class VerificationRequestRepository {
  constructor(conn) {
    this.conn = conn
  }

  async create({ userId, imageId, status }) {
    const id = uuid.v4()
    const createdAt = currentTimeMs()

    await this.conn.query(
      'INSERT INTO verification_requests (id, user_id, image_id, status, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, imageId, status, createdAt]
    )

    return { id, userId, imageId, status, createdAt }
  }
}

module.exports = VerificationRequestRepository
