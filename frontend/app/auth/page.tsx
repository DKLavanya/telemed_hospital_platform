"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, UserPlus, FileSignature, Stethoscope } from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("patient");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    qualification: "",
    availability: "",
    securityCode: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        const response = await apiRequest("/auth/login", "POST", {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem("telemed_token", response.access_token);
        
        // Redirect based on user profile
        const userProfile = await apiRequest("/auth/me", "GET", null, response.access_token);
        if (userProfile.role === "doctor") {
          localStorage.setItem("telemed_token_doctor", response.access_token);
          window.dispatchEvent(new Event("auth_changed"));
          router.push("/doctor");
        } else {
          localStorage.setItem("telemed_token_patient", response.access_token);
          window.dispatchEvent(new Event("auth_changed"));
          router.push("/patient");
        }
      } else {
        // Enforce password complexity rules: minimum 8 chars, 1 number, 1 special char
        const password = formData.password;
        if (password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setLoading(false);
          return;
        }
        if (!/\d/.test(password)) {
          setError("Password must contain at least one number.");
          setLoading(false);
          return;
        }
        if (!/[^a-zA-Z0-9]/.test(password)) {
          setError("Password must contain at least one special character/symbol.");
          setLoading(false);
          return;
        }

        // Register Flow
        await apiRequest("/auth/register", "POST", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: role,
          specialization: role === "doctor" ? formData.specialization : null,
          qualification: role === "doctor" ? formData.qualification : null,
          availability: role === "doctor" ? formData.availability : null,
          security_code: role === "doctor" ? formData.securityCode : null
        });

        // Automatically log in after registration
        const response = await apiRequest("/auth/login", "POST", {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem("telemed_token", response.access_token);
        if (role === "doctor") {
          localStorage.setItem("telemed_token_doctor", response.access_token);
          window.dispatchEvent(new Event("auth_changed"));
          router.push("/doctor");
        } else {
          localStorage.setItem("telemed_token_patient", response.access_token);
          window.dispatchEvent(new Event("auth_changed"));
          router.push("/patient");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper animate-slide-up">
      <div className="glass-panel auth-card">
        <h2 className="auth-card-title">{isLogin ? "Sign In" : "Create Account"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    placeholder="Enter your name" 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Account Role</label>
                <div className="input-with-icon">
                  <UserPlus className="input-icon" size={16} />
                  <select 
                    name="role" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    className="form-input form-select"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Medical Specialist / Doctor</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={16} />
              <input 
                type="email" 
                name="email" 
                required 
                value={formData.email} 
                onChange={handleInputChange} 
                placeholder="you@example.com" 
                className="form-input" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                name="password" 
                required 
                value={formData.password} 
                onChange={handleInputChange} 
                placeholder="••••••••" 
                className="form-input" 
              />
            </div>
          </div>

          {!isLogin && role === "doctor" && (
            <div className="doctor-extra-fields animate-slide-up">
              <h4 className="sub-title-fields">Doctor Profile Details</h4>
              
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <div className="input-with-icon">
                  <Stethoscope className="input-icon" size={16} />
                  <input 
                    type="text" 
                    name="specialization" 
                    required 
                    value={formData.specialization} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Cardiologist, Dermatologist" 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Qualifications</label>
                <div className="input-with-icon">
                  <FileSignature className="input-icon" size={16} />
                  <input 
                    type="text" 
                    name="qualification" 
                    required 
                    value={formData.qualification} 
                    onChange={handleInputChange} 
                    placeholder="e.g. MD, MBBS" 
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Weekly Availability</label>
                <input 
                  type="text" 
                  name="availability" 
                  value={formData.availability} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Mon-Fri 9AM-5PM" 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Doctor Security Registration Key</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={16} />
                  <input 
                    type="password" 
                    name="securityCode" 
                    required 
                    value={formData.securityCode} 
                    onChange={handleInputChange} 
                    placeholder="Enter Security Registration Key" 
                    className="form-input" 
                  />
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-submit-auth"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="toggle-auth-mode">
            {isLogin ? (
              <p>
                New to TeleMed?{" "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(""); }}
                  className="btn-toggle-link"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(""); }}
                  className="btn-toggle-link"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .auth-wrapper {
          max-width: 480px;
          margin: 40px auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .seed-info {
          padding: 16px 20px;
          border-color: var(--border-glow);
          background: rgba(99, 102, 241, 0.05);
          border-radius: var(--radius-md);
        }
        .seed-badge {
          background: var(--primary);
          color: white;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 8px;
        }
        .seed-text {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .code-block {
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: var(--text-main);
        }
        
        .auth-card {
          padding: 32px;
          border-radius: var(--radius-lg);
        }
        .auth-card-title {
          font-size: 1.75rem;
          margin-bottom: 24px;
          text-align: center;
          background: linear-gradient(135deg, var(--text-main), var(--text-muted));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .error-message {
          background: var(--danger-glow);
          border: 1px solid var(--danger);
          color: #fda4af;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          text-align: center;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .input-with-icon .form-input {
          padding-left: 44px;
          width: 100%;
        }
        .sub-title-fields {
          margin: 10px 0 16px 0;
          font-size: 0.95rem;
          color: var(--secondary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }
        .doctor-extra-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .btn-submit-auth {
          padding: 14px;
          font-size: 1rem;
          margin-top: 10px;
          width: 100%;
        }
        .toggle-auth-mode {
          text-align: center;
          margin-top: 8px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .btn-toggle-link {
          background: none;
          border: none;
          color: var(--secondary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          font-family: inherit;
        }
        .btn-toggle-link:hover {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
