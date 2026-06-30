import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import datetime
from typing import Optional
from app.core.config import settings

# Configure logger
logger = logging.getLogger("email_service")

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Sends an email using either Resend HTTP API (to bypass Render port blocking)
    or standard SMTP if configured, falling back to simulation logs.
    """
    # 1. Fallback to Resend HTTP API if configured (bypasses Render SMTP port blocking)
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        try:
            import httpx
            # Resend free tier requires the sender to be onboarding@resend.dev
            sender = "onboarding@resend.dev"
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": sender,
                    "to": to_email,
                    "subject": subject,
                    "html": html_content
                },
                timeout=10.0
            )
            if response.status_code in [200, 201]:
                logger.info(f"Successfully sent email notification to {to_email} via Resend HTTP API")
                return True
            else:
                logger.error(f"Resend HTTP API returned error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to send email via Resend HTTP API: {str(e)}")

    # 2. Fallback to standard SMTP
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("=" * 60)
        logger.warning(f"[EMAIL SIMULATION] Sending email to: {to_email}")
        logger.warning(f"[EMAIL SIMULATION] Subject: {subject}")
        logger.warning(f"[EMAIL SIMULATION] Content preview:\n{html_content[:500]}...")
        logger.warning("=" * 60)
        return True

    try:
        # Build MIME Message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAILS_FROM_EMAIL
        msg["To"] = to_email
        
        msg.attach(MIMEText(html_content, "html"))

        # Setup SMTP Server connection
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.ehlo()
        
        # Enable TLS encryption
        if settings.SMTP_PORT == 587:
            server.starttls()
            server.ehlo()
            
        # Login and send (automatically strip spaces from copy-pasted Google App Passwords)
        sanitized_password = settings.SMTP_PASSWORD.replace(" ", "")
        server.login(settings.SMTP_USER, sanitized_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Successfully sent email notification to {to_email} under subject '{subject}'")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {str(e)}")
        return False


def format_appointment_email(
    patient_name: str,
    patient_email: str,
    doctor_name: str,
    doctor_specialization: str,
    appointment_time: datetime.datetime,
    action_type: str,
    video_room_id: Optional[str] = None,
    doctor_email: Optional[str] = None
) -> tuple[str, str, str]:
    """
    Constructs and returns (to_email, subject, html_content) for an appointment notification event.
    Safe to use before database deletions or in background tasks.
    """
    # Portal Base URLs
    portal_base = "https://telemed-hospital-platform.vercel.app"
    patient_dashboard_url = f"{portal_base}/patient"
    doctor_dashboard_url = f"{portal_base}/doctor"
    
    # Format date-time for email
    date_str = appointment_time.strftime("%A, %d %B %Y at %I:%M %p") + " (IST)"

    subject = ""
    title_text = ""
    status_msg = ""
    detail_rows = ""
    cta_text = ""
    cta_link = ""
    alert_footer = ""

    # Choose recipient email based on action type
    recipient_email = doctor_email if action_type == "doctor_notification" else patient_email

    if action_type == "doctor_notification":
        subject = f"New Appointment Requested: {patient_name} - TeleMed"
        title_text = "New Appointment Request"
        status_msg = f"Dear Dr. {doctor_name}, a new patient ({patient_name}) has requested a telemedicine consultation slot with you. Please review the details below."
        detail_rows = f"""
            <tr><td><strong>Patient Name:</strong></td><td>{patient_name}</td></tr>
            <tr><td><strong>Patient Email:</strong></td><td>{patient_email}</td></tr>
            <tr><td><strong>Requested Slot:</strong></td><td>{date_str}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #f59e0b; font-weight: bold;">PENDING APPROVAL</span></td></tr>
        """
        cta_text = "Review in Doctor Dashboard"
        cta_link = doctor_dashboard_url

    elif action_type == "created":
        subject = "Consultation Booking Requested - TeleMed"
        title_text = "Consultation Requested"
        status_msg = f"Dear {patient_name}, your request to schedule a telemedicine consultation has been received and is waiting for physician confirmation."
        detail_rows = f"""
            <tr><td><strong>Doctor:</strong></td><td>Dr. {doctor_name} ({doctor_specialization})</td></tr>
            <tr><td><strong>Requested Time:</strong></td><td>{date_str}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #f59e0b; font-weight: bold;">PENDING</span></td></tr>
        """
        cta_text = "View Patient Dashboard"
        cta_link = patient_dashboard_url

    elif action_type == "scheduled" or action_type == "scheduled_status":
        subject = "Consultation Scheduled Successfully - TeleMed"
        title_text = "Consultation Scheduled"
        status_msg = f"Dear {patient_name}, your consultation request has been confirmed! Please prepare to join the session at the scheduled slot."
        detail_rows = f"""
            <tr><td><strong>Doctor:</strong></td><td>Dr. {doctor_name} ({doctor_specialization})</td></tr>
            <tr><td><strong>Scheduled Time:</strong></td><td>{date_str}</td></tr>
            <tr><td><strong>Room ID:</strong></td><td><code>{video_room_id}</code></td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #10b981; font-weight: bold;">CONFIRMED</span></td></tr>
        """
        cta_text = "Access Patient Dashboard"
        cta_link = patient_dashboard_url

    elif action_type == "active":
        subject = "ACTION REQUIRED: Your Consultation Room is Active! - TeleMed"
        title_text = "Consultation Room Active"
        status_msg = f"Dear {patient_name}, Dr. {doctor_name} has entered your consultation workspace and is waiting to begin. Click below to launch your video session now!"
        detail_rows = f"""
            <tr><td><strong>Doctor:</strong></td><td>Dr. {doctor_name}</td></tr>
            <tr><td><strong>Active Room Link:</strong></td><td><code>{video_room_id}</code></td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #0ea5e9; font-weight: bold; text-transform: uppercase;">IN PROGRESS</span></td></tr>
        """
        cta_text = "Launch Video Consultation Room"
        cta_link = f"{portal_base}/consultation/{video_room_id}?role=patient&name={patient_name}"
        alert_footer = "If your camera/microphone are busy, you will automatically join the session via text-only chat."

    elif action_type == "completed":
        subject = "Consultation Session Summary & Records - TeleMed"
        title_text = "Consultation Completed"
        status_msg = f"Dear {patient_name}, your medical consultation with Dr. {doctor_name} has concluded. Thank you for choosing TeleMed."
        detail_rows = f"""
            <tr><td><strong>Doctor:</strong></td><td>Dr. {doctor_name}</td></tr>
            <tr><td><strong>Completed At:</strong></td><td>{date_str}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #9ca3af; font-weight: bold;">COMPLETED</span></td></tr>
        """
        cta_text = "View Prescriptions & Bills"
        cta_link = patient_dashboard_url
        alert_footer = "You can download your digitally signed prescriptions and settle invoices under the 'Prescriptions' and 'Bills' tabs in your portal dashboard."

    elif action_type == "cancelled":
        subject = "Consultation Cancellation Notice - TeleMed"
        title_text = "Consultation Cancelled"
        status_msg = f"Dear {patient_name}, please be notified that your scheduled telemedicine appointment has been cancelled."
        detail_rows = f"""
            <tr><td><strong>Doctor:</strong></td><td>Dr. {doctor_name}</td></tr>
            <tr><td><strong>Original Time:</strong></td><td>{date_str}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="color: #ef4444; font-weight: bold;">CANCELLED</span></td></tr>
        """
        cta_text = "Reschedule Appointment"
        cta_link = patient_dashboard_url
        alert_footer = "If this cancellation was an error, please log back into the patient workspace to request a new consultation."

    # Build Premium Dark-Mode HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Plus Jakarta Sans', Arial, sans-serif;
                background-color: #0b0f19;
                color: #f3f4f6;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: linear-gradient(145deg, #111827 0%, #1f2937 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }}
            .header {{
                background: linear-gradient(135deg, #6366f1, #0ea5e9);
                padding: 30px;
                text-align: center;
            }}
            .header h2 {{
                color: #ffffff;
                margin: 0;
                font-size: 1.6rem;
                font-weight: 700;
                letter-spacing: -0.02em;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .message {{
                font-size: 1rem;
                line-height: 1.6;
                color: #d1d5db;
                margin-bottom: 30px;
            }}
            .details-table {{
                width: 100%;
                border-collapse: collapse;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                margin-bottom: 30px;
            }}
            .details-table td {{
                padding: 14px 18px;
                font-size: 0.95rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }}
            .details-table tr:last-child td {{
                border-bottom: none;
            }}
            .cta-button {{
                display: block;
                text-align: center;
                background: linear-gradient(135deg, #6366f1, #0ea5e9);
                color: #ffffff !important;
                text-decoration: none !important;
                padding: 14px 24px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1rem;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                margin: 30px 0;
            }}
            .alert-text {{
                background: rgba(239, 68, 68, 0.05);
                border: 1px dashed rgba(239, 68, 68, 0.2);
                color: #9ca3af;
                padding: 12px;
                border-radius: 6px;
                font-size: 0.85rem;
                text-align: center;
                margin-top: 20px;
            }}
            .footer {{
                background: rgba(0, 0, 0, 0.2);
                padding: 20px;
                text-align: center;
                font-size: 0.78rem;
                color: #9ca3af;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }}
            .footer a {{
                color: #0ea5e9;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>{title_text}</h2>
            </div>
            <div class="content">
                <div class="message">
                    {status_msg}
                </div>
                
                <table class="details-table">
                    {detail_rows}
                </table>
                
                <a href="{cta_link}" class="cta-button">{cta_text}</a>
                
                {f'<div class="alert-text">{alert_footer}</div>' if alert_footer else ''}
            </div>
            <div class="footer">
                <p>This is an automated notification from your <a href="{portal_base}">TeleMed Portal</a>.</p>
                <p>For urgent medical emergencies, please dial your local emergency services instantly.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return patient_email, subject, html_content
