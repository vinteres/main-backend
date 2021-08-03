const { Pool } = require('pg');
const config = require('./config/config');
const { error } = require('./core/logger');
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
      error(err);
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
  handleWithDBClient: connection.handleWithDBClient.bind(connection),
  getClient: connection.getClient.bind(connection)
};
