const { hash } = require('../utils');

const hasCompatibility = ({ compatibility }) => compatibility && 0 < compatibility;

class UserService {
  constructor(userRepository, viewRepository, searchPreferenceRepository, onboardingRepository, hobbieRepository, notificationService, locationService) {
    this.viewRepository = viewRepository;
    this.userRepository = userRepository;
    this.onboardingRepository = onboardingRepository;
    this.searchPreferenceRepository = searchPreferenceRepository;
    this.notificationService = notificationService;
    this.hobbieRepository = hobbieRepository;
    this.locationService = locationService;
  }

  async signUp({ email, password }) {
    password = await hash(password);
    const user = await this.userRepository.create({ email, password });
    const onboarding = await this.onboardingRepository.create(user.id);

    return { user, onboarding };
  }

  async getUsers(page, searchingUser) {
    const searchPreferences = await this.searchPreferenceRepository.getForUser(searchingUser.id);
    const search = {
      gender: searchingUser.interested_in,
      interestedIn: searchingUser.gender,
      cityId: searchPreferences.city_id,
      fromAge: searchPreferences.from_age,
      toAge: searchPreferences.to_age,
      searchingUserId: searchingUser.id
    };

    const users = await this.userRepository.searchUsers(page || 1, search);
    const totalCount = await this.userRepository.getUsersCount(search);

    return { users, totalCount };
  }

  async view(viewerUserId, viewedUserId) {
    if (viewerUserId === viewedUserId) return;

    const exists = await this.viewRepository.find(viewerUserId, viewedUserId);
    if (exists) {
      await this.viewRepository.incrementView(viewerUserId, viewedUserId);
    } else {
      await this.viewRepository.create(viewerUserId, viewedUserId);

      await this.notificationService.create(viewerUserId, viewedUserId, viewerUserId, 'view');
    }
  }

  async setMutualInterestsAndUpdateCompatibility(userId, users) {
    if (!Array.isArray(users)) users = [users];
    if (0 === users.length) return;

    const userHobbies = await this.hobbieRepository.getIdForUsers([userId, ...users.map(user => user.id)]);
    const userActivities = await this.hobbieRepository.getActivitiesIdForUsers([userId, ...users.map(user => user.id)]);
    const loggedUserHobbies = userHobbies[userId] || [];
    const loggedUserActivities = userActivities[userId] || [];

    users.forEach(user => {
      const userItemHobbies = userHobbies[user.id] || [];
      const userItemActivities = userActivities[user.id] || [];

      user.mutual_hobbies_count = loggedUserHobbies.filter((n) => userItemHobbies.indexOf(n) !== -1).length;
      user.mutual_ativities_count = loggedUserActivities.filter((n) => userItemActivities.indexOf(n) !== -1).length;
    });

    // users.forEach(user => {
    //   const userItemHobbies = userHobbies[user.id] || []
    //   const userItemActivities = userActivities[user.id] || []

    //   if (!hasCompatibility(user)) return;

    //   if (0 < loggedUserHobbies.length || 0 < userItemHobbies.length) {
    //     const hobbiesPercentageMatch = user.mutual_hobbies_count > 0 ?
    //     Math.trunc((
    //       Math.min(user.mutual_hobbies_count, userItemHobbies.length) /
    //       Math.max(user.mutual_hobbies_count, userItemHobbies.length)
    //     ) * 100) :
    //     0;

    //     user.compatibility = Math.ceil((user.compatibility + hobbiesPercentageMatch) / 2);
    //   }
    //   if (0 < loggedUserActivities.length || 0 < userItemActivities.length) {
    //     const activitiesPercentageMatch = user.mutual_ativities_count ?
    //     Math.trunc((
    //       Math.min(user.mutual_ativities_count, userItemActivities.length) /
    //       Math.max(user.mutual_ativities_count, userItemActivities.length)
    //     ) * 100) :
    //     0;

    //     user.compatibility = Math.ceil((user.compatibility + activitiesPercentageMatch) / 2);
    //   }

    //   if (user.compatibility > 100) user.compatibility = 100;
    // });
  }

  async setLocations(users) {
    const cityIds = new Set();
    users.forEach(user => {
      cityIds.add(user.city_id);
    });

    const cities = await this.locationService.getCitiesById([...cityIds]);

    users.forEach(user => {
      const city = cities.find(c => c.id === user.city_id);
      user.from = city.name;
    });
  }
}

module.exports = UserService;
