const { hash } = require("../utils")

class UserService {
  constructor(userRepository, viewRepository, searchPreferenceRepository, onboardingRepository, hobbieRepository, notificationService, locationService) {
    this.viewRepository = viewRepository
    this.userRepository = userRepository
    this.onboardingRepository = onboardingRepository
    this.searchPreferenceRepository = searchPreferenceRepository
    this.notificationService = notificationService
    this.hobbieRepository = hobbieRepository
    this.locationService = locationService
  }

  async signUp({ email, name, password }) {
    password = await hash(password)
    const user = await this.userRepository.create({ email, name, password })
    const onboarding = await this.onboardingRepository.create(user.id)

    return { user, onboarding }
  }

  async getUsers(page, searchingUser) {
    const searchPreferences = await this.searchPreferenceRepository.getForUser(searchingUser.id)
    const search = {
      gender: searchingUser.interested_in,
      interestedIn: searchingUser.gender,
      cityId: searchPreferences.city_id,
      fromAge: searchPreferences.from_age,
      toAge: searchPreferences.to_age,
    }

    const users = await this.userRepository.searchUsers(page || 1, search)
    const totalCount = await this.userRepository.getUsersCount(search)

    return { users, totalCount }
  }

  async view(viewerUserId, viewedUserId) {
    if (viewerUserId === viewedUserId) return

    const exists = await this.viewRepository.find(viewerUserId, viewedUserId)
    if (exists) {
      await this.viewRepository.incrementView(viewerUserId, viewedUserId)
    } else {
      await this.viewRepository.create(viewerUserId, viewedUserId)

      await this.notificationService.create(viewerUserId, viewedUserId, viewerUserId, 'view')
    }
  }

  async setMutualInterests(userId, users) {
    const userHobbies = await this.hobbieRepository.getIdForUsers([userId, ...users.map(user => user.id)])
    const userActivities = await this.hobbieRepository.getActivitiesIdForUsers([userId, ...users.map(user => user.id)])
    const loggedUserHobbies = userHobbies[userId] || []
    const loggedUserActivities = userActivities[userId] || []

    users.map(user => {
      const userHobbs = userHobbies[user.id] || []
      const userActs = userActivities[user.id] || []

      user.mutual_hobbies_count = loggedUserHobbies.filter((n) => userHobbs.indexOf(n) !== -1).length
      user.mutual_ativities_count = loggedUserActivities.filter((n) => userActs.indexOf(n) !== -1).length

      return user
    })
  }

  async setLocations(users) {
    const cityIds = new Set()
    users.forEach(user => {
      cityIds.add(user.city_id)
    })

    const cities = await this.locationService.getCitiesById([...cityIds])

    users.forEach(user => {
      const city = cities.find(c => c.id === user.city_id)
      user.from = city.name
    })
  }
}

module.exports = UserService
