import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

export const setupYjsServer = (server: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', setupWSConnection);

  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  return wss;
};
