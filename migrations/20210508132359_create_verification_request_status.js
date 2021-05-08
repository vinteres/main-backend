
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE verification_request_status AS ENUM (
      'verified',
      'pending',
      'rejected'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE verification_request_status
  `)
};
