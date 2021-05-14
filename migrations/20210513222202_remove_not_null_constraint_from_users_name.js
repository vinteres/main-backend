
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ALTER name DROP NOT NULL
  `)
};

exports.down = (knex) => {
  return knex.raw(`
  ALTER TABLE users ALTER COLUMN name SET NOT NULL
  `)
};
