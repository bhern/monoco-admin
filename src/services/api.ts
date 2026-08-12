import type {
  AdminSession,
  CallAsset,
  CallCategory,
  CallCategoryPayload,
  CallPayload,
  CallStatusOption,
  CallSummary,
  EntryAssetSummary,
  EntrySummary,
  FeatureSubmission,
  FeatureSubmissionStatus
} from "@/types/admin";

const API_BASE = import.meta.env.VITE_MONOCO_API_URL || "https://monoco-api.ben-505.workers.dev";

export function proxyImageUrl(url: string): string {
  return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

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

export async function listCalls(token: string, status?: string): Promise<CallSummary[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<CallSummary[]>(`/api/admin/calls${query}`, { token });
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

export async function listCallAssets(token: string, callId: string): Promise<CallAsset[]> {
  return request<CallAsset[]>(`/api/admin/calls/${callId}/assets`, { token });
}

export async function uploadCallAsset(
  token: string,
  callId: string,
  payload: {
    file: File;
    assetRole: string;
    callCategoryId?: string | null;
    title?: string;
    altText?: string;
    caption?: string;
    sortOrder?: number;
  }
): Promise<CallAsset> {
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("assetRole", payload.assetRole);
  if (payload.callCategoryId) formData.set("callCategoryId", payload.callCategoryId);
  if (payload.title) formData.set("title", payload.title);
  if (payload.altText) formData.set("altText", payload.altText);
  if (payload.caption) formData.set("caption", payload.caption);
  if (payload.sortOrder !== undefined) formData.set("sortOrder", String(payload.sortOrder));

  const result = await request<{ asset: CallAsset }>(`/api/admin/calls/${callId}/assets`, {
    token,
    method: "POST",
    body: formData
  });
  return result.asset;
}

export async function deleteCallAsset(token: string, callId: string, assetId: string): Promise<void> {
  await request<{ success: boolean }>(`/api/admin/calls/${callId}/assets/${assetId}`, {
    token,
    method: "DELETE"
  });
}

export async function listCallStatuses(token: string): Promise<CallStatusOption[]> {
  return request<CallStatusOption[]>("/api/admin/call-statuses", { token });
}

export async function listCallCategories(token: string, callId: string): Promise<CallCategory[]> {
  return request<CallCategory[]>(`/api/admin/calls/${callId}/categories`, { token });
}

export async function createDefaultCallCategories(
  token: string,
  callId: string
): Promise<CallCategory[]> {
  const result = await request<{ categories: CallCategory[] }>(
    `/api/admin/calls/${callId}/categories/defaults`,
    {
      token,
      method: "POST",
      body: JSON.stringify({})
    }
  );
  return result.categories;
}

export async function createCallCategory(
  token: string,
  callId: string,
  payload: CallCategoryPayload
): Promise<CallCategory> {
  const result = await request<{ category: CallCategory }>(`/api/admin/calls/${callId}/categories`, {
    token,
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.category;
}

export async function updateCallCategory(
  token: string,
  callId: string,
  categoryId: string,
  payload: CallCategoryPayload
): Promise<CallCategory> {
  const result = await request<{ category: CallCategory }>(
    `/api/admin/calls/${callId}/categories/${categoryId}`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
  return result.category;
}

export async function listEntries(token: string, callId?: string | null): Promise<EntrySummary[]> {
  const path = callId ? `/api/admin/calls/${callId}/entries` : "/api/admin/entries";
  return request<EntrySummary[]>(path, { token });
}

export async function updateEntryStatus(
  token: string,
  entryId: string,
  status: string
): Promise<EntrySummary> {
  const result = await request<{ entry: EntrySummary }>(`/api/admin/entries/${entryId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  return result.entry;
}

export async function updateEntryAsset(
  token: string,
  assetId: string,
  payload: { status?: string; editorsPick?: boolean }
): Promise<EntryAssetSummary> {
  const result = await request<{
    asset: EntryAssetSummary;
  }>(`/api/admin/entry-assets/${assetId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.asset;
}

export async function sendChallengeTestEmails(
  token: string,
  payload: { to?: string; data?: Record<string, unknown> } = {}
): Promise<{ success: boolean; to: string; sent: number; failed: number; results: unknown[] }> {
  return request<{ success: boolean; to: string; sent: number; failed: number; results: unknown[] }>(
    "/api/admin/test-challenge-emails",
    {
      token,
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function listFeatureSubmissions(
  token: string,
  status: FeatureSubmissionStatus | "all" = "all"
): Promise<FeatureSubmission[]> {
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  return request<FeatureSubmission[]>(`/api/admin/feature-submissions${query}`, { token });
}

export async function getFeatureSubmission(
  token: string,
  submissionId: string
): Promise<FeatureSubmission> {
  return request<FeatureSubmission>(`/api/admin/feature-submissions/${submissionId}`, { token });
}

export async function updateFeatureSubmissionStatus(
  token: string,
  submissionId: string,
  status: FeatureSubmissionStatus
): Promise<FeatureSubmission> {
  const result = await request<{ submission: FeatureSubmission }>(
    `/api/admin/feature-submissions/${submissionId}`,
    { token, method: "PATCH", body: JSON.stringify({ status }) }
  );
  return result.submission;
}

export async function publishFeatureNow(
  token: string,
  submissionId: string
): Promise<{ status: FeatureSubmissionStatus; instagramMediaId?: string; instagramUrl?: string }> {
  return request(`/api/admin/feature-submissions/${submissionId}/publish`, {
    token,
    method: "POST"
  });
}

export async function uploadFeatureCarousel(
  token: string,
  submission: Pick<FeatureSubmission, "submissionId" | "photographerName">,
  slides: Blob[]
): Promise<string[]> {
  const formData = new FormData();
  formData.set("submissionId", submission.submissionId);
  formData.set("photographerName", submission.photographerName);
  slides.forEach((slide, index) => {
    formData.append("slides", slide, `slide-${String(index + 1).padStart(2, "0")}.png`);
  });
  const result = await request<{ urls: string[] }>("/api/upload-carousel", {
    token,
    method: "POST",
    body: formData
  });
  return result.urls;
}

export async function approveAndScheduleFeature(
  token: string,
  payload: {
    recordId: string;
    photographerName: string;
    caption: string;
    carouselUrls: string[];
  }
): Promise<{ publishDate: string; publishDateLocal?: string; status: FeatureSubmissionStatus }> {
  return request("/api/approve", {
    token,
    method: "POST",
    body: JSON.stringify(payload)
  });
}
