const { v4 } = require('uuid');
const QueryBuilder = require('../core/query_builder');
const UserStatusType = require('../models/enums/user_status_type');
const { calculateAge, currentTimeMs } = require('../utils');

const USERS_PER_PAGE = 24;

class UserRepository {
  constructor(conn) {
    this.conn = conn;
  }

  static usersPerPage() {
    return USERS_PER_PAGE;
  }

  async create({ email, password }) {
    return await this._create({ email, password });
  }

  async createWithAccessToken({ email, name, accessToken }) {
    return await this._create({ email, name, accessToken });
  }

  async _create({ email, name, password, accessToken }) {
    const now = currentTimeMs();

    const items = {
      id: v4(),
      email: email.trim(),
      name: name ? name.trim() : name,
      password,
      status: 'onboarding',
      created_at: now,
      last_online_at: now,
      is_online: false,
      access_token: accessToken
    };
    const fields = [];
    const params = [];

    Object.keys(items).forEach(key => {
      if (items[key] === null || items[key] === undefined) return;

      fields.push(key === 'status' ? 'user_status' : key);
      params.push(items[key]);
    });

    const query = `
      INSERT INTO users (${fields.join(', ')}) VALUES
        (${fields.map((_, ix) => `$${1 + ix}`)})
    `;

    await this.conn.query(query, params);

    return items;
  }

  async getUserById(userId) {
    const query = `
      SELECT id, name, title, description, email, gender, interested_in, age, user_status, profile_image_id, is_online
      FROM users WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserPasswordById(userId) {
    const query = 'SELECT password FROM users WHERE id = $1';
    const result = await this.conn.query(query, [userId]);

    return result.rows[0].password;
  }

  async searchUsers(page, { gender, interestedIn, cityId, fromAge, toAge, searchingUserId }) {
    const [fields, params] = this.getSearchParams({ gender, interestedIn, cityId, fromAge, toAge, searchingUserId });

    const query = `
      SELECT id, name, age, gender, city_id, profile_image_id, verification_status, is_online
      FROM users
      WHERE user_status = 'active' AND gender = $1 AND interested_in = $2
      AND id != $3
      ${fields.join(' ')}
      ORDER BY is_online DESC, last_online_at DESC
      OFFSET ${(page - 1) * USERS_PER_PAGE}
      LIMIT ${USERS_PER_PAGE}
    `;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getUsersCount({ gender, interestedIn, cityId, fromAge, toAge }) {
    const [fields, params] = this.getSearchParams({ gender, interestedIn, cityId, fromAge, toAge });

    const query = `
      SELECT COUNT(*)
      FROM users
      WHERE user_status = 'active' AND gender = $1 AND interested_in = $2 ${fields.join(' ')}
    `;
    const result = await this.conn.query(query, params);

    return parseInt(result.rows[0].count);
  }

  getSearchParams({ gender, interestedIn, cityId, fromAge, toAge, searchingUserId }) {
    const optional = { cityId, fromAge, toAge };
    const params = [gender, interestedIn, searchingUserId].filter(i => i);
    const fields = [];

    Object.keys(optional).forEach((k) => {
      if (optional[k]) {
        params.push(optional[k]);
        let field = '';
        switch (k) {
          case 'cityId':
            field = 'city_id';
            break;
          case 'fromAge':
          case 'toAge':
            field = 'age';
            break;
        }

        fields.push(`AND ${field} ${k === 'fromAge' ? '>=' : (k === 'toAge' ? '<=' : '=')} $${params.length}`);
      }
    });

    return [fields, params];
  }

  async emailExists(email) {
    const query = `
      SELECT COUNT(*) FROM users WHERE email = $1
    `;
    const result = await this.conn.query(query, [email]);

    return !!parseInt(result.rows[0].count);
  }

  async getUserProfileById(userId) {
    const query = `
      SELECT id, name, title, description, email, age, title, gender,
      interested_in, height, smoking, drinking, body, children_status, pet_status,
      profile_image_id, birthday, city_id, verification_status,
      education_status, employment_status, interested_in, looking_for_type,
      personality, zodiac, income, is_online
      FROM users
      WHERE id = $1 AND user_status = 'active'
      ORDER BY created_at ASC
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserInfoById(userId) {
    const query = `
      SELECT id, gender, interested_in FROM users WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async getUserSettings(userId) {
    const query = `
      SELECT id, name, title, description, birthday, email, gender
      FROM users
      WHERE id = $1
    `;
    const result = await this.conn.query(query, [userId]);

    return result.rows[0];
  }

  async setCityId(userId, cityId) {
    const query = `
      UPDATE users SET city_id = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [cityId, userId]);

    return result.rows[0];
  }

