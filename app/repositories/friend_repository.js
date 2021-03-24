const { currentTimeMs } = require('../utils')
const uuid = require('uuid')

class FriendRepository {
  constructor(conn) {
    this.conn = conn
  }

  async findAcceptedRequests(userId) {
    const query = `SELECT * FROM friend_requests WHERE (requesting_user_id = $1 OR target_user_id = $1) AND type = 'accepted'`
    const result = await this.conn.query(query, [userId])

    return result.rows
  }

  async findRequest(requestingUserId, targetUserId) {
    const query = `SELECT * FROM friend_requests WHERE ((requesting_user_id = $1 AND target_user_id = $2) OR (requesting_user_id = $2 AND target_user_id = $1))`
    const result = await this.conn.query(query, [requestingUserId, targetUserId])

    return result.rows[0]
  }

  async createRequest(requestingUserId, targetUserId) {
    const id = uuid.v4()
    const createdAt = currentTimeMs()
    const type = 'pending'
    const query = `INSERT INTO friend_requests (id, requesting_user_id, target_user_id, type, created_at) VALUES ($1, $2, $3, $4, $5)`
    await this.conn.query(query, [id, requestingUserId, targetUserId, type, createdAt])

    return { id, requestingUserId, targetUserId, type, createdAt }
  }

  async acceptRequest(requestingUserId, targetUserId) {
    const acceptedAt = currentTimeMs()
    const query = `UPDATE friend_requests SET type = 'accepted', accepted_at = $1 WHERE requesting_user_id = $2 AND target_user_id = $3 AND type = 'pending'`
    await this.conn.query(query, [acceptedAt, requestingUserId, targetUserId, ])

    return { id, requestingUserId, targetUserId, type: 'friends', acceptedAt }
  }

  async cancelRequest(requestingUserId, targetUserId) {
    const query = `DELETE FROM friend_requests WHERE requesting_user_id = $1 AND target_user_id = $2 AND type = 'pending'`
    return await this.conn.query(query, [requestingUserId, targetUserId])
  }

  async unfriend(requestingUserId, targetUserId) {
    const query = `DELETE FROM friend_requests WHERE ((requesting_user_id = $1 AND target_user_id = $2) OR (requesting_user_id = $2 AND target_user_id = $1)) AND type = 'accepted'`
    return await this.conn.query(query, [requestingUserId, targetUserId])
  }
}

module.exports = FriendRepository
