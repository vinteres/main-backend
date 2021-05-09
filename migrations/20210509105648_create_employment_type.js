
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE employment_type AS ENUM (
      'full_time',
      'part_time',
      'freelance',
      'self_employed',
      'unemployed',
      'retired'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE employment_type
  `)
};
