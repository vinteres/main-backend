const { parentPort } = require('worker_threads');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');

const currentCalculations = {};

parentPort.on('message', targetUserId => {
  if (currentCalculations[targetUserId]) return;
  currentCalculations[targetUserId] = true;

  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const compatibilityService = await serviceDiscovery.get('compatibility_service');
    const userRepository = await serviceDiscovery.get('user_repository');
    const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      await compatibilityService.calculateInterestsCompatibility(targetUserId);
      await Promise.all([
        userRepository.setInterestsProcessedAt(targetUserId),
        compatibilityRepository.deleteScheduledInterestCalculations([targetUserId])
      ]);

      con.query('COMMIT');

      delete currentCalculations[targetUserId];
    } catch (e) {
      con.query('ROLLBACK');

      delete currentCalculations[targetUserId];

      throw e;
    }
  });
});
