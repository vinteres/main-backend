const UserRepository = require('../repositories/user_repository');
const { Controller } = require('./controller');
const MediaService = require('../services/media_service');
const { item } = require('../data_builders/intro_builder');
const SignUpValidator = require('../models/validators/sign_up_validator');
const { isConnected } = require('../services/ws_service');

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
      reported
    ] = await Promise.all([
      mediaRepository.getUserImages(userId),
      locationService.getLocationById(user.city_id),
      hobbieService.getCustomHobbiesForUser(userId),
      hobbieService.getCustomActivitiesForUser(userId),
      hobbieService.getForUser(userId),
      hobbieService.getActivitiesForUser(userId),
      reportRepository.isReported(loggedUserId, user.id)
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

    user.interests = interests;
    user.activities = activities;
    user.reported = reported;

    user.profile_image = MediaService.getProfileImagePath(user);
    user.online = !!isConnected(user.id);

    if (loggedUserId !== userId && 'uncompatible' !== user.relation_status) {
      const [compatibility] = await Promise.all([
        quizService.getCompatibilityFor(loggedUserId, userId),
        userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, user)
      ])
      user.compatibility = compatibility;
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

  async getUsers(req, res) {
    const token = this.getAuthToken(req);
    const page = req.query.page;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userService = await this.getService('user_service');
    const userRepository = await this.getService('user_repository');
    const quizService = await this.getService('quiz_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const loggedUser = await userRepository.getUserById(loggedUserId);
    const { users, totalCount } = await userService.getUsers(page, loggedUser);

    const [compatibilities] = await Promise.all([
      quizService.getCompatibilityForUsers(loggedUserId, users.map(user => user.id)),
      userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, users)
    ]);

    const compatibilityMap = {};
    compatibilities.forEach(item => {
      const tId = item.user_one_id === loggedUserId ? item.user_two_id : item.user_one_id;
      compatibilityMap[tId] = item.percent;
    });

    users.forEach(user => {
      user.profile_image = MediaService.getProfileImagePath(user);
      user.compatibility = compatibilityMap[user.id];
    });

    users.forEach(user => {
      user.online = !!isConnected(user.id);
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

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const userIds = await matchService.matchIds(loggedUserId);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verified'
    ], userIds);

    users.forEach(user => {
      user.online = !!isConnected(user.id);
    });

    res.json(users.map(user => {
      user.profile_image = MediaService.getProfileImagePath(user);

      return user;
    }));
  }

  async getViewers(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const viewsRepository = await this.getService('views_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const viewers = await viewsRepository.findFor(loggedUserId);
    const viewerIds = viewers.map(viewer => viewer.viewer_user_id);
    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verified'
    ], viewerIds);

    users.forEach(user => {
      user.online = !!isConnected(user.id);
    });

    res.json(viewerIds.map(viewerId => {
      const user = users.find(u => u.id === viewerId);
      user.profile_image = MediaService.getProfileImagePath(user);

      return user;
    }));
  }

  async getCompatibilities(req, res) {
    const token = this.getAuthToken(req);

    const quizService = await this.getService('quiz_service');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');
    const userService = await this.getService('user_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const compatibilities = await quizService.getHighCompatibilitiesForUser(loggedUserId);
    const compatibilityMap = {};
    compatibilities.forEach(item => {
      const tId = item.user_one_id === loggedUserId ? item.user_two_id : item.user_one_id;
      compatibilityMap[tId] = item.percent;
    });

    const users = await userRepository.findByIds([
      'id', 'name', 'age', 'gender', 'city_id', 'profile_image_id', 'verified'
    ], Object.keys(compatibilityMap));

    users.forEach(user => {
      user.profile_image = MediaService.getProfileImagePath(user);
      user.compatibility = compatibilityMap[user.id];
    });

    users.forEach(user => {
      user.online = !!isConnected(user.id);
    });

    await userService.setMutualInterestsAndUpdateCompatibility(loggedUserId, users);
    await userService.setLocations(users);

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
    const token = await authService.createAuthTokenForUser(result.user.id, false);
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
