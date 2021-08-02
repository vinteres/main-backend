const { v4 } = require("uuid");
const { currentTimeMs, mapByKeyTarget } = require("../utils");

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
      SELECT hobbies.*, user_hobbies.favorite FROM hobbies
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
    const params = [userId];
    hobbies.forEach(({ id, favorite }) => {
      params.push(id, favorite);
    });
    const query = `INSERT INTO user_hobbies (user_id, hobbie_id, favorite) VALUES ${hobbies.map(() => `($1, $${++c}, $${++c})`).join(', ')}`;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getCustomHobbiesForUser(userId) {
    const query = `
      SELECT * FROM custom_hobbies WHERE user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async deleteCustomHobbiesForUser(userId) {
    const query = 'DELETE FROM custom_hobbies WHERE user_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async setCustomHobbiesForUser(userId, hobbies) {
    if (!hobbies || 0 === hobbies.length) return;

    let c = 0;
    const params = [];
    hobbies.forEach(hobbie => {
      params.push(v4(), hobbie.name, userId, hobbie.favorite, currentTimeMs());
    });
    const query = `
      INSERT INTO custom_hobbies (id, name, user_id, favorite, created_at)
      VALUES ${hobbies.map(() => `($${++c}, $${++c}, $${++c}, $${++c}, $${++c})`).join(', ')}`;
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
      SELECT a.*, ua.favorite  FROM free_time_activities a
      JOIN user_free_time_activities ua ON a.id = ua.activity_id
      WHERE ua.user_id = $1
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
    const params = [userId];
    free_time_activities.forEach(({ id, favorite }) => {
      params.push(id, favorite);
    });
    const query = `
      INSERT INTO user_free_time_activities (user_id, activity_id, favorite)
      VALUES ${free_time_activities.map(() => `($1, $${++c}, $${++c})`).join(', ')}`;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getCustomActivitiesForUser(userId) {
    const query = `
      SELECT * FROM custom_free_time_activities WHERE user_id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async deleteCustomActivitiesForUser(userId) {
    const query = 'DELETE FROM custom_free_time_activities WHERE user_id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows;
  }

  async setCustomActivitiesForUser(userId, hobbies) {
    if (!hobbies || 0 === hobbies.length) return;

    let c = 0;
    const params = [];
    hobbies.forEach(hobbie => {
      params.push(v4(), hobbie.name, userId, hobbie.favorite, currentTimeMs());
    });
    const query = `
      INSERT INTO custom_free_time_activities (id, name, user_id, favorite, created_at)
      VALUES ${hobbies.map(() => `($${++c}, $${++c}, $${++c}, $${++c}, $${++c})`).join(', ')}`;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getHobbiesForUsers(userIds) {
    if (!Array.isArray(userIds) || 0 === userIds.length) return [];

    const query = `
      SELECT ua.user_id, a.name, ua.favorite FROM hobbies a
      JOIN user_hobbies ua ON a.id = ua.hobbie_id
      WHERE ua.user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    return mapByKeyTarget(result, 'user_id');
  }

  async getCustomHobbiesForUsers(userIds) {
    if (!Array.isArray(userIds) || 0 === userIds.length) return [];

    const query = `
      SELECT user_id, name, favorite FROM custom_hobbies
      WHERE user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    return mapByKeyTarget(result, 'user_id');
  }

  async getActivitiesForUsers(userIds) {
    if (!Array.isArray(userIds) || 0 === userIds.length) return [];

    const query = `
      SELECT ua.user_id, a.name, ua.favorite FROM free_time_activities a
      JOIN user_free_time_activities ua ON a.id = ua.activity_id
      WHERE ua.user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    return mapByKeyTarget(result, 'user_id');
  }

  async getCustomActivitiesForUsers(userIds) {
    if (!Array.isArray(userIds) || 0 === userIds.length) return [];

    const query = `
      SELECT user_id, name, favorite FROM custom_free_time_activities
      WHERE user_id IN (${userIds.map((_, ix) => `$${ix + 1}`).join(', ')})
    `;
    const result = await this.conn.query(query, userIds);

    return mapByKeyTarget(result, 'user_id');
  }
}

module.exports = HobbieRepository;
