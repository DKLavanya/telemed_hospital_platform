const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(endpoint: string, method: string = "GET", body: any = null, token: string | null = null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let activeToken = token;
  if (!activeToken && typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/doctor")) {
      activeToken = localStorage.getItem("telemed_token_doctor");
    } else if (path.startsWith("/patient")) {
      activeToken = localStorage.getItem("telemed_token_patient");
    } else {
      activeToken = localStorage.getItem("telemed_token_patient") || 
                    localStorage.getItem("telemed_token_doctor") || 
                    localStorage.getItem("telemed_token");
    }
  }

  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("telemed_token");
          localStorage.removeItem("telemed_token_doctor");
          localStorage.removeItem("telemed_token_patient");
          window.location.href = "/auth";
        }
        throw new ApiError("Session expired. Redirecting to login...", res.status);
      }
      throw new ApiError(errData.detail || `Request failed with status ${res.status}`, res.status);
    }
    if (res.status === 204) return null;
    return await res.json();
  } catch (error) {
    console.error(`API Request Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

export function getWebSocketSignalingUrl(roomId: string, clientId: string): string {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemed_token") : "";
  
  let wsBase = "ws://localhost:8000";
  if (typeof window !== "undefined") {
    if (API_BASE_URL.startsWith("https://")) {
      const host = API_BASE_URL.replace("https://", "").split("/")[0];
      wsBase = `wss://${host}`;
    } else if (API_BASE_URL.startsWith("http://")) {
      const host = API_BASE_URL.replace("http://", "").split("/")[0];
      wsBase = `ws://${host}`;
    }
  }
  
  return `${wsBase}/ws/signaling/${roomId}/${clientId}?token=${token}`;
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "";
  
  // Ensure the string is treated as UTC
  let cleanStr = dateStr;
  if (!cleanStr.endsWith("Z") && !cleanStr.includes("+") && !/-\d{2}:\d{2}$/.test(cleanStr)) {
    // Convert space to T if present (e.g., "2026-06-30 16:42:00" -> "2026-06-30T16:42:00")
    cleanStr = cleanStr.replace(" ", "T");
    if (!cleanStr.includes("T")) {
      // If it's just a date without time, parse natively
      return new Date(cleanStr).toLocaleDateString("en-GB");
    }
    // Append Z to parse as UTC
    cleanStr += "Z";
  }
  
  return new Date(cleanStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}
