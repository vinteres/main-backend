class MatchService {
  constructor(matchRepository) {
    this.matchRepository = matchRepository
  }

  async matchIds(userId) {
    const matches = await this.matchRepository.getMatchesFor(userId)
    const ids = []
    for (const match of matches) {
      ids.push(match.user_one_id == userId ? match.user_two_id : match.user_one_id)
    }

    return ids
  }
}

module.exports = MatchService
