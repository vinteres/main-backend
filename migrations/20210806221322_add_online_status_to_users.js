exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN is_online BOOL;
    ALTER TABLE users ADD COLUMN last_online_at BIGINT;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN is_online;
    ALTER TABLE users DROP COLUMN last_online_at;
  `)
};
