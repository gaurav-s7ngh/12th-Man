import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
tables = db.execute(text("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
""")).fetchall()

for t in tables:
    count = db.execute(text(f'SELECT COUNT(*) FROM "{t[0]}"')).scalar()
    print(f'{t[0]}: {count}')

print("\n--- FOREIGN KEY CONSTRAINTS ---")
fks = db.execute(text("""
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
""")).fetchall()
for fk in fks:
    print(fk)

db.close()