  async setVerificationStatus(userId, status) {
    const query = `
      UPDATE users SET verification_status = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [status, userId]);

    return result.rows[0];
  }

  async setAccountSettings(userId, {
    name, title, description, birthday
  }) {
    const query = `
      UPDATE users SET name = $1, title = $2, description = $3, birthday = $4, age = $5
      WHERE id = $6
    `;
    const result = await this.conn.query(query,
      [name, title, description, birthday, calculateAge(new Date(birthday)), userId]
    );

    return result.rows[0];
  }

  async setOnboardingAccountInfo(userId, {
    name, birthday, gender, interested_in, city, age
  }) {
    const query = `
      UPDATE users SET city_id = $1, name = $2, birthday = $3, gender = $4, interested_in = $5, age = $6 WHERE id = $7
    `;
    const result = await this.conn.query(query,
      [city, name.trim(), new Date(birthday), gender, interested_in, age, userId]
    );

    return result.rows[0];
  }

  async setProfileSettings(id, fields) {
    const { query, values } = QueryBuilder.update('users', fields, { id });
    const result = await this.conn.query(query, values);

    return result.rows[0];
  }

  async setPassword(userId, password) {
    const query = `
      UPDATE users SET password = $1 WHERE id = $2
    `;
    await this.conn.query(query, [password, userId]);
  }

  async setStatus(userId, status) {
    const query = `
      UPDATE users SET user_status = $1 WHERE id = $2
    `;
    await this.conn.query(query, [status, userId]);

    return status;
  }

  async setUserSettings(userId, {
    name, title, description, birthday, email, gender, interested_in, smoking, drinking, height, body, children_status, pet_status
  }) {
    const query = `
      UPDATE users SET name = $1, title = $2, description = $3, birthday = $4, email = $5, gender = $6,
      interested_in = $7, smoking = $8, drinking = $9, height = $10, body = $11, children_status = $12, pet_status = $13
      WHERE id = $14
    `;
    const result = await this.conn.query(query,
      [name, title, description, birthday, email, gender, interested_in, smoking, drinking, height, body, children_status, pet_status, userId]
    );

    return result.rows[0];
  }

  async setUserProfileImage(userId, imageId) {
    const query = `
      UPDATE users SET profile_image_id = $1 WHERE id = $2
    `;
    const result = await this.conn.query(query, [imageId, userId]);

    return result.rows[0];
  }

  async getUsersById(userIds) {
    if (userIds.length === 0) return [];

    const inq = userIds.map((userId, ix) => `$${ix + 1}`);
    const result = await this.conn.query(
      `SELECT id, name, email, age, gender, city_id, profile_image_id FROM users WHERE id IN (${inq.join(', ')})`,
      userIds
    );

    return result.rows;
  }

  async getUsersImage(userIds) {
    if (userIds.length === 0) return [];

    const inq = userIds.map((_, ix) => `$${ix + 1}`);
    const result = await this.conn.query(
      `SELECT id, name, gender, profile_image_id FROM users WHERE id IN (${inq.join(', ')})`,
      userIds
    );

    return result.rows;
  }

  async findAllIds() {
    const query = `
      SELECT id FROM users
    `;
    const result = await this.conn.query(query);

    return result.rows.map(user => user.id);
  }

  async findInterestedIds({ gender, interested_in, createdAt }) {
    let whereCreatedAt = '';
    const params = [gender, interested_in];
    if (createdAt) {
      whereCreatedAt = 'AND created_at < $3';
      params.push(createdAt);
    }

    const query = `
      SELECT id, created_at FROM users
      WHERE interested_in = $1 AND gender = $2 ${whereCreatedAt}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async findById(fields, id) {
    if (typeof fields === 'string') {
      fields = fields.trim().split(/\s+/);
    }
    const query = `SELECT ${fields.join(', ')} FROM users WHERE id = $1`;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findByIds(fields, ids) {
    if (0 === ids.length) return [];

    const query = `SELECT ${fields.join(', ')} FROM users WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`).join(', ')}) AND user_status = '${UserStatusType.ACTIVE}'`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async update(userId, fieldsToUpdate) {
    const fields = [];
    const values = [];

    Object.keys(fieldsToUpdate).forEach(field => {
      fields.push(field);
      values.push(fieldsToUpdate[field]);
    });

    const query = `
      UPDATE users
      SET ${fields.map((field, ix) => `${field} = $${ix + 1}`).join(', ')}
      WHERE id = $${fields.length + 1}
    `;
    const result = await this.conn.query(query, [...values, userId]);

    return result.rows[0];
  }

  async setCompatibilityProcessedAt(userId) {
    const query = `
      UPDATE users SET compatibility_processed_at = $1 WHERE id = $2
    `;
    await this.conn.query(query, [currentTimeMs(), userId]);
  }

  async setInterestsProcessedAt(userId) {
    const query = `
      UPDATE users SET interests_processed_at = $1 WHERE id = $2
    `;
    await this.conn.query(query, [currentTimeMs(), userId]);
  }
}

module.exports = UserRepository;
