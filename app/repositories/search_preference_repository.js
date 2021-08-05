const { currentTimeMs } = require('../utils');

const MIN_AGE = 18;
const MAX_AGE = 70;

class SearchPreferenceRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async getForUser(userId) {
    const result = await this.conn.query('SELECT * FROM search_preferences WHERE user_id = $1', [userId]);

    return result.rows[0];
  }

  async setForUser(userId, { fromAge, toAge, cityId, income }) {
    const result = await this.conn.query(
      'UPDATE search_preferences SET from_age = $1, to_age = $2, city_id = $3, income = $4 WHERE user_id = $5',
      [fromAge, toAge, cityId, income, userId]
    );

    return result.rows[0];
  }

  async create(userId, { fromAge, toAge, cityId }) {
    return await this.conn.query(
      'INSERT INTO search_preferences (user_id, from_age, to_age, city_id, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, fromAge, toAge, cityId, currentTimeMs()]
    );
  }
}

SearchPreferenceRepository.MIN_AGE = MIN_AGE;
SearchPreferenceRepository.MAX_AGE = MAX_AGE;

module.exports = SearchPreferenceRepository;
