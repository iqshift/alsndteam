import sys
import subprocess

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko"])
    import paramiko

def check_backend_deploy():
    hostname = "169.58.32.137"
    port = 22
    username = "root"
    password = "t1E8UI2RYpjBpyC2C"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, port=port, username=username, password=password, timeout=15)

    commands = [
        "cat /var/www/alsnd-backend/deploy.js",
        "pm2 list || pm2 status",
        "ps aux | grep node",
    ]

    for cmd in commands:
        print(f"\n==================== RUN: {cmd} ====================")
        stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
        output = stdout.read().decode('utf-8', errors='ignore')
        print("STDOUT:\n", output)

    client.close()

if __name__ == "__main__":
    check_backend_deploy()
