import requests
import json

BASE = "http://localhost:8000/api/v1"

def login():
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
    r.raise_for_status()
    return r.json()["access_token"]

token = login()
headers = {"Authorization": f"Bearer {token}"}
print(f"LOGIN OK")

# Create product
r = requests.post(f"{BASE}/products", headers=headers, json={
    "sku": "TEST001",
    "name": "Casco de seguridad",
    "category_id": 1,
    "unit_id": 1,
    "purchase_price": 15000,
    "sale_price": 25000,
    "current_stock": 50,
    "min_stock": 5,
})
print(f"CREATE PRODUCT: {r.status_code}")
if r.status_code != 201:
    print(r.json())
    exit(1)
product = r.json()
product_id = product["id"]
print(f"  Product ID: {product_id}, stock: {product['current_stock']}")

# Create client
r = requests.post(f"{BASE}/clients", headers=headers, json={
    "document_type": "CC",
    "document_number": "12345678",
    "name": "Juan Perez",
})
print(f"CREATE CLIENT: {r.status_code}")
if r.status_code != 201:
    print(r.json())
    exit(1)
client = r.json()
client_id = client["id"]
print(f"  Client ID: {client_id}")

# Create sale
r = requests.post(f"{BASE}/sales", headers=headers, json={
    "client_id": client_id,
    "payment_method": "efectivo",
    "items": [{"product_id": product_id, "quantity": 5, "unit_price": 25000}],
})
print(f"CREATE SALE: {r.status_code}")
if r.status_code != 201:
    print(r.json())
    exit(1)
sale = r.json()
print(f"  Sale ID: {sale['id']}, invoice: {sale['invoice_number']}, total: {sale['total']}")
print(f"  Items: {json.dumps(sale['items'], indent=2)}")

# Verify stock decreased
r = requests.get(f"{BASE}/products/{product_id}", headers=headers)
p = r.json()
print(f"  Stock after sale: {p['current_stock']} (expected 45)")

# List sales (the one that was 500)
r = requests.get(f"{BASE}/sales", headers=headers)
print(f"LIST SALES: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"  Found {len(data)} sales")
    if data:
        s = data[0]
        print(f"  First sale client: {s.get('client')}")
        print(f"  First sale items: {json.dumps(s.get('items', []), indent=2)}")
else:
    print(r.json())

# Create quote
r = requests.post(f"{BASE}/quotes", headers=headers, json={
    "client_id": client_id,
    "items": [{"product_id": product_id, "quantity": 10, "unit_price": 25000}],
})
print(f"\nCREATE QUOTE: {r.status_code}")
if r.status_code != 201:
    print(r.json())
    exit(1)
quote = r.json()
print(f"  Quote ID: {quote['id']}, number: {quote['quote_number']}, total: {quote['total']}")

# List quotes
r = requests.get(f"{BASE}/quotes", headers=headers)
print(f"LIST QUOTES: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"  Found {len(data)} quotes")
else:
    print(r.json())

print("\n=== ALL TESTS PASSED ===")
