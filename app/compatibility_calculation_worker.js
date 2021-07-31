const { parentPort } = require('worker_threads');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');

parentPort.on('message', userId => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const quizService = await serviceDiscovery.get('quiz_service');
    const userRepository = await serviceDiscovery.get('user_repository');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      await quizService.backfillCompatibility(userId);
      await userRepository.setCompatibilityProcessedAt(userId);

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  });
});
