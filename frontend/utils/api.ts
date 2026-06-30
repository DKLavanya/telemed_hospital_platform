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

  const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("telemed_token") : null);
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
          window.location.href = "/login";
          return new Promise(() => {}); // Halt execution to prevent UI catch blocks and alert popups
        }
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
