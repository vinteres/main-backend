const getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)

  return Math.floor(Math.random() * (max - min + 1)) + min
}

const percentage = (count, total) => 100 * count / total

class QuizService {
  constructor(quizRepository, userRepository, onboardingRepository) {
    this.quizRepository = quizRepository
    this.userRepository = userRepository
    this.onboardingRepository = onboardingRepository
  }

  async getHighCompatabilitiesForUser(userId) {
    return await this.quizRepository.findHighCompatabilitiesForUser(userId)
  }

  async getHighCompatabilityCountForUser(userId) {
    return await this.quizRepository.highCompatabilityCountForUser(userId)
  }

  async getCompatabilityForUsers(userId, userIds) {
    return await this.quizRepository.findCompatabilities(userId, userIds)
  }

  async getOrCreateCompatabilityFor(userOneId, userTwoId) {
    const compatability = await this.quizRepository.findCompatability(userOneId, userTwoId)
    if (compatability) {
      return compatability.percent
    }

    const userOneAnswers = await this.quizRepository.findAllForUser(userOneId)
    const userTwoAnswers = await this.quizRepository.findAllForUser(userTwoId)
    const qIds = Object.keys(userOneAnswers)
    let c = 0
    for (const qid of qIds) {
      if (userOneAnswers[qid] === userTwoAnswers[qid]) {
        c++
      }
    }

    let percentMatch = (0 === c || 0 === qIds.length) ? 0 : Math.ceil(percentage(c, qIds.length))
    if (percentMatch > 100) {
      percentMatch = 100
    }

    await this.quizRepository.createCompatability(userOneId, userTwoId, percentMatch)

    return percentMatch
  }

  async backfillCompatability(userId) {
    const user = await this.userRepository.getUserInfoById(userId)
    let lastCreatedAt = null

    while (1) {
      const users = await this.userRepository.findInterestedIds({ ...user, createdAt: lastCreatedAt })
      if (0 === users.length) break

      users.map(user => user.id).forEach(async uId => {
        if (uId === userId) return

        await this.getOrCreateCompatabilityFor(userId, uId)
      })

      lastCreatedAt = users[users.length - 1].created_at
    }
  }

  /**
   * For tests only
   */
  async backfillAnswers() {
    const questions = await this.quizRepository.findAllQuestions()
    const answers = await this.quizRepository.findAllAnswers(questions.map(question => question.id))
    const qa = {}
    for (const answer of answers) {
      if (!qa[answer.question_id]) qa[answer.question_id] = []
      qa[answer.question_id].push(answer.id)
    }

    const userIds = await this.userRepository.findAllIds()
    for (const userId of userIds) {
      const ua = {}
      for (const qId of Object.keys(qa)) {
        const aId = qa[qId][getRandomInt(0, qa[qId].length - 1)]
        ua[qId] = aId
      }

      const userAnswers = []
      for (const questionId of Object.keys(ua)) {
        const answerId = ua[questionId]
        userAnswers.push({
          userId: userId,
          answerId,
          questionId
        })
      }

      await this.onboardingRepository.createUserAnswers(userAnswers)
    }
  }
}

module.exports = QuizService
