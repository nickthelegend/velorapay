#!/usr/bin/env python3
"""
Debug script to check transaction records
"""

import requests
import json

# Get backend URL from frontend .env file
try:
    with open('/app/frontend/.env', 'r') as f:
        env_content = f.read()
        for line in env_content.split('\n'):
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                base_url = line.split('=')[1].strip()
                break
        else:
            raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in frontend/.env")
except Exception as e:
    print(f"❌ Error reading backend URL from frontend/.env: {e}")
    base_url = "http://localhost:8001"  # fallback

api_url = f"{base_url}/api"

# Test user data
user1_data = {
    "username": "alice_smith",
    "password": "SecurePass123!",
    "full_name": "Alice Smith"
}

# Login to get token
login_response = requests.post(f"{api_url}/auth/login", json={"username": user1_data["username"], "password": user1_data["password"]})
if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    
    # Get transaction history
    headers = {"Authorization": f"Bearer {token}"}
    history_response = requests.get(f"{api_url}/transaction/history", headers=headers)
    
    if history_response.status_code == 200:
        transactions = history_response.json()
        print(f"Found {len(transactions)} transactions:")
        for i, txn in enumerate(transactions):
            print(f"\nTransaction {i+1}:")
            print(f"  Type: {txn.get('type')}")
            print(f"  From: {txn.get('from_user_name')} ({txn.get('from_user')})")
            print(f"  To: {txn.get('to_user_name')} ({txn.get('to_user')})")
            print(f"  Amount: ${txn.get('amount')}")
            print(f"  Note: {txn.get('note')}")
            print(f"  Status: {txn.get('status')}")
            print(f"  Timestamp: {txn.get('timestamp')}")
    else:
        print(f"Failed to get transaction history: {history_response.status_code}")
        print(history_response.text)
else:
    print(f"Failed to login: {login_response.status_code}")
    print(login_response.text)