const chars = { 'Ё': 'YO', 'Й': 'I', 'Ц': 'TS', 'У': 'U', 'К': 'K', 'Е': 'E', 'Н': 'N', 'Г': 'G', 'Ш': 'SH', 'Щ': 'SCH', 'З': 'Z', 'Х': 'H', 'Ъ': '\'', 'ё': 'yo', 'й': 'i', 'ц': 'ts', 'у': 'u', 'к': 'k', 'е': 'e', 'н': 'n', 'г': 'g', 'ш': 'sh', 'щ': 'sch', 'з': 'z', 'х': 'h', 'ъ': '\'', 'Ф': 'F', 'Ы': 'I', 'В': 'V', 'А': 'a', 'П': 'P', 'Р': 'R', 'О': 'O', 'Л': 'L', 'Д': 'D', 'Ж': 'ZH', 'Э': 'E', 'ф': 'f', 'ы': 'i', 'в': 'v', 'а': 'a', 'п': 'p', 'р': 'r', 'о': 'o', 'л': 'l', 'д': 'd', 'ж': 'zh', 'э': 'e', 'Я': 'Ya', 'Ч': 'CH', 'С': 'S', 'М': 'M', 'И': 'I', 'Т': 'T', 'Ь': '\'', 'Б': 'B', 'Ю': 'YU', 'я': 'ya', 'ч': 'ch', 'с': 's', 'м': 'm', 'и': 'i', 'т': 't', 'ь': '\'', 'б': 'b', 'ю': 'yu' };

const translate = (s) => s.split('')
  .map((c) => chars[c] || c)
  .join('');

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
    text = text.toLowerCase().split('');
    text[0] = text[0].toUpperCase();
    text = text.join(''); 

    const query = 'SELECT * FROM cities WHERE name LIKE $1 OR name LIKE $2';
    const result = await this.conn.query(query, [text + '%', translate(text) + '%']);

    return result.rows;
  }
}

module.exports = LocationRepository;
