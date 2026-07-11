export type CallStatus = "draft" | "scheduled" | "open" | "closed" | "archived";

export interface CallSummary {
  id: string;
  templateId?: string | null;
  slug: string;
  title: string;
  subtitle?: string | null;
  brief?: string | null;
  guidelines?: string | null;
  callType: string;
  status: CallStatus;
  openAt?: string | null;
  closeAt?: string | null;
  deadlineAt?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  location?: string | null;
  entryFeeCents?: number | null;
  currency?: string | null;
  maxEntriesPerArtist?: number | null;
  publicGalleryEnabled?: boolean;
  entryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallStatusOption {
  key: CallStatus;
  label: string;
  sortOrder: number;
  isPublic: boolean;
  acceptsEntries: boolean;
  isTerminal: boolean;
  description?: string | null;
}

export interface CallPayload {
  title: string;
  slug: string;
  callType: string;
  status: CallStatus;
  subtitle?: string | null;
  brief?: string | null;
  guidelines?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  deadlineAt?: string | null;
  location?: string | null;
  maxEntriesPerArtist?: number | null;
  publicGalleryEnabled?: boolean;
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
