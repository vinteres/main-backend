
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN compatibility_processed_at BIGINT;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN compatibility_processed_at;
  `)
};
