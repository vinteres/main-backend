const { currentTimeMs } = require('../utils')

class ProfileQuestionsRepository {
  constructor(conn) {
    this.conn = conn
  }

  async findAllQuestions() {
    const query = `SELECT * FROM profile_questions`
    const result = await this.conn.query(query)

    return result.rows
  }

  async findUserAnswers(userId) {
    console.log(userId)
    const query = `
      SELECT qa.*, q.text AS question_text
      FROM profile_question_answers qa
      JOIN profile_questions q ON q.id = qa.question_id
      WHERE qa.user_id = $1`
    const result = await this.conn.query(query, [userId])

    return result.rows
  }

  async insertOrUpdate({ categoryId, questionId, userId, answer }) {
    const createdAt = currentTimeMs()

    const query = `
      INSERT INTO profile_question_answers (category_id, question_id, user_id, text, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (category_id, user_id) DO UPDATE
        SET question_id = excluded.question_id,
            text = excluded.text
    `
    const result = await this.conn.query(query, [categoryId, questionId, userId, answer, createdAt])

    return result.rows
  }
}

module.exports = ProfileQuestionsRepository
