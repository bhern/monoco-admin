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
  assetRules?: CallAssetRules;
  entryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallAssetRules {
  max_assets_per_entry?: number | null;
  max_categories_per_asset?: number | null;
  max_assets_per_category?: number | null;
  allowed_categories?: string[];
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

export interface CallCategory {
  id: string;
  callId: string;
  key: string;
  label: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallCategoryPayload {
  key?: string;
  label?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface CallAsset {
  id: string;
  callId: string;
  callCategoryId?: string | null;
  assetType: string;
  assetRole: string;
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  originalFilename?: string | null;
  r2Key?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
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
  assetRules?: CallAssetRules;
}

export interface EntrySummary {
  id: string;
  entryId: string;
  callId?: string;
  callTitle?: string | null;
  callSlug?: string | null;
  artistId?: string | null;
  artistName?: string | null;
  artistEmail?: string | null;
  artistInstagram?: string | null;
  status: string;
  title?: string | null;
  statement?: string | null;
  location?: string | null;
  submittedAt?: string | null;
  newsletterOptIn?: boolean;
  image?: {
    id: string;
    url: string;
    title?: string | null;
    status?: string;
  } | null;
  categories?: Array<{
    id: string;
    slug: string;
    label: string;
  }>;
  assetCount?: number;
}

export interface AdminSession {
  token: string;
  expiresAt?: string;
}
