from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Token & Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "patient" # patient, doctor
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    availability: Optional[str] = None
    security_code: Optional[str] = None


# --- User Schemas ---
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    availability: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Patient Record Schemas ---
class PatientRecordCreate(BaseModel):
    patient_id: int
    symptoms: str
    diagnosis: Optional[str] = None
    vitals_blood_pressure: Optional[str] = None
    vitals_heart_rate: Optional[int] = None
    vitals_temperature: Optional[float] = None
    notes: Optional[str] = None

class PatientRecordResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    visit_date: datetime
    symptoms: str
    diagnosis: Optional[str]
    vitals_blood_pressure: Optional[str]
    vitals_heart_rate: Optional[int]
    vitals_temperature: Optional[float]
    notes: Optional[str]
    created_at: datetime
    doctor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# --- Medicine Item for Prescription ---
class MedicineItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

# --- Prescription Schemas ---
class PrescriptionCreate(BaseModel):
    appointment_id: Optional[int] = None
    patient_id: int
    medicines: List[MedicineItem]
    notes: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: Optional[int]
    patient_id: int
    doctor_id: int
    medicines: List[Dict[str, Any]]
    notes: Optional[str]
    created_at: datetime
    doctor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# --- Medical Report Schemas ---
class MedicalReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_name: str
    file_url: str

class MedicalReportResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    description: Optional[str]
    file_name: str
    file_url: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Billing Schemas ---
class BillingCreate(BaseModel):
    appointment_id: Optional[int] = None
    patient_id: int
    amount: float

class BillingUpdate(BaseModel):
    status: str
    payment_method: Optional[str] = None

class BillingResponse(BaseModel):
    id: int
    appointment_id: Optional[int]
    patient_id: int
    amount: float
    status: str
    payment_method: Optional[str]
    payment_date: Optional[datetime]
    invoice_number: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Appointment Schemas ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_time: datetime
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    video_room_id: Optional[str] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_time: datetime
    duration: int
    status: str
    video_room_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    patient: Optional[UserResponse] = None
    doctor: Optional[UserResponse] = None
    prescription: Optional[PrescriptionResponse] = None
    bill: Optional[BillingResponse] = None

    class Config:
        from_attributes = True


# --- AI Symptom Analysis Schemas ---
class SymptomInput(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    possible_conditions: List[Dict[str, Any]] # e.g. [{"condition": "Common Cold", "probability": 0.85, "details": "..."}]
    recommendations: List[str]
    urgency_level: str # Low, Medium, High, Emergency
    disclaimer: str

# --- Razorpay Schemas ---
class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str
    key_id: str

class RazorpayVerifyPayload(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    bill_id: int
