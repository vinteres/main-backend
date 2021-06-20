const { currentTimeMs } = require('../utils');
const uuid = require('uuid');

const INTROS_PER_PAGE = 30;

class IntroRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async create({ fromUserId, toUserId, type, message, mediaMetadataId }) {
    const id = uuid.v4();
    const createdAt = currentTimeMs();
    const seen = false;
    const query = `INSERT INTO intros (id, from_user_id, to_user_id, type, message, media_metadata_id, seen, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    await this.conn.query(query, [id, fromUserId, toUserId, type, message, mediaMetadataId, seen, createdAt]);

    return { id, fromUserId, toUserId, type, message, mediaMetadataId, seen, createdAt };
  }

  async createMediaMetadata(type, mimeType) {
    const id = uuid.v4();
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO media_metadatas (id, type, mime_type, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [id, type, mimeType, createdAt]);

    return { id, type, createdAt };
  }

  async getMediaMetadata(id) {
    const query = 'SELECT * FROM media_metadatas WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async getForUser(userId, page) {
    page = page || 1;

    const query = `
      SELECT * FROM intros
      WHERE to_user_id = $1 AND liked_at IS NULL
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * INTROS_PER_PAGE}
      LIMIT ${INTROS_PER_PAGE}
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getFromUser(userId, page) {
    page = page || 1;

    const query = `
      SELECT * FROM intros
      WHERE from_user_id = $1
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * INTROS_PER_PAGE}
      LIMIT ${INTROS_PER_PAGE}
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getIntroFor(userOneId, userTwoId) {
    const query = `
      SELECT * FROM intros
      WHERE liked_at IS NULL AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))
    `;
    const result = await this.conn.query(query, [userOneId, userTwoId]);

    return result.rows[0];
  }

  async getIntroById(id) {
    const query = `
      SELECT * FROM intros WHERE id = $1
    `;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async areMatched(userOneId, userTwoId) {
    const query = `
      SELECT COUNT(*) FROM matches
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `;

    const result = await this.conn.query(query, [userOneId, userTwoId]);

    return 0 !== parseInt(result.rows[0].count);
  }

  async notSeenCountFor(userId) {
    const query = 'SELECT COUNT(*) FROM intros WHERE to_user_id = $1 AND seen = false';
    const result = await this.conn.query(query, [userId]);

    return parseInt(result.rows[0].count);
  }

  async seeIntros(userId) {
    const query = 'UPDATE intros SET seen = true WHERE to_user_id = $1';
    await this.conn.query(query, [userId]);
  }

  async likeIntro(id) {
    const query = 'UPDATE intros SET liked_at = $1 WHERE id = $2';
    await this.conn.query(query, [currentTimeMs(), id]);
  }
}

module.exports = IntroRepository;
