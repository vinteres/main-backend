
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users
    ADD COLUMN
    verification_status verification_status
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users
    DROP COLUMN
    verification_status
  `)
};
