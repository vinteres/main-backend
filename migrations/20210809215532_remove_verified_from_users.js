exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN verified;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN verified BOOL;
  `)
};
