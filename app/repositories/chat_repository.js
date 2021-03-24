const uuid = require('uuid')
const { currentTimeMs } = require('../utils')

const MESSAGES_PER_PAGE = 50

class ChatRepository {
  constructor(conn) {
    this.conn = conn
  }

  async getUserChatIds(userId) {
    const query = `
      SELECT chat_id FROM chat_members WHERE user_id = $1
    `
    const result = await this.conn.query(query, [userId])

    return result.rows.map(chat => chat.chat_id)
  }

  async getChatsById(chatIds) {
    if (!chatIds || 0 === chatIds.length) return []

    const query = `
      SELECT * FROM chats WHERE id IN (${chatIds.map((_, ix) => `$${ix + 1}`)}) ORDER BY last_message_at DESC
    `
    const result = await this.conn.query(query, chatIds)

    return result.rows
  }

  async getUserChats(userId) {
    const query = `
    SELECT chats.* FROM chats
    JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE chat_members.user_id = $1
    `

    const result = await this.conn.query(query, [userId])

    return result.rows
  }

  async getChatUsersFor(chatIds, userId) {
    const qin = chatIds.map((chatId, index) => `$${index + 1}`).join(', ')
    const query = `
    SELECT users.id, users.name, chat_members.chat_id FROM users
    JOIN chat_members ON chat_members.user_id = users.id
    WHERE chat_members.chat_id IN (${qin}) AND chat_members.user_id != $${chatIds.length + 1}
    `

    const result = await this.conn.query(query, [...chatIds, userId])

    return result.rows
  }

  async getChatsMembers(chatIds) {
    if (0 === chatIds.length) return []

    const qin = chatIds.map((_, index) => `$${index + 1}`).join(', ')
    const query = `
    SELECT * FROM chat_members WHERE chat_id IN (${qin})
    `

    const result = await this.conn.query(query, [...chatIds])

    return result.rows
  }

  async getChatUsers(chatIds) {
    const qin = chatIds.map((_, index) => `$${index + 1}`).join(', ')
    const query = `
    SELECT users.id, users.name, chat_members.not_seen_count, chat_members.chat_id FROM users
    JOIN chat_members ON chat_members.user_id = users.id
    WHERE chat_members.chat_id IN (${qin})
    `

    const result = await this.conn.query(query, [...chatIds])

    return result.rows
  }

  async getChatMembersForChat(chatId) {
    const query = `
      SELECT * FROM chat_members WHERE chat_id = $1
    `

    const result = await this.conn.query(query, [chatId])

    return result.rows
  }

  async getChatMembers(chatId) {
    const query = `
    SELECT users.id, users.name, chat_members.chat_id FROM users
    JOIN chat_members ON chat_members.user_id = users.id
    WHERE chat_members.chat_id = $1
    `

    const result = await this.conn.query(query, [chatId])

    return result.rows
  }

  async getChatMessages(chatId) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `

    const result = await this.conn.query(query, [chatId])

    return result.rows
  }

  async getChatMessagesAfter(chatId, createdAt) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `

    const result = await this.conn.query(query, [chatId, createdAt])

    return result.rows
  }


  async loadChatMessages(chatId, ts) {
    const query = `
    SELECT * FROM chat_messages WHERE chat_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT ${MESSAGES_PER_PAGE}
    `

    const result = await this.conn.query(query, [chatId, ts])

    return result.rows
  }

  async isChatMember(chatId, userId) {
    const query = `
    SELECT COUNT(*) FROM chat_members
    WHERE chat_id = $1 AND user_id = $2
    `

    const result = await this.conn.query(query, [chatId, userId])

    return 0 !== parseInt(result.rows[0].count)
  }

  async createMessage({ userId, chatId, text }) {
    const query = `
    INSERT INTO chat_messages (id, user_id, chat_id, text, created_at) VALUES
      ($1, $2, $3, $4, $5)
    `

    const message = { id: uuid.v4(), userId, chatId, text, createdAt: currentTimeMs() }
    await this.conn.query(query, [message.id, userId, chatId, text, message.createdAt ])

    return message
  }

  async getCommonChatId(memberOneId, memberTwoId) {
    const query = `
    SELECT cm1.chat_id
    FROM chat_members AS cm1
    JOIN chat_members  AS cm2 ON cm1.chat_id = cm2.chat_id
    WHERE cm1.user_id = $1 AND cm2.user_id = $2
    `

    const result = await this.conn.query(query, [memberOneId, memberTwoId])

    return result.rows.length === 1 ? result.rows[0].chat_id : null
  }

  async createChat() {
    const chatId = uuid.v4()

    const query = `
    INSERT INTO chats (id, last_message_at, created_at) VALUES ($1, $2, $3)
    `

    await this.conn.query(query, [chatId, currentTimeMs(), currentTimeMs()])

    return chatId
  }

  async incrementNotSeenCount(chatId, userIds) {
    if (!userIds || 0 === userIds.length) return

    const query = `
      UPDATE chat_members SET not_seen_count = not_seen_count + 1 WHERE chat_id = $1 AND user_id IN ($${userIds.map((_, ix) => ix + 2)})
    `

    return await this.conn.query(query, [chatId, ...userIds])
  }

  async seeChatMessages(chatId, userId) {
    const query = `
      UPDATE chat_members SET not_seen_count = 0 WHERE chat_id = $1 AND user_id = $2
    `

    return await this.conn.query(query, [chatId, userId])
  }

  async getNotSeenCount(userId) {
    const query = `
      SELECT * FROM chat_members WHERE user_id = $1 AND not_seen_count > 0
    `

    const result = await this.conn.query(query, [userId])

    return result.rows
  }

  async updateLastChatMessage(chatId, timestamp) {
    const query = `
    UPDATE chats SET last_message_at = $1 WHERE id = $2
    `

    await this.conn.query(query, [timestamp, chatId])

    return chatId
  }

  async createChatMembers(chatId, memberIds) {
    const query = `
    INSERT INTO chat_members (chat_id, user_id, not_seen_count, created_at) VALUES
      ($1, $2, 0, $3),
      ($4, $5, 0, $6)
    `

    const params = []
    for (const i of Array.prototype.concat(memberIds.map(memberId => [ chatId, memberId, currentTimeMs() ]))) {
      for (const j of i) params.push(j)
    }

    const result = await this.conn.query(query, params)

    return result.rows
  }

  static messagesPerPage() {
    return MESSAGES_PER_PAGE
  }
}

module.exports = ChatRepository
