const { v4 } = require('uuid');
const { SERVICE_NAME_DB_CLIENT } = require('../core/service_discovery');
const ServiceDiscovery = require('../core/service_discovery');
const { error } = require('./logger');

class ServiceDiscoveryRepo {
  static serviceDiscoveries = {};

  static create(contextId) {
    ServiceDiscoveryRepo.serviceDiscoveries[contextId] = new ServiceDiscovery();

    return ServiceDiscoveryRepo.serviceDiscoveries[contextId];
  }

  static destroy(contextId) {
    delete ServiceDiscoveryRepo.serviceDiscoveries[contextId];
  }

  static async handleWithServiceDiscoveryContext(handler) {
    const contextId = v4();
    const serviceDiscovery = ServiceDiscoveryRepo.create(contextId);

    try {
      return await handler(serviceDiscovery);
    } catch (e) {
      error(e);
    } finally {
      const con = serviceDiscovery.services[SERVICE_NAME_DB_CLIENT];
      if (con) con.release();

      ServiceDiscoveryRepo.destroy(contextId);
    }
  }
}

module.exports = ServiceDiscoveryRepo;
