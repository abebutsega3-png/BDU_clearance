const { existsSync } = require('node:fs');
const path = require('node:path');

const envPath = path.resolve(__dirname, '..', 'server', '.env');

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
