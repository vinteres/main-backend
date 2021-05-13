const { Pool } = require('pg')
const config = require('./config/config')

class Connection {
  constructor() {
    this.pool = new Pool(config.DB)
  }

  async getConnection(handle, errorHandle) {
    const client = await this.getClient();

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
