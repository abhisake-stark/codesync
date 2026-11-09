import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import { createRoomsRouter } from './routes/rooms';
import sessionsRoutes from './routes/sessions';
import { setupRoomHandlers } from './socket/roomHandler';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

export const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  destroyUpgrade: false
});
setupRoomHandlers(io);

// y-websocket for CRDT sync — attached manually to avoid conflicts
// with Socket.io's upgrade handler on the same HTTP server.
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

  if (pathname.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
  // Socket.io handles its own upgrade internally.
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', createRoomsRouter(io));
app.use('/api/sessions', sessionsRoutes);

const PORT = process.env.PORT || 3001;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codesync')
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });