import datetime
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import bcrypt
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.services.ai_analysis import analyze_symptoms
from app.services.billing_service import generate_invoice_number, process_mock_payment
from app.services.webrtc_signaling import signaling_manager

router = APIRouter()

# Password hashing configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

# Get current user dependency
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email, role=payload.get("role"), user_id=payload.get("user_id"))
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


# --- AUTH ENDPOINTS ---

@router.post("/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Enforce password complexity rules: minimum 8 chars, 1 number, 1 special char
    password = user_in.password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
    if not any(not c.isalnum() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character/symbol.")
    
    # Verify doctor registration code if role is doctor
    if user_in.role == "doctor":
        doctor_secret = os.getenv("DOCTOR_REGISTRATION_CODE", "HOSPITAL_DOC_2026")
        if not user_in.security_code or user_in.security_code != doctor_secret:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Invalid or missing doctor registration security code."
            )
            
    hashed_pwd = get_password_hash(user_in.password)
    user = models.User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=user_in.role,
        specialization=user_in.specialization,
        qualification=user_in.qualification,
        availability=user_in.availability
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# --- DOCTORS ENDPOINTS ---

@router.get("/doctors", response_model=List[schemas.UserResponse])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == models.UserRole.DOCTOR).all()


# --- APPOINTMENTS ENDPOINTS ---

