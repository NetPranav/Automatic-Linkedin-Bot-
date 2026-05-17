import socket
import re
import os

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

env_path = os.path.join(os.path.dirname(__file__), '.env')

if not os.path.exists(env_path):
    print("No .env file found. Creating from .env.example if exists...")
    example_path = os.path.join(os.path.dirname(__file__), '.env.example')
    if os.path.exists(example_path):
        with open(example_path, 'r') as f:
            content = f.read()
    else:
        content = "BACKEND_IP=127.0.0.1\n"
else:
    with open(env_path, 'r') as f:
        content = f.read()

ip = get_ip()

# Replace BACKEND_IP
if re.search(r'(?m)^BACKEND_IP=.*', content):
    content = re.sub(r'(?m)^BACKEND_IP=.*', f'BACKEND_IP={ip}', content)
else:
    content += f"\nBACKEND_IP={ip}\n"

with open(env_path, 'w') as f:
    f.write(content)

print(f"--------------------------------------------------")
print(f"✅ AUTO-UPDATED BACKEND IP TO: {ip}")
print(f"   (This ensures your mobile app can connect)")
print(f"--------------------------------------------------")
