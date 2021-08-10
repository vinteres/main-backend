const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { handleWithDBClient } = require('./db');
const SessionTokenRepository = require('./repositories/session_token_repository');
const { addConnection, send, closeConnection, isConnected } = require('./services/ws_service');
const { initRoutes } = require('./routes');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const requestIp = require('@supercharge/request-ip');
const ServiceDiscoveryRepo = require('./core/service_discovery_repo');
const { scheduleInterestCompatibilityCalculation, scheduleOfflineSetJob, scheduleVerificationJob } = require('./interest_compatibility_calculator');
const { NOTIFS_COUNT } = require('./models/enums/ws_message_type');
const OnlineService = require('./services/online_service');
const { scheduleCompatibilityCalculation } = require('./compatibility_calculator');

const app = express();
const port = 4000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request file logging.
// app.use((req, res, next) => {
//   if (['OPTIONS', 'HEAD'].includes(req.method) || /\./.test(req.originalUrl)) {
//     next();
//     return;
//   }

//   const d = new Date();
//   const time = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
//   const logFilePath = path.join(__dirname, '/../app.log');

//   fs.appendFile(
//     logFilePath,
//     `${req.method} ${req.originalUrl} AT ${time} | IP: ${requestIp.getClientIp(req)} | TOKEN: ${req.headers['x-auth-token']} | AGENT: ${req.headers['user-agent']}\n`,
//     () => {}
//   );

//   next();
// });

// app.use(express.static(process.cwd() + '/dist/'));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', '*');
  res.set('Access-Control-Allow-Headers', '*');

  next();
});

wss.on('connection', (ws, req) => {
  const authToken = (url) => {
    const params = url.split('?')[1].split('&').map(p => p.split('='));

    for (const i of params) {
      if (i[0] === 'x-auth-token') {
        return i[1];
      }
    }

    return null;
  };

  const token = authToken(req.url);
  let currentUserId;
  handleWithDBClient(async (client) => {
    const sessionTokenRepository = new SessionTokenRepository(client);
    currentUserId = await sessionTokenRepository.getUserId(token);

    addConnection(currentUserId, ws);
  });

  ws.on('message', (message) => {
    if (!currentUserId) return;

    const data = JSON.parse(message);
    if (!['msg', 'see_msg', 'notifs_count', 'msgs'].includes(data.type)) return;

    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery) => {
      const chatService = await serviceDiscovery.get('chat_service');

      (await serviceDiscovery.get('online_service')).updateLastOnline(currentUserId);

      if ('see_msg' === data.type) {
        await chatService.seeChatMessages(data.chatId, currentUserId);

        send(currentUserId, {
          type: data.type,
          msg: await chatService.getNotSeenCountFor(currentUserId)
        });
      } else if ('msg' === data.type) {
        await chatService.createAndSend({ ...data, userId: currentUserId });
      } else if (NOTIFS_COUNT === data.type) {
        const notificationService = await serviceDiscovery.get('notification_service');
        const introRepository = await serviceDiscovery.get('intro_repository');

        const [msg, intro, visits, matches] = await Promise.all([
          chatService.getNotSeenCountFor(currentUserId),
          introRepository.notSeenCountFor(currentUserId),
          notificationService.notSeenVisitsCountFor(currentUserId),
          notificationService.notSeenMatchesCountFor(currentUserId)
        ]);

        send(currentUserId, {
          msg, intro, visits, matches,
          type: NOTIFS_COUNT
        });
      } else if ('msgs' === data.type) {
        const messages = await chatService.getMessagesAfter(data.chatId, data.after);

        send(currentUserId, {
          type: data.type,
          chatId: data.chatId,
          messages
        });
      }
    });
  });

  ws.on('close', () => {
    closeConnection(currentUserId, ws);

    if (isConnected(currentUserId)) return;

    setTimeout(() => {
      handleWithDBClient(async (client) => {
        if (isConnected(currentUserId)) return;

        (new OnlineService(client)).setLastOnline(currentUserId, false);
      });
    }, 10000);
  });
});

server.listen(port, () => {
  console.log(`Server started on port ${server.address().port}`);
});

initRoutes(app);

scheduleCompatibilityCalculation();
scheduleInterestCompatibilityCalculation();
scheduleOfflineSetJob();
scheduleVerificationJob();
