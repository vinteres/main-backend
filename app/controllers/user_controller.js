const UserRepository = require('../repositories/user_repository');
const { Controller } = require('../core/controller');
const MediaService = require('../services/media_service');
const { item } = require('../data_builders/intro_builder');
const SignUpValidator = require('../models/validators/sign_up_validator');
const { isConnected, send } = require('../services/ws_service');
const { MAX_AGE, MIN_AGE } = require('../repositories/search_preference_repository');
const { SEE_VISITS, SEE_MATCHES } = require('../models/enums/ws_message_type');

class UserController extends Controller {
  async get(req, res) {
    const token = this.getAuthToken(req);
    const userId = req.params.id;

    const quizService = await this.getService('quiz_service');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const userService = await this.getService('user_service');
    const hobbieService = await this.getService('hobbie_service');
    const mediaRepository = await this.getService('media_repository');
    const introRepository = await this.getService('intro_repository');
    const introService = await this.getService('intro_service');
    const reportRepository = await this.getService('report_repository');
    const locationService = await this.getService('location_service');
    const compatibilityRepository = await this.getService('compatibility_repository');
    const searchPreferenceRepository = await this.getService('search_preference_repository');

    const [loggedUserId, user] = await Promise.all([
      sessionTokenRepository.getUserId(token),
      userRepository.getUserProfileById(userId)
    ]);

    if (!user) return res.status(404).end();

    const [
      images,
      location,
      customHobbies,
      customActivities,
      interests,
      activities,
      reported,
      searchPreferences
    ] = await Promise.all([
      mediaRepository.getUserImages(userId),
      locationService.getLocationById(user.city_id),
      hobbieService.getCustomHobbiesForUser(userId),
      hobbieService.getCustomActivitiesForUser(userId),
      hobbieService.getForUser(userId),
      hobbieService.getActivitiesForUser(userId),
      reportRepository.isReported(loggedUserId, user.id),
      searchPreferenceRepository.getForUser(userId),
    ]);
    user.location = location;
    user.images = MediaService.mapImages(images);

    if (loggedUserId !== userId) {
      user.relation_status = await introService.relationBetween(loggedUserId, userId);
      if ('intro_to_me' === user.relation_status) {
        const intro = await introRepository.getIntroFor(loggedUserId, userId);
        user.intro = item(intro);
      } else if (!user.relation_status) {
        const loggedUser = await userRepository.getUserInfoById(loggedUserId);

        if (loggedUser.gender !== user.interested_in || loggedUser.interested_in !== user.gender) {
          user.relation_status = 'uncompatible';
        }
      }
    }

    user.searchPreferences = {
      ageRangeSet: Boolean(searchPreferences.from_age && searchPreferences.from_age),
      fromAge: searchPreferences.from_age,
      toAge: searchPreferences.to_age,
      income: searchPreferences.income
    };

    user.interests = interests;
    user.activities = activities.map(activity => ({ ...activity, favorite: !!activity.favorite }));
    user.reported = reported;

    user.profile_image = MediaService.getProfileImagePath(user);

    user.showImage = true;

    if (loggedUserId !== userId && 'uncompatible' !== user.relation_status) {
      const [
        compatibility,
        interestCompatibility
      ] = await Promise.all([
        quizService.getCompatibilityFor(loggedUserId, userId),
        compatibilityRepository.findInterestCompatibility(loggedUserId, userId),
        userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, user)
      ])
      user.compatibility = compatibility;
      user.interestCompatibility = interestCompatibility?.percent;
    }

    user.interests.push(...customHobbies.map(hobbie => {
      hobbie.custom = true;

      return hobbie;
    }));

    user.activities.push(...customActivities.map(activity => {
      activity.custom = true;

      return activity;
    }));

    userService.view(loggedUserId, userId);

