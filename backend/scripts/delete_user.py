import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path)

def delete_user_by_email(email: str):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in environment variables.")
        return

    engine = create_engine(db_url)
    
    try:
        with engine.begin() as conn:
            # Find the user first
            user = conn.execute(
                text("SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER(:email)"),
                {"email": email}
            ).fetchone()
            
            if not user:
                print(f"No user found with email: {email}")
                return
                
            user_id, name, user_email, role = user[0], user[1], user[2], user[3]
            print(f"\nFound user: {name} (ID: {user_id}, Role: {role.upper()})")
            confirm = input(f"Are you sure you want to perform a deep cascading delete of {name}? (y/N): ")
            if confirm.lower() != 'y':
                print("Deletion cancelled.")
                return

            print(f"Starting deep cascading deletion for user ID {user_id}...")

            # 1. Delete prescriptions where this user is either patient or doctor
            conn.execute(
                text("DELETE FROM prescriptions WHERE doctor_id = :uid OR patient_id = :uid"),
                {"uid": user_id}
            )
            
            # 2. Delete prescriptions linked via appointments of this user
            conn.execute(
                text("""
                    DELETE FROM prescriptions 
                    WHERE appointment_id IN (
                        SELECT id FROM appointments WHERE doctor_id = :uid OR patient_id = :uid
                    )
                """),
                {"uid": user_id}
            )
            
            # 3. Delete billing records linked to appointments of this user
            conn.execute(
                text("""
                    DELETE FROM billing 
                    WHERE appointment_id IN (
                        SELECT id FROM appointments WHERE doctor_id = :uid OR patient_id = :uid
                    )
                """),
                {"uid": user_id}
            )
            
            # 4. Delete billing records directly linked to this user as patient
            conn.execute(
                text("DELETE FROM billing WHERE patient_id = :uid"),
                {"uid": user_id}
            )
            
            # 5. Delete medical reports/records for this user
            conn.execute(
                text("DELETE FROM patient_records WHERE doctor_id = :uid OR patient_id = :uid"),
                {"uid": user_id}
            )
            
            # 6. Delete appointments scheduled with or by this user
            conn.execute(
                text("DELETE FROM appointments WHERE doctor_id = :uid OR patient_id = :uid"),
                {"uid": user_id}
            )
            
            # 7. Delete the user profile from users table
            conn.execute(
                text("DELETE FROM users WHERE id = :uid"),
                {"uid": user_id}
            )
            
            print(f"Successfully deleted user {name} and all related medical/financial/appointment records.")
            
    except Exception as e:
        print(f"Database error during deletion: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email_arg = sys.argv[1]
    else:
        email_arg = input("Enter the email address of the user to delete: ").strip()
        
    if email_arg:
        delete_user_by_email(email_arg)
    else:
        print("No email provided.")
