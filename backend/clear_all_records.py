import sys
from sqlalchemy import create_engine, text

def main():
    # Neon cloud database URL
    db_url = "postgresql://neondb_owner:npg_tfw7vWKaTxN0@ep-divine-voice-at7r8a9j-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
        
    engine = create_engine(db_url)
    
    try:
        with engine.begin() as conn:
            print("Clearing clinical and transaction history from the database...")
            
            # Truncate transactional tables (leaving users and doctors untouched)
            conn.execute(text("TRUNCATE TABLE billing CASCADE"))
            conn.execute(text("TRUNCATE TABLE prescriptions CASCADE"))
            conn.execute(text("TRUNCATE TABLE patient_records CASCADE"))
            conn.execute(text("TRUNCATE TABLE appointments CASCADE"))
            
            print("Database cleaned successfully! All old records are removed.")
    except Exception as e:
        print(f"Error executing cleanup: {e}")

if __name__ == "__main__":
    main()
