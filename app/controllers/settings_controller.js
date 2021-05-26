const { Controller } = require('./controller');
const { compareHash } = require('../utils');
const { hash } = require('../utils');
const SearchPereferenceValidator = require('../models/validators/search_pereference_validator');

class SettingsController extends Controller {
  async getSettings(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const {
      name, title, description, birthday, email, gender, interested_in,
      smoking, drinking, height, body, children_status, pet_status,
      employment_status, education_status
    } = await userRepository.getUserProfileById(loggedUserId);

    const accountSettings = {
      name,
      title,
      description,
      birthday,
      email,
      gender,
      interested_in
    };

    const profileSettings = {
      smoking,
      drinking,
      height,
      body,
      children_status,
      pet_status,
      employment_status,
      education_status
    };

    Object.keys(profileSettings).forEach(key => {
      if (!profileSettings[key]) profileSettings[key] = 'not_tell';
    });

    const settings = { accountSettings, profileSettings };

    res.json(settings);
  }

  async setAccountSettings(req, res) {
    const token = this.getAuthToken(req);
    const { name, title, description, birthday, email, gender, interested_in } = req.body;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const user = await userRepository.setAccountSettings(
      loggedUserId,
      { name, title, description, birthday, email, gender, interested_in }
    );

    res.json(user);
  }

  async setProfileSettings(req, res) {
    const token = this.getAuthToken(req);
    const payload = req.body;

    Object.keys(payload).forEach(key => {
      if ('not_tell' === payload[key]) payload[key] = null;
    });

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const user = await userRepository.setProfileSettings(loggedUserId, payload);

    res.json(user);
  }

  async changePassword(req, res) {
    const token = this.getAuthToken(req);
    const { password, newPassword } = req.body;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const passwordHash = await userRepository.getUserPasswordById(loggedUserId);

    const matches = await compareHash(password, passwordHash);
    if (!matches) {
      return res.status(400).end();
    }
    const newPasswordHash = await hash(newPassword);
    await userRepository.setPassword(loggedUserId, newPasswordHash);

    res.status(201).end();
  }

  async deactivate(req, res) {
    const token = this.getAuthToken(req);
    const { password } = req.body;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');
    const authService = await this.serviceDiscovery.get('auth_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const passwordHash = await userRepository.getUserPasswordById(loggedUserId);
    const matches = await compareHash(password, passwordHash);
    if (!matches) {
      return res.status(400).end();
    }
    await userRepository.setStatus(loggedUserId, 'deleted');
    await authService.removeAuthToken(token);

    res.status(201).end();
  }

  async setLocation(req, res) {
    const token = this.getAuthToken(req);
    const { locationId } = req.params;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userRepository.setCityId(loggedUserId, locationId);

    res.status(201).end();
  }

  async getSearchPreferences(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const searchPreferenceRepository = await this.serviceDiscovery.get('search_preference_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');
    const locationService = await this.serviceDiscovery.get('location_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const searchPreferences = await searchPreferenceRepository.getForUser(loggedUserId);
    const { looking_for_type } = await userRepository.findById(['looking_for_type'], loggedUserId);

    const location = await locationService.getLocationById(searchPreferences.city_id);

    return res.json({
      fromAge: searchPreferences.from_age,
      toAge: searchPreferences.to_age,
      lookingFor: looking_for_type || 0,
      location: {
        cityId: location.id,
        name: '',
        fullName: location.fullName
      }
    });
  }

  async setSearchPreferences(req, res) {
    const token = this.getAuthToken(req);
    const { fromAge, toAge, cityId, lookingFor } = req.body;

    const validator = new SearchPereferenceValidator({ fromAge, toAge, cityId });
    if (!validator.validate()) {
      return res.status(400).json(validator.errors);
    }

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const searchPreferenceRepository = await this.serviceDiscovery.get('search_preference_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    if (undefined !== lookingFor) {
      const userRepository = await this.serviceDiscovery.get('user_repository');
      await userRepository.update(loggedUserId, { looking_for_type: lookingFor });
    }

    await searchPreferenceRepository.setForUser(loggedUserId, { fromAge, toAge, cityId });

    res.status(201).end();
  }

  async setDescription(req, res) {
    const token = this.getAuthToken(req);
    const { description } = req.body;

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository');
    const userRepository = await this.serviceDiscovery.get('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    await userRepository.update(loggedUserId, { description });

    res.status(201).end();
  }
}

module.exports = SettingsController;
