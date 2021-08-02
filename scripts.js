const { error } = require('./app/core/logger');
const { SERVICE_NAME_DB_CLIENT } = require('./app/core/service_discovery');

module.exports.backfillInterests = () => {
  require('./app/core/service_discovery_repo').handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    try {
      const compatibilityRepository = await serviceDiscovery.get('compatibility_repository');
      const compatibilityService = await serviceDiscovery.get('compatibility_service');
      const userRepository = await serviceDiscovery.get('user_repository');
      const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

      const users = (await con.query(`select id from users where user_status = 'active'`)).rows?.map(({ id }) => id) ?? [];

      for (const userId of users) {
        try {
          con.query('BEGIN');

          await compatibilityService.calculateInterestsCompatibility(userId);
          await userRepository.setInterestsProcessedAt(userId);

          con.query('COMMIT');
        } catch (e) {
          con.query('ROLLBACK');

          throw e;
        }
      };
    } catch (e) {
      error(e);
    }

    console.log('DONE!');
  });
};
