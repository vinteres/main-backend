const { Controller } = require('../core/controller');

class HobbieController extends Controller {
  async getAll(req, res) {
    const hobbieRepository = await this.getService('hobbie_repository');
    const hobbies = await hobbieRepository.findAll();

    res.json(hobbies);
  }

  async getAllActivities(req, res) {
    const hobbieRepository = await this.getService('hobbie_repository');
    const hobbies = await hobbieRepository.findAllActivities();

    res.json(hobbies);
  }

  async set(req, res) {
    const token = this.getAuthToken(req);
    const hobbies = req.body.hobbies;

    const hobbieRepository = await this.getService('hobbie_repository');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const compatibilityService = await this.getService('compatibility_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      await Promise.all([
        hobbieRepository.deleteForUser(loggedUserId),
        hobbieRepository.deleteCustomHobbiesForUser(loggedUserId)
      ]);
      await Promise.all([
        hobbieRepository.setForUser(loggedUserId, hobbies.filter(hobbie => !hobbie.custom)),
        hobbieRepository.setCustomHobbiesForUser(loggedUserId, hobbies.filter(hobbie => hobbie.custom))
      ]);

      await compatibilityService.scheduleForInterestCalculation(loggedUserId);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setActivities(req, res) {
    const token = this.getAuthToken(req);
    const activities = req.body.activities;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const hobbieRepository = await this.getService('hobbie_repository');
    const compatibilityService = await this.getService('compatibility_service');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      await Promise.all([
        hobbieRepository.deleteActivitiesForUser(loggedUserId),
        hobbieRepository.deleteCustomActivitiesForUser(loggedUserId),
      ]);
      await Promise.all([
        hobbieRepository.setActivitiesForUser(loggedUserId, activities.filter(activity => !activity.custom)),
        hobbieRepository.setCustomActivitiesForUser(loggedUserId, activities.filter(activity => activity.custom))
      ]);

      await compatibilityService.scheduleForInterestCalculation(loggedUserId);

      con.query('COMMIT');

      res.status(201).end();
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}

module.exports = HobbieController;
