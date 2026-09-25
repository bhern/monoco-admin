<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { toBlob } from "html-to-image";
import AppShell from "@/components/AppShell.vue";
import CarouselPreview from "@/components/CarouselPreview.vue";
import {
  approveAndScheduleFeature,
  listFeatureSubmissions,
  proxyImageUrl,
  updateFeatureSubmissionStatus,
  uploadFeatureCarousel
} from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { FeatureSubmission, FeatureSubmissionStatus } from "@/types/admin";

type ComposerSlide =
  | { id: string; type: "image"; imageIndex: number }
  | { id: string; type: "quote" }
  | { id: string; type: "cta" };

const session = useSessionStore();
const submissions = ref<FeatureSubmission[]>([]);
const selected = ref<FeatureSubmission | null>(null);
const statusFilter = ref<FeatureSubmissionStatus | "all">("pending-approval");
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const coverImageIndex = ref(0);
const coverPosition = ref(50);
const quote = ref("");
const caption = ref("");
const slides = ref<ComposerSlide[]>([]);
const previewUrls = ref<string[]>([]);
const confirmSchedule = ref(false);
let previewBlobs: Blob[] = [];

function clearPreview() {
  confirmSchedule.value = false;
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.value = [];
  previewBlobs = [];
}

watch([selected, coverImageIndex, coverPosition, quote, slides], clearPreview, { deep: true, flush: "sync" });
onBeforeUnmount(clearPreview);
const coverLogoUrl = "https://framerusercontent.com/images/CyAPbwgcbc5FoQw0wXEIPxkcA.png?width=757&height=129";
const ctaLogoUrl = "https://framerusercontent.com/images/97DUl79ObngjI2nKGtEafpsaTL4.png?width=200&height=200";

const selectedCover = computed(() => selected.value?.images[coverImageIndex.value] || null);
const selectedCoverUrl = computed(() => selectedCover.value ? proxyImageUrl(selectedCover.value.url) : "");
const editableStatuses: FeatureSubmissionStatus[] = ["pending-approval", "design-ready", "publish-failed"];

function canReview(submission: FeatureSubmission) {
  return editableStatuses.includes(submission.status);
}

function defaultCaption(submission: FeatureSubmission) {
  return `monoCO Feature\nPhotographer: ${submission.photographerName}\nLocations: ${submission.location}\n\n${submission.bio}\n\nFollow their work at @${submission.instagramHandle}\n\n—\n\nmonoCO is a monochrome photography collective dedicated to highlighting strong black & white work — regardless of follower count.\n\nTag #monoCO_collective and follow @monoco.collective to be considered for a future feature.\n\n#monoCO #monococollective #monochromephotography #blackandwhitephotography #bnwphotography #bnw_captures #bnwstreet #streetphotography #fineartphotography #urbanphotography #longexposurephotography #bnwart`;
}

function initializeComposer(submission: FeatureSubmission) {
  selected.value = submission;
  coverImageIndex.value = 0;
  coverPosition.value = 50;
  quote.value = "";
  caption.value = submission.caption || defaultCaption(submission);
  slides.value = [
    ...submission.images.map((_, imageIndex) => ({
      id: `image-${imageIndex}`,
      type: "image" as const,
      imageIndex
    })),
    { id: "quote", type: "quote" },
    { id: "cta", type: "cta" }
  ];
  notice.value = "";
  error.value = "";
}

async function load() {
  if (!session.token) return;
  loading.value = true;
  error.value = "";
  try {
    submissions.value = await listFeatureSubmissions(session.token, statusFilter.value);
    if (selected.value) {
      selected.value = submissions.value.find((item) => item.id === selected.value?.id) || null;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load feature submissions.";
  } finally {
    loading.value = false;
  }
}

function moveSlide(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= slides.value.length) return;
  if (slides.value[index]?.type === "cta" || slides.value[target]?.type === "cta") return;
  const next = [...slides.value];
  [next[index], next[target]] = [next[target], next[index]];
  slides.value = next;
}

async function waitForAssets(node: HTMLElement) {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(Array.from(node.querySelectorAll("img")).map(async (image) => {
    await image.decode();
    if (!image.naturalWidth) throw new Error("A carousel image could not be loaded.");
  }));
}

