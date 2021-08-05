exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN income income_type;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN income;
  `)
};
