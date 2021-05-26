const STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const wsConnections = {};

const addConnection = (userId, ws) => {
  if (!wsConnections[userId]) {
    wsConnections[userId] = {
      connections: []
    };
  }
  wsConnections[userId].connections.push(ws);
};

const closeConnection = (userId, ws) => {
  if (!wsConnections[userId] || !wsConnections[userId].connections) return;

  for (let i = 0; i < wsConnections[userId].connections.length; i++) {
    if (ws === wsConnections[userId].connections[i]) {
      wsConnections[userId].connections.splice(i, 1);

      break;
    }
  }

  if (0 === wsConnections[userId].connections.length) {
    delete wsConnections[userId];
  }
};

const sendData = (userId, data) => {
  if (!wsConnections[userId]) {
    return;
  }

  wsConnections[userId].connections.forEach(connection => {
    connection.send(JSON.stringify(data));
  });
};

const isConnected = (userId) => {
  if (!wsConnections[userId]) return false;

  for (const conn of wsConnections[userId].connections) {
    if (conn.readyState == STATE.OPEN) return true;
  }

  return false;
};

module.exports = {
  addConnection,
  closeConnection,
  sendData,
  isConnected,
};
