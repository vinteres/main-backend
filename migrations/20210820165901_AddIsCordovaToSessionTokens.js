exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE session_tokens ADD COLUMN is_cordova BOOL;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE session_tokens DROP COLUMN is_cordova;
  `)
};
