
exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE profile_questions (
      id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES profile_question_categories(id),
      text VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE profile_questions
  `)
};
