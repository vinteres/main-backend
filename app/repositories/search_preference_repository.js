const { currentTimeMs } = require('../utils')

class SearchPreferenceRepository {
  constructor(conn) {
    this.conn = conn
  }

  async getForUser(userId) {
    const result = await this.conn.query('SELECT * FROM search_preferences WHERE user_id = $1', [userId])

    const searchPreferences = result.rows[0]
    if (searchPreferences) {
      return searchPreferences
    }

    return {
      from_age: 18,
      to_age: 50,
      city_id: null
    }
  }

  async setForUser(userId, { fromAge, toAge, cityId }) {
    const result = await this.conn.query(
      'UPDATE search_preferences SET from_age = $1, to_age = $2, city_id = $3 WHERE user_id = $4',
      [fromAge, toAge, cityId, userId]
    )

    return result.rows[0]
  }

  async create(userId, { fromAge, toAge, cityId }) {
    return await this.conn.query(
      'INSERT INTO search_preferences (user_id, from_age, to_age, city_id, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, fromAge, toAge, cityId, currentTimeMs()]
    )
  }
}

module.exports = SearchPreferenceRepository
