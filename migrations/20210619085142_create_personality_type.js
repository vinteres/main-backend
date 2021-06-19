
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE personality_type AS ENUM (
      'introvert',
      'extrovert',
      'mixed'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE personality_type
  `)
};
