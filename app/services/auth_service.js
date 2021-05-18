const uuid = require('uuid')
const { currentTimeMs, compareHash } = require('../utils')

class AuthService {
  constructor(conn) {
    this.conn = conn
  }

  async login(email, password, remember) {
    const query = `
      select id, name, email, gender, user_status, verification_status, password FROM users WHERE email = $1
    `
    const loginError = { loggedIn: false }

    const result = await this.conn.query(query, [email.trim()])
    const user = result.rows[0]
    if (!user || 'deleted' === user.user_status) return loginError
    const match = await compareHash(password, user.password)
    if (!match) {
      return loginError
    }

    const token = await this.createAuthTokenForUser(user.id, remember)

    return {
      loggedIn: true,
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.user_status,
      gender: user.gender,
      verificationStatus: user.verification_status
    }
  }

  async removeAuthToken(token) {
    const query = `
      DELETE FROM session_tokens WHERE token = $1
    `

    return await this.conn.query(query, [token])
  }

  async createAuthTokenForUser(userId, remember) {
    const query = `
      INSERT INTO session_tokens (user_id, token, remember, created_at) VALUES($1, $2, $3, $4)
    `

    const token = uuid.v4()
    await this.conn.query(query, [userId, token, remember, currentTimeMs()])

    return token
  }
}

module.exports = AuthService
