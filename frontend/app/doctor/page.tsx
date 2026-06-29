"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, Calendar, Activity, FileText, CreditCard, Plus, Trash2, Video, CheckCircle2, User, AlertCircle, RefreshCw, BadgeAlert } from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState("queue");

  const formatAppointmentTime = (dateString: string) => {
    let formattedDateString = dateString;
    if (!dateString.endsWith("Z")) {
      formattedDateString = `${dateString}Z`;
    }
    const date = new Date(formattedDateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year}, ${hours}.${minutes} ${ampm}`;
  };
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  // Clinical Logging State (EMR Record)
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [vitalsBP, setVitalsBP] = useState("");
  const [vitalsHR, setVitalsHR] = useState<number | "">("");
  const [vitalsTemp, setVitalsTemp] = useState<number | "">("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [recordSuccess, setRecordSuccess] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);

  // Prescription State
  const [medicines, setMedicines] = useState<any[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  // Billing State
  const [billAmount, setBillAmount] = useState<number | "">("");
  const [billingSuccess, setBillingSuccess] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDoctorData = async () => {
    const token = localStorage.getItem("telemed_token");
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const user = await apiRequest("/auth/me");
      if (user.role !== "doctor") {
        throw new Error("Unauthorized access. Must be a Doctor.");
      }
      setCurrentUser(user);

      // Load appointments
      const appts = await apiRequest("/appointments");
      setAppointments(appts);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load doctor dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  useEffect(() => {
    if (selectedAppt) {
      const loadPatientHistory = async () => {
        try {
          const history = await apiRequest(`/records?patient_id=${selectedAppt.patient_id}`);
          setPatientHistory(history);
        } catch (err) {
          console.error("Failed to load patient history:", err);
        }
      };
      loadPatientHistory();
    } else {
      setPatientHistory([]);
    }
  }, [selectedAppt]);

  const handleStartConsultation = async (appt: any) => {
    try {
      // Set appointment status to active
      const updatedAppt = await apiRequest(`/appointments/${appt.id}`, "PUT", {
        status: "active"
      });
      
      // Update local state
      setAppointments(appointments.map(a => a.id === appt.id ? updatedAppt : a));
    } catch (err: any) {
      alert("Failed to start consultation room.");
    }
  };

  const handleCompleteConsultation = async (appt: any) => {
    try {
      const updatedAppt = await apiRequest(`/appointments/${appt.id}`, "PUT", {
        status: "completed"
      });
      setAppointments(appointments.map(a => a.id === appt.id ? updatedAppt : a));
      if (selectedAppt?.id === appt.id) {
        setSelectedAppt(null);
      }
    } catch (err: any) {
      alert("Failed to close consultation status.");
    }
  };

  const handleDeleteAppointment = async (apptId: number) => {
    if (!confirm("Are you sure you want to delete this appointment from the queue?")) return;
    try {
      await apiRequest(`/appointments/${apptId}`, "DELETE");
      setAppointments(appointments.filter(a => a.id !== apptId));
      if (selectedAppt?.id === apptId) {
        setSelectedAppt(null);
      }
    } catch (err: any) {
      alert("Failed to delete appointment: " + err.message);
    }
  };

  // Submit clinical record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setRecordLoading(true);
    setRecordSuccess(false);

    try {
      await apiRequest("/records", "POST", {
        patient_id: selectedAppt.patient_id,
        symptoms: symptoms,
        diagnosis: diagnosis,
        vitals_blood_pressure: vitalsBP || null,
        vitals_heart_rate: vitalsHR ? Number(vitalsHR) : null,
        vitals_temperature: vitalsTemp ? Number(vitalsTemp) : null,
        notes: clinicalNotes
      });

      setRecordSuccess(true);
      
      // Refresh patient history list immediately after saving
      const history = await apiRequest(`/records?patient_id=${selectedAppt.patient_id}`);
      setPatientHistory(history);

      setSymptoms("");
      setDiagnosis("");
      setVitalsBP("");
      setVitalsHR("");
      setVitalsTemp("");
      setClinicalNotes("");

      setTimeout(() => setRecordSuccess(false), 5000);
    } catch (err: any) {
      alert("Error logging medical records: " + (err.message || err));
    } finally {
      setRecordLoading(false);
    }
  };

  // Medicines builder helpers
  const handleAddMedRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedRow = (idx: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleMedChange = (idx: number, field: string, val: string) => {
    const updated = medicines.map((m, i) => {
      if (i === idx) {
        return { ...m, [field]: val };
      }
      return m;
    });
    setMedicines(updated);
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    
    // Validate rows
    const validMeds = medicines.filter(m => m.name.trim() !== "");
    if (validMeds.length === 0) {
      alert("Please add at least one medicine name.");
      return;
    }

    setPrescriptionLoading(true);
    setPrescriptionSuccess(false);

    try {
      await apiRequest("/prescriptions", "POST", {
        appointment_id: selectedAppt.id,
        patient_id: selectedAppt.patient_id,
        medicines: validMeds,
        notes: prescriptionNotes
      });

      setPrescriptionSuccess(true);
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
      setPrescriptionNotes("");
      
      setTimeout(() => setPrescriptionSuccess(false), 5000);
    } catch (err: any) {
      alert("Error saving prescription: " + (err.message || err));
    } finally {
      setPrescriptionLoading(false);
    }
  };

  // Generate bill
  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !billAmount) return;
    setBillingLoading(true);
    setBillingSuccess(false);

    try {
      await apiRequest("/billing", "POST", {
        appointment_id: selectedAppt.id,
        patient_id: selectedAppt.patient_id,
        amount: Number(billAmount)
      });

      setBillingSuccess(true);
      setBillAmount("");
      
      setTimeout(() => setBillingSuccess(false), 5000);
    } catch (err: any) {
      alert("Error issuing invoice: " + (err.message || err));
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw className="spinner-icon" size={32} />
        <p>Opening Doctor's Office database...</p>
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
        <p>Please register or sign in as a Doctor to access your clinical dashboard workspace.</p>
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
    <div className="doctor-dashboard-layout animate-slide-up">
      {/* Sidebar navigation */}
      <div className="glass-panel sidebar-nav">
        <div className="sidebar-header">
          <span className="portal-badge">Doctor Workstation</span>
          <h3>{currentUser.name}</h3>
          <p className="specialty-text">{currentUser.specialization || "General Medicine"}</p>
        </div>

        <div className="menu-items">
          <button 
            onClick={() => setActiveTab("queue")} 
            className={`menu-btn ${activeTab === "queue" ? "active" : ""}`}
          >
            <Calendar size={18} />
            Patient Queue
          </button>
          <button 
            onClick={() => {
              setActiveTab("emr");
              // default to first active appt if available
              if (!selectedAppt && appointments.length > 0) {
                setSelectedAppt(appointments[0]);
              }
            }} 
            className={`menu-btn ${activeTab === "emr" ? "active" : ""}`}
          >
            <Activity size={18} />
            Clinical Records
          </button>
          <button 
            onClick={() => {
              setActiveTab("prescribe");
              if (!selectedAppt && appointments.length > 0) {
                setSelectedAppt(appointments[0]);
              }
            }} 
            className={`menu-btn ${activeTab === "prescribe" ? "active" : ""}`}
          >
            <FileText size={18} />
            Prescriptions
          </button>
          <button 
            onClick={() => {
              setActiveTab("invoicing");
              if (!selectedAppt && appointments.length > 0) {
                setSelectedAppt(appointments[0]);
              }
            }} 
            className={`menu-btn ${activeTab === "invoicing" ? "active" : ""}`}
          >
            <CreditCard size={18} />
            Billing Generator
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="main-content-panel">
        
        {/* TAB 1: QUEUE MANAGEMENT */}
        {activeTab === "queue" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Today's Appointment Queue</h3>
            
            {appointments.length === 0 ? (
              <div className="empty-state">
                <p>No appointments booked with you today.</p>
              </div>
            ) : (
              <div className="queue-table-container">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Time Slot</th>
                      <th>Reason / Notes</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt.id}>
                        <td>
                          <div className="patient-user-cell">
                            <div className="cell-avatar">{(appt.patient?.name?.[0] || "P").toUpperCase()}</div>
                            <span>{appt.patient?.name || "Unknown Patient"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="appt-time-label">
                            📅 {formatAppointmentTime(appt.appointment_time)}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="appt-notes-txt" 
                            title={appt.notes || "General checkup"}
                          >
                            {appt.notes || "General checkup"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${appt.status}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            {appt.status === "pending" && (
                              <button 
                                onClick={() => handleStartConsultation(appt)} 
                                className="btn btn-secondary btn-sm"
                              >
                                Accept & Start Call
                              </button>
                            )}

                            {appt.status === "active" && (
                              <>
                                <Link 
                                  href={`/consultation/${appt.video_room_id}?role=doctor&name=${encodeURIComponent(currentUser.name)}`} 
                                  className="btn btn-success btn-sm btn-icon-video"
                                >
                                  <Video size={14} /> Join Call
                                </Link>
                                <button 
                                  onClick={() => handleCompleteConsultation(appt)} 
                                  className="btn btn-danger btn-sm"
                                >
                                  Mark Completed
                                </button>
                              </>
                            )}

                            {appt.status === "scheduled" && (
                              <button 
                                onClick={() => handleStartConsultation(appt)} 
                                className="btn btn-primary btn-sm"
                              >
                                Activate Consult
                              </button>
                            )}

                            {appt.status === "completed" && (
                              <span className="check-completed">
                                <CheckCircle2 size={14} /> completed
                              </span>
                            )}

                            <button 
                               onClick={() => handleDeleteAppointment(appt.id)} 
                               className="btn btn-danger btn-sm"
                               title="Delete Appointment"
                               style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ELECTRONIC HEALTH RECORDS (EMR) */}
        {activeTab === "emr" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Create Electronic Health Record</h3>
            
            <div className="clinical-grid">
              <div className="form-group">
                <label className="form-label">Select Patient from Appointments</label>
                <select 
                  value={selectedAppt ? selectedAppt.id : ""} 
                  onChange={(e) => setSelectedAppt(appointments.find(a => a.id === Number(e.target.value)) || null)} 
                  className="form-input form-select"
                >
                  <option value="">-- Choose active / completed patient session --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient?.name || "Unknown Patient"} - {new Date(a.appointment_time).toLocaleDateString()} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAppt ? (
                <div className="emr-workspace-grid animate-slide-up">
                  {/* Left: EMR Record Form */}
                  <form onSubmit={handleSaveRecord} className="clinical-form">
                    {recordSuccess && (
                      <div className="success-banner">
                        <CheckCircle2 size={16} /> Clinical EMR logged and saved to database successfully!
                      </div>
                    )}

                    <div className="form-row-grid">
                      <div className="form-group">
                        <label className="form-label">Vitals: Blood Pressure</label>
                        <input 
                          type="text" 
                          value={vitalsBP} 
                          onChange={(e) => setVitalsBP(e.target.value)} 
                          placeholder="e.g. 120/80" 
                          className="form-input" 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Vitals: Heart Rate (bpm)</label>
                        <input 
                          type="number" 
                          value={vitalsHR} 
                          onChange={(e) => setVitalsHR(e.target.value === "" ? "" : Number(e.target.value))} 
                          placeholder="e.g. 72" 
                          className="form-input" 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Vitals: Temperature (°F)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={vitalsTemp} 
                          onChange={(e) => setVitalsTemp(e.target.value === "" ? "" : Number(e.target.value))} 
                          placeholder="e.g. 98.6" 
                          className="form-input" 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Chief Symptoms Complaint</label>
                      <textarea 
                        rows={3} 
                        required 
                        value={symptoms} 
                        onChange={(e) => setSymptoms(e.target.value)} 
                        placeholder="Describe what symptoms the patient complained about." 
                        className="form-input" 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Clinical Diagnosis</label>
                      <input 
                        type="text" 
                        required 
                        value={diagnosis} 
                        onChange={(e) => setDiagnosis(e.target.value)} 
                        placeholder="e.g. Acute Viral Bronchitis" 
                        className="form-input" 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Physician Treatment Plan & Notes</label>
                      <textarea 
                        rows={4} 
                        value={clinicalNotes} 
                        onChange={(e) => setClinicalNotes(e.target.value)} 
                        placeholder="Input long form instructions, follow up recommendations, lifestyle changes, etc." 
                        className="form-input" 
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={recordLoading} 
                      className="btn btn-primary btn-save"
                    >
                      {recordLoading ? "Saving EMR..." : "Save Record"}
                    </button>
                  </form>

                  {/* Right: Patient History Panel */}
                  <div className="patient-history-panel glass-card">
                    <h4>Clinical History & past checkups</h4>
                    {patientHistory.length === 0 ? (
                      <div className="no-history-box">
                        <User size={24} />
                        <p>No previous medical records found for this patient.</p>
                      </div>
                    ) : (
                      <div className="history-timeline">
                        {patientHistory.map((rec) => (
                          <div key={rec.id} className="history-card">
                            <div className="history-header">
                              <span className="history-date">📅 {new Date(rec.visit_date).toLocaleDateString()}</span>
                              <span className="history-doctor">Dr. {rec.doctor?.name || "Physician"}</span>
                            </div>
                            <div className="history-body">
                              <p><strong>Diagnosis:</strong> <span style={{ color: 'white', fontWeight: 500 }}>{rec.diagnosis}</span></p>
                              <p><strong>Symptoms:</strong> {rec.symptoms}</p>
                              {(rec.vitals_blood_pressure || rec.vitals_heart_rate || rec.vitals_temperature) && (
                                <p className="history-vitals-txt">
                                  <strong>Vitals:</strong> {rec.vitals_blood_pressure ? `BP ${rec.vitals_blood_pressure}` : ""} {rec.vitals_heart_rate ? `| HR ${rec.vitals_heart_rate} bpm` : ""} {rec.vitals_temperature ? `| Temp ${rec.vitals_temperature}°F` : ""}
                                </p>
                              )}
                              {rec.notes && <p className="history-notes-block"><strong>Notes:</strong> {rec.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="select-patient-prompt">
                  <User size={32} />
                  <p>Choose an appointment from the dropdown list to begin compiling EMR diagnostic records.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL PRESCRIPTION WRITER */}
        {activeTab === "prescribe" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Write Electronic Prescription</h3>

            <div className="clinical-grid">
              <div className="form-group">
                <label className="form-label">Select Patient from Appointments</label>
                <select 
                  value={selectedAppt ? selectedAppt.id : ""} 
                  onChange={(e) => setSelectedAppt(appointments.find(a => a.id === Number(e.target.value)) || null)} 
                  className="form-input form-select"
                >
                  <option value="">-- Choose active / completed patient session --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient?.name} - {new Date(a.appointment_time).toLocaleDateString()} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAppt ? (
                <form onSubmit={handleSavePrescription} className="prescription-form animate-slide-up">
                  {prescriptionSuccess && (
                    <div className="success-banner">
                      <CheckCircle2 size={16} /> Prescription generated and digitally signed successfully!
                    </div>
                  )}

                  <div className="medicines-builder-section">
                    <div className="meds-header-row">
                      <h4>Medicines List</h4>
                      <button 
                        type="button" 
                        onClick={handleAddMedRow} 
                        className="btn btn-secondary btn-sm btn-add-row"
                      >
                        <Plus size={14} /> Add Medicine
                      </button>
                    </div>

                    <div className="meds-rows-list">
                      {medicines.map((med, idx) => (
                        <div key={idx} className="med-builder-row">
                          <div className="form-group med-col-large">
                            <label className="form-label font-small">Medicine Name</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Paracetamol 500mg" 
                              value={med.name} 
                              onChange={(e) => handleMedChange(idx, "name", e.target.value)} 
                              className="form-input" 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label font-small">Dosage</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 1 Tablet" 
                              value={med.dosage} 
                              onChange={(e) => handleMedChange(idx, "dosage", e.target.value)} 
                              className="form-input" 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label font-small">Frequency</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Twice daily" 
                              value={med.frequency} 
                              onChange={(e) => handleMedChange(idx, "frequency", e.target.value)} 
                              className="form-input" 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label font-small">Duration</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 5 Days" 
                              value={med.duration} 
                              onChange={(e) => handleMedChange(idx, "duration", e.target.value)} 
                              className="form-input" 
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveMedRow(idx)} 
                            className="btn-remove-row"
                            title="Remove row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Special instructions / pharmacy notes (Optional)</label>
                    <textarea 
                      rows={3} 
                      value={prescriptionNotes} 
                      onChange={(e) => setPrescriptionNotes(e.target.value)} 
                      placeholder="Write instructions (e.g. 'Take after meals. Drink plenty of water.')" 
                      className="form-input" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={prescriptionLoading} 
                    className="btn btn-primary btn-save"
                  >
                    {prescriptionLoading ? "Signing RX..." : "Sign & Send Prescription"}
                  </button>
                </form>
              ) : (
                <div className="select-patient-prompt">
                  <User size={32} />
                  <p>Choose an appointment from the dropdown list to construct digital prescriptions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BILLING & INVOICING */}
        {activeTab === "invoicing" && (
          <div className="glass-panel card-inner">
            <h3 className="section-title-tab">Generate Billing Invoice</h3>

            <div className="clinical-grid">
              <div className="form-group">
                <label className="form-label">Select Patient from Appointments</label>
                <select 
                  value={selectedAppt ? selectedAppt.id : ""} 
                  onChange={(e) => setSelectedAppt(appointments.find(a => a.id === Number(e.target.value)) || null)} 
                  className="form-input form-select"
                >
                  <option value="">-- Choose active / completed patient session --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient?.name} - {new Date(a.appointment_time).toLocaleDateString()} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAppt ? (
                <form onSubmit={handleGenerateBill} className="billing-form animate-slide-up">
                  {billingSuccess && (
                    <div className="success-banner">
                      <CheckCircle2 size={16} /> Invoice issued successfully! Status marked as pending.
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Billing Amount (₹ INR)</label>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      value={billAmount} 
                      onChange={(e) => setBillAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                      placeholder="e.g. 150" 
                      className="form-input" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={billingLoading} 
                    className="btn btn-primary"
                  >
                    {billingLoading ? "Generating Invoice..." : "Issue Invoice Bill"}
                  </button>
                </form>
              ) : (
                <div className="select-patient-prompt">
                  <User size={32} />
                  <p>Choose an appointment from the dropdown list to issue payments/invoices.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .doctor-dashboard-layout {
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
          background: var(--primary-glow);
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          display: inline-block;
          margin-bottom: 8px;
        }
        .specialty-text {
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
        
        /* Queue Table */
        .queue-table-container {
          overflow-x: auto;
        }
        .queue-table {
          width: 100%;
          border-collapse: collapse;
        }
        .queue-table th {
          text-align: left;
          color: var(--text-muted);
          padding: 12px 16px;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
        }
        .queue-table td {
          padding: 16px;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .patient-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
        .cell-avatar {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-weight: bold;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .appt-time-label {
          color: var(--secondary);
          font-weight: 500;
        }
        .appt-notes-txt {
          color: var(--text-muted);
          max-width: 300px;
          display: inline-block;
          word-break: break-word;
          white-space: normal;
        }
        .actions-cell {
          display: flex;
          gap: 8px;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 0.8rem;
        }
        .btn-icon-video {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .check-completed {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        
        /* Forms */
        .clinical-form, .prescription-form, .billing-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-row-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .success-banner {
          background: var(--success-glow);
          color: var(--success);
          border: 1px solid var(--success);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        /* Select EMR prompt */
        .select-patient-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px;
          color: var(--text-muted);
          gap: 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-lg);
        }
        
        /* Prescription Builder */
        .medicines-builder-section {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .meds-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-add-row {
          padding: 6px 12px;
          font-size: 0.8rem;
        }
        .meds-rows-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .med-builder-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }
        .font-small {
          font-size: 0.8rem;
        }
        .med-col-large {
          grid-column: span 1;
        }
        .btn-remove-row {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-fast);
          padding-bottom: 14px;
        }
        .btn-remove-row:hover {
          color: var(--danger);
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        /* EMR Workspace Grid & Patient History CSS */
        .emr-workspace-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          align-items: start;
          width: 100%;
        }
        .patient-history-panel {
          padding: 24px;
          max-height: 520px;
          overflow-y: auto;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .patient-history-panel h4 {
          margin-bottom: 16px;
          font-size: 1.05rem;
          color: var(--text-main);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        .no-history-box {
          color: var(--text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .history-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .history-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 16px;
          font-size: 0.85rem;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 600;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
          padding-bottom: 6px;
        }
        .history-date {
          color: var(--secondary);
        }
        .history-doctor {
          color: var(--text-muted);
        }
        .history-body p {
          margin-bottom: 6px;
          line-height: 1.4;
        }
        .history-vitals-txt {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .history-notes-block {
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          margin-top: 8px;
          line-height: 1.4;
        }

        @media (max-width: 960px) {
          .doctor-dashboard-layout {
            grid-template-columns: 1fr;
          }
          .form-row-grid {
            grid-template-columns: 1fr;
          }
          .med-builder-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .btn-remove-row {
            padding-bottom: 0;
            margin-top: 4px;
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
