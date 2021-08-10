const VerificationStatus = require('../models/enums/verification_status');
const MediaService = require('./media_service');

class UserMediaService {
  constructor(userRepository, mediaRepository, verificationService) {
    this.userRepository = userRepository;
    this.mediaRepository = mediaRepository;
    this.verificationService = verificationService;
  }

  async deleteUserImage(userId, targetImageId, position) {
    if (1 == position) {
      const nextImage = await this.mediaRepository.getUserImage(userId, +position + 1);
      const imageId = nextImage ? nextImage.image_id : null;
      await Promise.all([
        this.userRepository.setUserProfileImage(userId, imageId),
        this.scheduleForVerification(userId, imageId)
      ]);
    }
    await Promise.all([
      this.mediaRepository.deleteUserImage(userId, position),
      this.mediaRepository.deleteMediaMetadata([targetImageId])
    ]);
    await this.mediaRepository.changeUserImagePosition(userId, position);

    await MediaService.deleteImages(targetImageId);
  }

  async scheduleForVerification(userId, profileImageId) {
    const { verification_status } = await this.userRepository.findById('verification_status', userId);
    if (verification_status !== VerificationStatus.VERIFIED) return;

    if (!profileImageId) {
      await Promise.all([
        this.userRepository.setVerificationStatus(userId, VerificationStatus.REJECTED),
        this.verificationService.deleteForUser(userId)
      ]);

      return;
    }

    await Promise.all([
      this.userRepository.setVerificationStatus(userId, VerificationStatus.PENDING),
      this.verificationService.updateStatusForUser(userId, VerificationStatus.PENDING)
    ]);
  }
}

module.exports = UserMediaService;
