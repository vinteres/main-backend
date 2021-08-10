exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE compatibility_calculation_schedules (
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      created_at BIGINT NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE compatibility_calculation_schedules
  `)
};
