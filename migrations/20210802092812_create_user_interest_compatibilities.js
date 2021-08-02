exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE user_interest_compatibilities (
      user_one_id UUID NOT NULL REFERENCES users(id),
      user_two_id UUID NOT NULL REFERENCES users(id),
      percent INTEGER NOT NULL
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE user_interest_compatibilities
  `)
};
