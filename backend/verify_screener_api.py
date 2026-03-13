
import requests
import json
import time

BASE_URL = "http://localhost:8000/screener"

def test_endpoint(endpoint):
    print(f"\nTesting endpoint: {endpoint}")
    try:
        response = requests.get(f"{BASE_URL}/{endpoint}")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('success')}")
            if 'count' in data:
                print(f"Items found: {data['count']}")
            elif 'total_signals' in data:
                print(f"Total signals: {data['total_signals']}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    # Note: Backend must be running for this to work.
    # If not running, I'll just rely on linting/imports for now.
    endpoints = ["status", "scalping", "grid-zones", "basis", "alpha"]
    for ep in endpoints:
        test_endpoint(ep)
