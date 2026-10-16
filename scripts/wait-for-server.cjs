require('./load-backend-env.cjs');

const host = '127.0.0.1';
const port = Number(process.env.BACKEND_PORT || process.env.PORT || 3000);
const timeoutMs = 30000;
const retryMs = 500;
const startedAt = Date.now();

const waitForServer = () => {
  fetch(`http://${host}:${port}/api/health`, { signal: AbortSignal.timeout(1000) })
    .then(async (response) => {
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === 'OK') {
        console.log(`Backend health check passed on ${host}:${port}. Starting frontend...`);
        return;
      }

      console.error(`Port ${port} is responding, but it is not the BDU Clearance API.`);
      process.exitCode = 1;
    })
    .catch(() => {
      retryOrFail();
    });
};

const retryOrFail = () => {
  if (Date.now() - startedAt >= timeoutMs) {
    console.error(
      `The BDU Clearance API did not become healthy on ${host}:${port} within ${timeoutMs / 1000} seconds.`,
    );
    process.exitCode = 1;
    return;
  }

  setTimeout(waitForServer, retryMs);
};

waitForServer();
