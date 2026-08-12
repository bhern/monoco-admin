<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppShell from "@/components/AppShell.vue";
import { listFeatureSubmissions, proxyImageUrl, publishFeatureNow } from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { FeatureSubmission } from "@/types/admin";

const session = useSessionStore();
const scheduled = ref<FeatureSubmission[]>([]);
const published = ref<FeatureSubmission[]>([]);
const failed = ref<FeatureSubmission[]>([]);
const loading = ref(true);
const publishingId = ref("");
const error = ref("");
const notice = ref("");

const hasActivity = computed(() => scheduled.value.length || published.value.length || failed.value.length);

function displayDate(value?: string | null) {
  if (!value) return "Not available";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return dateOnly
    ? date.toLocaleDateString([], { dateStyle: "medium" })
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function coverUrl(submission: FeatureSubmission) {
  const url = submission.carouselUrls[0] || submission.images[0]?.url;
  return url ? proxyImageUrl(url) : "";
}

async function load() {
  if (!session.token) return;
  loading.value = true;
  error.value = "";
  try {
    [scheduled.value, published.value, failed.value] = await Promise.all([
      listFeatureSubmissions(session.token, "scheduled"),
      listFeatureSubmissions(session.token, "published"),
      listFeatureSubmissions(session.token, "publish-failed")
    ]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load publishing activity.";
  } finally {
    loading.value = false;
  }
}

async function publishNow(submission: FeatureSubmission) {
  if (!session.token) return;
  if (!window.confirm(`Publish ${submission.photographerName}'s feature to Instagram now? This cannot be undone.`)) return;
  publishingId.value = submission.id;
  error.value = "";
  notice.value = "";
  try {
    await publishFeatureNow(session.token, submission.id);
    notice.value = `${submission.photographerName}'s feature was published.`;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to publish this feature.";
    await load();
  } finally {
    publishingId.value = "";
  }
}

onMounted(load);
</script>

<template>
  <AppShell>
    <template #title>Feature Publishing</template>
    <template #actions>
      <button class="button subtle" type="button" :disabled="loading" @click="load">Refresh</button>
    </template>

    <p v-if="error" class="notice warning">{{ error }}</p>
    <p v-if="notice" class="notice success">{{ notice }}</p>
    <div v-if="loading" class="empty-state">Loading publishing activity…</div>
    <div v-else-if="!hasActivity" class="empty-state">
      <h2>No publishing activity yet</h2>
      <p>Scheduled and published Featured Photographer posts will appear here.</p>
    </div>

    <div v-else class="publishing-sections">
      <section class="publishing-section">
        <header><div><h2>Scheduled</h2><p>Posts waiting for the automatic publishing window.</p></div><span class="count">{{ scheduled.length }}</span></header>
        <div v-if="!scheduled.length" class="section-empty">Nothing is scheduled.</div>
        <article v-for="submission in scheduled" :key="submission.id" class="publish-row">
          <img v-if="coverUrl(submission)" :src="coverUrl(submission)" alt="" />
          <div class="publish-details">
            <h3>{{ submission.photographerName }}</h3>
            <p>@{{ submission.instagramHandle }}</p>
            <dl><div><dt>Scheduled for</dt><dd>{{ displayDate(submission.publishDate) }}</dd></div><div><dt>Slides</dt><dd>{{ submission.carouselUrls.length }}</dd></div></dl>
          </div>
          <button class="button publish" type="button" :disabled="Boolean(publishingId)" @click="publishNow(submission)">
            {{ publishingId === submission.id ? "Publishing…" : "Publish now" }}
          </button>
        </article>
      </section>

      <section v-if="failed.length" class="publishing-section failed-section">
        <header><div><h2>Needs attention</h2><p>Publishing attempts that failed and require review.</p></div><span class="count">{{ failed.length }}</span></header>
        <article v-for="submission in failed" :key="submission.id" class="publish-row">
          <img v-if="coverUrl(submission)" :src="coverUrl(submission)" alt="" />
          <div class="publish-details"><h3>{{ submission.photographerName }}</h3><p>@{{ submission.instagramHandle }}</p><p class="notice warning">{{ submission.publishError }}</p></div>
          <RouterLink class="button subtle" to="/featured-photographers?status=publish-failed">Review</RouterLink>
        </article>
      </section>

      <section class="publishing-section">
        <header><div><h2>Published</h2><p>Completed Featured Photographer posts.</p></div><span class="count">{{ published.length }}</span></header>
        <div v-if="!published.length" class="section-empty">Nothing has been published yet.</div>
        <article v-for="submission in published" :key="submission.id" class="publish-row">
          <img v-if="coverUrl(submission)" :src="coverUrl(submission)" alt="" />
          <div class="publish-details">
            <h3>{{ submission.photographerName }}</h3>
            <p>@{{ submission.instagramHandle }}</p>
            <dl><div><dt>Published</dt><dd>{{ displayDate(submission.publishedDate) }}</dd></div><div><dt>Media ID</dt><dd>{{ submission.instagramMediaId || "Pending" }}</dd></div></dl>
          </div>
          <a v-if="submission.instagramUrl" class="button subtle" :href="submission.instagramUrl" target="_blank" rel="noreferrer">View post</a>
        </article>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.publishing-sections{display:grid;gap:24px}.publishing-section{display:grid;gap:12px}.publishing-section>header{display:flex;align-items:center;justify-content:space-between}.publishing-section h2,.publishing-section p,.publish-row h3,.publish-row p{margin:0}.publishing-section header p{color:#6e6a60;margin-top:4px}.count{display:grid;place-items:center;min-width:32px;height:32px;border-radius:50%;background:#222;color:#fff;font-weight:700}.publish-row{display:grid;grid-template-columns:110px minmax(0,1fr) auto;align-items:center;gap:18px;padding:14px;border:1px solid #d9d7cf;border-radius:8px;background:#fff}.publish-row>img{width:110px;height:138px;object-fit:cover;border-radius:5px}.publish-details{display:grid;gap:6px}.publish-details>p{color:#6e6a60}.publish-details dl{display:flex;gap:28px;margin:8px 0 0}.publish-details dl div{display:grid;gap:2px}.publish-details dt{color:#777;font-size:11px;font-weight:700;text-transform:uppercase}.publish-details dd{margin:0;font-size:13px}.section-empty{padding:22px;border:1px dashed #c9c6bd;border-radius:8px;color:#777}.failed-section{border-left:3px solid #c54a3b;padding-left:16px}@media(max-width:760px){.publish-row{grid-template-columns:80px 1fr}.publish-row>img{width:80px;height:100px}.publish-row>.button{grid-column:1/-1}.publish-details dl{display:grid;gap:8px}}
</style>
