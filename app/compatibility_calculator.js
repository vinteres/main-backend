const { Worker } = require('worker_threads');
const path = require('path');
const { calculateInterestCompatibility } = require('./interest_compatibility_calculator');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');

const workerFile = path.resolve(__dirname + '/compatibility_calculation_worker.js');

const worker = new Worker(workerFile);

const TEN_MIN = 10 * 60 * 1000; // 10 min

worker.on('message', (userId) => {
  calculateInterestCompatibility(userId);
});

const calculateCompatibility = (userId) => worker.postMessage(userId);

const scheduleCompatibilityCalculation = () => {
  setTimeout(() => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      let userIds = await compatibilityRepository.getScheduledCompatibilityCalculations();
      if (userIds.length > 0) {
        const res = (await con.query(
          `SELECT id, compatibility_processed_at FROM users WHERE id IN (${userIds.map((_, ix) => `$${1 + ix}`).join(', ')})`,
          userIds
        )).rows;

        const compatibilityProcessedAt = {};
        res.forEach(({ id, compatibility_processed_at }) => {
          compatibilityProcessedAt[id] = compatibility_processed_at;
        });
        userIds = userIds.filter(id => !compatibilityProcessedAt[id]);
      }
      userIds.forEach(userId => calculateCompatibility(userId));

      scheduleCompatibilityCalculation();
    });
  }, TEN_MIN);
};

module.exports = {
  calculateCompatibility,
  scheduleCompatibilityCalculation
};
