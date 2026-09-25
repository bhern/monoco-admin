<script setup lang="ts">
import { ref } from "vue";
import { proxyImageUrl } from "@/services/api";

defineProps<{ urls: string[]; caption?: string | null }>();
const open = ref(false);
const track = ref<HTMLElement>();
const current = ref(0);
function move(delta: number) {
  if (track.value) track.value.scrollBy({ left: delta * track.value.clientWidth, behavior: "smooth" });
}
function updatePosition() {
  if (track.value?.clientWidth) current.value = Math.round(track.value.scrollLeft / track.value.clientWidth);
}
</script>

<template>
  <details v-if="urls.length" class="carousel-preview" @toggle="open = ($event.target as HTMLDetailsElement).open">
    <summary>Preview carousel · {{ urls.length }} slides</summary>
    <div v-show="open" class="preview-post">
      <strong class="account-name">monococollective</strong>
      <div ref="track" class="preview-track" tabindex="0" aria-label="Carousel slides" @scroll="updatePosition" @keydown.left.prevent="move(-1)" @keydown.right.prevent="move(1)">
        <img v-for="(url, index) in urls" :key="`${index}-${url}`" :src="proxyImageUrl(url)" :alt="`Carousel slide ${index + 1} of ${urls.length}`" loading="lazy" />
      </div>
      <div class="preview-controls">
        <button type="button" class="button subtle" :disabled="current === 0" @click="move(-1)">Previous</button>
        <span aria-live="polite">{{ current + 1 }} / {{ urls.length }}</span>
        <button type="button" class="button subtle" :disabled="current >= urls.length - 1" @click="move(1)">Next</button>
      </div>
      <p v-if="caption" class="preview-caption">{{ caption }}</p>
      <small>Saved slides in publishing order. Swipe or use the arrows.</small>
    </div>
  </details>
</template>

<style scoped>
.carousel-preview{grid-column:1/-1;min-width:0}.carousel-preview summary{cursor:pointer;font-weight:600;padding:10px 0}.preview-post{width:100%;max-width:432px;margin:12px auto;background:#fff;color:#171717;border:1px solid #ddd;border-radius:8px;overflow:hidden}.account-name{display:block;padding:14px}.preview-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain}.preview-track img{flex:0 0 100%;width:100%;min-width:0;aspect-ratio:4/5;object-fit:contain;scroll-snap-align:start;background:#eee}.preview-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px}.preview-caption{white-space:pre-wrap;overflow-wrap:anywhere;padding:0 14px;margin:0 0 14px}.preview-post small{display:block;padding:0 14px 14px;color:#666}
</style>
