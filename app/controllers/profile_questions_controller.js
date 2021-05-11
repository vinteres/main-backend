const { Controller } = require('./controller')

class ProfileQuestionsController extends Controller {
  async get(req, res) {
    const token = this.getAuthToken(req)
    const userId = req.params.id

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const profileQuestionsRepository = await this.serviceDiscovery.get('profile_questions_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    const questions = {}
    const answersResult = await profileQuestionsRepository.findUserAnswers(userId)
    const answers = answersResult.map(answer => ({
      category_id: answer.category_id,
      question_id: answer.question_id,
      question_text: answer.question_text,
      answer_text: answer.text
    }));

    if (userId === loggedUserId) {
      const allQuestions = await profileQuestionsRepository.findAllQuestions()

      allQuestions.forEach(question => {
        if (!questions[question.category_id]) questions[question.category_id] = []

        questions[question.category_id].push({
          question_id: question.id,
          question_text: question.text
        });
      })
    }

    res.json({ answers, questions })
  }

  async save(req, res) {
    const token = this.getAuthToken(req)
    const { categoryId, questionId, answer } = req.body;

    console.log(categoryId, questionId, answer)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const profileQuestionsRepository = await this.serviceDiscovery.get('profile_questions_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    await profileQuestionsRepository.insertOrUpdate({
      categoryId,
      questionId,
      userId: loggedUserId,
      answer
    });

    res.status(201).end();
  }
}

module.exports = ProfileQuestionsController
