
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE education_type AS ENUM (
      'none',
      'entry',
      'mid',
      'higher'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE education_type
  `)
};
