const getChunks = (a, chunk = 10) => {
  const r = [];
  for (let i = 0, j = a.length; i < j; i += chunk) {
    r.push(a.slice(i, i + chunk));
  }

  return r;
};

class QuizRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findAllQuestions() {
    const query = 'SELECT id, text, quiz_step FROM questions';
    const result = await this.conn.query(query);

    return result.rows;
  }

  async findAllAnswers(questionIds) {
    if (0 === questionIds.length) return [];

    const query = `SELECT id, text, question_id FROM answers WHERE question_id IN (${questionIds.map((_, ix) => `$${ix + 1}`)})`;
    const result = await this.conn.query(query, questionIds);

    return result.rows;
  }

  async findAllAnswersForUser(userId) {
    const query = 'SELECT * FROM user_answers WHERE user_id = $1';
    const result = await this.conn.query(query, [userId]);

    const r = {};
    for (const i of result.rows) {
      r[i.question_id] = i.answer_id;
    }

    return r;
  }

  async findAllAnswersForUsers(userIds) {
    const query = `SELECT * FROM user_answers WHERE user_id IN (${userIds.map((userId, ix) => `$${ix + 1}`).join(', ')})`;

    const result = [];
    for (const i of (await this.conn.query(query, userIds)).rows) {
      if (!result[i.user_id]) result[i.user_id] = [];

      result[i.user_id].push({ answer_id: i.answer_id, question_id: i.question_id });
    }

    return result;
  }

  async findCompatibilities(userId, userIds) {
    if (!userIds || 0 === userIds.length) return [];

    const query = `
      SELECT * FROM user_compatibilities WHERE
      ${userIds.map((uId, ix) => `((user_one_id = $1 AND user_two_id = $${ix + 2}) OR (user_one_id = $${ix + 2} AND user_two_id = $1))`).join(' OR \n')}
    `;
    const result = await this.conn.query(query, [userId, ...userIds]);

    return result.rows;
  }

  async findHighCompatibilitiesForUser(userId) {
    const query = 'SELECT * FROM user_compatibilities WHERE user_one_id = $1 OR user_two_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async findCompatibility(userOneId, userTwoId) {
    const query = 'select * FROM user_compatibilities WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)';

    const result = await this.conn.query(query, [userOneId, userTwoId]);

    return result.rows[0];
  }

  async highCompatibilityCountForUser(userId) {
    const query = `
      SELECT count(*) FROM user_compatibilities WHERE user_one_id = $1 OR user_two_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0].count;
  }

  async createCompatibility(userOneId, userTwoId, percent) {
    const query = 'INSERT INTO user_compatibilities (user_one_id, user_two_id, percent) VALUES ($1, $2, $3)';

    await this.conn.query(query, [userOneId, userTwoId, percent]);

    return { userOneId, userTwoId, percent };
  }

  async createCompatibilities(compatibilities) {
    if (!Array.isArray(compatibilities) || 0 === compatibilities.length) return;

    for (const chunk of getChunks(compatibilities)) {
      const params = [];
      const q = [];
      let c = 1;

      for (const a of chunk) {
        a.forEach(i => params.push(i));
        q.push(a.map(i => `$${c++}`).join(', '));
      }

      const query = `
        INSERT INTO user_compatibilities (user_one_id, user_two_id, percent) VALUES ${q.map(i => `(${i})`).join(', ')}
      `;

      await this.conn.query(query, params);
    }
  }
}

module.exports = QuizRepository;
