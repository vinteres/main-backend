const { v4 } = require('uuid');
const { SERVICE_NAME_DB_CLIENT } = require('../core/service_discovery');
const ServiceDiscovery = require('../core/service_discovery');

class ServiceDiscoveryRepo {
  static serviceDiscoveries = {};

  static create(requestId) {
    ServiceDiscoveryRepo.serviceDiscoveries[requestId] = new ServiceDiscovery();

    return ServiceDiscoveryRepo.serviceDiscoveries[requestId];
  }

  static destroy(requestId) {
    delete ServiceDiscoveryRepo.serviceDiscoveries[requestId];
  }
}

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

  static sendError(res, code = 500, msg = '') {
    return res.status(code).json({
      error: new Error(msg)
    });
  }

  async getService(name) {
    return await this.serviceDiscovery.get(name);
  }
}

const handle = (controller, action) => {
  return async (req, res) => {
    const requestId = v4();
    const serviceDiscovery = ServiceDiscoveryRepo.create(requestId);
    const inst = new controller(serviceDiscovery);

    try {
      return await inst[action](req, res);
    } catch(err) {
      console.error(err);

      return Controller.sendError(res);
    } finally {
      const con = serviceDiscovery.services[SERVICE_NAME_DB_CLIENT];
      if (con) con.release();

      ServiceDiscoveryRepo.destroy(requestId);
    }
  };
};

module.exports = {
  Controller,
  handle
};
