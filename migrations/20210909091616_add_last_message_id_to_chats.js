exports.up = (knex) => {
  return knex.raw(`
    ALTER TABLE chats ADD COLUMN last_message_id UUID REFERENCES chat_messages(id);
  `)
};

exports.down = (knex) => {
  return knex.raw(`
    ALTER TABLE chats DROP COLUMN last_message_id;
  `)
};
