const { Worker } = require('worker_threads');
const path = require('path');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');

const workerFile = path.resolve(__dirname + '/interest_calculation_worker.js');

const worker = new Worker(workerFile);

const SCHEDULE_TIME = 10 * 60 * 1000; // 10 min

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

module.exports = {
  calculateInterestCompatibility,
  scheduleInterestCompatibilityCalculation
};
