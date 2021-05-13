
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE user_compatability RENAME TO user_compatibilities
  `)
};

exports.down = (knex) => {
  return knex.raw(`
  ALTER TABLE user_compatibilities RENAME TO user_compatability
  `)
};
