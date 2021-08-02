const bcrypt = require('bcrypt');
const { ENV } = require('./config/config');

const chars = { 'Ё': 'YO', 'Й': 'I', 'Ц': 'TS', 'У': 'U', 'К': 'K', 'Е': 'E', 'Н': 'N', 'Г': 'G', 'Ш': 'SH', 'Щ': 'SCH', 'З': 'Z', 'Х': 'H', 'Ъ': '\'', 'ё': 'yo', 'й': 'i', 'ц': 'ts', 'у': 'u', 'к': 'k', 'е': 'e', 'н': 'n', 'г': 'g', 'ш': 'sh', 'щ': 'sch', 'з': 'z', 'х': 'h', 'ъ': '\'', 'Ф': 'F', 'Ы': 'I', 'В': 'V', 'А': 'a', 'П': 'P', 'Р': 'R', 'О': 'O', 'Л': 'L', 'Д': 'D', 'Ж': 'ZH', 'Э': 'E', 'ф': 'f', 'ы': 'i', 'в': 'v', 'а': 'a', 'п': 'p', 'р': 'r', 'о': 'o', 'л': 'l', 'д': 'd', 'ж': 'zh', 'э': 'e', 'Я': 'Ya', 'Ч': 'CH', 'С': 'S', 'М': 'M', 'И': 'I', 'Т': 'T', 'Ь': '\'', 'Б': 'B', 'Ю': 'YU', 'я': 'ya', 'ч': 'ch', 'с': 's', 'м': 'm', 'и': 'i', 'т': 't', 'ь': '\'', 'б': 'b', 'ю': 'yu' };

const translate = (s) => s.split('')
  .map((c) => chars[c] || c)
  .join('');

const enSepWords = 'to a is by it from as of the in on my me with and or'.split(/\s+/);
const bgSepWords = 'с в е за са се и или на ни от аз ти при мен'.split(/\s+/);
const sepWords = [...enSepWords, ...bgSepWords.map(translate)];

const comprName = (name) => name.split(/[^a-zA-Z]+/)
  .map(s => s.toLowerCase())
  .filter(s => !sepWords.includes(s))
  .join('');

const currentTimeMs = () => Date.now();

const mapByKey = (a, key) => {
  const result = {};
  for (const i of a) {
    result[i[key]] = i;
  }

  return result;
};

const timeAgo = (time) => {
  const now = parseInt(currentTimeMs() / 1000);
  let d = now - parseInt(time / 1000);
  if (d < 60) {
    return {
      key: 'few seconds ago'
    };
  }

  d = Math.floor(d / 60);
  if (d < 60) {
    return {
      key: `MINUTE${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 60);
  if (d < 24) {
    return {
      key: `HOUR${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 24);
  if (d < 7) {
    return {
      key: `DAY${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 7);
  if (d < 4) {
    return {
      key: `WEEK${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 4);
  if (d < 4) {
    return {
      key: `MONTH${1 < d ? 'S' : ''}_AGO`,
      d
    };
  }

  d = Math.floor(d / 12);
  if (d < 12) {
    return {
      key: `YEAR${1 < d ? 'S' : ''}`,
      d
    };
  }
};

const calculateAge = (birthday) => {
  const ageDifMs = Date.now() - birthday.getTime();
  const ageDate = new Date(ageDifMs);

  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const hash = async (text) => {
  return bcrypt.hash(text, 10);
};

const compareHash = async (text, hash) => {
  return bcrypt.compare(text, hash);
};

const isProd = () => 'production' === ENV;

const mapByKeyTarget = (result, key) => {
  const resp = {};
  result.rows.forEach(item => {
    if (!resp[item[key]]) {
      resp[item[key]] = {};
    }

    resp[item[key]][comprName(item.name)] = item.favorite;
  });

  return resp;
};

module.exports = {
  currentTimeMs,
  mapByKey,
  timeAgo,
  calculateAge,
  hash,
  compareHash,
  isProd,
  mapByKeyTarget,
  translate,
};
