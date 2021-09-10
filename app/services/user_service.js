const { MAX_AGE, MIN_AGE } = require('../repositories/search_preference_repository');
const { hash } = require('../utils');

// const hasCompatibility = ({ compatibility }) => compatibility && 0 < compatibility;

class UserService {
  constructor(
    userRepository,
    viewRepository,
    searchPreferenceRepository,
    onboardingRepository,
    hobbieRepository,
    notificationService,
    locationService
  ) {
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

  async signUpWith({ name, email, accessToken }) {
    const user = await this.userRepository.createWithAccessToken({ email, name, accessToken });
    const onboarding = await this.onboardingRepository.create(user.id);

    return { user, onboarding };
  }

  async getUsers(page, searchingUser, searchPref) {
    const search = {
      gender: searchingUser.interested_in,
      interestedIn: searchingUser.gender,
      cityId: (typeof searchPref.cityId === 'string' && searchPref.cityId.trim() !== '') ? searchPref.cityId : '',
      fromAge: searchPref.fromAge < MIN_AGE ? MIN_AGE : searchPref.fromAge,
      toAge: searchPref.toAge > MAX_AGE ? MAX_AGE : searchPref.toAge,
      searchingUserId: searchingUser.id
    };

    const [users, totalCount] = await Promise.all([
      this.userRepository.searchUsers(page || 1, search, searchPref.order),
      this.userRepository.getUsersCount(search)
    ]);

    return { users, totalCount };
  }

  async view(viewerUserId, viewedUserId) {
    if (viewerUserId === viewedUserId) return;

    const exists = await this.viewRepository.find(viewerUserId, viewedUserId);
    if (exists) {
      await this.viewRepository.incrementView(viewerUserId, viewedUserId);
    } else {
      await Promise.all([
        this.viewRepository.create(viewerUserId, viewedUserId),
        this.notificationService.create(viewerUserId, viewedUserId, viewerUserId, 'view')
      ]);
    }
  }

  async setMutualInterestsAndUpdateCompatibility(userId, users) {
    if (!Array.isArray(users)) users = [users];
    if (0 === users.length) return;

    const [userHobbies, userActivities] = await Promise.all([
      this.hobbieRepository.getIdForUsers([userId, ...users.map(user => user.id)]),
      this.hobbieRepository.getActivitiesIdForUsers([userId, ...users.map(user => user.id)])
    ]);
    const loggedUserHobbies = userHobbies[userId] || [];
    const loggedUserActivities = userActivities[userId] || [];

    users.forEach(user => {
      const userItemHobbies = userHobbies[user.id] || [];
      const userItemActivities = userActivities[user.id] || [];

      user.mutual_hobbies_count = loggedUserHobbies.filter((n) => userItemHobbies.indexOf(n) !== -1).length;
      user.mutual_ativities_count = loggedUserActivities.filter((n) => userItemActivities.indexOf(n) !== -1).length;
    });

    // Experimental compatibility modification based on mutual interests.
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

  async setStatus(userId, status) {
    return await this.userRepository.setStatus(userId, status);
  }
}

module.exports = UserService;
