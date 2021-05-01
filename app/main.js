const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const WebSocket = require('ws')
const { getConnection } = require('./db')
const SessionTokenRepository = require('./repositories/session_token_repository')
const { addConnection, sendData, closeConnection } = require('./services/ws_service')
const ChatService = require('./services/chat_service')
const NotificationService = require('./services/notification_service')
const IntroRepository = require('./repositories/intro_repository')
const { initRoutes } = require('./routes')
const ChatRepository = require('./repositories/chat_repository')
const NotificationRepository = require('./repositories/notification_repository')
const UserRepository = require('./repositories/user_repository')
const compression = require('compression')
const path = require('path')
const fs = require('fs')

const app = express()
const port = 4000

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

app.use(compression())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  if (['OPTIONS', 'HEAD'].includes(req.method) || /\./.test(req.originalUrl)) {
    next();
    return
  }

  const d = new Date();
  const time = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
  const logFilePath = path.join(__dirname, `/../app.log`)

  fs.appendFile(
    logFilePath,
    `${req.method} ${req.originalUrl} AT ${time}\nTOKEN: ${req.headers['x-auth-token']}\nUser agent: ${req.headers['user-agent']}\n\n`,
    (err) => {}
  );

  next();
})

app.use(express.static(process.cwd() + '/dist/'))

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', '*')
  res.set('Access-Control-Allow-Headers', '*')

  next()
})

wss.on('connection', (ws, req) => {
  const authToken = (url) => {
    const params = url.split('?')[1].split('&').map(p => p.split('='))

    for (const i of params) {
      if (i[0] === 'x-auth-token') {
        return i[1]
      }
    }

    return null
  }

  const token = authToken(req.url)
  let currentUserId
  getConnection(async (client) => {
    const sessionTokenRepository = new SessionTokenRepository(client)
    currentUserId = await sessionTokenRepository.getUserId(token)

    addConnection(currentUserId, ws)
  })

  ws.on('message', (message) => {
    if (!currentUserId) return

    const data = JSON.parse(message)
    if (!['msg', 'see_msg', 'notifs_count', 'msgs'].includes(data.type)) return

    getConnection(async (client) => {
      const chatService = new ChatService(new ChatRepository(client))

      if ('see_msg' === data.type) {
        await chatService.seeChatMessages(data.chatId, currentUserId)

        sendData(currentUserId, {
          type: data.type,
          msg: await chatService.getNotSeenCountFor(currentUserId)
        })
      } else if ('msg' === data.type) {
        await chatService.createAndSend({ ...data, userId: currentUserId })
      } else if ('notifs_count' === data.type) {
        const notificationService = new NotificationService(
          new NotificationRepository(client),
          new UserRepository(client)
        )
        const introRepository = new IntroRepository(client)

        const result = {
          msg: await chatService.getNotSeenCountFor(currentUserId),
          notif: await notificationService.getNotSeenCountFor(currentUserId),
          intro: await introRepository.notSeenCountFor(currentUserId)
        }

        sendData(currentUserId, {
          ...result,
          type: 'notifs_count'
        })
      } else if ('msgs' === data.type) {
        const messages = await chatService.getMessagesAfter(data.chatId, data.after)

        sendData(currentUserId, {
          type: data.type,
          chatId: data.chatId,
          messages
        })
      }
    })
  })

  ws.on('close', () => {
    closeConnection(currentUserId, ws)
  })
})

server.listen(port, () => {
  console.log(`Server started on port ${server.address().port}`)
})

initRoutes(app)
