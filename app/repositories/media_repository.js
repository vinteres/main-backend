const { currentTimeMs } = require('../utils');
const uuid = require('uuid');

class MediaRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async createMediaMetadata(type, mimeType) {
    const id = uuid.v4();
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO media_metadatas (id, type, mime_type, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [id, type, mimeType, createdAt]);

    return { id, type, createdAt };
  }

  async createUserImage(userId, imageId, position) {
    const createdAt = currentTimeMs();
    const query = 'INSERT INTO user_images (user_id, image_id, position, created_at) VALUES ($1, $2, $3, $4)';
    await this.conn.query(query, [userId, imageId, position, createdAt]);

    return { userId, imageId, position, createdAt };
  }

  async getMediaMetadata(id) {
    const query = 'SELECT * FROM media_metadatas WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async getUserImages(userId) {
    const query = 'SELECT * FROM user_images WHERE user_id = $1 ORDER BY position ASC';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getUserImage(userId, position) {
    const query = 'SELECT * FROM user_images WHERE user_id = $1 AND position = $2';
    const result = await this.conn.query(query, [userId, position]);

    return result.rows[0];
  }

  async deleteMediaMetadata(ids) {
    if (!ids || 0 === ids.length) return;

    const query = `DELETE FROM media_metadatas WHERE id = (${ids.map((_, ix) => `$${ix + 1}`).join(', ')})`;
    await this.conn.query(query, ids);
  }

  async deleteUserImage(userId, position) {
    const query = 'DELETE FROM user_images WHERE user_id = $1 AND position = $2';
    await this.conn.query(query, [userId, position]);
  }

  async changeUserImagePosition(userId, position) {
    const query = 'UPDATE user_images SET position = position - 1 WHERE user_id = $1 AND position > $2';
    await this.conn.query(query, [userId, position]);
  }
}

module.exports = MediaRepository;
