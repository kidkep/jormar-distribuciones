import requests
import json

BASE = "http://localhost:8000/api/v1"

r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get product
r = requests.get(f"{BASE}/products", params={}, headers=headers)
products = r.json()
print(f"Products: {len(products)}")
if products:
    prod = products[0]
    print(f"First product: {prod['id']} - {prod['name']} - stock: {prod['current_stock']}")
else:
    print("NO PRODUCTS FOUND!")
    exit()

# Get client
r = requests.get(f"{BASE}/clients", params={}, headers=headers)
clients = r.json()
print(f"Clients: {len(clients)}")
if clients:
    client = clients[0]
    print(f"First client: {client['id']} - {client['name']}")

# Try sale
print("\n=== CREATING SALE ===")
r = requests.post(f"{BASE}/sales", json={
    "client_id": client["id"],
    "payment_method": "efectivo",
    "items": [{"product_id": prod["id"], "quantity": 2, "unit_price": prod["sale_price"]}],
}, headers=headers)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:1000]}")
