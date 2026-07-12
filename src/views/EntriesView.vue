<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Check, RefreshCw, Star, X } from "@lucide/vue";
import AppShell from "@/components/AppShell.vue";
import EmptyState from "@/components/EmptyState.vue";
import { listEntries, updateEntryAsset, updateEntryStatus } from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { EntrySummary } from "@/types/admin";

const session = useSessionStore();
const entries = ref<EntrySummary[]>([]);
const error = ref("");
const notice = ref("");
const loading = ref(false);
const updatingId = ref("");
const updatingAssetId = ref("");

const sortedEntries = computed(() =>
  [...entries.value].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""))
);

async function loadEntries() {
  if (!session.token) return;

  loading.value = true;
  error.value = "";

  try {
    entries.value = await listEntries(session.token);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load entries.";
  } finally {
    loading.value = false;
  }
}

async function setStatus(entry: EntrySummary, status: string) {
  if (!session.token) return;

  updatingId.value = entry.id;
  error.value = "";
  notice.value = "";

  try {
    await updateEntryStatus(session.token, entry.id, status);
    entries.value = entries.value.map((item) =>
      item.id === entry.id
        ? {
            ...item,
            status,
            image: item.image ? { ...item.image, status } : item.image
          }
        : item
    );
    notice.value = `Entry marked ${status}.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to update entry.";
  } finally {
    updatingId.value = "";
  }
}

async function setAssetStatus(entry: EntrySummary, assetId: string, status: string) {
  if (!session.token) return;

  updatingAssetId.value = assetId;
  error.value = "";
  notice.value = "";

  try {
    const asset = await updateEntryAsset(session.token, assetId, { status });
    entries.value = entries.value.map((item) =>
      item.id === entry.id
        ? {
            ...item,
            status: status === "approved" ? "approved" : item.status,
            assets: item.assets?.map((existing) =>
              existing.id === assetId
                ? {
                    ...existing,
                    ...asset,
                    status
                  }
                : existing
            ),
            image:
              item.image?.id === assetId
                ? {
                    ...item.image,
                    status
                  }
                : item.image
          }
        : item
    );
    notice.value = `Image marked ${status}.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to update image.";
  } finally {
    updatingAssetId.value = "";
  }
}

async function toggleEditorsPick(entry: EntrySummary, assetId: string, editorsPick: boolean) {
  if (!session.token) return;

  updatingAssetId.value = assetId;
  error.value = "";
  notice.value = "";

  try {
    await updateEntryAsset(session.token, assetId, { editorsPick });
    entries.value = entries.value.map((item) =>
      item.id === entry.id
        ? {
            ...item,
            assets: item.assets?.map((asset) =>
              asset.id === assetId
                ? {
                    ...asset,
                    isEditorsPick: editorsPick
                  }
                : asset
            )
          }
        : item
    );
    notice.value = editorsPick ? "Editor's Pick added." : "Editor's Pick removed.";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to update Editor's Pick.";
  } finally {
    updatingAssetId.value = "";
  }
}

function categoryText(entry: EntrySummary) {
  return entry.categories?.map((category) => category.label).join(", ") || "Uncategorized";
}

function assetCategoryText(asset: NonNullable<EntrySummary["assets"]>[number]) {
  return asset.categories?.map((category) => category.label).join(", ") || "Uncategorized";
}

onMounted(loadEntries);
</script>

