#!/usr/bin/env python3
import os
import paramiko
from pathlib import Path

# Hostinger credentials
HOST = "157.173.209.161"
PORT = 65002
USERNAME = "u492735793"
PASSWORD = "Ahmed93-93"
REMOTE_PATH = "/home/u492735793/domains/greenofig.com/public_html"

# Local paths
LOCAL_DIST = Path(__file__).parent / "dist"

def upload_directory(sftp, local_dir, remote_dir):
    """Recursively upload a directory"""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"

        if os.path.isfile(local_path):
            print(f"  Uploading: {item}")
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.mkdir(remote_path)
            except IOError:
                pass  # Directory already exists
            upload_directory(sftp, local_path, remote_path)

def main():
    print("=" * 50)
    print("GreenoFig Deployment to Hostinger")
    print("=" * 50)

    # Check if dist folder exists
    if not LOCAL_DIST.exists():
        print(f"Error: dist folder not found at {LOCAL_DIST}")
        print("Run 'npm run build' first")
        return

    print(f"\nConnecting to {HOST}:{PORT}...")

    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)
        print("Connected!")

        sftp = ssh.open_sftp()

        # Clear old static files
        print("\nClearing old static files...")
        stdin, stdout, stderr = ssh.exec_command(f"rm -rf {REMOTE_PATH}/static && mkdir -p {REMOTE_PATH}/static")
        stdout.read()
        print("Done!")

        # Upload static folder
        static_local = LOCAL_DIST / "static"
        if static_local.exists():
            print("\nUploading static files...")
            upload_directory(sftp, str(static_local), f"{REMOTE_PATH}/static")

        # Upload root files
        print("\nUploading root files...")
        for item in os.listdir(LOCAL_DIST):
            local_path = LOCAL_DIST / item
            if local_path.is_file():
                remote_path = f"{REMOTE_PATH}/{item}"
                print(f"  Uploading: {item}")
                sftp.put(str(local_path), remote_path)

        # Verify deployment
        print("\nVerifying deployment...")
        stdin, stdout, stderr = ssh.exec_command(f"ls {REMOTE_PATH}/static/*.js 2>/dev/null | wc -l")
        js_count = stdout.read().decode().strip()
        stdin, stdout, stderr = ssh.exec_command(f"ls {REMOTE_PATH}/static/*.css 2>/dev/null | wc -l")
        css_count = stdout.read().decode().strip()

        print(f"  JS files: {js_count}")
        print(f"  CSS files: {css_count}")

        sftp.close()
        ssh.close()

        print("\n" + "=" * 50)
        print("Deployment complete!")
        print("Site: https://greenofig.com")
        print("=" * 50)

    except Exception as e:
        print(f"Error: {e}")
        return

if __name__ == "__main__":
    main()
