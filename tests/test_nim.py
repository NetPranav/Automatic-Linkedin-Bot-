import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("NVIDIA_NIM_API_KEY")
MODEL = os.getenv("NVIDIA_NIM_MODEL")

print(f"Testing Model: {MODEL}")

def test_text():
    print("Sending Text Request...")
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "Say hello"}],
        "max_tokens": 50
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(response.text)
    except Exception as e:
        print(f"Error: {e}")

test_text()
