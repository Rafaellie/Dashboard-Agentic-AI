import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv
import urllib.parse

# load env
load_dotenv(".env")

# ambil database_url
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# ekstrak kredensial
parsed = urllib.parse.urlparse(db_url)
user = parsed.username
password = parsed.password
host = parsed.hostname
port = parsed.port or 5432

try:
    # konek ke postgres bawaan
    conn = psycopg2.connect(
        dbname='postgres',
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE dashboard_db;")
    print("database 'dashboard_db' berhasil dibuat")
    cursor.close()
    conn.close()
except psycopg2.errors.DuplicateDatabase:
    print("database 'dashboard_db' sudah ada")
except Exception as e:
    print(f"error buat database: {e}")
