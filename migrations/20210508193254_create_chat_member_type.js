
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE chat_member_type AS ENUM (
      'user',
      'page'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE chat_member_type
  `)
};
