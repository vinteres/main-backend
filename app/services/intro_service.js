const UserRelationStatusType = require("../models/enums/user_relation_status_type")
const { sendData } = require("./ws_service")

class IntroService {
  constructor(introRepository, matchRepository) {
    this.introRepository = introRepository
    this.matchRepository = matchRepository
  }

  async create({ fromUserId, toUserId, type, message, mediaMetadataId }) {
    const intro = await this.introRepository.create({ fromUserId, toUserId, type, message, mediaMetadataId })

    sendData(toUserId, {
      ...intro,
      type: 'intro'
    })

    return intro
  }

  async unmatch(userOneId, userTwoId) {
    return await this.matchRepository.unmatch(userOneId, userTwoId)
  }

  async relationBetween(userOneId, userTwoId) {
    if (userOneId === userTwoId) return
    if (!userOneId || !userTwoId) return

    const areMatched = await this.introRepository.areMatched(userOneId, userTwoId)
    if (areMatched) {
      return UserRelationStatusType.MATCHED
    }

    const intro = await this.introRepository.getIntroFor(userOneId, userTwoId)
  
    if (!intro || intro.liked_at) return

    if (intro.to_user_id === userOneId) {
      return UserRelationStatusType.INTRO_TO_ME
    } else {
      return UserRelationStatusType.INTRO_FROM_ME
    }
  }
}

module.exports = IntroService
