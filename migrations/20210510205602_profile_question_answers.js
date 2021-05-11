
exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE profile_question_answers (
      category_id INTEGER NOT NULL REFERENCES profile_question_categories(id),
      question_id INTEGER NOT NULL REFERENCES profile_questions(id),
      user_id UUID REFERENCES users(id),
      text text NOT NULL,
      created_at BIGINT NOT NULL,
      UNIQUE(category_id, user_id)
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE profile_question_answers
  `)
};
