const { Controller } = require('./controller')
const { calculateAge } = require('../utils')

class OnboardingController extends Controller {
  async getStep(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    res.json(step)
  }

  async setAccountInfo(req, res) {
    const token = this.getAuthToken(req)
    const { name, title, description, birthday, gender, interested_in, city } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const searchPreferenceRepository = await this.serviceDiscovery.get('search_preference_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (1 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    const age = calculateAge(new Date(birthday))
    await userRepository.setOnboardingAccountInfo(
      loggedUserId,
      { name, title, description, birthday, gender, interested_in, city, age }
    )

    const fromAge = (18 > 15 - age) ? 18 : age - 15
    const toAge = (99 < 15 + age) ? 99 : age + 15
    if (await searchPreferenceRepository.getForUser(loggedUserId)) {
      await searchPreferenceRepository.setForUser(loggedUserId, { fromAge, toAge, cityId: city })
    } else {
      await searchPreferenceRepository.create(loggedUserId, { fromAge, toAge, cityId: city })
    }

    const newStep = step.step + 1
    await onboardingRepository.incrementStep(loggedUserId, newStep)

    res.json({ step: newStep })
  }

  async setProfileInfo(req, res) {
    const token = this.getAuthToken(req)
    const { smoking, drinking, height, body, children_status, pet_status } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (2 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    await userRepository.setProfileSettings(
      loggedUserId,
      { smoking, drinking, height, body, children_status, pet_status }
    )

    const newStep = step.step + 1
    await onboardingRepository.incrementStep(loggedUserId, newStep)

    res.json({ step: newStep })
  }

  async setInterests(req, res) {
    const token = this.getAuthToken(req)
    const { hobbies, activities } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')
    const hobbieRepository = await this.serviceDiscovery.get('hobbie_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (3 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    hobbieRepository.deleteForUser(loggedUserId)
    hobbieRepository.setForUser(loggedUserId, hobbies)

    hobbieRepository.deleteActivitiesForUser(loggedUserId)
    hobbieRepository.setActivitiesForUser(loggedUserId, activities)

    const newStep = step.step + 1
    await onboardingRepository.incrementStep(loggedUserId, newStep)

    res.json({ step: newStep })
  }

  async setQuizAnswers(req, res) {
    const token = this.getAuthToken(req)
    const { answers } = req.body

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const quizService = await this.serviceDiscovery.get('quiz_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (4 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    const userAnswers = []
    for (const questionId of Object.keys(answers)) {
      const answerId = answers[questionId]
      userAnswers.push({
        userId: loggedUserId,
        answerId,
        questionId
      })
    }

    await onboardingRepository.createUserAnswers(userAnswers)
    await userRepository.setStatus(loggedUserId, 'active');

    (async () => {
      await quizService.backfillCompatability(loggedUserId)
    })();

    const { completedAt } = await onboardingRepository.setComplete(loggedUserId)

    res.json({ completed: !!completedAt })
  }
}

module.exports = OnboardingController
