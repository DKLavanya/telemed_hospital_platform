"use client";

import React, { useState } from "react";
import { Brain, Send, Stethoscope, AlertTriangle, ShieldCheck, HeartPulse, RefreshCw } from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function SymptomsPage() {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("male");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      // AI Symptom analysis endpoint requires authentication header (falls back to localstorage)
      const data = await apiRequest("/ai/analyze", "POST", {
        symptoms: symptoms,
        age: age ? Number(age) : null,
        gender: gender
      });
      setResults(data);
    } catch (err: any) {
      // In case user is not signed in, prompt them or run analysis using mock client-side backup
      console.warn("API request failed, running client backup analysis...");
      // Let's call the symptom checker offline client fallback so it ALWAYS works for the user
      // even if they haven't registered yet! This is a robust UX trick.
      setTimeout(() => {
        const fallbackData = getClientFallbackAnalysis(symptoms);
        setResults(fallbackData);
        setLoading(false);
      }, 1000);
      return;
    }
    setLoading(false);
  };

  const getClientFallbackAnalysis = (text: string) => {
    const normText = text.toLowerCase();
    let conditions = [];
    let recommendations = [];
    let urgency = "Low";

    const hasChest = normText.includes("chest");
    const hasPain = ["pain", "hurt", "tightness", "pressure", "ache", "sharp", "discomfort"].some(k => normText.includes(k));
    const hasBlood = ["blood", "bleed", "bleeding", "hemorrhage", "red"].some(k => normText.includes(k));
    const hasEarHead = ["ear", "ears", "head", "skull", "brain", "hearing", "neck", "spine", "eye", "eyes"].some(k => normText.includes(k));
    const hasTrauma = ["accident", "injury", "torn", "tear", "broken", "fracture", "wound", "cut", "fall", "hit", "trauma", "crash"].some(k => normText.includes(k));

    if (hasTrauma) {
      if (hasEarHead || hasChest) {
        conditions.push({
          condition: "Acute Trauma / Critical Physical Injury",
          probability: 0.90,
          details: "Physical trauma or laceration involving critical anatomical regions (head, neck, ear, eye, or chest). High risk of internal injury, fracture, or severe tissue damage."
        });
        recommendations.push("Go to the nearest emergency room immediately for professional wound care and assessment.");
        recommendations.push("Keep the patient stable and do not manipulate the injured structures.");
        urgency = "Emergency";
      } else {
        conditions.push({
          condition: "Localized Physical Trauma / Wound",
          probability: 0.80,
          details: "Localized physical trauma or laceration to limbs or extremities. Warrants clinical evaluation to rule out deep cuts, fractures, or tendon damage."
        });
        recommendations.push("Visit an urgent care center or doctor for examination and dressing.");
        recommendations.push("Apply a clean compress to manage bleeding and keep the injured area elevated.");
        urgency = "High";
      }
    }

    if ((hasChest && hasPain) || ["breathing", "shortness of breath", "breath", "suffocat", "chok"].some(k => normText.includes(k))) {
      conditions.push({
        condition: "Cardiac Chest Pain / Respiratory Distress",
        probability: 0.85,
        details: "Potential cardiac warning signs or acute breathing difficulty. Immediate medical review required."
      });
      recommendations.push("Seek immediate emergency medical care (Call 911 / 108).");
      recommendations.push("Sit upright, rest, and do not perform physical work.");
      urgency = "Emergency";
    }

    if (hasBlood && hasEarHead && !hasTrauma) {
      conditions.push({
        condition: "Head Injury / Bleeding from Ear",
        probability: 0.80,
        details: "Bleeding from the ear canal or head trauma indicating potential skull base injury or eardrum rupture."
      });
      recommendations.push("Go to the nearest emergency room immediately.");
      recommendations.push("Keep the head slightly elevated and do not plug the ear canal.");
      urgency = "Emergency";
    }

    if (conditions.length === 0) {
      if (["fever", "cough", "throat", "shivering", "chills"].some(k => normText.includes(k))) {
        conditions.push({
          condition: "Influenza / Acute Viral Syndrome",
          probability: 0.85,
          details: "Classic presentation of respiratory viral infection. Self-limiting, but monitor temperature."
        });
        recommendations.push("Drink fluids, rest, and monitor fever.");
        recommendations.push("Consult a primary physician if fever persists.");
        urgency = "Medium";
      } else if (["stomach", "vomit", "diarrhea", "nausea", "belly"].some(k => normText.includes(k))) {
        conditions.push({
          condition: "Gastroenteritis / Food Poisoning",
          probability: 0.75,
          details: "Typical stomach or gut irritation, likely from viral or food issues."
        });
        recommendations.push("Stay hydrated with electrolytes.");
        recommendations.push("Consult a provider if pain is severe or blood is present.");
        urgency = "Low";
      } else {
        conditions.push({
          condition: "General Symptom Discomfort",
          probability: 0.60,
          details: "Symptoms are generalized. Telemedicine consultation is recommended for diagnostic evaluation."
        });
        recommendations.push("Schedule a consultation in the Doctor Portal.");
        recommendations.push("Keep a log of symptoms.");
        urgency = "Low";
      }
    }

    return {
      possible_conditions: conditions,
      recommendations: recommendations,
      urgency_level: urgency,
      disclaimer: "DISCLAIMER: Offline fallback mode. This is an informational assessment and does not constitute official medical advice."
    };
  };

  const getUrgencyClass = (level: string) => {
    switch (level.toLowerCase()) {
      case "emergency": return "urgency-emergency";
      case "high": return "urgency-high";
      case "medium": return "urgency-medium";
      default: return "urgency-low";
    }
  };

  return (
    <div className="symptoms-container animate-slide-up">
      <div className="header-info">
        <div className="icon-badge">
          <Brain className="brain-glow" size={24} />
        </div>
        <h1 className="title">AI Symptom Analysis</h1>
        <p className="subtitle">Enter your details and symptoms. Our intelligent clinical matcher will analyze potential conditions and suggest recommended next steps.</p>
      </div>

      <div className="layout-grid">
        {/* Input Form Column */}
        <div className="glass-panel input-panel">
          <h3 className="panel-title">Diagnostic Input</h3>
          
          <form onSubmit={handleAnalyze} className="symptom-form">
            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  min="0" 
                  max="120" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} 
                  placeholder="e.g. 28" 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)} 
                  className="form-input form-select"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Describe how you are feeling</label>
              <textarea 
                rows={5} 
                required 
                value={symptoms} 
                onChange={(e) => setSymptoms(e.target.value)} 
                placeholder="Describe symptoms in your own words. (e.g., 'I have had a sharp headache for two days, feeling slightly nauseous when exposed to light.')" 
                className="form-input textarea-input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn btn-primary btn-submit-analyze"
            >
              {loading ? (
                <>
                  <RefreshCw className="spinner-icon" size={16} />
                  Analyzing Symptoms...
                </>
              ) : (
                <>
                  <Stethoscope size={16} />
                  Begin Analysis
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="glass-panel results-panel">
          {!results && !loading && (
            <div className="empty-results">
              <HeartPulse className="empty-icon animate-pulse-slow" size={48} />
              <p>Ready to analyze. Submit your symptoms in the form to generate suggestions.</p>
            </div>
          )}

          {loading && (
            <div className="loading-results">
              <div className="loader-ring"></div>
              <p>Running semantic matching algorithms...</p>
            </div>
          )}

          {results && !loading && (
            <div className="results-wrapper animate-slide-up">
              {/* Urgency Badge Header */}
              <div className="results-header">
                <h3 className="results-title">Analysis Results</h3>
                <span className={`badge ${getUrgencyClass(results.urgency_level)}`}>
                  {results.urgency_level} Urgency
                </span>
              </div>

              {/* Conditions List */}
              <div className="conditions-section">
                <h4 className="section-sub-title">Possible Matches</h4>
                <div className="conditions-list">
                  {results.possible_conditions?.map((cond: any, idx: number) => (
                    <div key={idx} className="condition-card glass-card">
                      <div className="condition-card-header">
                        <span className="condition-name">{cond.condition}</span>
                        <span className="condition-probability">
                          {Math.round(cond.probability * 100)}% Match
                        </span>
                      </div>
                      <p className="condition-desc">{cond.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="recommendations-section">
                <h4 className="section-sub-title">Recommended Actions</h4>
                <ul className="recs-list">
                  {results.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx} className="rec-item">
                      <span className="rec-bullet">&bull;</span>
                      <span className="rec-text">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="disclaimer-alert">
                <AlertTriangle className="disclaimer-icon" size={18} />
                <p className="disclaimer-text">{results.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .symptoms-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .header-info {
          text-align: center;
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .icon-badge {
          background: var(--primary-glow);
          border: 1px solid var(--border-glow);
          width: 54px;
          height: 54px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brain-glow {
          color: var(--primary);
          filter: drop-shadow(0 0 4px var(--primary));
        }
        .title {
          font-size: 2.5rem;
        }
        .subtitle {
          color: var(--text-muted);
          line-height: 1.6;
        }
        
        .layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .input-panel, .results-panel {
          padding: 32px;
          border-radius: var(--radius-lg);
          min-height: 480px;
          display: flex;
          flex-direction: column;
        }
        .panel-title {
          font-size: 1.35rem;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .symptom-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex-grow: 1;
        }
        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .textarea-input {
          resize: none;
          line-height: 1.5;
        }
        .btn-submit-analyze {
          padding: 14px;
          font-size: 1rem;
          margin-top: auto;
        }
        
        /* Empty/Loading */
        .empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 16px;
          color: var(--text-muted);
          flex-grow: 1;
          padding: 0 40px;
        }
        .empty-icon {
          color: rgba(255, 255, 255, 0.05);
        }
        .loading-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          color: var(--text-muted);
          flex-grow: 1;
        }
        .loader-ring {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.03);
          border-top-color: var(--secondary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        /* Results wrapper */
        .results-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .results-title {
          font-size: 1.35rem;
        }
        
        /* Urgency levels */
        .urgency-low {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
        }
        .urgency-medium {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }
        .urgency-high {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }
        .urgency-emergency {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(244, 63, 94, 0.25));
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.4);
          animation: pulse 1.5s infinite;
        }
        
        .section-sub-title {
          font-size: 1rem;
          color: var(--text-muted);
          margin-bottom: 12px;
          font-weight: 600;
        }
        .conditions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .condition-card {
          padding: 16px;
        }
        .condition-card-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          font-size: 0.95rem;
          margin-bottom: 6px;
        }
        .condition-name {
          color: var(--text-main);
        }
        .condition-probability {
          color: var(--secondary);
        }
        .condition-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        
        .recs-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rec-item {
          display: flex;
          gap: 8px;
          font-size: 0.9rem;
        }
        .rec-bullet {
          color: var(--primary);
          font-weight: bold;
        }
        .rec-text {
          color: var(--text-main);
        }
        
        .disclaimer-alert {
          background: rgba(245, 158, 11, 0.03);
          border: 1px solid rgba(245, 158, 11, 0.12);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          gap: 12px;
        }
        .disclaimer-icon {
          color: var(--warning);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .disclaimer-text {
          font-size: 0.8rem;
          color: #fcd34d;
          line-height: 1.4;
        }
        
        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
