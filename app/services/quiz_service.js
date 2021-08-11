const MIN_PERCENT_MATCH = 55;
const MAX_MATCHES = 100;

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const percentage = (count, total) => 100 * count / total;

const mapBy = (o, k) => {
  if (!o) return [];

  const result = {};
  for (const i of Object.keys(o) || []) {
    const oi = o[i];
    result[oi[k]] = oi.answer_id;
  }

  return result;
};

const getCompatibilityPercentBetween = (userOneAnswers, userTwoAnswers) => {
  const qIds = Object.keys(userOneAnswers);
  let c = 0;
  for (const qid of qIds) {
    if (userOneAnswers[qid] === userTwoAnswers[qid]) c++;
  }

  let percentMatch = (0 === c || 0 === qIds.length) ? 0 : Math.ceil(percentage(c, qIds.length));
  if (percentMatch > 100) percentMatch = 100;

  return percentMatch;
};

class QuizService {
  constructor(quizRepository, userRepository, onboardingRepository) {
    this.quizRepository = quizRepository;
    this.userRepository = userRepository;
    this.onboardingRepository = onboardingRepository;
  }

  async getHighCompatibilitiesForUser(userId) {
    return await this.quizRepository.findHighCompatibilitiesForUser(userId);
  }

  async getHighCompatibilityCountForUser(userId) {
    return await this.quizRepository.highCompatibilityCountForUser(userId);
  }

  async getCompatibilityForUsers(userId, userIds) {
    return await this.quizRepository.findCompatibilities(userId, userIds);
  }

  async getCompatibilityFor(userOneId, userTwoId) {
    const compatibility = await this.quizRepository.findCompatibility(userOneId, userTwoId);
    if (compatibility) {
      return compatibility.percent;
    }

    return 0;
  }

  async backfillCompatibility(userId, timeInterval) {
    const compatibilities = await this._getCompatibility(userId, timeInterval);

    await this.quizRepository.createCompatibilities(compatibilities);
  }

  async _getCompatibility(userId, timeInterval) {
    let foundMatches = 0;
    let { from, to } = timeInterval ?? {};

    const [user, userOneAnswers, existingCompatibility] = await Promise.all([
      this.userRepository.getUserInfoById(userId),
      this.quizRepository.findAllAnswersForUser(userId),
      this._getExistingCompatibilityFor(userId)
    ]);

    const compatibilities = [];

    for (; ;) {
      const users = await this.userRepository.findInterestedIds({
        ...user,
        timeInterval: { from, to }
      });
      if (0 === users.length) break;

      const userIds = users.map(user => user.id);
      const usersAnswers = await this.quizRepository.findAllAnswersForUsers(userIds);

      for (const iUserId of userIds) {
        if (existingCompatibility.find(({ user_two_id }) => user_two_id === iUserId)) continue;

        const userAnswers = mapBy(usersAnswers[iUserId], 'question_id');
        const percentMatch = getCompatibilityPercentBetween(userOneAnswers, userAnswers);

        if (percentMatch >= MIN_PERCENT_MATCH) {
          compatibilities.push([userId, iUserId, percentMatch]);
          foundMatches++;

          if (foundMatches >= MAX_MATCHES) return compatibilities;
        }
      }

      to = users[users.length - 1].active_at;
    }

    return compatibilities;
  }

  async _getExistingCompatibilityFor(userId) {
    const r = await this.quizRepository.findHighCompatibilitiesForUser(userId);

    return r.map(({ user_one_id, user_two_id }) => {
      if (userId === user_one_id) {
        return { user_one_id, user_two_id };
      }

      return { user_one_id: userId, user_two_id: user_one_id };
    });
  }

  /**
   * For tests only
   */
  async backfillAnswers() {
    const questions = await this.quizRepository.findAllQuestions();
    const answers = await this.quizRepository.findAllAnswers(questions.map(question => question.id));
    const qa = {};
    for (const answer of answers) {
      if (!qa[answer.question_id]) qa[answer.question_id] = [];
      qa[answer.question_id].push(answer.id);
    }

    const userIds = await this.userRepository.findAllIds();
    for (const userId of userIds) {
      const ua = {};
      for (const qId of Object.keys(qa)) {
        const aId = qa[qId][getRandomInt(0, qa[qId].length - 1)];
        ua[qId] = aId;
      }

      const userAnswers = [];
      for (const questionId of Object.keys(ua)) {
        const answerId = ua[questionId];
        userAnswers.push({
          userId: userId,
          answerId,
          questionId
        });
      }

      await this.onboardingRepository.createUserAnswers(userAnswers);
    }
  }
}

module.exports = QuizService;