    res.json(user);
  }

  async hasProfileImage(req, res) {
    const token = this.getAuthToken(req);

    const userRepository = await this.getService('user_repository');
    const sessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { profile_image_id } = await userRepository.findById('profile_image_id', loggedUserId);

    res.json({
      hasProfileImage: !!profile_image_id
    });
  }

  async getUsers(req, res) {
    const token = this.getAuthToken(req);
    const page = req.query.page;
    const fromAge = req.query.fromAge;
    const toAge = req.query.toAge;
    const cityId = req.query.cityId;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userService = await this.getService('user_service');
    const userRepository = await this.getService('user_repository');
    const quizService = await this.getService('quiz_service');
    const compatibilityRepository = await this.getService('compatibility_repository');
    const locationService = await this.getService('location_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const loggedUser = await userRepository.getUserById(loggedUserId);
    const { users, totalCount } = await userService.getUsers(page, loggedUser, {
      fromAge, toAge, cityId
    });

    const cityIds = Array.from(new Set(users.map(({ city_id }) => city_id)));
    const userIds = users.map(({ id }) => id);
    const [
      compatibilities,
      interestCompatibilities,
      cities
    ] = await Promise.all([
      quizService.getCompatibilityForUsers(loggedUserId, userIds),
      compatibilityRepository.findInterestCompatibilities(loggedUserId, userIds),
      locationService.getCitiesById(cityIds, false),
      userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, users)
    ]);

    const compatibilityMap = {};
    compatibilities.forEach(({ user_one_id, user_two_id, percent }) => {
      const tId = user_one_id === loggedUserId ? user_two_id : user_one_id;
      compatibilityMap[tId] = percent;
    });

    const interestCompatibilityMap = {};
    interestCompatibilities.forEach(({ user_one_id, user_two_id, percent }) => {
      const tId = user_one_id === loggedUserId ? user_two_id : user_one_id;
      interestCompatibilityMap[tId] = percent;
    });

    users.forEach(user => {
      const city = cities.find(c => c.id === user.city_id);
      user.from = city.name;
    });

    users.forEach(user => {
      user.profile_image = MediaService.getProfileImagePath(user);
      user.compatibility = compatibilityMap[user.id];
      user.interestCompatibility = interestCompatibilityMap[user.id];

      user.showImage = true;
      user.showProfileLink = true;
    });

    const responseData = {
      users,
      totalPages: Math.ceil(totalCount / UserRepository.usersPerPage())
    };

    res.json(responseData);
  }

  async getMatches(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const matchService = await this.getService('match_service');
    const notificationRepository = await this.getService('notification_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const userIds = await matchService.matchIds(loggedUserId);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status', 'is_online'
    ], userIds);

    await notificationRepository.seeNotifs(loggedUserId, ['matched', 'intro_like']);
    send(loggedUserId, { type: SEE_MATCHES });

    res.json(users.map(user => {
      user.profile_image = MediaService.getProfileImagePath(user);

      user.showImage = true;
      user.showProfileLink = true;

      return user;
    }));
  }

  async getViewers(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const viewsRepository = await this.getService('views_repository');
    const notificationRepository = await this.getService('notification_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const viewers = await viewsRepository.findFor(loggedUserId);
    const viewerIds = viewers.map(viewer => viewer.viewer_user_id);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status', 'is_online'
    ], viewerIds);

    await notificationRepository.seeNotifs(loggedUserId, 'view');
    send(loggedUserId, { type: SEE_VISITS });

    res.json(viewerIds.map(viewerId => {
      const user = users.find(u => u.id === viewerId);
      if (!user) return null;

      user.profile_image = MediaService.getProfileImagePath(user);

      user.showImage = true;
      user.showProfileLink = true;

      return user;
    }).filter(user => user));
  }

  async getCompatibilities(req, res) {
    const token = this.getAuthToken(req);

    const quizService = await this.getService('quiz_service');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const compatibilityRepository = await this.getService('compatibility_repository');
    const userRepository = await this.getService('user_repository');
    const userService = await this.getService('user_service');
    const searchPreferenceRepository = await this.getService('search_preference_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const [
      compatibilities,
      interestCompatibilities,
      { from_age, to_age }
    ] = await Promise.all([
      quizService.getHighCompatibilitiesForUser(loggedUserId),
      compatibilityRepository.findInterestCompatibilitiesForUser(loggedUserId),
      searchPreferenceRepository.getForUser(loggedUserId)
    ]);
    const compatibilityMap = {};
    compatibilities.forEach(({ user_one_id, user_two_id, percent }) => {
      const tId = user_one_id === loggedUserId ? user_two_id : user_one_id;
      compatibilityMap[tId] = percent;
    });

    const interestCompatibilityMap = {};
    interestCompatibilities.forEach(({ user_one_id, user_two_id, percent }) => {
      const tId = user_one_id === loggedUserId ? user_two_id : user_one_id;
      interestCompatibilityMap[tId] = percent;
    });

    const users = (await userRepository.findByIds(
      [
        'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verification_status', 'is_online'
      ],
      Object.keys(compatibilityMap)
    )).filter(({ age }) => (to_age ?? MAX_AGE) >= age && (from_age ?? MIN_AGE) <= age);

    users.forEach(user => {
      user.profile_image = MediaService.getProfileImagePath(user);
      user.compatibility = compatibilityMap[user.id];
      user.interestCompatibility = interestCompatibilityMap[user.id];

      user.showImage = true;
      user.showProfileLink = true;
    });

    await Promise.all([
      userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, users),
      userService.setLocations(users)
    ]);

    res.json(users);
  }

  async getCompatibilityCount(req, res) {
    const token = this.getAuthToken(req);

    const quizService = await this.getService('quiz_service');
    const sessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const compatibilityCount = await quizService.getHighCompatibilityCountForUser(loggedUserId);

    res.json({ compatibilityCount });
  }

  async report(req, res) {
    const token = this.getAuthToken(req);
    const { type, details, toUserId } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const reportRepository = await this.getService('report_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await reportRepository.createReport({ fromUserId: loggedUserId, toUserId, type, details });

    res.status(201).end();
  }

  async feedback(req, res) {
    const token = this.getAuthToken(req);
    const { type, details } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const reportRepository = await this.getService('report_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await reportRepository.createFeedback({ userId: loggedUserId, type, details });

    res.status(201).end();
  }

  async signUp(req, res) {
    const { email, password } = req.body;

    const validator = new SignUpValidator({ email, password });
    if (!validator.validate()) {
      return res.status(400).json(validator.errors);
    }

    const userService = await this.getService('user_service');
    const authService = await this.getService('auth_service');

    const result = await userService.signUp({ email, password });
    const token = await authService.createAuthTokenForUser(
      result.user.id,
      false,
      this.isFromMobile(req),
      this.isFromCordova(req)
    );
    result.user.token = token;

    res.json(result);
  }

  async emailExists(req, res) {
    const { email } = req.query;

    const userRepository = await this.getService('user_repository');
    const exists = await userRepository.emailExists(email);

    if (exists) return res.json({ exists });

    res.status(201).end();
  }
}

module.exports = UserController;
