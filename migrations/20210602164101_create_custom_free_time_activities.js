
exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE custom_free_time_activities (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    )
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE custom_free_time_activities
  `)
};
