<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { Download, ImagePlus } from "@lucide/vue";
import { proxyImageUrl } from "@/services/api";

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_URL = "https://framerusercontent.com/images/UCSZmkerJoLdon5qwV9o0jhB1w.png?width=757&height=129";
const BEBAS_NEUE_URL = "https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2";
const INTER_URL = "https://framerusercontent.com/assets/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2";
let brandFontsPromise: Promise<void> | null = null;

const props = defineProps<{
  heroUrl?: string | null;
  title: string;
  subtitle?: string | null;
  closeAt?: string | null;
  currentUrl?: string | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  save: [file: File];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const focusX = ref(50);
const focusY = ref(50);
const overlayOpacity = ref(78);
const rendering = ref(false);
const renderError = ref("");

const fileName = computed(() => {
  const slug = props.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "monthly-challenge"}-social-share-1200x630.png`;
});

function formatChallengeMonth(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "MONTHLY CHALLENGE";
  return `MONTHLY CHALLENGE  ·  ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date).toUpperCase()}`;
}

function formatCloseDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `CLOSES ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric"
  }).format(date).toUpperCase()}`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

async function loadImage(url: string) {
  const response = await fetch(proxyImageUrl(url));
  if (!response.ok) throw new Error("Unable to load the challenge hero for export.");
  return createImageBitmap(await response.blob());
}

function ensureBrandFonts() {
  if (!brandFontsPromise) {
    brandFontsPromise = Promise.all([
      new FontFace("Bebas Neue", `url(${BEBAS_NEUE_URL})`, { weight: "400" }).load(),
      new FontFace("Inter", `url(${INTER_URL})`, { weight: "400" }).load()
    ]).then((fonts) => {
      fonts.forEach((font) => document.fonts.add(font));
    });
  }
  return brandFontsPromise;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) * (focusX.value / 100);
  const sourceY = (image.height - sourceHeight) * (focusY.value / 100);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function fitTitle(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  let size = 58;
  do {
    context.font = `400 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  } while (size > 34);
}

async function render() {
  const target = canvas.value;
  if (!target) return;

  rendering.value = true;
  renderError.value = "";
  const context = target.getContext("2d");
  if (!context) {
    rendering.value = false;
    renderError.value = "Canvas rendering is unavailable in this browser.";
    return;
  }

  try {
    await ensureBrandFonts();
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#181818";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    const [heroImage, logoImage] = await Promise.all([
      props.heroUrl ? loadImage(props.heroUrl) : Promise.resolve(null),
      loadImage(LOGO_URL)
    ]);

    if (heroImage) drawCover(context, heroImage, 0, 70, WIDTH, HEIGHT - 70);

    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.fillRect(0, 70, WIDTH, HEIGHT - 70);
    context.drawImage(logoImage, 24, 23, 176, 30);
    heroImage?.close();
    logoImage.close();

    const panelX = 210;
    const panelY = 255;
    const panelWidth = 780;
    const panelHeight = 215;
    context.fillStyle = `rgba(0, 0, 0, ${overlayOpacity.value / 100})`;
    context.fillRect(panelX, panelY, panelWidth, panelHeight);

    context.textBaseline = "alphabetic";
    context.fillStyle = "#f2b72e";
    context.font = "400 20px Inter, Arial, sans-serif";
    context.fillText(formatChallengeMonth(props.closeAt), panelX + 20, panelY + 38);

    const title = (props.title || "Monthly Challenge").toUpperCase();
    context.fillStyle = "#ffffff";
    fitTitle(context, title, panelWidth - 40);
    context.fillText(title, panelX + 20, panelY + 105);

    context.fillStyle = "#ffffff";
    context.font = "400 17px Inter, Arial, sans-serif";
    context.fillText(props.subtitle || "", panelX + 20, panelY + 142, panelWidth - 40);

    const closeLabel = formatCloseDate(props.closeAt);
    context.font = "400 16px Inter, Arial, sans-serif";
    context.fillStyle = "#ffffff";
    if (closeLabel) context.fillText(`▣  ${closeLabel}`, panelX + 20, panelY + 185);

    context.strokeStyle = "rgba(255, 255, 255, 0.25)";
    context.lineWidth = 1;
    roundedRect(context, WIDTH - 42, HEIGHT - 42, 25, 25, 13);
    context.stroke();
  } catch (err) {
    renderError.value = err instanceof Error ? err.message : "Unable to render the share image.";
  } finally {
    rendering.value = false;
  }
}

function toBlob() {
  return new Promise<Blob>((resolve, reject) => {
    canvas.value?.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to export the share image."));
    }, "image/png");
  });
}

async function download() {
  await render();
  if (renderError.value) return;
  const blob = await toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.value;
  link.click();
  URL.revokeObjectURL(url);
}

async function save() {
  await render();
  if (renderError.value) return;
  const blob = await toBlob();
  emit("save", new File([blob], fileName.value, { type: "image/png" }));
}

watch(
  () => [props.heroUrl, props.title, props.subtitle, props.closeAt, focusX.value, focusY.value, overlayOpacity.value],
  async () => {
    await nextTick();
    await render();
  }
);

onMounted(render);
</script>

<template>
  <div class="share-generator">
    <div class="share-preview">
      <canvas ref="canvas" :width="WIDTH" :height="HEIGHT" aria-label="Social share image preview"></canvas>
      <span class="share-size">1200 × 630</span>
    </div>

    <p v-if="renderError" class="notice warning">{{ renderError }}</p>

    <div class="share-controls">
      <label>
        <span>Horizontal position</span>
        <input v-model.number="focusX" type="range" min="0" max="100" />
      </label>
      <label>
        <span>Vertical position</span>
        <input v-model.number="focusY" type="range" min="0" max="100" />
      </label>
      <label>
        <span>Overlay</span>
        <input v-model.number="overlayOpacity" type="range" min="45" max="95" />
      </label>
    </div>

    <div class="share-actions">
      <button class="button subtle" type="button" :disabled="rendering || busy || !heroUrl" @click="download">
        <Download :size="16" />
        Download PNG
      </button>
      <button class="button primary" type="button" :disabled="rendering || busy || !heroUrl" @click="save">
        <ImagePlus :size="16" />
        {{ busy ? "Saving" : "Save share image" }}
      </button>
    </div>

    <a v-if="currentUrl" class="current-share" :href="currentUrl" target="_blank" rel="noreferrer">
      View currently saved share image
    </a>
  </div>
</template>

<style scoped>
.share-generator { display: grid; gap: 16px; }
.share-preview { position: relative; overflow: hidden; border: 1px solid #d9d7cf; border-radius: 8px; background: #111; }
.share-preview canvas { display: block; width: 100%; height: auto; aspect-ratio: 1200 / 630; }
.share-size { position: absolute; right: 10px; bottom: 10px; padding: 5px 8px; border-radius: 4px; background: rgba(0,0,0,.72); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.share-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.share-controls label { display: grid; gap: 7px; color: #5f5b52; font-size: 12px; font-weight: 700; }
.share-controls input { width: 100%; accent-color: #222; }
.share-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.current-share { color: #4f4b43; font-size: 13px; font-weight: 700; }
@media (max-width: 760px) { .share-controls { grid-template-columns: 1fr; } }
</style>
