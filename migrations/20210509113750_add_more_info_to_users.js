
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE users ADD COLUMN employment_status employment_type;
    ALTER TABLE users ADD COLUMN education_status education_type;
    ALTER TABLE users ADD COLUMN looking_for_type INTEGER;
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE users DROP COLUMN employment_status;
    ALTER TABLE users DROP COLUMN education_status;
    ALTER TABLE users DROP COLUMN looking_for_type;
  `)
};
