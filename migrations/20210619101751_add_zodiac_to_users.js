
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN zodiac VARCHAR(255);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN zodiac;
  `)
};
