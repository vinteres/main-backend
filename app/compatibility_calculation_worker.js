const { parentPort } = require('worker_threads');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');
const { currentTimeMs } = require('./utils');

const currentCalculations = {};

parentPort.on('message', userId => {
  if (currentCalculations[userId]) return;
  currentCalculations[userId] = true;

  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const quizService = await serviceDiscovery.get('quiz_service');
    const userRepository = await serviceDiscovery.get('user_repository');
    const compatibilityService = await serviceDiscovery.get('compatibility_service');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    const {
      deleted_at,
      compatibility_processed_at
    } = await userRepository.findById(
      'deleted_at compatibility_processed_at',
      userId
    );

    try {
      con.query('BEGIN');

      await quizService.backfillCompatibility(userId, {
        from: deleted_at > compatibility_processed_at ? deleted_at : compatibility_processed_at,
        to: currentTimeMs()
      });
      await Promise.all([
        userRepository.setCompatibilityProcessedAt(userId),
        compatibilityService.deleteScheduledCompatibilityCalculations([userId]),
        compatibilityService.scheduleForInterestCalculation(userId)
      ]);

      con.query('COMMIT');

      delete currentCalculations[userId];

      parentPort.postMessage(userId);
    } catch (e) {
      con.query('ROLLBACK');

      delete currentCalculations[userId];

      throw e;
    }
  });
});
