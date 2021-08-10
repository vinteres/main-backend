exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE verification_requests DROP COLUMN id;
    ALTER TABLE verification_requests DROP COLUMN completed_at;
    ALTER TABLE verification_requests DROP COLUMN rejected_at;
    ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (user_id);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE verification_requests DROP CONSTRAINT verification_requests_pkey;
    ALTER TABLE verification_requests ADD COLUMN id UUID PRIMARY KEY;
    ALTER TABLE verification_requests ADD COLUMN completed_at BIGINT;
    ALTER TABLE verification_requests ADD COLUMN rejected_at BIGINT;
  `)
};
