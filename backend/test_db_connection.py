import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL_SYNC")
print(f"🔍 Testing DB connection to: {db_url}")

try:
    conn = psycopg2.connect(
        dbname="invoice_ai",
        user="postgres",
        password="Welcome123",
        host="localhost",
        port="5432"
    )
    print("✅ psycopg2 connection successful!")
    conn.close()
except Exception as e:
    print("❌ psycopg2 connection failed:")
    print(e)
