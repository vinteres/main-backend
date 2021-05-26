const { currentTimeMs } = require('../utils');

class OnboardingRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async create(userId) {
    const step = 1;
    const createdAt = currentTimeMs();
    const query = `
      INSERT INTO onboarding (user_id, step, created_at) VALUES
        ($1, $2, $3)
    `;

    await this.conn.query(query, [userId, step, createdAt]);

    return { userId, step, createdAt };
  }

  async getStep(userId) {
    const query = `
      SELECT step, completed_at FROM onboarding WHERE user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async incrementStep(userId, step) {
    const query = `
      UPDATE onboarding SET step = $1 WHERE user_id = $2
    `;

    await this.conn.query(query, [step, userId]);

    return { step, userId };
  }

  async setComplete(userId) {
    const completedAt = currentTimeMs();
    const query = `
      UPDATE onboarding SET completed_at = $1 WHERE user_id = $2
    `;

    await this.conn.query(query, [completedAt, userId]);

    return { completedAt, userId };
  }

  async createUserAnswers(answers) {
    let c = 1;
    const q = [];
    const params = [];
    answers.forEach((item) => {
      q.push(`($${c++}, $${c++}, $${c++})`);
      params.push(item.userId);
      params.push(item.answerId);
      params.push(item.questionId);
    });

    const query = `
      INSERT INTO user_answers (user_id, answer_id, question_id) VALUES
        ${q.join(', ')}
    `;

    await this.conn.query(query, params);
  }
}

module.exports = OnboardingRepository;
