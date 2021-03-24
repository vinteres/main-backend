const { timeAgo } = require("../utils")
const { sendData } = require("./ws_service")

class ChatService {
  constructor(chatRepository) {
    this.chatRepository = chatRepository
  }

  async createChatIfNotExists(userOneId, userTwoId) {
    let chatId = await this.chatRepository.getCommonChatId(userOneId, userTwoId)
    if (!chatId) {
      chatId = await this.chatRepository.createChat()
      await this.chatRepository.createChatMembers(chatId, [userOneId, userTwoId])
    }

    return chatId
  }

  async getNotSeenCountFor(userId) {
    const userChats = await this.chatRepository.getNotSeenCount(userId)

    const result = {}
    for (const chat of userChats) {
      result[chat.chat_id] = chat.not_seen_count
    }

    return result
  }

  async getMessagesAfter(chatId, after) {
    let messages = await this.chatRepository.getChatMessagesAfter(chatId, after)

    messages = messages.reverse()

    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at)
    }

    return messages
  }

  calculateNotSeenCount(chats) {
    if (0 === chats.length) return 0
    if (1 === chats.length) return chats[0].not_seen_count

    let totalNotSeenCount = 0
    for (const chat of chats) totalNotSeenCount += chat.not_seen_count

    return totalNotSeenCount
  }

  async createAndSend({ userId, chatId, text }) {
    const message = await this.createMessage({ userId, chatId, text })
    const chatMembers = await this.chatRepository.getChatMembers(chatId)
    const sender = chatMembers.find(member => member.id === userId)
    const otherMemberIds = chatMembers.filter(member => member.id !== userId).map(user => user.id)

    await this.chatRepository.incrementNotSeenCount(chatId, otherMemberIds)

    chatMembers.forEach(member => {
      sendData(member.id, {
        type: 'msg',
        text,
        chatId,
        user_id: userId,
        user_name: sender.name,
        created_at: message.createdAt,
        postedAgo: timeAgo(message.createdAt)
      })
    })
  }

  async createMessage({ userId, chatId, text, cardId }) {
    const message = await this.chatRepository.createMessage({ userId, chatId, text, cardId })
    await this.chatRepository.updateLastChatMessage(message.chatId, message.createdAt)

    return message
  }

  async seeChatMessages(chatId, userId) {
    await this.chatRepository.seeChatMessages(chatId, userId)

    sendData(userId, {
      type: 'see_msg',
      msg: await this.getNotSeenCountFor(userId)
    })
  }
}

module.exports = ChatService
