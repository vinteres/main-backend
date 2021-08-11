
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN deleted_at BIGINT;
    ALTER TABLE users ADD COLUMN active_at BIGINT;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN deleted_at;
    ALTER TABLE users DROP COLUMN active_at;
  `)
};
