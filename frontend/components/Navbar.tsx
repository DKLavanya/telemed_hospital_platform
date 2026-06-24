"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Activity, User, LogOut, Menu, X } from "lucide-react";
import { apiRequest } from "../utils/api";

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("telemed_token");
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const user = await apiRequest("/auth/me");
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load user profile, token might be expired.");
      localStorage.removeItem("telemed_token");
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    // Listen to changes in localStorage or custom trigger
    window.addEventListener("auth_changed", fetchCurrentUser);
    return () => {
      window.removeEventListener("auth_changed", fetchCurrentUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("telemed_token");
    setCurrentUser(null);
    window.dispatchEvent(new Event("auth_changed"));
    router.push("/");
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        <Link href="/" className="logo-section">
          <div className="logo-icon-wrapper">
            <Activity className="logo-icon" />
          </div>
          <span className="logo-text">Tele<span className="gradient-txt">Med</span></span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-links desktop-only">
          <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
            Overview
          </Link>
          <Link href="/symptoms" className={`nav-link ${pathname === "/symptoms" ? "active" : ""}`}>
            AI Symptom Checker
          </Link>
          <Link href="/patient" className={`nav-link ${pathname.startsWith("/patient") ? "active" : ""}`}>
            Patient Portal
          </Link>
          <Link href="/doctor" className={`nav-link ${pathname.startsWith("/doctor") ? "active" : ""}`}>
            Doctor Portal
          </Link>
        </nav>

        {/* Desktop Auth Section */}
        <div className="auth-section desktop-only">
          {currentUser ? (
            <div className="user-profile-menu">
              <div className="user-avatar-info">
                <div className="avatar-placeholder">
                  {(currentUser.name?.[0] || "U").toUpperCase()}
                </div>
                <div className="avatar-details">
                  <span className="avatar-name">{currentUser.name}</span>
                  <span className="avatar-role">
                    {currentUser.role === "doctor" ? `${currentUser.specialization || "Physician"}` : "Patient"}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout" title="Sign Out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn btn-primary btn-auth-nav">
              <User size={16} />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer animate-slide-up">
          <nav className="mobile-nav-links">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${pathname === "/" ? "active" : ""}`}
            >
              Overview
            </Link>
            <Link 
              href="/symptoms" 
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${pathname === "/symptoms" ? "active" : ""}`}
            >
              AI Symptom Checker
            </Link>
            <Link 
              href="/patient" 
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${pathname.startsWith("/patient") ? "active" : ""}`}
            >
              Patient Portal
            </Link>
            <Link 
              href="/doctor" 
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${pathname.startsWith("/doctor") ? "active" : ""}`}
            >
              Doctor Portal
            </Link>
            
            <div className="mobile-auth-divider" />
            
            <div className="mobile-auth-wrapper">
              {currentUser ? (
                <div className="mobile-profile-details">
                  <div className="mobile-user-row">
                    <div className="avatar-placeholder">
                      {(currentUser.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="mobile-user-meta">
                      <span className="mobile-username">{currentUser.name}</span>
                      <span className="mobile-role">
                        {currentUser.role === "doctor" ? `${currentUser.specialization || "Physician"}` : "Patient"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-secondary mobile-logout-btn">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary mobile-login-btn">
                  <User size={16} /> Sign In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      <style jsx>{`
        .navbar-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color);
          height: 72px;
          display: flex;
          align-items: center;
        }
        .navbar-inner {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo-icon-wrapper {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px var(--primary-glow);
        }
        .logo-icon {
          color: white;
          width: 20px;
          height: 20px;
        }
        .logo-text {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.35rem;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }
        .gradient-txt {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        /* Desktop Navigation & Links styling */
        .nav-links {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-family: var(--font-heading);
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s ease-in-out;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          border: 1px solid transparent;
          background: transparent;
        }
        .nav-link:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-color);
        }
        .nav-link.active {
          color: var(--secondary);
          background: var(--secondary-glow);
          border-color: rgba(14, 165, 233, 0.15);
          font-weight: 700;
        }

        .auth-section {
          display: flex;
          align-items: center;
        }
        .btn-auth-nav {
          padding: 8px 16px;
          font-size: 0.9rem;
        }
        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 6px 12px;
          border-radius: var(--radius-md);
        }
        .user-avatar-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--secondary), var(--primary));
          color: white;
          font-weight: 700;
          font-family: var(--font-heading);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }
        .avatar-details {
          display: flex;
          flex-direction: column;
        }
        .avatar-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .avatar-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .btn-logout {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .btn-logout:hover {
          color: var(--danger);
        }

        /* Mobile Layout & Hamburger styles */
        .desktop-only {
          display: flex;
        }
        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          padding: 6px;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }
        .mobile-menu-toggle:hover {
          color: var(--secondary);
        }

        .mobile-drawer {
          position: absolute;
          top: 72px;
          left: 0;
          width: 100%;
          background: rgba(11, 15, 25, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
          padding: 24px;
          z-index: 99;
        }
        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mobile-nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid transparent;
        }
        .mobile-nav-link:hover, .mobile-nav-link.active {
          color: var(--secondary);
          background: var(--secondary-glow);
          border: 1px solid rgba(14, 165, 233, 0.15);
          padding-left: 20px;
        }
        
        .mobile-auth-divider {
          height: 1px;
          background: var(--border-color);
          margin: 8px 0;
        }
        .mobile-auth-wrapper {
          padding: 8px 12px;
        }
        .mobile-profile-details {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mobile-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mobile-user-meta {
          display: flex;
          flex-direction: column;
        }
        .mobile-username {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .mobile-role {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .mobile-logout-btn, .mobile-login-btn {
          width: 100%;
        }

        @media (max-width: 900px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-menu-toggle {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
}
