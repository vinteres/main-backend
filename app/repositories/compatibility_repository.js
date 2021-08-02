const { currentTimeMs } = require("../utils");

class CompatibilityRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findInterestCompatibilities(userId, userIds) {
    if (!userIds || 0 === userIds.length) return [];

    const query = `
      SELECT * FROM user_interest_compatibilities WHERE
      ${userIds.map((uId, ix) => `((user_one_id = $1 AND user_two_id = $${ix + 2}) OR (user_one_id = $${ix + 2} AND user_two_id = $1))`).join(' OR \n')}
    `;
    const result = await this.conn.query(query, [userId, ...userIds]);

    return result.rows;
  }

  async findInterestCompatibility(userOneId, userTwoId) {
    const query = 'select * FROM user_interest_compatibilities WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)';

    const result = await this.conn.query(query, [userOneId, userTwoId]);

    return result.rows[0];
  }

  async findInterestCompatibilitiesForUser(userId) {
    const query = 'SELECT * FROM user_interest_compatibilities WHERE user_one_id = $1 OR user_two_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async deleteInterestCompatibilityForUser(userId) {
    const query = 'DELETE FROM user_interest_compatibilities WHERE user_one_id = $1 OR user_two_id = $1';

    await this.conn.query(query, [userId]);
  }

  async createInterestCompatibility(userOneId, userTwoId, percent) {
    const query = 'INSERT INTO user_interest_compatibilities (user_one_id, user_two_id, percent) VALUES ($1, $2, $3)';

    await this.conn.query(query, [userOneId, userTwoId, percent]);

    return { userOneId, userTwoId, percent };
  }

  async hasScheduledInterestCalculation(userId) {
    const query = `
      SELECT count(*) FROM interest_calculation_schedules WHERE user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0].count > 0;
  }

  async createInterestCalculationSchedule(userId) {
    const query = 'INSERT INTO interest_calculation_schedules (user_id, created_at) VALUES ($1, $2)';

    const createdAt = currentTimeMs();

    await this.conn.query(query, [userId, createdAt]);

    return { userId, createdAt };
  }

  async getScheduledInterestCalculations(userId) {
    const query = 'SELECT user_id FROM interest_calculation_schedules ORDER BY created_at ASC LIMIT 10';

    const result = await this.conn.query(query);

    return result.rows ? result.rows.map(({ user_id }) => user_id) : [];
  }

  async deleteScheduledInterestCalculations(ids) {
    if (!ids || 0 === ids.length) return;

    const query = `DELETE FROM interest_calculation_schedules WHERE user_id IN (${ids.map((_, ix) => `$${ix + 1}`).join(', ')})`;
    await this.conn.query(query, ids);
  }
}

module.exports = CompatibilityRepository;
