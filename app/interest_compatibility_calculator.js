const { Worker } = require('worker_threads');
const path = require('path');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');
const { SERVICE_NAME_DB_CLIENT } = require('./core/service_discovery');
const { isConnected } = require('./services/ws_service');
const { currentTimeMs, isProd } = require('./utils');
const MediaService = require('./services/media_service');
const { compareFaces } = require('./services/img_recognition_service');
const { error } = require('./core/logger');
const VerificationStatus = require('./models/enums/verification_status');

const workerFile = path.resolve(__dirname + '/interest_calculation_worker.js');

const worker = new Worker(workerFile);

const TEN_MIN = 10 * 60 * 1000; // 10 min
const OFFLINE_JOB_SCHEDULE_TIME = 5 * 60 * 1000; // 5 min
const OFFLINE_TIME = 2 * 60 * 1000; // 2 min

const calculateInterestCompatibility = (userId) => worker.postMessage(userId);

const scheduleInterestCompatibilityCalculation = () => {
  setTimeout(() => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      let userIds = await compatibilityRepository.getScheduledInterestCalculations();
      if (userIds.length > 0) {
        const res = (await con.query(
          `SELECT id, compatibility_processed_at, interests_processed_at FROM users WHERE id IN (${userIds.map((_, ix) => `$${1 + ix}`).join(', ')})`,
          userIds
        )).rows;

        userIds = userIds.filter(uId => res.find(({ id }) => uId === id).compatibility_processed_at);
      }
      userIds.forEach(userId => calculateInterestCompatibility(userId));

      scheduleInterestCompatibilityCalculation();
    });
  }, TEN_MIN);
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

const scheduleVerificationJob = () => {
  setTimeout(() => {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      const verificationRequests = (await con.query(
        `SELECT user_id, image_id FROM verification_requests WHERE status = $1 ORDER BY created_at ASC LIMIT 20`,
        [VerificationStatus.PENDING]
      )).rows;

      if (verificationRequests.length === 0) return;

      const userProfileImages = {};
      (await con.query(
        `SELECT id, profile_image_id FROM users WHERE id IN (${verificationRequests.map((_, ix) => `$${1 + ix}`).join(', ')})`,
        verificationRequests.map(({ user_id }) => user_id)
      )).rows
        .filter(({ profile_image_id }) => profile_image_id)
        .forEach(({ id, profile_image_id }) => {
          userProfileImages[id] = profile_image_id;
        });

      const compares = [];
      for (const { user_id, image_id } of verificationRequests) {
        if (!userProfileImages[user_id]) {
          compares.push(
            Promise.resolve({ match: false, user_id, image_id })
          );

          continue;
        }
        const profileImageName = MediaService.createImageName(
          MediaService.SIZE_BIG,
          userProfileImages[user_id]
        );

        compares.push(
          (isProd() ? compareFaces(profileImageName, image_id) : Promise.resolve(true))
            .then(match => ({ match, user_id, image_id }))
            .catch((e) => {
              error(e);

              return { match: false, user_id, image_id };
            })
        );
      }

      const reject = [];
      const accept = [];

      for (const { match, user_id, image_id } of (await Promise.all(compares))) {
        if (match) {
          accept.push({ user_id, image_id });
        } else {
          reject.push({ user_id, image_id });
        }
      }

      try {
        con.query('BEGIN');

        const queries = [];
        if (accept.length > 0) {
          queries.push(
            con.query(
              `UPDATE users SET verification_status = $1 WHERE id IN (${accept.map((_, ix) => `$${2 + ix}`).join(', ')})`,
              [VerificationStatus.VERIFIED, ...accept.map(({ user_id }) => user_id)]
            ),
            con.query(
              `UPDATE verification_requests SET status = $1 WHERE user_id IN (${accept.map((_, ix) => `$${2 + ix}`).join(', ')})`,
              [VerificationStatus.VERIFIED, ...accept.map(({ user_id }) => user_id)]
            )
          );
        }
        if (reject.length > 0) {
          queries.push(
            con.query(
              `UPDATE users SET verification_status = $1 WHERE id IN (${reject.map((_, ix) => `$${2 + ix}`).join(', ')})`,
              [VerificationStatus.REJECTED, ...reject.map(({ user_id }) => user_id)]
            ),
            con.query(
              `DELETE FROM verification_requests WHERE user_id IN (${reject.map((_, ix) => `$${1 + ix}`).join(', ')})`,
              reject.map(({ user_id }) => user_id)
            )
          );
        }

        await Promise.all(queries);

        if (reject.length > 0) {
          await MediaService.deleteImages(reject.map(({ image_id }) => image_id));
        }

        con.query('COMMIT');
      } catch (e) {
        con.query('ROLLBACK');

        error(e);
      }

      scheduleVerificationJob();
    });

  }, TEN_MIN);
};

module.exports = {
  calculateInterestCompatibility,
  scheduleInterestCompatibilityCalculation,
  scheduleOfflineSetJob,
  scheduleVerificationJob
};
