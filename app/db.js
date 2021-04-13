const { Pool } = require('pg')

class Connection {
  constructor() {
    this.pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'vinterest',
      port: 5432,
    })
  }

  async getConnection(handle, errorHandle) {
    const client = await this.pool.connect()
    try {
      await handle(client)
    } catch(err) {
      console.error(err)
      if (errorHandle) errorHandle()
    } finally {
      client.release()
    }
  }

  async getClient() {
    return await this.pool.connect()
  }
}

const connection = new Connection()

module.exports = {
  Connection,
  getConnection(handle, errorHandle) {
    return connection.getConnection(handle, errorHandle)
  },
  getClient() {
    return connection.getClient()
  }
}
