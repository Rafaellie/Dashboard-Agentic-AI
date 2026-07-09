from app.main import app
from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()
result = db.execute(text("""
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' OR event_object_table = 'profiles';
""")).fetchall()

for row in result:
    print(row)
