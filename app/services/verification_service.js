const VerificationStatus = require("../models/enums/verification_status");

module.exports = class VerificationService {
  constructor(userRepository, verificationRequestRepository) {
    this.userRepository = userRepository;
    this.verificationRequestRepository = verificationRequestRepository;
  }

  async deleteForUser(userId) {
    return await this.verificationRequestRepository.deleteForUser(userId);
  }

  async updateStatusForUser(userId, status) {
    return await this.verificationRequestRepository.updateStatusForUser(userId, status);
  }

  async requestVerification(userId, imageId) {
    await Promise.all([
      this.userRepository.setVerificationStatus(userId, VerificationStatus.PENDING),
      this.verificationRequestRepository.create({
        userId,
        imageId,
        status: VerificationStatus.PENDING
      })
    ]);
  }
}
