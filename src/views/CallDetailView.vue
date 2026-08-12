<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { RadioTower, Save } from "@lucide/vue";
import AppShell from "@/components/AppShell.vue";
import SingleImageUploader, {
  type ImageAsset,
  type UploadContext
} from "@/components/SingleImageUploader.vue";
import SocialShareGenerator from "@/components/SocialShareGenerator.vue";
import {
  createCallCategory,
  createDefaultCallCategories,
  createCall,
  deleteCallAsset,
  getCall,
  listCallAssets,
  listCallCategories,
  listCallStatuses,
  updateCall,
  updateCallCategory,
  uploadCallAsset
} from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { CallAsset, CallCategory, CallPayload, CallStatus, CallStatusOption } from "@/types/admin";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const error = ref("");
const notice = ref("");
const statuses = ref<CallStatusOption[]>([]);
const categories = ref<CallCategory[]>([]);
const categoryError = ref("");
const categoryNotice = ref("");
const categoriesLoading = ref(false);
const savingCategoryId = ref("");
const creatingCategory = ref(false);
const assets = ref<CallAsset[]>([]);
const assetError = ref("");
const assetNotice = ref("");
const uploadingAssetKey = ref("");

const callId = computed(() => {
  const value = route.params.callId;
  return typeof value === "string" ? value : null;
});
const isNew = computed(() => route.name === "call-new" || !callId.value);
const canSave = computed(() => Boolean(form.title.trim() && form.slug.trim()));
const statusDetails = computed(() => statuses.value.find((status) => status.key === form.status));
const canPublish = computed(
  () => !isNew.value && form.status !== "open" && canSave.value && !saving.value && !publishing.value
);

