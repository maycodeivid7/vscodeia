const { WebSocket, WebSocketServer } = require('ws');
const { createHash } = require('node:crypto');
const authService = require('../services/auth-service');
const { readSessionToken } = require('../middleware/auth');
const { getAllowedOrigins } = require('../config/client-origins');

const clientsByUser = new Map();
const clientsBySession = new Map();
let webSocketServer;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) {
    return;
  }
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function removeClient(userId, sessionHash, client) {
  const clients = clientsByUser.get(userId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      clientsByUser.delete(userId);
    }
  }

  const sessionClients = clientsBySession.get(sessionHash);
  if (sessionClients) {
    sessionClients.delete(client);
    if (sessionClients.size === 0) {
      clientsBySession.delete(sessionHash);
    }
  }
}

function attachNotificationHub(server) {
  if (webSocketServer) {
    throw new Error('O hub de notificações já está conectado a um servidor.');
  }

  webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: 1024,
    perMessageDeflate: false,
  });

  server.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch (error) {
      rejectUpgrade(socket, '400', 'Bad Request');
      return;
    }

    if (pathname !== '/api/notifications/stream') {
      rejectUpgrade(socket, '404', 'Not Found');
      return;
    }

    const origin = request.headers.origin;
    if (origin && !getAllowedOrigins().includes(origin)) {
      rejectUpgrade(socket, '403', 'Forbidden');
      return;
    }

    (async () => {
      const token = readSessionToken(request);
      if (!token) {
        rejectUpgrade(socket, '401', 'Unauthorized');
        return;
      }
      const session = await authService.getSessionDetails(token);
      if (!session) {
        rejectUpgrade(socket, '401', 'Unauthorized');
        return;
      }

      webSocketServer.handleUpgrade(request, socket, head, (client) => {
        const userId = session.user.id;
        const clients = clientsByUser.get(userId) || new Set();
        clients.add(client);
        clientsByUser.set(userId, clients);
        const sessionHash = hashToken(token);
        const sessionClients = clientsBySession.get(sessionHash) || new Set();
        sessionClients.add(client);
        clientsBySession.set(sessionHash, sessionClients);
        const expiresIn = Math.max(0, session.expiraEm.getTime() - Date.now());
        const expiryTimer = setTimeout(() => client.close(4401, 'Sessão expirada.'), expiresIn);
        client.on('close', () => {
          clearTimeout(expiryTimer);
          removeClient(userId, sessionHash, client);
        });
        client.on('error', (error) => {
          console.error('Erro no WebSocket de notificações:', error.message);
        });
        client.send(JSON.stringify({ type: 'ready' }));
      });
    })().catch((error) => {
      console.error('Não foi possível autenticar o WebSocket de notificações:', error);
      rejectUpgrade(socket, '500', 'Internal Server Error');
    });
  });
}

function publishNotifications(notifications) {
  for (const notification of notifications) {
    const { usuarioId, ...notificationData } = notification;
    publishUserEvent(usuarioId, { type: 'notification', notification: notificationData });
  }
}

function publishUserEvent(userId, event) {
  const recipients = clientsByUser.get(userId);
  if (!recipients) {
    return;
  }
  const message = JSON.stringify(event);
  for (const client of recipients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, (error) => {
        if (error) {
          console.error('Falha ao enviar atualização em tempo real:', error.message);
          client.terminate();
        }
      });
    }
  }
}

function disconnectUser(userId) {
  const clients = clientsByUser.get(userId);
  if (!clients) {
    return;
  }
  for (const client of clients) {
    client.close(4401, 'Sessão encerrada.');
  }
}

function disconnectSession(token) {
  if (!token) {
    return;
  }
  const clients = clientsBySession.get(hashToken(token));
  if (!clients) {
    return;
  }
  for (const client of clients) {
    client.close(4401, 'Sessão encerrada.');
  }
}

module.exports = {
  attachNotificationHub,
  disconnectSession,
  disconnectUser,
  publishNotifications,
  publishUserEvent,
};
