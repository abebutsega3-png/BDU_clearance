require('./load-backend-env.cjs');

const net = require('node:net');

const port = Number(process.env.BACKEND_PORT || process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid backend port "${port}". Choose a port between 1 and 65535.`);
  process.exitCode = 1;
} else {
  const server = net.createServer();

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Backend port ${port} is already in use. No process was stopped.`);
      console.error(
        `Find the listener with: Get-NetTCPConnection -LocalPort ${port} | Select-Object LocalAddress, LocalPort, OwningProcess`,
      );
      console.error(
        'Stop the previous BDU Clearance server with Ctrl+C in its terminal, or choose a different BACKEND_PORT.',
      );
    } else {
      console.error('Unable to check backend port:', error.stack || error);
    }

    process.exitCode = 1;
  });

  server.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
    server.close((error) => {
      if (error) {
        console.error('Unable to release backend port after checking:', error.stack || error);
        process.exitCode = 1;
        return;
      }

      console.log(`Backend port ${port} is available.`);
    });
  });
}
