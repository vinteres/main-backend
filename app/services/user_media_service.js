const MediaService = require('./media_service');

class UserMediaService {
  constructor(userRepository, mediaRepository) {
    this.userRepository = userRepository;
    this.mediaRepository = mediaRepository;
  }

  async deleteUserImage(userId, targetImageId, position) {
    if (1 == position) {
      const nextImage = await this.mediaRepository.getUserImage(userId, +position + 1);
      const imageId = nextImage ? nextImage.image_id : null;
      await this.userRepository.setUserProfileImage(userId, imageId);
    }
    await this.mediaRepository.deleteUserImage(userId, position);
    await this.mediaRepository.deleteMediaMetadata([targetImageId]);
    await this.mediaRepository.changeUserImagePosition(userId, position);

    await MediaService.deleteImages(targetImageId);
  }
}

module.exports = UserMediaService;
