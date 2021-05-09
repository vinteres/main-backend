
exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_user_id_fkey;
    CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    DROP INDEX idx_chat_messages_user_id;
    ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  `)
};
