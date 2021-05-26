const MediaService = require('../services/media_service');
const { timeAgo } = require('../utils');

const item = (intro) => ({
  id: intro.id,
  liked_at: intro.liked_at,
  fromUserId: intro.from_user_id,
  timeAgo: timeAgo(intro.created_at),
  type: intro.type,
  message: intro.message,
  mediaPath: MediaService.mediaPath(intro.media_metadata_id)
});

module.exports = {
  item,
};
