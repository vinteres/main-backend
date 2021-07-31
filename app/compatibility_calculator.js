const { Worker } = require('worker_threads');
const path = require('path');

const workerFile = path.resolve(__dirname + '/compatibility_calculation_worker.js');

const worker = new Worker(workerFile);

const calculateCompatibility = (userId) => worker.postMessage(userId);

module.exports = { calculateCompatibility };
