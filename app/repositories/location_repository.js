const { translate } = require("../utils");

class LocationRepository {
  constructor(conn) {
    this.conn = conn;
  }

  async findCountriesById(ids) {
    ids = [...new Set(ids)];
    if (0 === ids.length) return [];

    const query = `SELECT * FROM countries WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async findCitiesById(ids) {
    if (!ids || 0 === ids.length) return [];

    const query = `SELECT id, name, country_id FROM cities WHERE id IN (${ids.map((_, ix) => `$${ix + 1}`)})`;
    const result = await this.conn.query(query, ids);

    return result.rows;
  }

  async findCityById(id) {
    const query = 'SELECT * FROM cities WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async findCitiesByCountryId(id) {
    const query = 'SELECT id, name FROM cities WHERE country_id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows;
  }

  async findCountryById(id) {
    const query = 'SELECT * FROM countries WHERE id = $1';
    const result = await this.conn.query(query, [id]);

    return result.rows[0];
  }

  async search(text) {
    text = text.trim().toLowerCase().split('');
    text[0] = text[0].toUpperCase();
    text = text.join('');
    let translated = translate(text);

    if ('Sofiya' === translated) {
      translated = 'Sofia';
    }

    const query = 'SELECT * FROM cities WHERE name LIKE $1 OR name LIKE $2';
    const result = await this.conn.query(query, [`${text}%`, `${translated}%`]);

    return result.rows;
  }
}

module.exports = LocationRepository;
