import sqlite3
import json

try:
    conn = sqlite3.connect('drafts.db')
    cur = conn.cursor()
    cur.execute('SELECT id, status, updated_at, data FROM drafts ORDER BY updated_at DESC LIMIT 5')
    rows = cur.fetchall()
    
    print('Recent Drafts:')
    for r in rows:
        data = json.loads(r[3])
        print(f"ID: {r[0]} | Status: {r[1]} | Updated: {r[2]} | Error: {data.get('error_message')}")
        
except Exception as e:
    print(f"Error: {e}")
