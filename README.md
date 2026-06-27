# Advanced Hospital & Telemedicine Platform

A secure, modern, and comprehensive hospital management & telemedicine system. It integrates a Next.js frontend with a FastAPI backend, utilizing PostgreSQL, WebRTC, and Redis.

## Features

- 📅 **Appointment Management**: Patients can schedule video consultations; doctors can view and run their queue.
- 🗂️ **Electronic Health Records (EMR)**: Secure history logging of vitals, chief complaints, and diagnosis.
- 👨‍⚕️ **Doctor Portal Workspace**: A clinical workstation for prescribing medicines, invoicing, and calling.
- 📹 **Video Consultation (WebRTC)**: Peer-to-peer audio/video connection with mock feedback simulators and chat channels.
- 💊 **Digital Prescription System**: Interactive builder allowing doctors to write and sign prescriptions.
- 🧠 **AI Symptom Analysis**: Step-by-step diagnostic matcher giving potential matches and urgency recommendations.
- 💳 **Billing & Payments**: Automated invoice manager with a simulated payment gateway checkout, complete with canvas-confetti.

---

## Live Cloud Deployment

The application is deployed and fully active in the cloud:

- 🌐 **Frontend Client (Vercel)**: [https://telemed-hospital-platform.vercel.app](https://telemed-hospital-platform.vercel.app)
- ⚡ **Backend API Docs (Render)**: [https://telemed-backend-afjq.onrender.com/docs](https://telemed-backend-afjq.onrender.com/docs)
- 🗄️ **Database Server (Neon)**: Serverless PostgreSQL Database

### 🔑 Authorization Keys
- **Doctor Registration Security Key**: `HOSPITAL_DOC_2026` *(Required to create a new doctor account on the Sign Up page)*

---

## Getting Started (Local Run)

### Option A: Local Run (No Docker required, uses SQLite)

Highly recommended for fast, zero-setup developer previews.

#### 1. Start the Backend (FastAPI)
1. Open a terminal inside `backend/`
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install package requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Launch uvicorn web server:
   ```bash
   uvicorn app.main:app --reload
   ```
The backend will automatically start up, create a local database file `telemed.db`, and seed default doctor profiles. It runs at [http://localhost:8000](http://localhost:8000).

#### 2. Start the Frontend (Next.js)
1. Open a terminal inside `frontend/`
2. Install Node packages:
   ```bash
   npm install
   ```
3. Launch development server:
   ```bash
   npm run dev
   ```
The client dashboard will compile and launch at [http://localhost:3000](http://localhost:3000).

---

### Option B: Docker Compose Run (PostgreSQL & Redis active)

If you have Docker running on your system, you can orchestrate all services using a single command:

1. Open your terminal at the project root directory
2. Run:
   ```bash
   docker-compose up --build
   ```
This will compile containers for:
- PostgreSQL (database, port 5432)
- Redis (signaling/caching, port 6379)
- FastAPI (backend API, port 8000)
- Next.js (frontend client, port 3000)

---

## Developer Testing Accounts

The database seeds automatically with doctor profiles on startup. You can log in immediately:

- **Sarah Jenkins (Cardiologist)**
  - 📧 Email: `sarah.jenkins@telemed.com`
  - 🔑 Password: `doctorpassword123`
- **Amit Patel (General Physician)**
  - 📧 Email: `amit.patel@telemed.com`
  - 🔑 Password: `doctorpassword123`
- **Emily Stone (Pediatrician)**
  - 📧 Email: `emily.stone@telemed.com`
  - 🔑 Password: `doctorpassword123`

