
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE chat_members DROP CONSTRAINT chat_members_user_id_fkey;
    ALTER TABLE chat_members RENAME COLUMN user_id TO rel_id;
    CREATE INDEX idx_chat_members_rel_id ON chat_members(rel_id);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP INDEX idx_chat_members_rel_id;
    ALTER TABLE chat_members RENAME COLUMN rel_id TO user_id;
    ALTER TABLE chat_members 
    ADD CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  `)
};
