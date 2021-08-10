const { Controller } = require('../core/controller');
const { calculateAge } = require('../utils');
const PageRepository = require('../repositories/page_repository');
const { calculateCompatibility } = require('../compatibility_calculator');

const STEPS = {
  ACCOUNT_INFO: 1,
  ABOUT: 2,
  PROFILE_INFO: 3,
  INTERESTS: 4,
  PHOTO: 5,
  QUIZ: 6,
  COMPLETE: 7,
};

class OnboardingController extends Controller {
  async getStep(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    res.json(step);
  }

  async getAccountInfo(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const { name } = await userRepository.findById(
      ['name'],
      loggedUserId
    );

    res.json({
      name
    });
  }

  async setAccountInfo(req, res) {
    const token = this.getAuthToken(req);
    const { name, birthday, gender, interested_in, city } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const userRepository = await this.getService('user_repository');
    const searchPreferenceRepository = await this.getService('search_preference_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.ACCOUNT_INFO != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const age = calculateAge(new Date(birthday));
      await userRepository.setOnboardingAccountInfo(
        loggedUserId,
        { name, birthday, gender, interested_in, city, age }
      );

      if (await searchPreferenceRepository.getForUser(loggedUserId)) {
        await searchPreferenceRepository.setForUser(loggedUserId, { cityId: city });
      } else {
        await searchPreferenceRepository.create(loggedUserId, { cityId: city });
      }

      const newStep = step.step + 1;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setAbout(req, res) {
    const token = this.getAuthToken(req);
    const { title, description } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.ABOUT != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      await userRepository.update(loggedUserId, { title, description });

      const newStep = step.step + 1;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setProfileInfo(req, res) {
    const token = this.getAuthToken(req);
    const payload = req.body;

    Object.keys(payload).forEach(key => {
      if ('not_tell' === payload[key]) payload[key] = null;
    });

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const userRepository = await this.getService('user_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.PROFILE_INFO != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      await userRepository.setProfileSettings(loggedUserId, payload);

      const newStep = step.step + 1;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setInterests(req, res) {
    const token = this.getAuthToken(req);
    const { hobbies, activities } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const hobbieRepository = await this.getService('hobbie_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.INTERESTS != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

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

      await Promise.all([
        hobbieRepository.deleteActivitiesForUser(loggedUserId),
        hobbieRepository.deleteCustomActivitiesForUser(loggedUserId),
      ]);
      await Promise.all([
        hobbieRepository.setActivitiesForUser(loggedUserId, activities.filter(activity => !activity.custom)),
        hobbieRepository.setCustomActivitiesForUser(loggedUserId, activities.filter(activity => activity.custom))
      ]);

      const newStep = step.step + 1;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async setImageStepPassed(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.PHOTO != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const newStep = step.step + 1;
    await onboardingRepository.incrementStep(loggedUserId, newStep);

    res.json({ step: newStep });
  }

  async setQuizAnswers(req, res) {
    const token = this.getAuthToken(req);
    const { answers } = req.body;

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const compatibilityService = await this.getService('compatibility_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.QUIZ != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

      const userAnswers = [];
      for (const questionId of Object.keys(answers)) {
        const answerId = answers[questionId];
        userAnswers.push({
          userId: loggedUserId,
          answerId,
          questionId
        });
      }

      await onboardingRepository.createUserAnswers(userAnswers);
      await compatibilityService.scheduleForCompatibilityCalculation(loggedUserId);

      const newStep = step.step + 1;
      await onboardingRepository.incrementStep(loggedUserId, newStep);

      res.json({ step: newStep });

      con.query('COMMIT');

      calculateCompatibility(loggedUserId);
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async completeOnboarding(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const onboardingRepository = await this.getService('onboarding_repository');
    const userRepository = await this.getService('user_repository');
    const chatRepository = await this.getService('chat_repository');
    const chatService = await this.getService('chat_service');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const step = await onboardingRepository.getStep(loggedUserId);

    if (step.completed_at) {
      return res.status(400).json({ completed: true });
    } else if (STEPS.COMPLETE != step.step) {
      return res.status(400).json({ step: step.step });
    }

    const con = await this.getConnection();

    try {
      con.query('BEGIN');

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
        '',
        'Добре дошли във Vinteres!',
        '',
        'Ние сме сайт за запознанства, който се цели да сближи хора по характер и интереси.',
        'За това как работи може да видите тук: https://vinteres.io/#how-it-works',
        '',
        'При въпроси или проблеми може да се свържете от опцията "Обратна връзка" или да пишете тук.',
        '',
        'Желаем ви успех!',
      ].join('\n');
      await chatService.createAndSend({ userId: pageId, chatId, text });

      res.json({ completed: !!completedAt });

      con.query('COMMIT');
    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }
}

module.exports = OnboardingController;
