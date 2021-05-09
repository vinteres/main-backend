
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE chat_members
    ADD COLUMN
    rel_type chat_member_type
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE chat_members
    DROP COLUMN
    rel_type
  `)
};
