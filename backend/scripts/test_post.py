import requests
import json
from datetime import datetime

url = "http://localhost:8000/save-transaction"
payload = {
    "telegram_id": 8610037078,
    "sku_id": "PROD-001",
    "timestamp": datetime.utcnow().isoformat() + "Z"
}

headers = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true"
}

response = requests.post(url, json=payload, headers=headers)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
