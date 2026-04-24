const { execSync } = require('child_process');
const { spawn } = require('child_process');

const server = spawn('pnpm', ['exec', 'http-server', 'dist/', '-p', '9000', '-s'], {
    stdio: 'inherit'
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
