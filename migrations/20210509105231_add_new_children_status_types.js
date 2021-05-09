
exports.up = (knex) => {
  return Promise.all([
    knex.raw(`
      ALTER TYPE children_status_type ADD VALUE 'does_not_have_and_does_not_want';
    `),
    knex.raw(`
      ALTER TYPE children_status_type ADD VALUE 'does_not_have_but_wants';
    `)
  ])
};

exports.down = (knex) => {
  return knex.raw(`
    DELETE FROM pg_enum
    WHERE enumlabel IN ('does_not_have_but_wants', 'does_not_have_and_does_not_want')
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'children_status_type'
    );
  `)
};

exports.config = { transaction: false };
