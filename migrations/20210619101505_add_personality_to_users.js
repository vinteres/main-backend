
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN personality personality_type;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN personality;
  `)
};
