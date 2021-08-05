exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE search_preferences ADD COLUMN income VARCHAR(255);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE search_preferences DROP COLUMN income;
  `)
};
