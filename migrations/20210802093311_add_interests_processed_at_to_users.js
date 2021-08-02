exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN interests_processed_at BIGINT;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN interests_processed_at;
  `)
};
