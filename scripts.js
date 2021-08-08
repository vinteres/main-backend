const { error } = require('./app/core/logger');
const { SERVICE_NAME_DB_CLIENT } = require('./app/core/service_discovery');
const ServiceDiscoveryRepo = require('./app/core/service_discovery_repo');
const PageRepository = require('./app/repositories/page_repository');
const MediaService = require('./app/services/media_service');
const { currentTimeMs } = require('./app/utils');

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

const resetSearchPrefAges = (toUserId, text) => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      await con.query('UPDATE search_preferences SET from_age = NULL, to_age = NULL');

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

const backfillOnlineState = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    try {
      con.query('BEGIN');

      let c = 0;
      const now = currentTimeMs();

      const userIds = (await con.query('SELECT id FROM users WHERE last_online_at IS NULL ORDER BY created_at ASC')).rows.map(({ id }) => id);

      for (const id of userIds) {
        await con.query('UPDATE users SET last_online_at = $1, is_online = false WHERE id = $2', [now + c++, id]);
      }

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      console.error(e);

      throw e;
    }
  });
};

const validateProfileImages = () => {
  ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
    const userMediaService = await this.getService('user_media_service');
    const con = await serviceDiscovery.get(SERVICE_NAME_DB_CLIENT);

    const resp = (await con.query('SELECT id, profile_image_id FROM users WHERE profile_image_id IS NOT NULL')).rows.map(({ id }) => id);

    for (const { id, profile_image_id } of resp) {
      const valid = await MediaService.validateImage(
        MediaService.createImageName(
          MediaService.SIZE_BIG,
          profile_image_id
        )
      );

      console.log(`userId: ${id}\nprofileImageId: ${profile_image_id}\nvalid: ${valid}`);

      if (valid) continue;

      try {
        con.query('BEGIN');

        await userMediaService.deleteUserImage(id, profile_image_id, 1);

        con.query('COMMIT');
      } catch (e) {
        con.query('ROLLBACK');

        console.error(e);
      }
    }
  });
};

module.exports = {
  backfillInterests,
  sendMessageFromAdmin,
  resetSearchPrefAges,
  backfillOnlineState,
  validateProfileImages
};
