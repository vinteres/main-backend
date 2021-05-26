class HobbieService {
  constructor(hobbieRepository) {
    this.hobbieRepository = hobbieRepository;
  }

  async getForUser(userId) {
    return await this.hobbieRepository.getForUser(userId);
  }

  async getActivitiesForUser(userId) {
    return await this.hobbieRepository.getActivitiesForUser(userId);
  }

  async setUserHobbies(userId, hobbies) {
    if (!hobbies) return;

    await this.hobbieRepository.deleteForUser(userId);
    await this.hobbieRepository.setForUser(userId, hobbies);
  }
}

module.exports = HobbieService;
