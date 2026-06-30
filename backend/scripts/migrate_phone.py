import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path)

def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in environment variables.")
        sys.exit(1)
        
    engine = create_engine(db_url)
    
    print("Running database migration to add 'phone' column to 'users' table...")
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR;"))
        print("Success: Database migration completed. 'phone' column is ready in Neon PostgreSQL.")
    except Exception as e:
        print(f"Error executing database migration: {e}")

if __name__ == "__main__":
    main()
