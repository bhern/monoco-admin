import type {
  AdminSession,
  CallPayload,
  CallStatusOption,
  CallSummary,
  EntrySummary
} from "@/types/admin";

const API_BASE = import.meta.env.VITE_MONOCO_API_URL || "https://monoco-api.ben-505.workers.dev";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join(", ") : "") ||
      `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function login(passcode: string): Promise<AdminSession> {
  const result = await request<{ token?: string; sessionToken?: string; expiresAt?: string }>(
    "/api/admin/login",
    {
      method: "POST",
      body: JSON.stringify({ passcode })
    }
  );

  const token = result.token || result.sessionToken;
  if (!token) throw new Error("Login succeeded but no session token was returned.");

  return {
    token,
    expiresAt: result.expiresAt
  };
}

export async function listCalls(token: string): Promise<CallSummary[]> {
  return request<CallSummary[]>("/api/admin/calls", { token });
}

export async function getCall(token: string, callId: string): Promise<CallSummary> {
  return request<CallSummary>(`/api/admin/calls/${callId}`, { token });
}

export async function createCall(token: string, payload: CallPayload): Promise<CallSummary> {
  const result = await request<{ call: CallSummary }>("/api/admin/calls", {
    token,
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.call;
}

export async function updateCall(
  token: string,
  callId: string,
  payload: Partial<CallPayload>
): Promise<CallSummary> {
  const result = await request<{ call: CallSummary }>(`/api/admin/calls/${callId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.call;
}

export async function listCallStatuses(token: string): Promise<CallStatusOption[]> {
  return request<CallStatusOption[]>("/api/admin/call-statuses", { token });
}

export async function listEntries(token: string, callId: string): Promise<EntrySummary[]> {
  return request<EntrySummary[]>(`/api/admin/calls/${callId}/entries`, { token });
}
