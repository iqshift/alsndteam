const { Client } = require('ssh2');

const config = {
  host: '169.58.32.137',
  port: 22,
  username: 'root',
  password: 't1E8UI2RYpjBpyC2C'
};

function runQuery() {
  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(`cd /var/www/alsnd-backend && node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient().driver.findMany().then(drivers => console.log('Drivers on server:', drivers)).catch(console.error)"`, (err, stream) => {
      if (err) throw err;
      stream.on('close', () => {
        conn.end();
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }).connect(config);
}

runQuery();