async function embedExportImages(node: HTMLElement, images: Map<string, string>) {
  for (const image of Array.from(node.querySelectorAll("img"))) {
    const url = image.src;
    if (!images.has(url)) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Carousel image failed to load (${response.status}).`);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Unable to read carousel image."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      images.set(url, dataUrl);
    }
    image.src = images.get(url)!;
  }
}

async function exportCarousel() {
  await nextTick();
  const blobs: Blob[] = [];
  const count = slides.value.length + 1;
  const images = new Map<string, string>();
  for (let index = 0; index < count; index += 1) {
    const node = document.getElementById(`feature-export-${index}`);
    if (!node) throw new Error(`Export slide ${index + 1} was not rendered.`);
    // Snapshot the current composition and embed bytes before html-to-image sees it.
    // This bypasses its shared resource cache, including across photographers.
    const snapshot = node.cloneNode(true) as HTMLElement;
    snapshot.removeAttribute("id");
    node.parentElement!.appendChild(snapshot);
    let blob: Blob | null;
    try {
      await embedExportImages(snapshot, images);
      await waitForAssets(snapshot);
      blob = await toBlob(snapshot, {
      width: 1080,
      height: 1350,
      pixelRatio: 1,
      cacheBust: true,
      // Each proxied image is identified by its URL query parameter.
      includeQueryParams: true,
      backgroundColor: index === 0 ? "#ffffff" : undefined
      });
    } finally {
      snapshot.remove();
    }
    if (!blob) throw new Error(`Unable to export slide ${index + 1}.`);
    blobs.push(blob);
  }
  return blobs;
}

async function scheduleFeature() {
  if (!session.token || !selected.value || !quote.value.trim() || !previewBlobs.length) return;
  confirmSchedule.value = false;
  busy.value = true;
  error.value = "";
  notice.value = "";
  let stage = "generating carousel images";
  try {
    const blobs = previewBlobs;
    stage = "uploading carousel images";
    const carouselUrls = await uploadFeatureCarousel(session.token, selected.value, blobs);
    stage = "scheduling the feature";
    const result = await approveAndScheduleFeature(session.token, {
      recordId: selected.value.id,
      photographerName: selected.value.photographerName,
      caption: caption.value,
      carouselUrls
    });
    notice.value = `Feature scheduled for ${result.publishDateLocal || result.publishDate}.`;
    selected.value = null;
    await load();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err || "Unknown error");
    error.value = `Failed while ${stage}: ${detail}`;
  } finally {
    busy.value = false;
  }
}

async function previewCarousel() {
  busy.value = true;
  error.value = "";
  clearPreview();
  try {
    previewBlobs = await exportCarousel();
    previewUrls.value = previewBlobs.map((blob) => URL.createObjectURL(blob));
  } catch (err) {
    clearPreview();
    error.value = err instanceof Error ? err.message : "Unable to preview carousel.";
  } finally {
    busy.value = false;
  }
}

async function rejectFeature(submission: FeatureSubmission) {
  if (!session.token) return;
  if (!window.confirm(`Reject ${submission.photographerName}'s submission?`)) return;
  busy.value = true;
  error.value = "";
  try {
    await updateFeatureSubmissionStatus(session.token, submission.id, "rejected");
    notice.value = "Feature submission rejected.";
    selected.value = null;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to reject submission.";
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppShell>
    <template #title>Featured Photographers</template>
    <template #actions>
      <button class="button subtle" type="button" :disabled="loading" @click="load">Refresh</button>
    </template>

    <p v-if="error" class="notice warning">{{ error }}</p>
    <p v-if="notice" class="notice success">{{ notice }}</p>

    <section v-if="!selected" class="feature-admin-list">
      <div class="toolbar">
        <div>
          <strong>Approval workflow</strong>
          <span class="muted">Framer remains the public submission surface.</span>
        </div>
        <label class="feature-filter">
          <span>Status</span>
          <select v-model="statusFilter" @change="load">
            <option value="all">All</option>
            <option value="pending-approval">Pending approval</option>
            <option value="scheduled">Scheduled</option>
            <option value="publishing">Publishing</option>
            <option value="published">Published</option>
            <option value="publish-failed">Publish failed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="empty-state">Loading feature submissions…</div>
      <div v-else-if="!submissions.length" class="empty-state">
        <h2>No submissions</h2>
        <p>There are no Featured Photographer submissions in this status.</p>
      </div>
      <div v-else class="feature-card-grid">
        <article v-for="submission in submissions" :key="submission.id" class="feature-card">
          <img v-if="submission.images[0]" :src="submission.images[0].url" alt="" />
          <div class="feature-card-body">
            <div class="feature-card-heading">
              <div>
                <h2>{{ submission.photographerName }}</h2>
                <p>@{{ submission.instagramHandle }} · {{ submission.location }}</p>
              </div>
              <span class="status-pill">{{ submission.status }}</span>
            </div>
            <p>{{ submission.bio }}</p>
            <CarouselPreview :urls="submission.carouselUrls" :caption="submission.caption" />
            <p v-if="submission.publishDate" class="muted">Publish: {{ submission.publishDate }}</p>
            <p v-if="submission.publishError" class="notice warning">{{ submission.publishError }}</p>
            <div class="entry-actions">
              <button v-if="canReview(submission)" class="button danger" type="button" :disabled="busy" @click="rejectFeature(submission)">Reject</button>
              <button v-if="canReview(submission)" class="button primary" type="button" @click="initializeComposer(submission)">Review & compose</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="feature-review">
      <div class="feature-review-toolbar">
        <button class="button subtle" type="button" :disabled="busy" @click="selected = null">← Back</button>
        <div class="action-group">
          <button class="button subtle" type="button" :disabled="busy || !quote.trim()" @click="previewCarousel">Generate preview</button>
          <button class="button danger" type="button" :disabled="busy" @click="rejectFeature(selected)">Reject</button>
          <button class="button publish" type="button" :disabled="busy || !quote.trim() || !previewUrls.length" @click="confirmSchedule = true">
            {{ busy ? "Generating…" : "Approve & schedule" }}
          </button>
        </div>
      </div>

      <section v-if="confirmSchedule" class="panel" role="dialog" aria-labelledby="confirm-schedule-title">
        <h2 id="confirm-schedule-title">Schedule this carousel?</h2>
        <p>Upload the previewed carousel and schedule this feature? The photographer will receive a scheduling email.</p>
        <div class="action-group">
          <button class="button subtle" type="button" @click="confirmSchedule = false">Cancel</button>
          <button class="button publish" type="button" @click="scheduleFeature">Confirm schedule</button>
        </div>
      </section>

      <section v-if="previewUrls.length" class="panel">
        <h2>Exported carousel preview</h2>
        <p>Review every slide before scheduling. These are the exact images that will be uploaded.</p>
        <div class="composer-slides exported-preview-grid">
          <article v-for="(url, index) in previewUrls" :key="url" class="composer-slide">
            <a :href="url" :download="`slide-${String(index + 1).padStart(2, '0')}.png`"><img :src="url" :alt="`Exported slide ${index + 1}`" /></a>
            <strong>Slide {{ index + 1 }}</strong>
          </article>
        </div>
      </section>

      <div class="feature-review-grid">
        <div class="panel">
          <h2>Cover creation</h2>
          <p class="muted">Choose the cover image and adjust its vertical crop.</p>
          <div class="cover-preview">
            <img v-if="selectedCover" :src="selectedCoverUrl" :style="{ objectPosition: `center ${coverPosition}%` }" alt="" crossorigin="anonymous" />
            <div class="cover-scrim" />
            <div class="cover-logo"><img :src="coverLogoUrl" alt="monoCO" /></div>
            <div class="cover-title"><small>Featured</small><strong>{{ selected.photographerName }}</strong></div>
            <div class="cover-handle">{{ selected.instagramHandle }}</div>
          </div>
          <label class="field">
            <span>Vertical image position: {{ coverPosition }}%</span>
            <input v-model.number="coverPosition" type="range" min="0" max="100" />
          </label>
          <div class="cover-options">
            <button
              v-for="(image, index) in selected.images"
              :key="image.url"
              class="cover-option"
              :class="{ selected: coverImageIndex === index }"
              type="button"
              @click="coverImageIndex = index"
            >
              <img :src="proxyImageUrl(image.url)" alt="" crossorigin="anonymous" />
              <span>Image {{ index + 1 }}</span>
            </button>
          </div>
        </div>

        <div class="panel">
          <h2>Submission</h2>
          <dl class="settings-list">
            <div><dt>Photographer</dt><dd>{{ selected.photographerName }}</dd></div>
            <div><dt>Instagram</dt><dd>@{{ selected.instagramHandle }}</dd></div>
            <div><dt>Email</dt><dd>{{ selected.email }}</dd></div>
            <div><dt>Location</dt><dd>{{ selected.location }}</dd></div>
            <div v-if="selected.website"><dt>Website</dt><dd>{{ selected.website }}</dd></div>
          </dl>
          <p class="entry-statement">{{ selected.bio }}</p>
        </div>

        <div class="panel wide">
          <h2>Carousel order</h2>
          <p class="muted">The generated cover is always slide 1. Reorder image and quote slides; the CTA remains last.</p>
          <div class="composer-slides">
            <article v-for="(slide, index) in slides" :key="slide.id" class="composer-slide">
              <img v-if="slide.type === 'image'" :src="proxyImageUrl(selected.images[slide.imageIndex]?.url || '')" alt="" crossorigin="anonymous" />
              <div v-else class="composer-slide-placeholder">{{ slide.type === "quote" ? "Quote" : "CTA" }}</div>
              <strong>Slide {{ index + 2 }} · {{ slide.type }}</strong>
              <div class="order-controls">
                <button class="button compact" type="button" :disabled="index === 0 || slide.type === 'cta'" @click="moveSlide(index, -1)">↑</button>
                <button class="button compact" type="button" :disabled="index === slides.length - 1 || slides[index + 1]?.type === 'cta'" @click="moveSlide(index, 1)">↓</button>
              </div>
            </article>
          </div>
        </div>

        <div class="panel">
          <h2>Quote</h2>
          <label class="field">
            <span>Quote for carousel (required)</span>
            <textarea v-model="quote" rows="8" placeholder="Enter the quote shown on the quote slide." />
          </label>
        </div>

        <div class="panel">
          <h2>Instagram caption</h2>
          <label class="field">
            <span>Caption</span>
            <textarea v-model="caption" rows="14" />
          </label>
        </div>
      </div>

      <div class="feature-export-stage" aria-hidden="true">
        <div id="feature-export-0" class="export-slide export-cover">
          <img v-if="selectedCover" :src="selectedCoverUrl" :style="{ objectPosition: `center ${coverPosition}%` }" alt="" crossorigin="anonymous" />
          <div class="export-cover-scrim" />
          <div class="export-cover-logo"><img :src="proxyImageUrl(coverLogoUrl)" alt="monoCO" crossorigin="anonymous" /></div>
          <div class="export-cover-title"><small>Featured</small><strong>{{ selected.photographerName }}</strong></div>
          <div class="export-cover-handle">{{ selected.instagramHandle }}</div>
        </div>
        <div
          v-for="(slide, index) in slides"
          :id="`feature-export-${index + 1}`"
          :key="`export-${slide.id}`"
          class="export-slide"
          :class="`export-${slide.type}`"
        >
          <img v-if="slide.type === 'image'" :src="proxyImageUrl(selected.images[slide.imageIndex]?.url || '')" alt="" crossorigin="anonymous" />
          <template v-else-if="slide.type === 'quote'">
            <div class="export-quote-mark">“</div>
            <div class="export-quote-text">{{ quote }}</div>
            <div class="export-quote-name">{{ selected.photographerName }}</div>
          </template>
          <template v-else>
            <img class="export-cta-mark" :src="proxyImageUrl(ctaLogoUrl)" alt="monoCO" crossorigin="anonymous" />
            <div class="export-cta-copy"><small>Follow</small><strong>monoco.collective</strong></div>
          </template>
        </div>
      </div>
    </section>
  </AppShell>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:ital,wght@0,400;0,700;1,400&display=swap");
.exported-preview-grid{flex-wrap:wrap;overflow:visible}.feature-review-grid>.panel{min-width:0}
.feature-admin-list,.feature-review{display:grid;gap:18px}.feature-filter{display:flex;align-items:center;gap:8px}.feature-filter span{font-size:12px;font-weight:700}.feature-filter select{border:1px solid #d4d1c8;border-radius:6px;padding:8px}.feature-card-grid{display:grid;gap:16px}.feature-card{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;border:1px solid #d9d7cf;border-radius:8px;background:#fff;padding:16px}.feature-card>img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px}.feature-card-heading,.feature-review-toolbar{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.feature-card h2{margin:0}.feature-card p{line-height:1.5}.feature-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.cover-preview{position:relative;aspect-ratio:1080/1350;max-width:540px;overflow:hidden;background:#000;color:#fff;margin:18px auto}.cover-preview>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cover-scrim{position:absolute;inset:0;background:rgba(0,0,0,.3)}.cover-logo{position:absolute;top:0;left:0;right:0;height:13.333%;display:grid;place-items:center;background:#000}.cover-logo img{width:70%;height:auto;opacity:.5}.cover-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.cover-title small{font:400 12px Inter,sans-serif}.cover-title strong{font:700 28px "Bebas Neue",sans-serif;letter-spacing:.02em;text-transform:uppercase;text-align:center}.cover-handle{position:absolute;left:0;right:0;bottom:12px;text-align:center;font:400 12px Inter,sans-serif}.cover-options,.composer-slides{display:flex;gap:10px;overflow-x:auto;margin-top:16px}.cover-option{min-width:100px;border:2px solid transparent;border-radius:6px;background:#f4f3ef;padding:6px}.cover-option.selected{border-color:#f2b72e}.cover-option img{width:86px;height:86px;object-fit:cover}.cover-option span{display:block;font-size:11px}.composer-slide{min-width:150px;border:1px solid #dedbd2;border-radius:8px;padding:10px}.composer-slide img,.composer-slide-placeholder{width:128px;height:128px;object-fit:contain;background:#111;color:#fff;display:grid;place-items:center}.composer-slide strong{display:block;font-size:12px;margin:8px 0}.feature-export-stage{position:fixed;left:-20000px;top:0;width:1080px}.export-slide{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}.export-image img{width:1020px;height:1300px;object-fit:contain}.export-cover>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.export-cover-scrim{position:absolute;inset:0;background:rgba(0,0,0,.3)}.export-cover-logo{position:absolute;top:0;left:0;right:0;height:180px;background:#000;display:grid;place-items:center}.export-cover-logo img{height:80px;width:auto;opacity:.5}.export-cover-title{position:absolute;inset:0;color:#fff;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;margin-top:40px}.export-cover-title small{font:400 24px Inter,sans-serif}.export-cover-title strong{font:700 56px "Bebas Neue",sans-serif;letter-spacing:.02em;text-transform:uppercase;text-align:center}.export-cover-handle{position:absolute;left:0;right:0;bottom:24px;color:#fff;text-align:center;font:400 24px Inter,sans-serif}.export-quote{background:#000;color:#fff;flex-direction:column;padding:120px 80px}.export-quote-mark{font-size:240px;color:#888;line-height:.6}.export-quote-text{font:italic 56px/1.6 "Inter Display",serif;text-align:center}.export-quote-name{position:absolute;bottom:40px;font:700 80px "Bebas Neue",sans-serif;letter-spacing:.05em;text-transform:uppercase}.export-cta{background:#000;color:#fff;flex-direction:column;gap:80px}.export-cta-mark{width:280px;height:280px;object-fit:contain}.export-cta-copy{display:flex;flex-direction:column;text-align:center}.export-cta-copy small{font:400 32px "Inter Display",serif}.export-cta-copy strong{font:700 64px Inter,sans-serif;letter-spacing:.02em}@media(max-width:820px){.feature-card,.feature-review-grid{grid-template-columns:1fr}.feature-review-toolbar{align-items:stretch;flex-direction:column}}
</style>
