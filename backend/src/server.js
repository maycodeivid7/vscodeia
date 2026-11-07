require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { createServer } = require('node:http');
const { attachNotificationHub } = require('./realtime/notification-hub');

const port = Number(process.env.PORT || 3000);

connectDatabase()
  .then(() => {
    const server = createServer(app);
    attachNotificationHub(server);
    server.listen(port, () => {
      console.log(`API Nexo disponível na porta ${port}.`);
    });
  })
  .catch((error) => {
    console.error('Não foi possível iniciar a API:', error.message);
    process.exitCode = 1;
  });
