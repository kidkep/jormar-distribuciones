import sqlite3
conn = sqlite3.connect("C:/Users/JUANCA/jormar-distribuciones/backend/jormar.db")
c = conn.cursor()

c.execute("SELECT * FROM role_permissions WHERE role_id=1")
rps = c.fetchall()
perm_ids = [r[1] for r in rps]
print("Admin perm IDs:", sorted(perm_ids))

c.execute("SELECT * FROM permissions WHERE id=23")
p23 = c.fetchall()
print("Perm 23:", p23)

# Check caja permissions
c.execute("SELECT * FROM permissions WHERE name LIKE '%caja%' OR name LIKE '%retiro%'")
caja_perms = c.fetchall()
print("Caja/Retiro perms:", caja_perms)
conn.close()
