const net = require('node:net');

const host = '127.0.0.1';
const port = 3000;
const timeoutMs = 30000;
const retryMs = 500;
const startedAt = Date.now();

const waitForServer = () => {
  const socket = net.createConnection({ host, port });

  socket.once('connect', () => {
    socket.end();
    console.log(`Backend is listening on ${host}:${port}. Starting frontend...`);
  });

  socket.once('error', () => {
    socket.destroy();
    if (Date.now() - startedAt >= timeoutMs) {
      console.error(`Backend did not start listening on ${host}:${port} within ${timeoutMs / 1000} seconds.`);
      process.exitCode = 1;
      return;
    }
    setTimeout(waitForServer, retryMs);
  });
};

waitForServer();
