import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { app } from './app.js';

const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
  // TODO: Add proper logging instead of console.log
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      // TODO: Add proper message handling
    } catch (error) {
      // TODO: Add proper error handling
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    // TODO: Add proper logging instead of console.log
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('listening on port', PORT); 
  // TODO: Add proper logging instead of console.log
  // Server is now running on port ${PORT}
});
