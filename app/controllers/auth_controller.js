const { Controller } = require('../core/controller');

class AuthController extends Controller {
  async login(req, res) {
    const email = req.body.username;
    const password = req.body.password;
    const remember = req.body.remember;

    const suthService = await this.getService('auth_service');
    const user = await suthService.login(email, password, remember);

    res.json(user);
  }

  async logout(req, res) {
    const token = this.getAuthToken(req);

    const authService = await this.getService('auth_service');
    await authService.removeAuthToken(token);

    res.json();
  }
}

module.exports = AuthController;
