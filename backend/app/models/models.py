import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole:
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.PATIENT) # patient, doctor, admin
    
    # Doctor specific fields
    specialization = Column(String, nullable=True) # e.g. Cardiologist, Dermatologist
    qualification = Column(String, nullable=True) # e.g. MD, MBBS
    availability = Column(String, nullable=True) # e.g. Mon-Fri 9AM-5PM
    
    # Contact field
    phone = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    appointments_as_patient = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient")
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    records_as_patient = relationship("PatientRecord", foreign_keys="PatientRecord.patient_id", back_populates="patient")
    prescriptions_as_patient = relationship("Prescription", foreign_keys="Prescription.patient_id", back_populates="patient")
    medical_reports = relationship("MedicalReport", back_populates="patient")
    bills = relationship("Billing", back_populates="patient")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appointment_time = Column(DateTime, nullable=False)
    duration = Column(Integer, default=30) # in minutes
    status = Column(String, default="pending") # pending, scheduled, active, completed, cancelled
    video_room_id = Column(String, nullable=True, unique=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    prescription = relationship("Prescription", back_populates="appointment", uselist=False)
    bill = relationship("Billing", back_populates="appointment", uselist=False)


class PatientRecord(Base):
    __tablename__ = "patient_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    visit_date = Column(DateTime, default=datetime.datetime.utcnow)
    symptoms = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=True)
    vitals_blood_pressure = Column(String, nullable=True) # e.g. 120/80
    vitals_heart_rate = Column(Integer, nullable=True) # e.g. 72
    vitals_temperature = Column(Float, nullable=True) # e.g. 98.6
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="records_as_patient")
    doctor = relationship("User", foreign_keys=[doctor_id])


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    medicines = Column(JSON, nullable=False) # List of dicts: [{"name": "Aspirin", "dosage": "100mg", "frequency": "Once daily", "duration": "5 days"}]
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="prescription")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="prescriptions_as_patient")
    doctor = relationship("User", foreign_keys=[doctor_id])


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String, nullable=False) # file path or cloud key
    file_url = Column(String, nullable=False) # download link
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", back_populates="medical_reports")


class Billing(Base):
    __tablename__ = "billing"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending") # pending, paid, refunded
    payment_method = Column(String, nullable=True) # card, cash, bank_transfer
    payment_date = Column(DateTime, nullable=True)
    invoice_number = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="bill")
    patient = relationship("User", back_populates="bills")
