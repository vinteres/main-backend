
exports.up = (knex) => {
  return knex.raw(`
    CREATE TYPE verification_status AS ENUM (
      'verified',
      'pending',
      'rejected',
      'unverified'
    );
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TYPE verification_status
  `)
};
