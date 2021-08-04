const { error } = require('./app/core/logger');
const { SERVICE_NAME_DB_CLIENT } = require('./app/core/service_discovery');
const ServiceDiscoveryRepo = require('./app/core/service_discovery_repo');
const PageRepository = require('./app/repositories/page_repository');

const backfillInterests = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
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
      }
    } catch (e) {
      error(e);
    }

    console.log('DONE!');
  });
};

const sendMessageFromAdmin = (toUserId, text) => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const chatService = await serviceDiscovery.get('chat_service');
    const chatRepository = await serviceDiscovery.get('chat_repository');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      const adminPageId = PageRepository.getAppPageId();
      const chatId = await chatRepository.getCommonChatId(adminPageId, toUserId);

      await chatService.createAndSend({ userId: adminPageId, chatId, text });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

module.exports = {
  backfillInterests,
  sendMessageFromAdmin
};
