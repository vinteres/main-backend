const { Controller } = require("./controller")

class HobbieController extends Controller {
  async getAll(req, res) {
    const hobbieRepository = await this.serviceDiscovery.get('hobbie_repository')
    const hobbies = await hobbieRepository.findAll()

    res.json(hobbies)
  }

  async getAllActivities(req, res) {
    const hobbieRepository = await this.serviceDiscovery.get('hobbie_repository')
    const hobbies = await hobbieRepository.findAllActivities()

    res.json(hobbies)
  }

  async set(req, res) {
    const token = this.getAuthToken(req)
    const hobbies = req.body.hobbies

    const hobbieRepository = await this.serviceDiscovery.get('hobbie_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    hobbieRepository.deleteForUser(loggedUserId)
    hobbieRepository.setForUser(loggedUserId, hobbies)

    res.status(201).end()
  }

  async setActivities(req, res) {
    const token = this.getAuthToken(req)
    const activities = req.body.activities

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const hobbieRepository = await this.serviceDiscovery.get('hobbie_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    hobbieRepository.deleteActivitiesForUser(loggedUserId)
    hobbieRepository.setActivitiesForUser(loggedUserId, activities)

    res.status(201).end()
  }
}

module.exports = HobbieController
