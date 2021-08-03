exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN access_token VARCHAR(255);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN access_token;
  `)
};
