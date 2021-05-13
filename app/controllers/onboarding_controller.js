const { Controller } = require('./controller')
const { calculateAge } = require('../utils')
const PageRepository = require('../repositories/page_repository')

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
    const payload = req.body;

    Object.keys(payload).forEach(key => {
      if ('not_tell' === payload[key]) payload[key] = null;
    });

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

    await userRepository.setProfileSettings(loggedUserId, payload)

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

    await onboardingRepository.createUserAnswers(userAnswers);

    (async () => {
      await quizService.backfillCompatibility(loggedUserId);
    })();

    const newStep = step.step + 1
    await onboardingRepository.incrementStep(loggedUserId, newStep)

    res.json({ step: newStep })
  }

  async setImageStepPassed(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (5 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    const newStep = step.step + 1
    await onboardingRepository.incrementStep(loggedUserId, newStep)

    res.json({ step: newStep })
  }

  async completeOnboarding(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const onboardingRepository = await this.serviceDiscovery.get('onboarding_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const chatRepository = await this.serviceDiscovery.get('chat_repository')
    const chatService = await this.serviceDiscovery.get('chat_service')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const step = await onboardingRepository.getStep(loggedUserId)

    if (step.completed_at) {
      return res.status(400).json({ completed: true })
    } else if (6 != step.step) {
      return res.status(400).json({ step: step.step })
    }

    await userRepository.setStatus(loggedUserId, 'active');
    const { completedAt } = await onboardingRepository.setComplete(loggedUserId);

    // CREATE GREETING MESSAGE
    const loggedUser = await userRepository.findById(['id', 'name'], loggedUserId);
    const chatId = await chatRepository.createChat();
    const pageId = PageRepository.getAppPageId();
    await chatRepository.createChatMembers(chatId, [
      { id: pageId, type: 'page' },
      { id: loggedUser.id }
    ]);
    const text = [
      `Здравей, ${loggedUser.name}`,
      "",
      "Добре дошли във Vinteres! Нашата цел е да направим най-добрия сайт за серйозни запознанста в България.",
      "",
      "Поздрави и успех",
    ].join("\n")
    await chatService.createAndSend({ userId: pageId, chatId, text })

    res.json({ completed: !!completedAt })
  }
}

module.exports = OnboardingController
