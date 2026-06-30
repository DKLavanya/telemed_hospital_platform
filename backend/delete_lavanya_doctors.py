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
            # Query all doctor accounts starting with 'Lavanya'
            res = conn.execute(
                text("SELECT id, name, email FROM users WHERE name LIKE 'Lavanya%' AND role = 'doctor'")
            ).fetchall()
            
            if not res:
                print("No doctor accounts starting with 'Lavanya' were found.")
                return
                
            for user_id, name, email in res:
                print(f"Found Doctor: {name} (ID: {user_id}, Email: {email}). Deleting related records...")
                
                # Delete related database details
                conn.execute(
                    text("DELETE FROM billing WHERE appointment_id IN (SELECT id FROM appointments WHERE doctor_id = :id)"),
                    {"id": user_id}
                )
                conn.execute(text("DELETE FROM appointments WHERE doctor_id = :id"), {"id": user_id})
                conn.execute(text("DELETE FROM prescriptions WHERE doctor_id = :id"), {"id": user_id})
                conn.execute(text("DELETE FROM patient_records WHERE doctor_id = :id"), {"id": user_id})
                
                # Delete user
                conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
                print(f"Deleted {name} ({email}) successfully.")
            print("Cleanup completed successfully!")
    except Exception as e:
        print(f"Error executing cleanup: {e}")

if __name__ == "__main__":
    main()
