exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE user_free_time_activities ADD COLUMN favorite BOOL;
    ALTER TABLE custom_free_time_activities ADD COLUMN favorite BOOL;
    ALTER TABLE user_hobbies ADD COLUMN favorite BOOL;
    ALTER TABLE custom_hobbies ADD COLUMN favorite BOOL;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE user_free_time_activities DROP COLUMN favorite;
    ALTER TABLE custom_free_time_activities DROP COLUMN favorite;
    ALTER TABLE user_hobbies DROP COLUMN favorite;
    ALTER TABLE custom_hobbies DROP COLUMN favorite;
  `)
};