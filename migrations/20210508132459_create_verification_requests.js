
exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE verification_requests (
      id UUID PRIMARY KEY,
      image_id UUID NOT NULL REFERENCES media_metadatas(id),
      user_id UUID NOT NULL REFERENCES users(id),
      status verification_request_status NOT NULL,
      completed_at BIGINT,
      rejected_at BIGINT,
      created_at BIGINT NOT NULL
    )
  `)
};

exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE verification_requests
  `)
};
