const axios = require('axios');
const { calculateCompatibility } = require('../compatibility_calculator');
const { Controller } = require('../core/controller');
const UserStatusType = require('../models/enums/user_status_type');
const { sendError } = require('./chat_controller');

class AuthController extends Controller {
  async login(req, res) {
    const email = req.body.username;
    const password = req.body.password;
    const remember = req.body.remember;

    const authService = await this.getService('auth_service');
    const compatibilityService = await this.getService('compatibility_service');
    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const [activated, user] = await authService.login(
        email,
        password,
        remember,
        this.isFromMobile(req),
        this.isFromCordova(req)
      );
      if (activated) await compatibilityService.scheduleForCompatibilityCalculation(user.id);

      con.query('COMMIT');

      if (activated) calculateCompatibility(user.id);

      res.json(user);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async loginWith(req, res) {
    let email = req.body.email;
    const name = req.body.name;
    const accessToken = req.body.token;

    const authService = await this.getService('auth_service');
    const userService = await this.getService('user_service');
    const compatibilityService = await this.getService('compatibility_service');
    const con = await this.getConnection();

    try {
      const resp = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);

      email = (resp.data.email ?? email).trim();
    } catch (e) {
      if (e.response.status === 400 || e.response.status === 401) {
        return sendError(res, e.response.status, 'Invalid token');
      } else {
        throw e;
      }
    }

    const dbResp = await con.query('SELECT id, user_status FROM users WHERE email = $1', [email]);
    const foundUser = dbResp.rows[0];
    const exists = !!foundUser;

    let result = {};
    try {
      con.query('BEGIN');

      let activated = false;

      if (exists) {
        if (foundUser.user_status === UserStatusType.DELETED) {
          const { activeStatus } = await Promise.all([
            userService.setStatus(foundUser.id, UserStatusType.ACTIVE),
            compatibilityService.scheduleForCompatibilityCalculation(foundUser.id)
          ]);
          foundUser.user_status = activeStatus;

          activated = true;
        }

        result = await authService.loginWith(
          email,
          this.isFromMobile(req),
          this.isFromCordova(req)
        );
      } else {
        const r = await userService.signUpWith({ email, name, accessToken });
        if (!r?.user) {
          throw 'Couldn\'t create user';
        }

        const authToken = await authService.createAuthTokenForUser(
          r.user.id,
          false,
          this.isFromMobile(req),
          this.isFromCordova(req)
        );
        result = { ...r.user, token: authToken };
      }
      con.query('COMMIT');

      if (activated) calculateCompatibility(foundUser.id);
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
