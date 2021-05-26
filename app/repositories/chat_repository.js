const uuid = require('uuid');
const { currentTimeMs } = require('../utils');

const MESSAGES_PER_PAGE = 50;

class ChatRepository {
  constructor(conn) {
    this.conn = conn;
  }

  // CHATS

  async getChatsById(chatIds) {
    if (!chatIds || 0 === chatIds.length) return [];

    const query = `
      SELECT * FROM chats WHERE id IN (${chatIds.map((_, ix) => `$${ix + 1}`)}) ORDER BY last_message_at DESC
    `;
    const result = await this.conn.query(query, chatIds);

    return result.rows;
  }

  async createChat() {
    const chatId = uuid.v4();

    const query = `
    INSERT INTO chats (id, last_message_at, created_at) VALUES ($1, $2, $3)
    `;

    await this.conn.query(query, [chatId, currentTimeMs(), currentTimeMs()]);

    return chatId;
  }

  async updateLastChatMessage(chatId, timestamp) {
    const query = `
    UPDATE chats SET last_message_at = $1 WHERE id = $2
    `;

    await this.conn.query(query, [timestamp, chatId]);

    return chatId;
  }

  // CHAT_MEMBERS

  async getCommonChatId(memberOneId, memberTwoId) {
    const query = `
    SELECT cm1.chat_id
    FROM chat_members AS cm1
    JOIN chat_members  AS cm2 ON cm1.chat_id = cm2.chat_id
    WHERE cm1.rel_id = $1 AND cm2.rel_id = $2
    `;

    const result = await this.conn.query(query, [memberOneId, memberTwoId]);

    return result.rows.length === 1 ? result.rows[0].chat_id : null;
  }

  async incrementNotSeenCount(chatId, relIds) {
    if (!relIds || 0 === relIds.length) return;

    const query = `
      UPDATE chat_members SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND rel_id IN ($${relIds.map((_, ix) => ix + 2)})
    `;

    return await this.conn.query(query, [chatId, ...relIds]);
  }

  async seeChatMessages(chatId, relId) {
    const query = `
      UPDATE chat_members SET not_seen_count = 0 WHERE chat_id = $1 AND rel_id = $2
    `;

    return await this.conn.query(query, [chatId, relId]);
  }

  async getNotSeenCount(relId) {
    const query = `
      SELECT chat_id, not_seen_count FROM chat_members WHERE rel_id = $1 AND not_seen_count > 0
    `;

    const result = await this.conn.query(query, [relId]);

    return result.rows;
  }

  async createChatMembers(chatId, members) {
    const query = `
    INSERT INTO chat_members (chat_id, rel_id, rel_type, not_seen_count, created_at) VALUES
      ($1, $2, $3, 0, $4),
      ($5, $6, $7, 0, $8)
    `;

    const params = [];
    for (const i of Array.prototype.concat(members.map(({ id, type }) => [chatId, id, type || 'user', currentTimeMs()]))) {
      for (const j of i) params.push(j);
    }

    const result = await this.conn.query(query, params);

    return result.rows;
  }

  async getChatIdsForUser(relId) {
    const query = `
      SELECT chat_id FROM chat_members WHERE rel_id = $1
    `;
    const result = await this.conn.query(query, [relId]);

    return result.rows.map(chat => chat.chat_id);
  }

  async getChatsMembersInChats(chatIds) {
    if (0 === chatIds.length) return [];

    const qin = chatIds.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      SELECT * FROM chat_members WHERE chat_id IN (${qin})
    `;

    const result = await this.conn.query(query, [...chatIds]);

    return result.rows;
  }

  async getChatMembers(chatId) {
    const query = `
    SELECT chat_id, rel_id, rel_type
    FROM chat_members
    WHERE chat_id = $1
    `;

    const result = await this.conn.query(query, [chatId]);

    return result.rows;
  }

  async findRelType(chatId, relId) {
    const query = `
    SELECT rel_type
    FROM chat_members
    WHERE chat_id = $1 AND rel_id = $2
    `;

    const result = await this.conn.query(query, [chatId, relId]);

    const item = result.rows[0];

    return item ? item.rel_type : null;
  }

  async isChatMember(chatId, relId) {
    const query = `
    SELECT COUNT(*)
    FROM chat_members
    WHERE chat_id = $1 AND rel_id = $2
    `;

    const result = await this.conn.query(query, [chatId, relId]);

    return 0 !== parseInt(result.rows[0].count);
  }

  // CHAT_MESSAGES

  async getChatMessages(chatId) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `;

    const result = await this.conn.query(query, [chatId]);

    return result.rows;
  }

  async getChatMessagesAfter(chatId, createdAt) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `;

    const result = await this.conn.query(query, [chatId, createdAt]);

    return result.rows;
  }

  async loadChatMessages(chatId, ts) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `;

    const result = await this.conn.query(query, [chatId, ts]);

    return result.rows;
  }

  async createMessage({ userId, chatId, text }) {
    const query = `
    INSERT INTO chat_messages (id, user_id, chat_id, text, created_at) VALUES
      ($1, $2, $3, $4, $5)
    `;

    const message = { id: uuid.v4(), userId, chatId, text, createdAt: currentTimeMs() };
    await this.conn.query(query, [message.id, userId, chatId, text, message.createdAt]);

    return message;
  }

  static messagesPerPage() {
    return MESSAGES_PER_PAGE;
  }
}

module.exports = ChatRepository;
