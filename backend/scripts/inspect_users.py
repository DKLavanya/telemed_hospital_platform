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
    
    try:
        with engine.begin() as conn:
            # Query all users
            users = conn.execute(text("SELECT id, name, email, role, specialization FROM users ORDER BY id")).fetchall()
            print("\n================== TELEMED SYSTEM USERS ==================")
            for row in users:
                spec_str = f" ({row[4]})" if row[4] else ""
                print(f"ID: {row[0]:<3} | Name: {row[1]:<18} | Email: {row[2]:<28} | Role: {row[3].upper()}{spec_str}")
            print("==========================================================\n")
            
    except Exception as e:
        print(f"Database connection error: {e}")

if __name__ == "__main__":
    main()
