import sys
from sqlalchemy import create_engine, text

def main():
    # Default to local database
    db_url = "postgresql://postgres:postgres123@localhost:5432/hospital_db"
    
    # Allow overriding database URL via command-line argument for Neon cloud DB
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
    
    # Hide password in terminal log output
    masked_url = db_url.split('@')[-1] if '@' in db_url else db_url
    print(f"Connecting to database: {masked_url}")
    
    engine = create_engine(db_url)
    
    emails_to_delete = [
        "sarah.jenkins@telemed.com",
        "amit.patel@telemed.com",
        "emily.stone@telemed.com"
    ]
    
    try:
        with engine.begin() as conn:
            for email in emails_to_delete:
                # Find user
                res = conn.execute(
                    text("SELECT id, name FROM users WHERE email = :email"),
                    {"email": email}
                ).fetchone()
                
                if res:
                    user_id, name = res[0], res[1]
                    print(f"Found {name} (ID: {user_id}). Deleting related database records...")
                    
                    # Delete billing records related to the doctor's appointments
                    conn.execute(
                        text("DELETE FROM billing WHERE appointment_id IN (SELECT id FROM appointments WHERE doctor_id = :id)"),
                        {"id": user_id}
                    )
                    
                    # Delete other foreign key dependencies
                    conn.execute(text("DELETE FROM appointments WHERE doctor_id = :id"), {"id": user_id})
                    conn.execute(text("DELETE FROM prescriptions WHERE doctor_id = :id"), {"id": user_id})
                    conn.execute(text("DELETE FROM patient_records WHERE doctor_id = :id"), {"id": user_id})
                    
                    # Delete main user account
                    conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
                    print(f"Deleted {name} successfully.")
                else:
                    print(f"User with email {email} was not found (already deleted).")
            print("Cleanup completed successfully!")
    except Exception as e:
        print(f"Error executing cleanup: {e}")

if __name__ == "__main__":
    main()
