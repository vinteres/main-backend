const axios = require('axios');
const { Controller } = require('../core/controller');
const { sendError } = require('./chat_controller');

class AuthController extends Controller {
  async login(req, res) {
    const email = req.body.username;
    const password = req.body.password;
    const remember = req.body.remember;

    const authService = await this.getService('auth_service');
    const user = await authService.login(email, password, remember);

    res.json(user);
  }

  async loginWith(req, res) {
    let email = req.body.email;
    const name = req.body.name;
    const accessToken = req.body.token;

    const authService = await this.getService('auth_service');
    const userService = await this.getService('user_service');
    const con = await this.getConnection();

    try {
      const resp = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);

      email = resp.data.email ?? email;
    } catch (e) {
      if (e.response.status === 400 || e.response.status === 401) {
        return sendError(res, e.response.status, 'Invalid token');
      } else {
        throw e;
      }
    }

    const dbResp = await con.query('SELECT user_status FROM users WHERE email = $1', [email]);
    const exists = dbResp.rows.length === 1 && dbResp.rows[0].user_status !== 'deleted';

    let result = {};
    try {
      con.query('BEGIN');

      if (exists) {
        result = await authService.loginWith(email);
      } else {
        const r = await userService.signUpWith({ email, name, accessToken });
        const authToken = await authService.createAuthTokenForUser(r.user.id, false);
        result = { ...r.user, token: authToken };
      }
      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }

    res.json(result);
  }

  async logout(req, res) {
    const token = this.getAuthToken(req);

    const authService = await this.getService('auth_service');
    await authService.removeAuthToken(token);

    res.json();
  }
}

module.exports = AuthController;
