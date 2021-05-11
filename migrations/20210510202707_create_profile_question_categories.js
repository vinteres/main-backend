
exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE profile_question_categories (
      id INTEGER PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE profile_question_categories
  `)
};
