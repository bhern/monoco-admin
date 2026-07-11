<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Save } from "@lucide/vue";
import AppShell from "@/components/AppShell.vue";
import { createCall, getCall, listCallStatuses, updateCall } from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { CallPayload, CallStatus, CallStatusOption } from "@/types/admin";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const statuses = ref<CallStatusOption[]>([]);

const callId = computed(() => {
  const value = route.params.callId;
  return typeof value === "string" ? value : null;
});
const isNew = computed(() => route.name === "call-new" || !callId.value);
const canSave = computed(() => Boolean(form.title.trim() && form.slug.trim()));

const form = reactive({
  title: "",
  slug: "",
  callType: "monthly-challenge",
  status: "draft" as CallStatus,
  subtitle: "",
  brief: "",
  guidelines: "",
  openAt: "",
  closeAt: "",
  deadlineAt: "",
  location: "",
  maxEntriesPerArtist: 1,
  maxAssetsPerEntry: 3,
  maxCategoriesPerAsset: 1,
  maxAssetsPerCategory: 1,
  publicGalleryEnabled: true
});

function toKebabCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildPayload(): CallPayload {
  return {
    title: form.title.trim(),
    slug: toKebabCase(form.slug || form.title),
    callType: form.callType,
    status: form.status,
    subtitle: nullableText(form.subtitle),
    brief: nullableText(form.brief),
    guidelines: nullableText(form.guidelines),
    openAt: toIsoDateTime(form.openAt),
    closeAt: toIsoDateTime(form.closeAt),
    deadlineAt: toIsoDateTime(form.deadlineAt),
    location: nullableText(form.location),
    maxEntriesPerArtist: form.maxEntriesPerArtist || null,
    publicGalleryEnabled: form.publicGalleryEnabled,
    assetRules: {
      max_assets_per_entry: form.maxAssetsPerEntry || null,
      max_categories_per_asset: form.maxCategoriesPerAsset || null,
      max_assets_per_category: form.maxAssetsPerCategory || null,
      allowed_categories: ["people-presence", "nature-made", "human-made"]
    }
  };
}

