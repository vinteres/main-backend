const ServiceDiscovery = require('../core/service_discovery')
const { getClient } = require('../db')

class Controller {
  constructor() {
    this.serviceDiscovery = new ServiceDiscovery(this)
  }

  getAuthToken(req) {
    return req.headers['x-auth-token']
  }

  errorHandle(res) {
    return Controller.sendError(res, 500, 'Internal server error')
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = await getClient()
    }

    return this.connection
  }

  closeConnection() {
    if (this.connection) {
      this.connection.release()
    }
  }

  static sendError(res, code = 500, msg = '') {
    return res.status(code).json({
      error: new Error(msg)
    })
  }
}

const handle = (controller, action) => {
  return async (req, res) => {
    const inst = new controller()
    try {
      return await inst[action](req, res)
    } catch(err) {
      console.error(err)

      return Controller.sendError(res)
    } finally {
      inst.closeConnection()
    }
  }
}

module.exports = {
  Controller,
  handle
}
