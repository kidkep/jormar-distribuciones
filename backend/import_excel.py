import requests
import openpyxl
import time

EXCEL = r"C:\Users\JUANCA\Desktop\JORMAR\P2 GESTOR DE NEGOCIO ORIGINAL No 1   2026 (1) (1).xlsm"
BASE = "http://localhost:8000/api/v1"

def login():
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
    r.raise_for_status()
    return r.json()["access_token"]

token = login()
headers = {"Authorization": f"Bearer {token}"}
print("LOGIN OK")

wb = openpyxl.load_workbook(EXCEL, read_only=True, keep_vba=True)

# 1. IMPORT SUPPLIERS (BD_PROVEEDORES)
print("\n--- IMPORTING SUPPLIERS ---")
ws = wb["BD_PROVEEDORES"]
suppliers_ok = 0
suppliers_fail = 0
for row in ws.iter_rows(min_row=2, values_only=True):
    name = str(row[0]).strip() if row[0] else None
    nit = str(row[2]).strip() if row[2] else None
    phone = str(int(row[3])) if row[3] and isinstance(row[3], (int, float)) else str(row[3]) if row[3] else None
    address = str(row[4]).strip() if row[4] else None
    email = str(row[5]).strip() if row[5] else None
    city = str(row[6]).strip() if row[6] else None
    
    if not name or not nit:
        continue
    
    nit = nit.strip()
    if not nit or nit.lower() in ('impuestos', ''):
        nit = f"PROV-{suppliers_ok+1}"
    
    data = {
        "name": name,
        "document_type": "NIT",
        "document_number": nit,
        "phone": str(phone) if phone else None,
        "address": address,
        "email": email,
        "city": city,
    }
    
    r = requests.post(f"{BASE}/suppliers", headers=headers, json=data)
    if r.status_code == 201:
        suppliers_ok += 1
    elif r.status_code == 409:
        pass
    else:
        suppliers_fail += 1
        if suppliers_fail <= 3:
            print(f"  FAIL: {name} -> {r.status_code}: {r.json()}")

print(f"  Suppliers: {suppliers_ok} created, {suppliers_fail} errors")

# 2. IMPORT CLIENTS (BD_CLIENTES)
print("\n--- IMPORTING CLIENTS ---")
ws = wb["BD_CLIENTES"]
clients_ok = 0
clients_fail = 0
for row in ws.iter_rows(min_row=2, values_only=True):
    name = str(row[0]).strip() if row[0] else None
    doc = str(row[1]).strip() if row[1] else None
    phone = str(int(row[2])) if row[2] and isinstance(row[2], (int, float)) else str(row[2]) if row[2] else None
    address = str(row[3]).strip() if row[3] else None
    email = str(row[4]).strip() if row[4] else None
    city = str(row[5]).strip() if row[5] else None
    
    if not name or not doc:
        continue
    
    doc = doc.strip()
    
    data = {
        "name": name,
        "document_type": "CC",
        "document_number": doc,
        "phone": phone,
        "address": address,
        "email": email,
        "city": city,
    }
    
    r = requests.post(f"{BASE}/clients", headers=headers, json=data)
    if r.status_code == 201:
        clients_ok += 1
    elif r.status_code == 409:
        pass
    else:
        clients_fail += 1
        if clients_fail <= 3:
            print(f"  FAIL: {name} -> {r.status_code}: {r.json()}")

print(f"  Clients: {clients_ok} created, {clients_fail} errors")

# 3. IMPORT PRODUCTS (BD_PRODUCTOS)
print("\n--- IMPORTING PRODUCTS ---")
ws = wb["BD_PRODUCTOS"]
products_ok = 0
products_fail = 0
for row in ws.iter_rows(min_row=2, values_only=True):
    code = row[0]
    name = str(row[1]).strip() if row[1] else None
    purchase = row[2]
    sale = row[3]
    stock = row[4]
    
    if not name:
        continue
    
    sku = str(code) if code else f"PROD-{products_ok+1}"
    sku = sku.strip()
    
    data = {
        "sku": sku,
        "name": name,
        "purchase_price": float(purchase) if purchase else 0,
        "sale_price": float(sale) if sale else 0,
        "current_stock": int(stock) if stock and isinstance(stock, (int, float)) else 0,
        "min_stock": 5,
        "tax_rate": 19,
        "is_active": True,
    }
    
    r = requests.post(f"{BASE}/products", headers=headers, json=data)
    if r.status_code == 201:
        products_ok += 1
    elif r.status_code == 409:
        pass
    else:
        products_fail += 1
        if products_fail <= 3:
            print(f"  FAIL: {name} -> {r.status_code}: {r.json()}")
    
    if products_ok % 100 == 0 and products_ok > 0:
        print(f"  ... {products_ok} products imported")

print(f"  Products: {products_ok} created, {products_fail} errors")

# 4. IMPORT EXPENSES (BD_GASTOSYCOSTOS)
print("\n--- IMPORTING EXPENSES ---")
ws = wb["BD_GASTOSYCOSTOS"]
expenses_ok = 0
expenses_fail = 0
for row in ws.iter_rows(min_row=2, values_only=True):
    desc = str(row[1]).strip() if row[1] else None
    amount = row[3]
    
    if not desc or not amount:
        continue
    
    data = {
        "description": desc,
        "amount": float(amount),
        "category": "general",
        "payment_method": "efectivo",
        "reference": str(row[0]) if row[0] else None,
    }
    
    r = requests.post(f"{BASE}/expenses", headers=headers, json=data)
    if r.status_code == 201:
        expenses_ok += 1
    else:
        expenses_fail += 1
        if expenses_fail <= 3:
            print(f"  FAIL: {desc} -> {r.status_code}: {r.json()}")

print(f"  Expenses: {expenses_ok} created, {expenses_fail} errors")

# SUMMARY
print("\n=== IMPORT SUMMARY ===")
print(f"  Suppliers: {suppliers_ok}")
print(f"  Clients:   {clients_ok}")
print(f"  Products:  {products_ok}")
print(f"  Expenses:  {expenses_ok}")
print("\nDone!")