<template>
  <AppShell>
    <template #title>Entries</template>
    <template #actions>
      <button class="button subtle" type="button" @click="loadEntries">
        <RefreshCw :size="16" />
      </button>
    </template>

    <section class="toolbar">
      <div>
        <strong>{{ entries.length }}</strong>
        <span>entries</span>
      </div>
      <span class="muted">Review challenge submissions and approve gallery images.</span>
    </section>

    <p v-if="error" class="notice warning">{{ error }}</p>
    <p v-if="notice" class="notice success">{{ notice }}</p>

    <section v-if="loading" class="table-card">
      <div class="loading-row">Loading entries...</div>
    </section>

    <section v-else-if="sortedEntries.length" class="entry-list">
      <article v-for="entry in sortedEntries" :key="entry.id" class="entry-card">
        <a
          v-if="entry.image?.url"
          class="entry-thumb"
          :href="entry.image.url"
          target="_blank"
          rel="noreferrer"
        >
          <img :src="entry.image.url" :alt="entry.title || 'Submitted image'" />
        </a>
        <div v-else class="entry-thumb empty">No image</div>

        <div class="entry-body">
          <div class="entry-heading">
            <div>
              <h2>{{ entry.title || "Untitled" }}</h2>
              <p class="muted">
                {{ entry.artistName || "Unknown artist" }}
                <span v-if="entry.artistEmail"> · {{ entry.artistEmail }}</span>
              </p>
            </div>
            <span class="status-pill">{{ entry.status }}</span>
          </div>

          <dl class="entry-meta">
            <div>
              <dt>Call</dt>
              <dd>{{ entry.callTitle || entry.callSlug || "Unknown" }}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{{ categoryText(entry) }}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{{ entry.submittedAt || "Not set" }}</dd>
            </div>
            <div>
              <dt>Opt-in</dt>
              <dd>{{ entry.newsletterOptIn ? "Yes" : "No" }}</dd>
            </div>
          </dl>

          <p v-if="entry.statement" class="entry-statement">{{ entry.statement }}</p>

          <div v-if="entry.assets?.length" class="asset-review-list">
            <article v-for="asset in entry.assets" :key="asset.id" class="asset-review-card">
              <a
                v-if="asset.url"
                class="asset-review-thumb"
                :href="asset.url"
                target="_blank"
                rel="noreferrer"
              >
                <img :src="asset.url" :alt="asset.title || 'Submitted image'" />
              </a>
              <div v-else class="asset-review-thumb empty">No image</div>

              <div class="asset-review-body">
                <div class="asset-review-heading">
                  <div>
                    <h3>{{ asset.title || "Untitled" }}</h3>
                    <p class="muted">{{ assetCategoryText(asset) }}</p>
                  </div>
                  <span class="status-pill">{{ asset.status || "submitted" }}</span>
                </div>

                <p v-if="asset.description" class="entry-statement">{{ asset.description }}</p>

                <div class="entry-actions compact">
                  <button
                    class="button publish"
                    type="button"
                    :disabled="updatingAssetId === asset.id || asset.status === 'approved'"
                    @click="setAssetStatus(entry, asset.id, 'approved')"
                  >
                    <Check :size="16" />
                    Approve image
                  </button>
                  <button
                    class="button subtle"
                    type="button"
                    :disabled="updatingAssetId === asset.id || asset.status === 'rejected'"
                    @click="setAssetStatus(entry, asset.id, 'rejected')"
                  >
                    <X :size="16" />
                    Reject image
                  </button>
                  <button
                    class="button subtle"
                    type="button"
                    :disabled="updatingAssetId === asset.id || asset.status !== 'approved'"
                    @click="toggleEditorsPick(entry, asset.id, !asset.isEditorsPick)"
                  >
                    <Star :size="16" />
                    {{ asset.isEditorsPick ? "Remove Pick" : "Editor's Pick" }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div class="entry-actions">
            <button
              class="button publish"
              type="button"
              :disabled="updatingId === entry.id || entry.status === 'approved'"
              @click="setStatus(entry, 'approved')"
            >
              <Check :size="16" />
              Approve
            </button>
            <button
              class="button subtle"
              type="button"
              :disabled="updatingId === entry.id || entry.status === 'rejected'"
              @click="setStatus(entry, 'rejected')"
            >
              <X :size="16" />
              Reject
            </button>
          </div>
        </div>
      </article>
    </section>

    <EmptyState
      v-else
      title="No entries yet"
      message="Entries submitted through the challenge form will appear here."
    />
  </AppShell>
</template>
