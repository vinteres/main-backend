const { currentTimeMs } = require('../utils')

class ReportRepository {
  constructor(conn) {
    this.conn = conn
  }

  async isReported(reporterId, reportedId) {
    const query = `
      SELECT COUNT(*) FROM reports
      WHERE reporter_user_id = $1 AND reported_user_id = $2
    `

    const result = await this.conn.query(query, [reporterId, reportedId])

    return 0 !== parseInt(result.rows[0].count)
  }

  async hasReported(reporterId, reportedIds) {
    if (!reportedIds || 0 === reportedIds.length) return {}

    const query = `
      SELECT reported_user_id FROM reports
      WHERE reporter_user_id = $1 AND reported_user_id IN (${reportedIds.map((id, ix) => `$${ix + 2}`)})
    `

    let result = await this.conn.query(query, [reporterId, ...reportedIds])
    result = result.rows.map(i => i.reported_user_id)

    const res = {}
    for (const id of reportedIds) {
      res[id] = !!result.filter(i => i === id).length
    }

    return res
  }

  async createReport({ fromUserId, toUserId, type, details }) {
    const createdAt = currentTimeMs()
    const query = 'INSERT INTO reports (reporter_user_id, reported_user_id, type, details, created_at) VALUES ($1, $2, $3, $4, $5)'
    await this.conn.query(query, [fromUserId, toUserId, type, details, createdAt])

    return { fromUserId, toUserId, type, details, createdAt }
  }

  async createFeedback({ userId, type, details }) {
    const createdAt = currentTimeMs()
    const query = 'INSERT INTO feedbacks (user_id, type, details, created_at) VALUES ($1, $2, $3, $4)'
    await this.conn.query(query, [userId, type, details, createdAt])

    return { userId, type, details, createdAt }
  }
}

module.exports = ReportRepository
