import datetime
from sqlalchemy import create_engine, text

def main():
    db_url = "postgresql://neondb_owner:npg_tfw7vWKaTxN0@ep-divine-voice-at7r8a9j-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    engine = create_engine(db_url)
    
    print("Testing record insertion on Neon database...")
    
    with engine.begin() as conn:
        doctor = conn.execute(text("SELECT id FROM users WHERE role = 'doctor' LIMIT 1")).fetchone()
        patient = conn.execute(text("SELECT id FROM users WHERE role = 'patient' LIMIT 1")).fetchone()
        appointment = conn.execute(text("SELECT id FROM appointments LIMIT 1")).fetchone()
        
        if not doctor or not patient:
            print(f"Error: Missing doctor ({doctor}) or patient ({patient}) in the database.")
            return
            
        doc_id = doctor[0]
        pat_id = patient[0]
        appt_id = appointment[0] if appointment else None
        
        print(f"Using Doctor ID: {doc_id}, Patient ID: {pat_id}, Appointment ID: {appt_id}")
        
        # Test 1: PatientRecord
        try:
            print("1. Testing patient_records insertion...")
            conn.execute(text("""
                INSERT INTO patient_records (patient_id, doctor_id, visit_date, symptoms, diagnosis, vitals_blood_pressure, vitals_heart_rate, vitals_temperature, notes, created_at)
                VALUES (:pat, :doc, :now, 'Test symptoms', 'Test diagnosis', '120/80', 72, 98.6, 'Test notes', :now)
            """), {"pat": pat_id, "doc": doc_id, "now": datetime.datetime.now(datetime.UTC).replace(tzinfo=None)})
            print("   SUCCESS: patient_records inserted successfully.")
        except Exception as e:
            print(f"   FAILED: patient_records: {e}")
            
        # Test 2: Prescription
        try:
            print("2. Testing prescriptions insertion...")
            conn.execute(text("""
                INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medicines, notes, created_at)
                VALUES (:appt, :pat, :doc, '[{"name": "Paracetamol"}]'::jsonb, 'Test notes', :now)
            """), {"appt": appt_id, "pat": pat_id, "doc": doc_id, "now": datetime.datetime.now(datetime.UTC).replace(tzinfo=None)})
            print("   SUCCESS: prescriptions inserted successfully.")
        except Exception as e:
            print(f"   FAILED: prescriptions: {e}")
            
        # Test 3: Billing
        try:
            print("3. Testing billing insertion...")
            conn.execute(text("""
                INSERT INTO billing (appointment_id, patient_id, amount, status, invoice_number, created_at)
                VALUES (:appt, :pat, 150.00, 'pending', 'INV-TEST-123456', :now)
            """), {"appt": appt_id, "pat": pat_id, "now": datetime.datetime.now(datetime.UTC).replace(tzinfo=None)})
            print("   SUCCESS: billing inserted successfully.")
        except Exception as e:
            print(f"   FAILED: billing: {e}")
            
    print("Database testing complete.")

if __name__ == "__main__":
    main()
