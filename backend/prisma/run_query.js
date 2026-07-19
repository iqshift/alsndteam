const { Client } = require('ssh2');
const path = require('path');

const config = {
  host: '169.58.32.137',
  port: 22,
  username: 'root',
  password: 't1E8UI2RYpjBpyC2C'
};

function uploadAndRun() {
  const conn = new Client();
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localFile = path.join(__dirname, 'query.js');
      const remoteFile = '/var/www/alsnd-backend/prisma/query.js';
      sftp.fastPut(localFile, remoteFile, {}, (err) => {
        if (err) throw err;
        conn.exec('cd /var/www/alsnd-backend && node prisma/query.js && rm prisma/query.js', (err, stream) => {
          if (err) throw err;
          stream.on('close', () => {
            conn.end();
          }).on('data', (data) => {
            process.stdout.write(data);
          }).stderr.on('data', (data) => {
            process.stderr.write(data);
          });
        });
      });
    });
  }).connect(config);
}

uploadAndRun();
