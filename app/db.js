const { Pool } = require('pg');
const config = require('./config/config');
const { isProd } = require('./utils');

class Connection {
  constructor() {
    this.pool = new Pool(config.DB);
  }

  async handleWithDBClient(handle, errorHandle) {
    const client = await this.getClient();

    try {
      await handle(client);
    } catch(err) {
      console.error(err);
      if (errorHandle) errorHandle();
    } finally {
      client.release();
    }
  }

  async getClient() {
    const con = await this.pool.connect();

    if (isProd()) return con;

    return {
      async query(query, params) {
        console.log(new Date());
        console.log(query.trim().split(/\s+/).join(' '));
        console.log();

        return con.query(query, params);
      },
      async release() {
        return await con.release();
      }
    };
  }
}

const connection = new Connection();

module.exports = {
  Connection,
  handleWithDBClient(handle, errorHandle) {
    return connection.handleWithDBClient(handle, errorHandle);
  },
  getClient() {
    return connection.getClient();
  }
};
