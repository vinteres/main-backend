const ChatRepository = require('../repositories/chat_repository');
const { getProfileImagePath } = require('../services/media_service');
const { Controller } = require('../core/controller');
const { timeAgo } = require('../utils');
const MediaService = require('../services/media_service');
const ChatMemberType = require('../models/enums/chat_member_type');

class ChatController extends Controller {
  async members(req, res) {
    const token = this.getAuthToken(req);

    const sessionTokenRepository = await this.getService('session_token_repository');
    const chatRepository = await this.getService('chat_repository');
    const userRepository = await this.getService('user_repository');
    const pageRepository = await this.getService('page_repository');
    const matchRepository = await this.getService('match_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    const chatIds = await chatRepository.getChatIdsForUser(loggedUserId);
    const chats = await chatRepository.getChatsById(chatIds);

    const membersData = await chatRepository.getChatsMembersInChats(chatIds);

    const chatMembers = membersData.filter(member => member.rel_id !== loggedUserId);
    const chatUserMembers = chatMembers.filter(member => ChatMemberType.USER === member.rel_type);
    const chatPageMembers = chatMembers.filter(member => ChatMemberType.PAGE === member.rel_type);
    const tu = membersData.filter(member => member.rel_id === loggedUserId);

    let matches = [];
    if (0 < chatMembers.length) {
      matches = await matchRepository.getMatchesFor(loggedUserId);
      matches = matches.map(match => {
        if (match.user_one_id === loggedUserId) {
          return match.user_two_id;
        }

        return match.user_one_id;
      });
    }

    const [userImages, pageImages] = await Promise.all([
      userRepository.getUsersImage(chatUserMembers.map(user => user.rel_id)),
      pageRepository.findByIds(
        ['id', 'name', 'profile_image_id'],
        chatPageMembers.map(user => user.rel_id)
      )
    ]);

    chatMembers.forEach(member => {
      if (ChatMemberType.USER === member.rel_type) {
        const imageItem = userImages.find(image => member.rel_id === image.id);

        member.name = imageItem.name;
        // user.gender = u.gender
        member.profileImage = getProfileImagePath(imageItem);
      } else if (ChatMemberType.PAGE === member.rel_type) {
        const imageItem = pageImages.find(image => member.rel_id === image.id);

        member.name = imageItem.name;
        member.profileImage = MediaService.mediaPath(imageItem.profile_image_id, 'small');
      }
    });

    let result = chats.map(chat => {
      const member = chatMembers.find(item => item.chat_id === chat.id);
      const matched = matches.find(match => match === member.rel_id);
      if (ChatMemberType.USER === member.rel_type && !matched) return;

      const lastMessageAt = chat.last_message_at;
      const notSeenCount = tu.find(item => item.chat_id === chat.id).not_seen_count;

      return {
        id: member.rel_id,
        name: member.name,
        profileImage: member.profileImage,
        chat_id: member.chat_id,
        lastMessageAt,
        notSeenCount
      };
    });
    result = result.filter(user => !!user);

    res.json(result);
  }

  async get(req, res) {
    const token = this.getAuthToken(req);
    const userId = req.params.userId;

    const chatRepository = await this.getService('chat_repository');
    const chatService = await this.getService('chat_service');
    const sessionTokenRepository = await this.getService('session_token_repository');
    const matchRepository = await this.getService('match_repository');
    const userRepository = await this.getService('user_repository');
    const pageRepository = await this.getService('page_repository');
    const con = await this.getConnection();

    const loggedUserId = await sessionTokenRepository.getUserId(token);

    try {
      con.query('BEGIN');

      let chatId = await chatRepository.getCommonChatId(loggedUserId, userId);
      let memberType = await chatRepository.findRelType(chatId, userId);

      if ('page' !== memberType) {
        const matched = await matchRepository.areMatched(loggedUserId, userId);
        if (!matched) {
          return res.json({
            member: false
          });
        }
      }

      if (!chatId) {
        chatId = await chatRepository.createChat();
        await chatRepository.createChatMembers(chatId, [{ id: loggedUserId }, { id: userId }]);
      }
      await chatService.seeChatMessages(chatId, loggedUserId);

      con.query('COMMIT');

      memberType = memberType || 'user';

      let messages = await chatRepository.getChatMessages(chatId);
      let user;
      if (ChatMemberType.USER === memberType) {
        user = await userRepository.getUserById(userId);
      } else if (ChatMemberType.PAGE === memberType) {
        user = await pageRepository.findById(['id', 'name', 'profile_image_id'], userId);
      }

      messages = messages.reverse();

      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        lastMessage.postedAgo = timeAgo(lastMessage.created_at);
      }

      res.json({
        member: true,
        chatId,
        user: {
          id: user.id,
          type: memberType,
          name: user.name,
          profileImage: MediaService.getProfileImagePath(user),
        },
        messages,
        hasMoreMsgs: ChatRepository.messagesPerPage() === messages.length
      });

    } catch (e) {
      con.query('ROLLBACK');

      throw e;
    }
  }

  async loadOlder(req, res) {
    const token = this.getAuthToken(req);
    const chatId = req.params.userId;
    const ts = req.query.t;

    const chatRepository = await this.getService('chat_repository');
    const sessionTokenRepository = await this.getService('session_token_repository');

    const loggedUserId = await sessionTokenRepository.getUserId(token);
    const isChatMember = await chatRepository.isChatMember(chatId, loggedUserId);

    if (!isChatMember) {
      return res.status(403).end();
    }

    let messages = await chatRepository.loadChatMessages(chatId, ts);
    messages = messages.reverse();

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.postedAgo = timeAgo(lastMessage.created_at);
    }

    res.json({
      messages,
      hasMoreMsgs: ChatRepository.messagesPerPage() === messages.length
    });
  }
}

module.exports = ChatController;
