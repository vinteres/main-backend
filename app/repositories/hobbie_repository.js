class HobbieRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findAll() {
    const query = 'SELECT * FROM hobbies';
    const result = await this.conn.query(query);

    return result.rows;
  }

  async getForUser(userId) {
    const query = `
      SELECT hobbies.* FROM hobbies
      JOIN user_hobbies ON hobbies.id = user_hobbies.hobbie_id
      WHERE user_hobbies.user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async getIdForUsers(userIds) {
    if (!userIds || 0 === userIds.length) return [];

    const query = `
      SELECT * FROM user_hobbies
      WHERE user_hobbies.user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    const r = {};
    result.rows.forEach(item => {
      if (!r[item.user_id]) r[item.user_id] = [];
      r[item.user_id].push(item.hobbie_id);
    });

    return r;
  }

  async deleteForUser(userId) {
    const query = 'DELETE FROM user_hobbies WHERE user_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async setForUser(userId, hobbies) {
    if (!hobbies || 0 === hobbies.length) return;

    let c = 1;
    const params = [userId, ...hobbies.map(hobbie => hobbie.id)];
    const query = `INSERT INTO user_hobbies (user_id, hobbie_id) VALUES ${hobbies.map(() => `($1, $${++c})`).join(', ')}`;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async findAllActivities() {
    const query = 'SELECT * FROM free_time_activities';
    const result = await this.conn.query(query);

    return result.rows;
  }

  async getActivitiesIdForUsers(userIds) {
    if (!userIds || 0 === userIds.length) return [];

    const query = `
      SELECT user_id, activity_id FROM user_free_time_activities
      WHERE user_free_time_activities.user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    const r = {};
    result.rows.forEach(item => {
      if (!r[item.user_id]) r[item.user_id] = [];
      r[item.user_id].push(item.activity_id);
    });

    return r;
  }

  async getActivitiesForUser(userId) {
    const query = `
      SELECT free_time_activities.* FROM free_time_activities
      JOIN user_free_time_activities ON free_time_activities.id = user_free_time_activities.activity_id
      WHERE user_free_time_activities.user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async deleteActivitiesForUser(userId) {
    const query = 'DELETE FROM user_free_time_activities WHERE user_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async setActivitiesForUser(userId, free_time_activities) {
    if (!free_time_activities || 0 === free_time_activities.length) return;

    let c = 1;
    const params = [userId, ...free_time_activities.map(acivity => acivity.id)];
    const query = `INSERT INTO user_free_time_activities (user_id, activity_id) VALUES ${free_time_activities.map(() => `($1, $${++c})`).join(', ')}`;
    const result = await this.conn.query(query, params);

    return result.rows;
  }
}

module.exports = HobbieRepository;
