import sqlite3, json
conn = sqlite3.connect("drafts.db")
cursor = conn.cursor()
cursor.execute("SELECT data FROM drafts WHERE status='failed' ORDER BY updated_at DESC LIMIT 1;")
row = cursor.fetchone()
if row:
    print(json.loads(row[0]).get("error_message"))
else:
    print("No failed drafts")
