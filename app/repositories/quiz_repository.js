const MIN_COMPATABILITY_PERCENT = 50

class QuizRepository {
  constructor(conn) {
    this.conn = conn
  }

  async findAllQuestions() {
    const query = 'SELECT id, text, quiz_step FROM questions'
    const result = await this.conn.query(query)

    return result.rows
  }

  async findAllAnswers(questionIds) {
    if (0 === questionIds.length) return []

    const query = `SELECT id, text, question_id FROM answers WHERE question_id IN (${questionIds.map((_, ix) => `$${ix + 1}`)})`
    const result = await this.conn.query(query, questionIds)

    return result.rows
  }

  async findAllForUser(userId) {
    const query = 'SELECT * FROM user_answers WHERE user_id = $1'
    const result = await this.conn.query(query, [userId])

    const r = {}
    for (const i of result.rows) {
      r[i.question_id] = i.answer_id
    }

    return r
  }

  async findCompatabilities(userId, userIds) {
    if (!userIds || 0 === userIds.length) return []

    const query = `
      SELECT * FROM user_compatability WHERE
      ${userIds.map((uId, ix) => `((user_one_id = $1 AND user_two_id = $${ix + 2}) OR (user_one_id = $${ix + 2} AND user_two_id = $1))`).join(' OR \n')}
    `
    const result = await this.conn.query(query, [userId, ...userIds])

    return result.rows
  }

  async findHighCompatabilitiesForUser(userId) {
    const query = `
      SELECT * FROM user_compatability WHERE
      (user_one_id = $1 OR user_two_id = $1) AND percent >= $2
    `
    const result = await this.conn.query(query, [userId, MIN_COMPATABILITY_PERCENT])

    return result.rows
  }

  async createCompatability(userOneId, userTwoId, percent) {
    const query = 'INSERT INTO user_compatability (user_one_id, user_two_id, percent) VALUES ($1, $2, $3)'

    await this.conn.query(query, [userOneId, userTwoId, percent])

    return { userOneId, userTwoId, percent }
  }

  async findCompatability(userOneId, userTwoId) {
    const query = 'select * FROM user_compatability WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)'

    const result = await this.conn.query(query, [userOneId, userTwoId])

    return result.rows[0]
  }
}

module.exports = QuizRepository
