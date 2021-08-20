const uuid = require('uuid');
const UserStatusType = require('../models/enums/user_status_type');
const { currentTimeMs, compareHash } = require('../utils');

class AuthService {
  constructor(conn, userRepository) {
    this.conn = conn;
    this.userRepository = userRepository;
  }

  async login(email, password, remember, isFromMobile, isFromCordova) {
    const query = `
      select id, name, email, gender, user_status, verification_status, password FROM users WHERE email = $1
    `;
    let activated = false;
    const loginError = [activated, { loggedIn: false }];

    const result = await this.conn.query(query, [email.trim()]);
    const user = result.rows[0];
    if (!user) {
      return loginError;
    }
    if (user.user_status === UserStatusType.DELETED) {
      user.user_status = await this.userRepository.setStatus(user.id, UserStatusType.ACTIVE);
      activated = true;
    }
    const match = await compareHash(password, user.password);
    if (!match) {
      return loginError;
    }

    const token = await this.createAuthTokenForUser(
      user.id,
      remember,
      isFromMobile,
      isFromCordova
    );

    return [
      activated,
      {
        loggedIn: true,
        token,
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.user_status,
        gender: user.gender,
        verificationStatus: user.verification_status
      }
    ];
  }

  async loginWith(email, isFromMobile, isFromCordova) {
    const query = `
      select id, name, email, gender, user_status, verification_status, password FROM users WHERE email = $1
    `;
    const loginError = { loggedIn: false };

    const result = await this.conn.query(query, [email.trim()]);
    const user = result.rows[0];
    if (!user || 'deleted' === user.user_status) return loginError;

    const token = await this.createAuthTokenForUser(user.id, false, isFromMobile, isFromCordova);

    return {
      loggedIn: true,
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.user_status,
      gender: user.gender,
      verificationStatus: user.verification_status
    };
  }

  async removeAuthToken(token) {
    const query = `
      DELETE FROM session_tokens WHERE token = $1
    `;

    return await this.conn.query(query, [token]);
  }

  async createAuthTokenForUser(userId, remember, isFromMobile, isFromCordova) {
    const query = `
      INSERT INTO session_tokens (user_id, token, remember, is_mobile, is_cordova, created_at) VALUES($1, $2, $3, $4, $5, $6)
    `;

    const token = uuid.v4();
    await this.conn.query(
      query,
      [userId, token, remember, isFromMobile, isFromCordova, currentTimeMs()
    ]);

    return token;
  }
}

module.exports = AuthService;