const form = reactive({
  title: "",
  slug: "",
  callType: "monthly-challenge",
  status: "draft" as CallStatus,
  subtitle: "",
  briefSummary: "",
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

const newCategory = reactive({
  label: "",
  key: "",
  slug: "",
  description: "",
  sortOrder: 40
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
    briefSummary: nullableText(form.briefSummary),
    brief: nullableText(form.brief),
    guidelines: nullableText(form.guidelines),
    openAt: toIsoDateTime(form.openAt),
    closeAt: toIsoDateTime(form.closeAt),
    deadlineAt: toIsoDateTime(form.closeAt),
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

async function loadCategoriesForCall(id: string) {
  if (!session.token) return;

  categoriesLoading.value = true;
  categoryError.value = "";

  try {
    categories.value = await listCallCategories(session.token, id);
  } catch (err) {
    categoryError.value = err instanceof Error ? err.message : "Unable to load categories.";
  } finally {
    categoriesLoading.value = false;
  }
}

async function loadAssetsForCall(id: string) {
  if (!session.token) return;

  assetError.value = "";

  try {
    assets.value = await listCallAssets(session.token, id);
  } catch (err) {
    assetError.value = err instanceof Error ? err.message : "Unable to load call assets.";
  }
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
      form.briefSummary = call.briefSummary || "";
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
      await loadCategoriesForCall(call.id);
      await loadAssetsForCall(call.id);
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
      await router.replace(`/calls/${saved.id}`);
      await loadCategoriesForCall(saved.id);
      await loadAssetsForCall(saved.id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to save call.";
  } finally {
    saving.value = false;
  }
}

async function publishCall() {
  if (!session.token || !callId.value) return;
  if (!canSave.value) {
    error.value = "Title and slug are required before publishing.";
    return;
  }

  publishing.value = true;
  error.value = "";
  notice.value = "";

  try {
    const payload = {
      ...buildPayload(),
      status: "open" as CallStatus
    };
    const saved = await updateCall(session.token, callId.value, payload);
    form.status = saved.status || "open";
    notice.value = "Call published.";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to publish call.";
  } finally {
    publishing.value = false;
  }
}

function assetsFor(role: string, callCategoryId?: string | null) {
  return assets.value
    .filter((asset) => {
      const sameRole = asset.assetRole === role;
      const sameCategory = callCategoryId
        ? asset.callCategoryId === callCategoryId
        : !asset.callCategoryId;
      return sameRole && sameCategory;
    })
    .sort((a, b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
}

function latestAsset(role: string, callCategoryId?: string | null) {
  return assetsFor(role, callCategoryId)[0] || null;
}

function latestCategoryAsset(callCategoryId: string) {
  return assets.value
    .filter((asset) => asset.callCategoryId === callCategoryId)
    .sort((a, b) => b.createdAt?.localeCompare(a.createdAt || "") || 0)[0] || null;
}

function toImageAsset(asset?: CallAsset | null): ImageAsset | null {
  if (!asset) return null;
  return {
    id: asset.id,
    publicUrl: asset.publicUrl,
    altText: asset.altText,
    title: asset.title,
    fileName: asset.originalFilename || undefined
  };
}

function assetKey(context: UploadContext) {
  return `${context.call_category_id || "call"}:${context.asset_role}`;
}

async function uploadAsset({ file, context }: { file: File; context: UploadContext }) {
  if (!session.token || !callId.value) return;

  const assetRole = String(context.asset_role || "");
  const callCategoryId = typeof context.call_category_id === "string" ? context.call_category_id : null;
  const uploadKey = assetKey(context);
  uploadingAssetKey.value = uploadKey;
  assetError.value = "";
  assetNotice.value = "";

  try {
    const asset = await uploadCallAsset(session.token, callId.value, {
      file,
      assetRole,
      callCategoryId,
      title: file.name,
      altText: file.name,
      sortOrder: assetsFor(assetRole, callCategoryId).length * 10
    });

    assets.value = [asset, ...assets.value];
    assetNotice.value = "Image uploaded.";
  } catch (err) {
    assetError.value = err instanceof Error ? err.message : "Unable to upload image.";
  } finally {
    uploadingAssetKey.value = "";
  }
}

async function removeAsset({ image, context }: { image: ImageAsset; context: UploadContext }) {
  if (!session.token || !callId.value || !image.id) return;

  const uploadKey = assetKey(context);
  uploadingAssetKey.value = uploadKey;
  assetError.value = "";
  assetNotice.value = "";

  try {
    await deleteCallAsset(session.token, callId.value, image.id);
    assets.value = assets.value.filter((asset) => asset.id !== image.id);
    assetNotice.value = "Image removed.";
  } catch (err) {
    assetError.value = err instanceof Error ? err.message : "Unable to remove image.";
  } finally {
    uploadingAssetKey.value = "";
  }
}

async function saveSocialShareImage(file: File) {
  if (!session.token || !callId.value) return;

  const assetRole = "social-share";
  const uploadKey = assetKey({ scope: "call", call_id: callId.value, asset_role: assetRole });
  uploadingAssetKey.value = uploadKey;
  assetError.value = "";
  assetNotice.value = "";

  try {
    const asset = await uploadCallAsset(session.token, callId.value, {
      file,
      assetRole,
      title: `${form.title} social share image`,
      altText: `${form.title} Monthly Challenge social share image`,
      sortOrder: assetsFor(assetRole).length * 10
    });
    assets.value = [asset, ...assets.value];
    assetNotice.value = "Social share image saved.";
  } catch (err) {
    assetError.value = err instanceof Error ? err.message : "Unable to save the social share image.";
  } finally {
    uploadingAssetKey.value = "";
  }
}

async function seedDefaultCategories() {
  if (!session.token || !callId.value) return;

  categoriesLoading.value = true;
  categoryError.value = "";
  categoryNotice.value = "";

  try {
    categories.value = await createDefaultCallCategories(session.token, callId.value);
    categoryNotice.value = "Monthly challenge categories are ready.";
  } catch (err) {
    categoryError.value = err instanceof Error ? err.message : "Unable to create categories.";
  } finally {
    categoriesLoading.value = false;
  }
}

function resetNewCategory() {
  newCategory.label = "";
  newCategory.key = "";
  newCategory.slug = "";
  newCategory.description = "";
  newCategory.sortOrder =
    categories.value.length > 0
      ? Math.max(...categories.value.map((category) => category.sortOrder)) + 10
      : 10;
}

async function addCategory() {
  if (!session.token || !callId.value) return;

  const label = newCategory.label.trim();
  if (!label) {
    categoryError.value = "Category label is required.";
    return;
  }

  creatingCategory.value = true;
  categoryError.value = "";
  categoryNotice.value = "";

  try {
    const category = await createCallCategory(session.token, callId.value, {
      label,
      key: toKebabCase(newCategory.key || label),
      slug: toKebabCase(newCategory.slug || newCategory.key || label),
      description: nullableText(newCategory.description),
      sortOrder: newCategory.sortOrder || 0
    });

    categories.value = [...categories.value, category].sort((a, b) => a.sortOrder - b.sortOrder);
    resetNewCategory();
    categoryNotice.value = "Category added.";
  } catch (err) {
    categoryError.value = err instanceof Error ? err.message : "Unable to add category.";
  } finally {
    creatingCategory.value = false;
  }
}

async function saveCategory(category: CallCategory) {
  if (!session.token || !callId.value) return;

  savingCategoryId.value = category.id;
  categoryError.value = "";
  categoryNotice.value = "";

  try {
    const saved = await updateCallCategory(session.token, callId.value, category.id, {
      key: category.key,
      label: category.label,
      slug: category.slug,
      description: category.description || null,
      sortOrder: category.sortOrder
    });

    categories.value = categories.value
      .map((item) => (item.id === saved.id ? saved : item))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    categoryNotice.value = "Category saved.";
  } catch (err) {
    categoryError.value = err instanceof Error ? err.message : "Unable to save category.";
  } finally {
    savingCategoryId.value = "";
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
      <div class="action-group">
        <button
          v-if="!isNew && form.status !== 'open'"
          class="button publish"
          type="button"
          :disabled="!canPublish"
          @click="publishCall"
        >
          <RadioTower :size="16" />
          {{ publishing ? "Publishing" : "Publish" }}
        </button>
        <button class="button primary" type="button" :disabled="saving || !canSave" @click="save">
          <Save :size="16" />
          {{ saving ? "Saving" : "Save" }}
        </button>
      </div>
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
            <small v-if="statusDetails" class="field-note">
              {{ statusDetails.isPublic ? "Visible publicly." : "Hidden from public pages." }}
              {{ statusDetails.acceptsEntries ? "Accepting entries." : "Not accepting entries." }}
            </small>
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
      </section>

      <section class="panel">
        <h2>Public copy</h2>
        <label class="field">
          <span>Subtitle</span>
          <input v-model="form.subtitle" type="text" placeholder="One short thematic sentence" />
          <small class="field-note">Displayed directly beneath the challenge title.</small>
        </label>
        <label class="field">
          <span>Brief summary</span>
          <textarea v-model="form.briefSummary" rows="4" placeholder="Compact introduction shown on the challenge page"></textarea>
          <small class="field-note">Keep this concise enough for the hero panel.</small>
        </label>
        <label class="field">
          <span>Full brief</span>
          <textarea v-model="form.brief" rows="10" placeholder="Complete creative direction for the challenge"></textarea>
          <small class="field-note">Used by the full-brief experience.</small>
        </label>
        <label class="field">
          <span>Location</span>
          <input v-model="form.location" type="text" placeholder="Online" />
        </label>
        <label class="field">
          <span>Guidelines</span>
          <textarea v-model="form.guidelines" rows="7" placeholder="Call-specific submission rules and constraints"></textarea>
          <small class="field-note">Use for practical rules that differ from the general FAQ.</small>
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
          Category records control what each submitted image can be assigned to.
        </p>

        <div v-if="isNew" class="category-empty">
          Save the call before editing categories.
        </div>

        <template v-else>
          <p v-if="assetError" class="notice warning">{{ assetError }}</p>
          <p v-if="assetNotice" class="notice success">{{ assetNotice }}</p>

          <SingleImageUploader
            label="Call hero"
            help-text="Main public image for this call."
            :image="toImageAsset(latestAsset('call-hero'))"
            :upload-context="{ scope: 'call', call_id: callId, asset_role: 'call-hero' }"
            :busy="uploadingAssetKey === 'call:call-hero'"
            upload-label="Upload hero"
            replace-label="Replace hero"
            @upload="uploadAsset"
            @remove="removeAsset"
          />

          <div class="asset-section-divider"></div>

          <div class="asset-section-heading">
            <div>
              <h3>Social share image</h3>
              <p class="muted">Generate a Facebook and Open Graph image from the current hero and challenge copy.</p>
            </div>
          </div>

          <SocialShareGenerator
            :hero-url="latestAsset('call-hero')?.publicUrl"
            :title="form.title"
            :subtitle="form.subtitle"
            :close-at="form.closeAt"
            :current-url="latestAsset('social-share')?.publicUrl"
            :busy="uploadingAssetKey === 'call:social-share'"
            @save="saveSocialShareImage"
          />

          <div class="category-toolbar">
            <button
              class="button subtle"
              type="button"
              :disabled="categoriesLoading"
              @click="seedDefaultCategories"
            >
              {{ categoriesLoading ? "Working" : "Create monthly defaults" }}
            </button>
          </div>

          <p v-if="categoryError" class="notice warning">{{ categoryError }}</p>
          <p v-if="categoryNotice" class="notice success">{{ categoryNotice }}</p>

          <div class="category-create">
            <div class="category-fields">
              <label class="field">
                <span>New category</span>
                <input v-model="newCategory.label" type="text" placeholder="Architecture" />
              </label>
              <label class="field">
                <span>Key</span>
                <input v-model="newCategory.key" type="text" placeholder="architecture" />
              </label>
              <label class="field">
                <span>Slug</span>
                <input v-model="newCategory.slug" type="text" placeholder="architecture" />
              </label>
              <label class="field">
                <span>Sort</span>
                <input v-model.number="newCategory.sortOrder" type="number" min="0" />
              </label>
            </div>
            <label class="field">
              <span>Description</span>
              <textarea v-model="newCategory.description" rows="2"></textarea>
            </label>
            <div class="category-create-actions">
              <button
                class="button primary"
                type="button"
                :disabled="creatingCategory || !newCategory.label.trim()"
                @click="addCategory"
              >
                {{ creatingCategory ? "Adding" : "Add category" }}
              </button>
            </div>
          </div>

          <div v-if="categoriesLoading && !categories.length" class="category-empty">
            Loading categories...
          </div>

          <div v-else-if="categories.length" class="category-list">
            <article v-for="category in categories" :key="category.id" class="category-row">
              <div class="category-row-header">
                <strong>{{ category.label || "Untitled category" }}</strong>
                <button
                  class="button subtle"
                  type="button"
                  :disabled="savingCategoryId === category.id"
                  @click="saveCategory(category)"
                >
                  {{ savingCategoryId === category.id ? "Saving" : "Save category" }}
                </button>
              </div>

              <div class="category-fields">
                <label class="field">
                  <span>Label</span>
                  <input v-model="category.label" type="text" />
                </label>
                <label class="field">
                  <span>Key</span>
                  <input v-model="category.key" type="text" />
                </label>
                <label class="field">
                  <span>Slug</span>
                  <input v-model="category.slug" type="text" />
                </label>
                <label class="field">
                  <span>Sort</span>
                  <input v-model.number="category.sortOrder" type="number" min="0" />
                </label>
              </div>

              <label class="field">
                <span>Description</span>
                <textarea v-model="category.description" rows="2"></textarea>
              </label>

              <SingleImageUploader
                label="Category image"
                :image="toImageAsset(latestCategoryAsset(category.id))"
                :upload-context="{
                  scope: 'call-category',
                  call_id: callId,
                  call_category_id: category.id,
                  asset_role: 'category-image'
                }"
                :busy="uploadingAssetKey === `${category.id}:category-image`"
                compact
                upload-label="+"
                replace-label="Replace"
                @upload="uploadAsset"
                @remove="removeAsset"
              />
            </article>
          </div>

          <div v-else class="category-empty">
            No categories yet. Create the monthly defaults to add People & Presence,
            Nature-made, and Human-made.
          </div>
        </template>
      </section>
    </form>
  </AppShell>
</template>
