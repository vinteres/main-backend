const { Worker } = require('worker_threads');
const path = require('path');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const { isConnected } = require('./services/ws_service');
const { currentTimeMs } = require('./utils');

const workerFile = path.resolve(__dirname + '/interest_calculation_worker.js');

const worker = new Worker(workerFile);

const SCHEDULE_TIME = 10 * 60 * 1000; // 10 min
const OFFLINE_JOB_SCHEDULE_TIME = 1 * 60 * 1000; // 5 min
const OFFLINE_TIME = 5 * 60 * 1000; // 5 min

const calculateInterestCompatibility = (userId) => worker.postMessage(userId);

const scheduleInterestCompatibilityCalculation = () => {
  setTimeout(() => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');

      const userIds = await compatibilityRepository.getScheduledInterestCalculations();
      userIds.forEach(userId => {
        calculateInterestCompatibility(userId);
      });
      await compatibilityRepository.deleteScheduledInterestCalculations(userIds);

      scheduleInterestCompatibilityCalculation();
    });
  }, SCHEDULE_TIME);
};

const scheduleOfflineSetJob = () => {
  setTimeout(() => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      const userIds = (await con.query('SELECT id FROM users WHERE last_online_at < $1 AND is_online = true', [currentTimeMs() - OFFLINE_TIME])).rows
        .map(({ id }) => id)
        .filter(id => !isConnected(id));

      if (userIds.length > 0) {
        await con.query(
          `UPDATE users SET last_online_at = $1, is_online = false WHERE id IN (${userIds.map((_, ix) => `$${2 + ix}`)})`,
          [currentTimeMs(), ...userIds]
        );
      }

      scheduleOfflineSetJob();
    });
  }, OFFLINE_JOB_SCHEDULE_TIME);
};

module.exports = {
  calculateInterestCompatibility,
  scheduleInterestCompatibilityCalculation,
  scheduleOfflineSetJob
};
