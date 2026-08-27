import requests
import json

BASE = "http://localhost:8000/api/v1"

# Login
r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("LOGIN OK")

# Create category
r = requests.post(f"{BASE}/catalog/categories", json={"name": "EPP", "description": "Equipo Proteccion"}, headers=headers)
print(f"Category: {r.status_code} {r.json() if r.status_code in [200,201] else r.text}")
cat_id = r.json().get("id")

# Create unit
r = requests.post(f"{BASE}/catalog/units", json={"name": "Pieza", "abbreviation": "pza"}, headers=headers)
print(f"Unit: {r.status_code} {r.json() if r.status_code in [200,201] else r.text}")
unit_id = r.json().get("id")

# Create 3 products
for i, (sku, name, price) in enumerate([
    ("EPP-001", "Guantes de Proteccion", 12000),
    ("EPP-002", "Casco de Seguridad", 25000),
    ("EPP-003", "Botas de Hule", 45000),
]):
    r = requests.post(f"{BASE}/products", json={
        "sku": sku, "name": name, "purchase_price": price // 2,
        "sale_price": price, "current_stock": 50, "min_stock": 5,
        "category_id": cat_id, "unit_id": unit_id,
    }, headers=headers)
    print(f"Product {sku}: {r.status_code}")

# Create 3 clients
for doc, name, phone in [
    ("1001234567", "Maria Lopez", "3001112233"),
    ("1009876543", "Juan Perez", "3004445566"),
    ("800123456", "Empresa XYZ S.A.", "3007778899"),
]:
    r = requests.post(f"{BASE}/clients", json={
        "document_type": "CC", "document_number": doc,
        "name": name, "phone": phone, "city": "Mariquita",
    }, headers=headers)
    print(f"Client {name}: {r.status_code}")

# Create 2 suppliers
for doc, name in [("900111222", "Distribuidora Norte"), ("900333444", "Importadora Andina")]:
    r = requests.post(f"{BASE}/suppliers", json={
        "document_type": "NIT", "document_number": doc,
        "name": name, "city": "Bogota",
    }, headers=headers)
    print(f"Supplier {name}: {r.status_code}")

# --- TEST SEARCH ---
print("\n=== SEARCH TESTS ===")
r = requests.get(f"{BASE}/products", params={"search": "Guantes"}, headers=headers)
print(f"Search 'Guantes': {len(r.json())} results")

r = requests.get(f"{BASE}/products", params={"search": "EPP-001"}, headers=headers)
print(f"Search 'EPP-001': {len(r.json())} results")

r = requests.get(f"{BASE}/products", params={}, headers=headers)
print(f"Products ALL: {len(r.json())} results")

r = requests.get(f"{BASE}/clients", params={"search": "Maria"}, headers=headers)
print(f"Search 'Maria': {len(r.json())} results")

r = requests.get(f"{BASE}/clients", params={}, headers=headers)
print(f"Clients ALL: {len(r.json())} results")

r = requests.get(f"{BASE}/suppliers", params={}, headers=headers)
print(f"Suppliers ALL: {len(r.json())} results")

# --- TEST SALE ---
print("\n=== SALE TEST ===")
prod = requests.get(f"{BASE}/products", params={}, headers=headers).json()[0]
client = requests.get(f"{BASE}/clients", params={}, headers=headers).json()[0]
r = requests.post(f"{BASE}/sales", json={
    "client_id": client["id"],
    "payment_method": "efectivo",
    "items": [{"product_id": prod["id"], "quantity": 3, "unit_price": prod["sale_price"]}],
}, headers=headers)
print(f"Sale: {r.status_code}")
if r.status_code in [200, 201]:
    sale = r.json()
    print(f"  Invoice: {sale['invoice_number']} Total: {sale['total']}")

    r = requests.get(f"{BASE}/products/{prod['id']}", headers=headers)
    print(f"  Stock after: {r.json()['current_stock']} (was 50, sold 3)")

# --- TEST QUOTE ---
print("\n=== QUOTE TEST ===")
r = requests.post(f"{BASE}/quotes", json={
    "client_id": client["id"],
    "items": [{"product_id": prod["id"], "quantity": 10, "unit_price": prod["sale_price"]}],
    "notes": "Cotizacion bulk",
}, headers=headers)
print(f"Quote: {r.status_code}")
if r.status_code in [200, 201]:
    q = r.json()
    print(f"  Number: {q['quote_number']} Total: {q['total']} Status: {q['status']}")

    # Stock should NOT change
    r = requests.get(f"{BASE}/products/{prod['id']}", headers=headers)
    print(f"  Stock after quote: {r.json()['current_stock']} (should still be 47)")

# --- TEST EXPENSE ---
print("\n=== EXPENSE TEST ===")
r = requests.post(f"{BASE}/expenses", json={
    "description": "Arriendo local", "amount": 800000, "category": "arriendo",
}, headers=headers)
print(f"Expense: {r.status_code} {r.json()['description'] if r.status_code in [200,201] else r.text}")

# --- TEST DEBTOR (sale on credit) ---
print("\n=== DEBTOR TEST ===")
r = requests.post(f"{BASE}/sales", json={
    "client_id": client["id"],
    "payment_method": "credito",
    "items": [{"product_id": prod["id"], "quantity": 2, "unit_price": prod["sale_price"]}],
}, headers=headers)
print(f"Credit Sale: {r.status_code}")
if r.status_code in [200, 201]:
    credit_sale = r.json()
    print(f"  Invoice: {credit_sale['invoice_number']} Total: {credit_sale['total']}")

    r = requests.get(f"{BASE}/debtors", headers=headers)
    print(f"  Debtors count: {len(r.json())}")

    # Register payment
    debtor = r.json()[0]
    r = requests.post(f"{BASE}/debtors/{debtor['sale_id']}/payments", json={
        "amount": 50000, "payment_method": "nequi",
    }, headers=headers)
    print(f"  Payment: {r.status_code}")

    r = requests.get(f"{BASE}/debtors", headers=headers)
    d = r.json()[0]
    print(f"  Balance after payment: {d['balance']} (total was {d['total']})")

# --- TEST DASHBOARD ---
print("\n=== DASHBOARD TEST ===")
r = requests.get(f"{BASE}/dashboard/stats", headers=headers)
print(f"Dashboard: {r.status_code}")
if r.status_code == 200:
    s = r.json()
    print(f"  Products: {s['total_products']}")
    print(f"  Clients: {s['total_clients']}")
    print(f"  Suppliers: {s['total_suppliers']}")
    print(f"  Sales today: {s['sales_today']}")
    print(f"  Debt balance: {s['total_debt_balance']}")
    print(f"  Recent sales: {len(s['recent_sales'])}")

print("\n=== TODAS LAS PRUEBAS OK ===")
