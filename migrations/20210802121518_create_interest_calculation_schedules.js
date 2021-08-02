exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE interest_calculation_schedules (
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      created_at BIGINT NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE interest_calculation_schedules
  `)
};
