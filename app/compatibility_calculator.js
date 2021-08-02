const { Worker } = require('worker_threads');
const path = require('path');
const { calculateInterestCompatibility } = require('./interest_compatibility_calculator');

const workerFile = path.resolve(__dirname + '/compatibility_calculation_worker.js');

const worker = new Worker(workerFile);

worker.on('message', (userId) => {
  calculateInterestCompatibility(userId);
});

const calculateCompatibility = (userId) => worker.postMessage(userId);

module.exports = { calculateCompatibility };
