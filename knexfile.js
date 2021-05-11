const { DB } = require('./app/config/config')

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      user: DB.user,
      database: DB.database,
      password: DB.password
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      user: DB.user,
      database: DB.database,
      password: DB.password
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