@router.post("/appointments", response_model=schemas.AppointmentResponse)
def create_appointment(
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    # Validation: Ensure appointment time is in the future (robust comparison of timezone-aware and naive)
    appointment_time_utc = appt.appointment_time
    if appointment_time_utc.tzinfo is not None:
        appointment_time_utc = appointment_time_utc.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        if appointment_time_utc <= datetime.datetime.utcnow():
            raise HTTPException(status_code=400, detail="Appointment time must be in the future")
    else:
        if appointment_time_utc <= datetime.datetime.now():
            raise HTTPException(status_code=400, detail="Appointment time must be in the future")
        
    # Check if doctor exists
    doctor = db.query(models.User).filter(models.User.id == appt.doctor_id, models.User.role == models.UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    db_appt = models.Appointment(
        patient_id=current_user.id,
        doctor_id=appt.doctor_id,
        appointment_time=appointment_time_utc,
        notes=appt.notes,
        status="pending",  # Set status explicitly to resolve synchronization validation
        video_room_id=str(uuid.uuid4()) # Generate unique room code
    )
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

@router.get("/appointments", response_model=List[schemas.AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.PATIENT:
        return db.query(models.Appointment).filter(models.Appointment.patient_id == current_user.id).order_by(models.Appointment.appointment_time.desc()).all()
    elif current_user.role == models.UserRole.DOCTOR:
        return db.query(models.Appointment).filter(models.Appointment.doctor_id == current_user.id).order_by(models.Appointment.appointment_time.desc()).all()
    else:
        return db.query(models.Appointment).all()

@router.put("/appointments/{appointment_id}", response_model=schemas.AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appt_update: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not db_appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user.role == models.UserRole.PATIENT and db_appt.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == models.UserRole.DOCTOR and db_appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if appt_update.status is not None:
        db_appt.status = appt_update.status
    if appt_update.notes is not None:
        db_appt.notes = appt_update.notes
    if appt_update.video_room_id is not None:
        db_appt.video_room_id = appt_update.video_room_id
        
    db.commit()
    db.refresh(db_appt)
    return db_appt

@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not db_appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user.role == models.UserRole.PATIENT and db_appt.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == models.UserRole.DOCTOR and db_appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    db.delete(db_appt)
    db.commit()
    return None


# --- PATIENT RECORDS ENDPOINTS ---

@router.post("/records", response_model=schemas.PatientRecordResponse)
def create_patient_record(
    record: schemas.PatientRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can write patient records")
        
    db_record = models.PatientRecord(
        patient_id=record.patient_id,
        doctor_id=current_user.id,
        symptoms=record.symptoms,
        diagnosis=record.diagnosis,
        vitals_blood_pressure=record.vitals_blood_pressure,
        vitals_heart_rate=record.vitals_heart_rate,
        vitals_temperature=record.vitals_temperature,
        notes=record.notes
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@router.get("/records", response_model=List[schemas.PatientRecordResponse])
def get_patient_records(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.PATIENT:
        # Patients can only see their own records
        return db.query(models.PatientRecord).filter(models.PatientRecord.patient_id == current_user.id).order_by(models.PatientRecord.visit_date.desc()).all()
    else:
        # Doctors or admins can view records
        if patient_id:
            return db.query(models.PatientRecord).filter(models.PatientRecord.patient_id == patient_id).order_by(models.PatientRecord.visit_date.desc()).all()
        return db.query(models.PatientRecord).order_by(models.PatientRecord.visit_date.desc()).all()


# --- PRESCRIPTIONS ENDPOINTS ---

@router.post("/prescriptions", response_model=schemas.PrescriptionResponse)
def create_prescription(
    prescription: schemas.PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can create prescriptions")
        
    # Serialize medicines back to list of dicts for model
    med_list = [med.dict() for med in prescription.medicines]
    
    db_prescription = models.Prescription(
        appointment_id=prescription.appointment_id,
        patient_id=prescription.patient_id,
        doctor_id=current_user.id,
        medicines=med_list,
        notes=prescription.notes
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

@router.get("/prescriptions", response_model=List[schemas.PrescriptionResponse])
def get_prescriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.PATIENT:
        return db.query(models.Prescription).filter(models.Prescription.patient_id == current_user.id).order_by(models.Prescription.created_at.desc()).all()
    else:
        return db.query(models.Prescription).filter(models.Prescription.doctor_id == current_user.id).order_by(models.Prescription.created_at.desc()).all()


# --- MEDICAL REPORTS ENDPOINTS ---

@router.post("/reports", response_model=schemas.MedicalReportResponse)
def create_medical_report(
    report: schemas.MedicalReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Any logged in user can upload a report (patient upload their old reports, or doctors)
    # We assign it to current user if patient, or specify patient in future.
    # For now, current user is the owner.
    db_report = models.MedicalReport(
        patient_id=current_user.id,
        title=report.title,
        description=report.description,
        file_name=report.file_name,
        file_url=report.file_url
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/reports", response_model=List[schemas.MedicalReportResponse])
def get_medical_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.PATIENT:
        return db.query(models.MedicalReport).filter(models.MedicalReport.patient_id == current_user.id).order_by(models.MedicalReport.created_at.desc()).all()
    else:
        # Doctors can view all reports
        return db.query(models.MedicalReport).order_by(models.MedicalReport.created_at.desc()).all()


# --- BILLING ENDPOINTS ---

@router.post("/billing", response_model=schemas.BillingResponse)
def create_bill(
    bill: schemas.BillingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.DOCTOR and current_user.role != models.UserRole.ADMIN:
         raise HTTPException(status_code=403, detail="Forbidden")
         
    invoice_num = generate_invoice_number()
    db_bill = models.Billing(
        appointment_id=bill.appointment_id,
        patient_id=bill.patient_id,
        amount=bill.amount,
        status="pending",
        invoice_number=invoice_num
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

@router.get("/billing", response_model=List[schemas.BillingResponse])
def get_bills(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.PATIENT:
        return db.query(models.Billing).filter(models.Billing.patient_id == current_user.id).order_by(models.Billing.created_at.desc()).all()
    else:
        return db.query(models.Billing).order_by(models.Billing.created_at.desc()).all()

@router.put("/billing/{bill_id}", response_model=schemas.BillingResponse)
def update_bill(
    bill_id: int,
    bill_update: schemas.BillingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_bill = db.query(models.Billing).filter(models.Billing.id == bill_id).first()
    if not db_bill:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role == models.UserRole.PATIENT and db_bill.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    db_bill.status = bill_update.status
    if bill_update.status == "paid":
        db_bill.payment_method = bill_update.payment_method or "card"
        db_bill.payment_date = datetime.datetime.utcnow()
        
    db.commit()
    db.refresh(db_bill)
    return db_bill


# --- AI SYMPTOM ANALYSIS ---

@router.post("/ai/analyze", response_model=schemas.AIAnalysisResponse)
def get_symptom_analysis(
    input_data: schemas.SymptomInput,
    current_user: models.User = Depends(get_current_user)
):
    return analyze_symptoms(
        symptoms_text=input_data.symptoms,
        age=input_data.age,
        gender=input_data.gender
    )


# --- RAZORPAY BILLING ENDPOINTS ---

@router.post("/billing/{bill_id}/razorpay-order", response_model=schemas.RazorpayOrderResponse)
def create_razorpay_order(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    bill = db.query(models.Billing).filter(models.Billing.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role == models.UserRole.PATIENT and bill.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        # Fallback to simulation/sandbox mode for demonstration purposes
        return {
            "order_id": f"mock_order_{bill.id}_{uuid.uuid4().hex[:6]}",
            "amount": bill.amount,
            "currency": "INR",
            "key_id": "rzp_test_mock_keys_not_set"
        }
        
    try:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        # Razorpay expects amount in paise (1 INR = 100 paise)
        amount_paise = int(bill.amount * 100)
        
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_bill_{bill.id}",
            "payment_capture": 1
        }
        
        razorpay_order = client.order.create(data=order_data)
        
        return {
            "order_id": razorpay_order["id"],
            "amount": bill.amount,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create Razorpay order: {str(e)}")

@router.post("/billing/verify-razorpay", response_model=schemas.BillingResponse)
def verify_razorpay_payment(
    payload: schemas.RazorpayVerifyPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    bill = db.query(models.Billing).filter(models.Billing.id == payload.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role == models.UserRole.PATIENT and bill.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Check if this is a simulation bypass order
    if payload.razorpay_order_id.startswith("mock_order_"):
        bill.status = "paid"
        bill.payment_method = "simulated_card"
        bill.payment_date = datetime.datetime.utcnow()
        
        db.commit()
        db.refresh(bill)
        return bill
        
    try:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        params_dict = {
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        }
        
        client.utility.verify_payment_signature(params_dict)
        
        # Mark bill as paid
        bill.status = "paid"
        bill.payment_method = "razorpay"
        bill.payment_date = datetime.datetime.utcnow()
        
        db.commit()
        db.refresh(bill)
        return bill
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")
