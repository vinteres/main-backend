const { parentPort } = require('worker_threads');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');

parentPort.on('message', targetUserId => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const compatibilityService = await serviceDiscovery.get('compatibility_service');
    const userRepository = await serviceDiscovery.get('user_repository');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      await compatibilityService.calculateInterestsCompatibility(targetUserId);
      await userRepository.setInterestsProcessedAt(targetUserId);

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  });
});
