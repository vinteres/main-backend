
exports.up = (knex) => {
  return knex.raw(`
  CREATE TYPE income_type AS ENUM (
      'none',
      'low',
      'middle',
      'high'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE income_type
  `)
};
