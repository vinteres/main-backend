const { Controller } = require('./controller');

class QuizController extends Controller {
  async getQuiz(req, res) {
    const quizRepository = await this.serviceDiscovery.get('quiz_repository');

    const questions = await quizRepository.findAllQuestions();
    const answers = await quizRepository.findAllAnswers(questions.map(question => question.id));

    res.json({ questions, answers });
  }
}

module.exports = QuizController;
