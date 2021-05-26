const { v4 } = require('uuid');
const { currentTimeMs } = require('../utils');

const APP_PAGE_ID = 'd71e949a-f899-4160-8356-42a9e7616acb';

class PageRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findById(fields, id) {
    const query = `SELECT ${fields.join(', ')} FROM pages WHERE id = $1`;
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findByIds(fields, ids) {
    if (0 === ids.length) return [];

    const query = `SELECT ${fields.join(', ')} FROM pages WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`).join(', ')})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  static getAppPageId() {
    return APP_PAGE_ID;
  }
}

module.exports = PageRepository;
