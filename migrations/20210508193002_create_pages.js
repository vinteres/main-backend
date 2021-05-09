
exports.up = (knex) => {
  return knex.raw(`
    CREATE TABLE pages (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      profile_image_id UUID REFERENCES media_metadatas(id),
      created_at BIGINT NOT NULL
    )
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP TABLE pages
  `)
};
