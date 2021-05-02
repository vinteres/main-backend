
class SessionTokenRepository {
  constructor(conn) {
    this.conn = conn
  }

  async getUserId(token) {
    const result = await this.conn.query('SELECT user_id, remember, created_at FROM session_tokens WHERE token = $1', [token])

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    return result.rows[0].user_id
  }

  async getByToken(token) {
    const result = await this.conn.query('SELECT user_id, remember, created_at FROM session_tokens WHERE token = $1', [token])

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  async removeByToken(token) {
    const query = `
      DELETE FROM session_tokens WHERE token = $1
    `

    return await this.conn.query(query, [token])
  }
}

module.exports = SessionTokenRepository
