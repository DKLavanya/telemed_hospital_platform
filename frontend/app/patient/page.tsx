"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, FileText, Activity, CreditCard, Stethoscope, Video, PlusCircle, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../utils/api";
import confetti from "canvas-confetti";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("appointments");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  
  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Payment Modal State
  const [payingBill, setPayingBill] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payingLoading, setPayingLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    const token = localStorage.getItem("telemed_token");
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const user = await apiRequest("/auth/me");
      if (user.role !== "patient") {
        throw new Error("Unauthorized dashboard role");
      }
      setCurrentUser(user);

      // Batch load
      const [docsData, apptsData, recordsData, prescriptionsData, billsData] = await Promise.all([
        apiRequest("/doctors"),
        apiRequest("/appointments"),
        apiRequest("/records"),
        apiRequest("/prescriptions"),
        apiRequest("/billing")
      ]);

      setDoctors(docsData);
      setAppointments(apptsData);
      setRecords(recordsData);
      setPrescriptions(prescriptionsData);
      setBills(billsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !apptTime) return;

    setBookingLoading(true);
    setBookingSuccess(false);

    try {
      await apiRequest("/appointments", "POST", {
        doctor_id: Number(selectedDoctorId),
        appointment_time: apptTime,
        notes: apptNotes
      });
      
      setBookingSuccess(true);
      setSelectedDoctorId("");
      setApptTime("");
      setApptNotes("");

      // Reload appointments list
      const updatedAppts = await apiRequest("/appointments");
      setAppointments(updatedAppts);

      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to book appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handlePayBill = async () => {
    if (!payingBill) return;
    setPayingLoading(true);

    try {
      await apiRequest(`/billing/${payingBill.id}`, "PUT", {
        status: "paid",
        payment_method: "card"
      });

      setPaymentSuccess(true);
      triggerConfetti();

      // Reload bills
      const updatedBills = await apiRequest("/billing");
      setBills(updatedBills);

      setTimeout(() => {
        setPayingBill(null);
        setPaymentSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Payment processing failed.");
    } finally {
      setPayingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw className="spinner-icon" size={32} />
        <p>Loading your medical files & appointments...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 16px;
            color: var(--text-muted);
          }
          .spinner-icon { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="glass-panel unauth-container animate-slide-up">
        <AlertCircle size={48} className="alert-icon" />
        <h2>Access Denied</h2>
        <p>Please register or sign in as a Patient to access your patient dashboard dashboard.</p>
        <Link href="/auth" className="btn btn-primary">
          Sign In / Register
        </Link>
        <style jsx>{`
          .unauth-container {
            max-width: 500px;
            margin: 80px auto;
            padding: 40px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .alert-icon { color: var(--danger); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-layout animate-slide-up">
      {/* Sidebar Navigation */}
      <div className="glass-panel sidebar-nav">
        <div className="sidebar-header">
          <span className="portal-badge">Patient Workspace</span>
          <h3>{currentUser.name}</h3>
          <p className="patient-email">{currentUser.email}</p>
        </div>

        <div className="menu-items">
          <button 
            onClick={() => setActiveTab("appointments")} 
            className={`menu-btn ${activeTab === "appointments" ? "active" : ""}`}
          >
            <Calendar size={18} />
            Appointments
          </button>
          <button 
            onClick={() => setActiveTab("records")} 
            className={`menu-btn ${activeTab === "records" ? "active" : ""}`}
          >
            <Activity size={18} />
            Medical Records
          </button>
          <button 
            onClick={() => setActiveTab("prescriptions")} 
            className={`menu-btn ${activeTab === "prescriptions" ? "active" : ""}`}
          >
            <FileText size={18} />
            Prescriptions
          </button>
          <button 
            onClick={() => setActiveTab("billing")} 
            className={`menu-btn ${activeTab === "billing" ? "active" : ""}`}
          >
            <CreditCard size={18} />
            Bills & Invoices
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content-panel">
        
        {/* TAB 1: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <div className="tab-pane-content">
            <div className="grid-two-cols">
              {/* Appointments List */}
              <div className="glass-panel card-inner">
                <h3 className="section-title-tab">Scheduled Consultations</h3>
                
                {appointments.length === 0 ? (
                  <div className="empty-state">
                    <p>No upcoming appointments found. Book a consultation on the right.</p>
                  </div>
                ) : (
                  <div className="appointments-list">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="appointment-card glass-card">
                        <div className="appt-header">
                          <div className="appt-doctor">
                            <Stethoscope size={18} className="appt-icon" />
                            <div className="doctor-info-text">
                              <strong>{appt.doctor?.name || "Doctor"}</strong>
                              {appt.doctor?.specialization && <span className="appt-specialty">{appt.doctor.specialization}</span>}
                            </div>
                          </div>
                          <span className={`badge badge-${appt.status}`}>
                            {appt.status}
                          </span>
                        </div>
                        
                        <div className="appt-body">
                          <p className="appt-time">
                            📅 {new Date(appt.appointment_time).toLocaleString()}
                          </p>
                          {appt.notes && <p className="appt-notes">📝 {appt.notes}</p>}
                        </div>

                        {/* Call button shows up if scheduled or active */}
                        {(appt.status === "scheduled" || appt.status === "active") && appt.video_room_id && (
                          <Link 
                            href={`/consultation/${appt.video_room_id}?role=patient&name=${encodeURIComponent(currentUser.name)}`} 
                            className="btn btn-success btn-join-call"
                          >
                            <Video size={16} />
                            Launch Video Room
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book Appointment Form */}
              <div className="glass-panel card-inner">
                <h3 className="section-title-tab">Book Consultation</h3>
                
                <form onSubmit={handleBookAppointment} className="booking-form">
                  {bookingSuccess && (
                    <div className="success-banner">
                      <CheckCircle2 size={16} />
                      Appointment requested successfully!
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Select Specialist Doctor</label>
                    <select 
                      required 
                      value={selectedDoctorId} 
                      onChange={(e) => setSelectedDoctorId(e.target.value)} 
                      className="form-input form-select"
                    >
                      <option value="">-- Choose Speciality doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} - {doc.specialization} ({doc.qualification})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Consultation Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={apptTime} 
                      onChange={(e) => setApptTime(e.target.value)} 
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brief medical notes / symptoms description</label>
                    <textarea 
                      rows={4} 
                      value={apptNotes} 
                      onChange={(e) => setApptNotes(e.target.value)} 
                      placeholder="Explain symptoms briefly for the doctor to review." 
                      className="form-input" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={bookingLoading} 
                    className="btn btn-primary btn-book"
                  >
                    {bookingLoading ? "Scheduling..." : "Schedule Appointment"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEDICAL RECORDS */}
        {activeTab === "records" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Electronic Medical Records</h3>
            {records.length === 0 ? (
              <div className="empty-state">
                <p>No diagnosis records logged in this account.</p>
              </div>
            ) : (
              <div className="records-timeline">
                {records.map((rec) => (
                  <div key={rec.id} className="record-timeline-item glass-card">
                    <div className="record-header">
                      <div>
                        <h4>Diagnosis: {rec.diagnosis || "Undetermined"}</h4>
                        <span className="record-doctor">Logged by {rec.doctor?.name || "Unknown Physician"}</span>
                      </div>
                      <span className="record-date">📅 {new Date(rec.visit_date).toLocaleDateString()}</span>
                    </div>
                    <div className="record-body">
                      <div className="vitals-row">
                        {rec.vitals_blood_pressure && <span className="vital-badge">BP: {rec.vitals_blood_pressure}</span>}
                        {rec.vitals_heart_rate && <span className="vital-badge">HR: {rec.vitals_heart_rate} bpm</span>}
                        {rec.vitals_temperature && <span className="vital-badge">Temp: {rec.vitals_temperature}°F</span>}
                      </div>
                      <p className="record-text"><strong>Symptoms:</strong> {rec.symptoms}</p>
                      {rec.notes && <p className="record-text"><strong>Physician Notes:</strong> {rec.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRESCRIPTIONS */}
        {activeTab === "prescriptions" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Active Prescriptions</h3>
            {prescriptions.length === 0 ? (
              <div className="empty-state">
                <p>No digital prescriptions found in your file.</p>
              </div>
            ) : (
              <div className="prescriptions-grid">
                {prescriptions.map((pres) => (
                  <div key={pres.id} className="prescription-card-file glass-card">
                    <div className="pres-header">
                      <div>
                        <h4>Digital Prescription</h4>
                        <span className="pres-doc">Dr. {pres.doctor?.name || "Unknown Physician"}</span>
                      </div>
                      <span className="pres-date">{new Date(pres.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="pres-medicines-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pres.medicines.map((med: any, idx: number) => (
                            <tr key={idx}>
                              <td><strong>{med.name}</strong></td>
                              <td>{med.dosage}</td>
                              <td>{med.frequency}</td>
                              <td>{med.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pres.notes && <p className="pres-notes-txt"><strong>Notes:</strong> {pres.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BILLING */}
        {activeTab === "billing" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Billing History</h3>
            {bills.length === 0 ? (
              <div className="empty-state">
                <p>No billing invoices issued to this account.</p>
              </div>
            ) : (
              <div className="bills-table-container">
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Issue Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id}>
                        <td><code>{bill.invoice_number}</code></td>
                        <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                        <td><strong>${bill.amount.toFixed(2)}</strong></td>
                        <td>
                          <span className={`badge badge-${bill.status}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>
                          {bill.status === "pending" ? (
                            <button 
                              onClick={() => setPayingBill(bill)} 
                              className="btn btn-primary btn-pay-now"
                            >
                              Pay Invoice
                            </button>
                          ) : (
                            <span className="paid-check">
                              <CheckCircle2 size={16} /> paid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Payment checkout modal popup */}
      {payingBill && (
        <div className="modal-backdrop">
          <div className="glass-panel modal-card animate-slide-up">
            <h3>Invoice Payment</h3>
            <p className="modal-sub">Simulating secure billing gateway checkout</p>
            
            {paymentSuccess ? (
              <div className="payment-success-msg">
                <CheckCircle2 className="success-glowing-icon" size={48} />
                <h4>Payment Successful!</h4>
                <p>Invoice status updated. Confetti triggered.</p>
              </div>
            ) : (
              <div className="payment-modal-body">
                <div className="invoice-meta">
                  <span>Bill to Pay:</span>
                  <strong>{payingBill.invoice_number}</strong>
                </div>
                <div className="invoice-meta">
                  <span>Grand Total:</span>
                  <strong className="invoice-amount">${payingBill.amount.toFixed(2)}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input type="text" defaultValue={currentUser.name} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input type="text" placeholder="•••• •••• •••• ••••" defaultValue="4111 2222 3333 4444" className="form-input" />
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Expiry</label>
                    <input type="text" placeholder="MM/YY" defaultValue="12/28" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVC</label>
                    <input type="text" placeholder="•••" defaultValue="123" className="form-input" />
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={() => setPayingBill(null)} 
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePayBill} 
                    disabled={payingLoading} 
                    className="btn btn-primary"
                  >
                    {payingLoading ? "Processing payment..." : `Pay $${payingBill.amount.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 28px;
          align-items: start;
        }
        
        .sidebar-nav {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .sidebar-header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 18px;
        }
        .portal-badge {
          background: var(--secondary-glow);
          color: var(--secondary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          display: inline-block;
          margin-bottom: 8px;
        }
        .patient-email {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin-top: 4px;
        }
        
        .menu-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .menu-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
          text-align: left;
        }
        .menu-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.03);
        }
        .menu-btn.active {
          color: white;
          background: var(--primary);
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        
        .main-content-panel {
          min-height: 500px;
        }
        .card-inner {
          padding: 32px;
          border-radius: var(--radius-lg);
        }
        .section-title-tab {
          font-size: 1.35rem;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        
        .grid-two-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        /* Appointments pane */
        .appointments-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .appointment-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }
        .appt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .appt-doctor {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .doctor-info-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .appt-icon {
          color: var(--secondary);
          background: var(--secondary-glow);
          padding: 6px;
          border-radius: var(--radius-sm);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .appt-specialty {
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 500;
        }
        .appt-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .appt-time {
          font-size: 0.9rem;
          color: var(--text-main);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .appt-notes {
          font-size: 0.85rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          margin-top: 4px;
        }
        .btn-join-call {
          margin-top: 6px;
          width: 100%;
        }
        
        /* Forms */
        .booking-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .success-banner {
          background: var(--success-glow);
          color: var(--success);
          border: 1px solid var(--success);
          padding: 10px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-book {
          width: 100%;
          padding: 12px;
        }
        
        /* Medical Records */
        .records-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .record-timeline-item {
          padding: 24px;
        }
        .record-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .record-doctor {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .record-date {
          font-size: 0.9rem;
          color: var(--secondary);
        }
        .vitals-row {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .vital-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          color: var(--text-main);
        }
        .record-text {
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        
        /* Prescriptions */
        .prescriptions-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .prescription-card-file {
          padding: 28px;
        }
        .pres-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px dashed var(--border-color);
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .pres-doc {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .pres-date {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .pres-medicines-table table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .pres-medicines-table th {
          text-align: left;
          color: var(--text-muted);
          padding: 8px 12px;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
        }
        .pres-medicines-table td {
          padding: 12px;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .pres-notes-txt {
          font-size: 0.85rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }
        
        /* Billing */
        .bills-table-container {
          overflow-x: auto;
        }
        .bills-table {
          width: 100%;
          border-collapse: collapse;
        }
        .bills-table th {
          text-align: left;
          color: var(--text-muted);
          padding: 12px 16px;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
        }
        .bills-table td {
          padding: 16px;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .btn-pay-now {
          padding: 6px 12px;
          font-size: 0.85rem;
        }
        .paid-check {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--success);
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        /* Modal Backdrop */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-backdrop .modal-card {
          width: 100%;
          max-width: 460px;
          padding: 32px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }
        .invoice-amount {
          color: var(--secondary);
          font-size: 1.15rem;
        }
        .payment-modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 12px;
          margin-top: 10px;
        }
        
        .payment-success-msg {
          text-align: center;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .success-glowing-icon {
          color: var(--success);
          filter: drop-shadow(0 0 10px var(--success));
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        @media (max-width: 960px) {
          .dashboard-layout {
            grid-template-columns: 1fr;
          }
          .grid-two-cols {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
