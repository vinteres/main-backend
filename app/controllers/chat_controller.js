const ChatRepository = require('../repositories/chat_repository')
const { getProfileImagePath } = require('../services/media_service')
const { Controller } = require('./controller')
const { timeAgo } = require('../utils')
const MediaService = require('../services/media_service')

class ChatController extends Controller {
  async members(req, res) {
    const token = this.getAuthToken(req)

    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const chatRepository = await this.serviceDiscovery.get('chat_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')
    const matchRepository = await this.serviceDiscovery.get('match_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)

    const chatIds = await chatRepository.getUserChatIds(loggedUserId)
    const chats = await chatRepository.getChatsById(chatIds)

    const membersData = await chatRepository.getChatsMembers(chatIds)

    const chatMembers = membersData.filter(member => member.user_id !== loggedUserId)
    const tu = membersData.filter(member => member.user_id === loggedUserId)

    let matches = []
    if (0 < chatMembers.length) {
      matches = await matchRepository.getMatchesFor(loggedUserId)
      matches = matches.map(match => {
        if (match.user_one_id === loggedUserId) {
          return match.user_two_id
        }

        return match.user_one_id
      })
    }

    const userImages = await userRepository.getUsersImage(chatMembers.map(user => user.user_id))

    chatMembers.map(user => {
      const u = userImages.find(userImage => user.user_id === userImage.id)

      user.name = u.name
      user.gender = u.gender
      user.profileImage = getProfileImagePath(u)

      return user
    })

    let result = chats.map(chat => {
      const member = chatMembers.find(item => item.chat_id === chat.id)
      const matched = matches.find(match => match === member.user_id)
      if (!matched) return

      const lastMessageAt = chat.last_message_at
      const notSeenCount = tu.find(item => item.chat_id === chat.id).not_seen_count

      return {
        id: member.user_id,
        name: member.name,
        profileImage: member.profileImage,
        chat_id: member.chat_id,
        lastMessageAt,
        notSeenCount
      }
    })
    result = result.filter(user => user)

    res.json(result)
  }

  async get(req, res) {
    const token = this.getAuthToken(req)
    const userId = req.params.userId

    const chatRepository = await this.serviceDiscovery.get('chat_repository')
    const chatService = await this.serviceDiscovery.get('chat_service')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')
    const matchRepository = await this.serviceDiscovery.get('match_repository')
    const userRepository = await this.serviceDiscovery.get('user_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const matched = await matchRepository.areMatched(loggedUserId, userId)

    if (!matched) {
      return res.json({
        member: false
      })
    }
    let chatId = await chatRepository.getCommonChatId(loggedUserId, userId)
    if (!chatId) {
      chatId = await chatRepository.createChat()
      await chatRepository.createChatMembers(chatId, [loggedUserId, userId])
    }
    await chatService.seeChatMessages(chatId, loggedUserId)

    let messages = await chatRepository.getChatMessages(chatId)
    const user = await userRepository.getUserById(userId)

    messages = messages.reverse()

    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at)
    }

    res.json({
      member: true,
      chatId,
      user: {
        id: user.id,
        name: user.name,
        profileImage: MediaService.getProfileImagePath(user),
      },
      messages,
      hasMoreMsgs: ChatRepository.messagesPerPage() === messages.length
    })
  }

  async loadOlder(req, res) {
    const token = this.getAuthToken(req)
    const chatId = req.params.userId
    const ts = req.query.t

    const chatRepository = await this.serviceDiscovery.get('chat_repository')
    const sessionTokenRepository = await this.serviceDiscovery.get('session_token_repository')

    const loggedUserId = await sessionTokenRepository.getUserId(token)
    const isChatMember = await chatRepository.isChatMember(chatId, loggedUserId)

    if (!isChatMember) {
      return res.status(403).end()
    }

    let messages = await chatRepository.loadChatMessages(chatId, ts)
    messages = messages.reverse()

    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at)
    }

    res.json({
      messages,
      hasMoreMsgs: ChatRepository.messagesPerPage() === messages.length
    })
  }
}

module.exports = ChatController