async function load() {
  if (!session.token) return;

  loading.value = true;
  error.value = "";

  try {
    try {
      statuses.value = await listCallStatuses(session.token);
    } catch {
      statuses.value = [
        {
          key: "draft",
          label: "Draft",
          sortOrder: 10,
          isPublic: false,
          acceptsEntries: false,
          isTerminal: false
        },
        {
          key: "scheduled",
          label: "Scheduled",
          sortOrder: 20,
          isPublic: true,
          acceptsEntries: false,
          isTerminal: false
        },
        {
          key: "open",
          label: "Open",
          sortOrder: 30,
          isPublic: true,
          acceptsEntries: true,
          isTerminal: false
        },
        {
          key: "closed",
          label: "Closed",
          sortOrder: 40,
          isPublic: true,
          acceptsEntries: false,
          isTerminal: true
        },
        {
          key: "archived",
          label: "Archived",
          sortOrder: 50,
          isPublic: false,
          acceptsEntries: false,
          isTerminal: true
        }
      ];
    }

    if (!isNew.value && callId.value) {
      const call = await getCall(session.token, callId.value);
      form.title = call.title || "";
      form.slug = call.slug || "";
      form.callType = call.callType || "monthly-challenge";
      form.status = call.status || "draft";
      form.subtitle = call.subtitle || "";
      form.brief = call.brief || "";
      form.guidelines = call.guidelines || "";
      form.openAt = toInputDateTime(call.openAt);
      form.closeAt = toInputDateTime(call.closeAt);
      form.deadlineAt = toInputDateTime(call.deadlineAt);
      form.location = call.location || "";
      form.maxEntriesPerArtist = call.maxEntriesPerArtist || 1;
      form.maxAssetsPerEntry = call.assetRules?.max_assets_per_entry || 3;
      form.maxCategoriesPerAsset = call.assetRules?.max_categories_per_asset || 1;
      form.maxAssetsPerCategory = call.assetRules?.max_assets_per_category || 1;
      form.publicGalleryEnabled = Boolean(call.publicGalleryEnabled);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load call.";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!session.token) return;
  if (!canSave.value) {
    error.value = "Title and slug are required.";
    return;
  }

  saving.value = true;
  error.value = "";
  notice.value = "";

  try {
    const payload = buildPayload();
    const saved = isNew.value
      ? await createCall(session.token, payload)
      : await updateCall(session.token, callId.value || "", payload);

    notice.value = "Call saved.";

    if (isNew.value) {
      router.replace(`/calls/${saved.id}`);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to save call.";
  } finally {
    saving.value = false;
  }
}

watch(
  () => form.title,
  (title) => {
    if (isNew.value && !form.slug) form.slug = toKebabCase(title);
  }
);

onMounted(load);
</script>

<template>
  <AppShell>
    <template #title>{{ isNew ? "New call" : "Call editor" }}</template>
    <template #actions>
      <button class="button primary" type="button" :disabled="saving || !canSave" @click="save">
        <Save :size="16" />
        {{ saving ? "Saving" : "Save" }}
      </button>
    </template>

    <p v-if="error" class="notice warning">{{ error }}</p>
    <p v-if="notice" class="notice success">{{ notice }}</p>

    <section v-if="loading" class="panel">
      <p class="muted">Loading call...</p>
    </section>

    <form v-else class="editor-grid" @submit.prevent="save">
      <section class="panel">
        <h2>Call basics</h2>
        <label class="field">
          <span>Title</span>
          <input v-model="form.title" type="text" placeholder="Solitude" required />
        </label>
        <label class="field">
          <span>Slug</span>
          <input v-model="form.slug" type="text" placeholder="solitude-july-2026" required />
        </label>
        <label class="field">
          <span>Brief</span>
          <textarea
            v-model="form.brief"
            rows="5"
            placeholder="Short public-facing call description"
          ></textarea>
        </label>
      </section>

      <section class="panel">
        <h2>Status and timing</h2>
        <div class="two-column">
          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="status in statuses" :key="status.key" :value="status.key">
                {{ status.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Entries per artist</span>
            <input v-model.number="form.maxEntriesPerArtist" type="number" min="1" />
          </label>
        </div>
        <div class="two-column">
          <label class="field">
            <span>Open at</span>
            <input v-model="form.openAt" type="datetime-local" />
          </label>
          <label class="field">
            <span>Close at</span>
            <input v-model="form.closeAt" type="datetime-local" />
          </label>
        </div>
        <label class="field">
          <span>Deadline</span>
          <input v-model="form.deadlineAt" type="datetime-local" />
        </label>
      </section>

      <section class="panel">
        <h2>Public copy</h2>
        <label class="field">
          <span>Subtitle</span>
          <input v-model="form.subtitle" type="text" />
        </label>
        <label class="field">
          <span>Location</span>
          <input v-model="form.location" type="text" placeholder="Online" />
        </label>
        <label class="field">
          <span>Guidelines</span>
          <textarea v-model="form.guidelines" rows="7"></textarea>
        </label>
      </section>

      <section class="panel">
        <h2>Entry rules</h2>
        <label class="field">
          <span>Call type</span>
          <input v-model="form.callType" type="text" required />
        </label>
        <div class="two-column">
          <label class="field">
            <span>Images per entry</span>
            <input v-model.number="form.maxAssetsPerEntry" type="number" min="1" />
          </label>
          <label class="field">
            <span>Categories per image</span>
            <input v-model.number="form.maxCategoriesPerAsset" type="number" min="1" />
          </label>
        </div>
        <label class="field">
          <span>Images per category</span>
          <input v-model.number="form.maxAssetsPerCategory" type="number" min="1" />
        </label>
        <label class="checkbox-field">
          <input v-model="form.publicGalleryEnabled" type="checkbox" />
          <span>Public gallery enabled</span>
        </label>
        <p class="helper-text">
          Current setup: one artist entry packet, up to 3 images, one image per category.
        </p>
      </section>

      <section class="panel wide">
        <h2>Assets and categories</h2>
        <p class="muted">
          Hero images, category thumbnails, examples, and category editing come next.
        </p>
      </section>
    </form>
  </AppShell>
</template>
