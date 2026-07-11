export type CallStatus = "draft" | "scheduled" | "open" | "closed" | "archived";

export interface CallSummary {
  id: string;
  slug: string;
  title: string;
  callType: string;
  status: CallStatus;
  openAt?: string | null;
  closeAt?: string | null;
  entryCount?: number;
}

export interface EntrySummary {
  id: string;
  entryId: string;
  artistName?: string | null;
  artistEmail?: string | null;
  status: string;
  submittedAt?: string | null;
  assetCount?: number;
}

export interface AdminSession {
  token: string;
  expiresAt?: string;
}
