const { error } = require('./logger');
const { SERVICE_NAME_DB_CLIENT } = require('./service_discovery');
const ServiceDiscoveryRepo = require('./service_discovery_repo');

const defaultError = { code: 500, msg: '' };

class Controller {
  constructor(serviceDiscovery) {
    this.serviceDiscovery = serviceDiscovery;
  }

  getAuthToken(req) {
    return req.headers['x-auth-token'];
  }

  errorHandle(res) {
    return Controller.sendError(res, 500, 'Internal server error');
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = this.serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);
    }

    return this.connection;
  }

  async onError(req, res, err) {
    error(err);

    const { code, msg } = this.handleError(err) ?? defaultError;

    return Controller.sendError(res, code, msg);
  }

  handleError(_) {
    return defaultError;
  }

  static sendError(res, code = 500, msg = '') {
    return res.status(code).json({
      error: msg
    });
  }

  async getService(name) {
    return await this.serviceDiscovery.get(name);
  }
}

const handle = (controller, action) => {
  return async (req, res) =>
    await ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const inst = new controller(serviceDiscovery);

      try {
        return await inst[action](req, res);
      } catch (err) {
        return await inst.onError(req, res, err);
      }
    });
};

module.exports = {
  Controller,
  handle
};
