exports.up = (knex) => {
  return knex.raw(`
    alter table search_preferences alter column from_age drop not null;
    alter table search_preferences alter column to_age drop not null;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    alter table search_preferences alter column from_age set not null;
    alter table search_preferences alter column to_age set not null;
  `)
};
