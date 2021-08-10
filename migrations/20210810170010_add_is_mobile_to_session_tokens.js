exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE session_tokens ADD COLUMN is_mobile BOOL;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE session_tokens DROP COLUMN is_mobile;
  `)
};
