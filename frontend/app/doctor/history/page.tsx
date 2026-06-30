"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest, formatDateTime } from "../../../utils/api";
import { Activity, RefreshCw } from "lucide-react";

function HistoryContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id");
  const patientName = searchParams.get("name") || "Patient";

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) {
      setError("No patient ID provided.");
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/records?patient_id=${patientId}`);
        setRecords(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load clinical history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  return (
    <div className="history-page-container">
      <div className="glass-panel header-banner">
        <div>
          <h2>Clinical History & EMR Timeline</h2>
          <p className="patient-subtitle">Patient: <strong>{patientName}</strong> (ID: {patientId})</p>
        </div>
        <button onClick={() => window.close()} className="btn btn-secondary close-btn">
          Close Window
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" size={32} />
          <p>Retrieving patient timeline records...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-panel empty-state">
          <Activity size={48} className="empty-icon" />
          <h3>No Records Found</h3>
          <p>There are no past clinical records or checkups logged for this patient in the database.</p>
        </div>
      ) : (
        <div className="timeline-container">
          {records.map((rec, index) => (
            <div key={rec.id} className="timeline-item glass-card animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="timeline-marker"></div>
              <div className="record-card">
                <div className="record-header">
                  <div className="header-left">
                    <span className="visit-date">📅 {formatDateTime(rec.visit_date)}</span>
                    <span className="doctor-badge">Logged by Dr. {rec.doctor?.name || "Physician"}</span>
                  </div>
                  {rec.vitals_blood_pressure || rec.vitals_heart_rate || rec.vitals_temperature ? (
                    <div className="vitals-row">
                      {rec.vitals_blood_pressure && <span className="vital-tag">BP: {rec.vitals_blood_pressure}</span>}
                      {rec.vitals_heart_rate && <span className="vital-tag">HR: {rec.vitals_heart_rate} bpm</span>}
                      {rec.vitals_temperature && <span className="vital-tag">Temp: {rec.vitals_temperature}°F</span>}
                    </div>
                  ) : null}
                </div>
                
                <div className="record-body">
                  <div className="section-block">
                    <span className="block-label">Chief Symptoms / Complaint</span>
                    <p className="block-content text-highlight">{rec.symptoms}</p>
                  </div>
                  
                  <div className="section-block">
                    <span className="block-label">Clinical Diagnosis</span>
                    <p className="block-content diagnosis-text">{rec.diagnosis}</p>
                  </div>
                  
                  {rec.notes && (
                    <div className="section-block notes-block">
                      <span className="block-label">Treatment Plan & Physician Notes</span>
                      <p className="block-content notes-content">{rec.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .history-page-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 24px;
          font-family: var(--font-sans);
        }
        .header-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          margin-bottom: 32px;
          border-radius: var(--radius-lg);
        }
        .header-banner h2 {
          margin: 0 0 4px 0;
          font-size: 1.6rem;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .patient-subtitle {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-muted);
        }
        .patient-subtitle strong {
          color: var(--primary);
        }
        .close-btn {
          min-width: auto;
          padding: 8px 16px;
        }
        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .spinner {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .empty-icon {
          color: var(--text-muted);
          opacity: 0.4;
        }
        .empty-state h3 {
          margin: 0 0 8px 0;
        }
        .empty-state p {
          margin: 0;
          color: var(--text-muted);
          max-width: 400px;
        }
        
        /* Timeline style */
        .timeline-container {
          position: relative;
          padding-left: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .timeline-container::before {
          content: '';
          position: absolute;
          left: 11px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: rgba(255, 255, 255, 0.08);
        }
        .timeline-item {
          position: relative;
        }
        .timeline-marker {
          position: absolute;
          left: -26px;
          top: 24px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
          border: 2px solid #000;
        }
        .record-card {
          padding: 24px;
          border-radius: var(--radius-md);
        }
        .record-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .visit-date {
          font-weight: 600;
          font-size: 1rem;
          color: #ffffff;
        }
        .doctor-badge {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .vitals-row {
          display: flex;
          gap: 8px;
        }
        .vital-tag {
          font-size: 0.78rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }
        
        .record-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .section-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .block-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .block-content {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .text-highlight {
          color: rgba(255, 255, 255, 0.9);
        }
        .diagnosis-text {
          color: #ffffff;
          font-weight: 600;
          font-size: 1.05rem;
        }
        .notes-block {
          background: rgba(255, 255, 255, 0.01);
          border-left: 3px solid var(--primary);
          padding: 10px 14px;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .notes-content {
          color: rgba(255, 255, 255, 0.85);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <RefreshCw style={{ animation: "spin 1s linear infinite" }} size={32} />
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}
