const { Client } = require('ssh2');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  host: '169.58.32.137',
  port: 22,
  username: 'root',
  password: 't1E8UI2RYpjBpyC2C'
};

async function runLocal(cmd) {
  console.log(`Executing local: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function deploy() {
  console.log('=== STARTING DEPLOYMENT TO 169.58.32.137 ===');
  
  // 1. Pack files locally (paths are relative to backend)
  try {
    runLocal('tar -czf backend_deploy.tar.gz --exclude="node_modules" --exclude="dist" --exclude=".env" --exclude="*.log" -C . .');
    runLocal('tar -czf admin_deploy.tar.gz -C ../admin-dashboard/build .');
  } catch (err) {
    console.error('Failed to compress project files:', err.message);
    process.exit(1);
  }

  const conn = new Client();
  conn.on('ready', () => {
    console.log('SSH connection ready. Starting SFTP upload...');
    
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      console.log('Uploading backend_deploy.tar.gz...');
      sftp.fastPut('backend_deploy.tar.gz', '/var/www/backend_deploy.tar.gz', {}, (err) => {
        if (err) throw err;
        console.log('Backend archive uploaded successfully.');
        
        console.log('Uploading admin_deploy.tar.gz...');
        sftp.fastPut('admin_deploy.tar.gz', '/var/www/admin_deploy.tar.gz', {}, (err) => {
          if (err) throw err;
          console.log('Admin archive uploaded successfully.');
          
          console.log('Extracting and deploying on remote server 169.58.32.137...');
          const remoteCmds = [
            'mkdir -p /var/www/alsnd-backend',
            'mkdir -p /var/www/alsnd-admin',
            'tar -xzf /var/www/backend_deploy.tar.gz -C /var/www/alsnd-backend',
            'rm -rf /var/www/alsnd-admin/static',
            'tar -xzf /var/www/admin_deploy.tar.gz -C /var/www/alsnd-admin',
            'cd /var/www/alsnd-backend && npm install && npx prisma generate && npx prisma db push && npm run build',
            'pm2 restart alsnd-backend || pm2 restart all',
            'rm /var/www/backend_deploy.tar.gz /var/www/admin_deploy.tar.gz'
          ].join(' && ');

          conn.exec(remoteCmds, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
              console.log(`Remote execution closed with code: ${code}`);
              
              // Clean up local packed files
              if (fs.existsSync('backend_deploy.tar.gz')) fs.unlinkSync('backend_deploy.tar.gz');
              if (fs.existsSync('admin_deploy.tar.gz')) fs.unlinkSync('admin_deploy.tar.gz');
              console.log('Local clean up completed.');
              
              conn.end();
              if (code === 0) {
                console.log('=== DEPLOYMENT COMPLETED SUCCESSFULLY ON 169.58.32.137! ===');
              } else {
                console.error('=== DEPLOYMENT FAILED ON SERVER! ===');
                process.exit(1);
              }
            }).on('data', (data) => {
              process.stdout.write(data);
            }).stderr.on('data', (data) => {
              process.stderr.write(data);
            });
          });
        });
      });
    });
  }).connect(config);
}

deploy();
