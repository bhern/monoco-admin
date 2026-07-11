<script setup lang="ts">
import { computed, ref } from "vue";

export type ImageAsset = {
  id?: string;
  publicUrl?: string | null;
  altText?: string | null;
  title?: string | null;
  fileName?: string | null;
};

export type UploadContext = Record<string, string | number | boolean | null | undefined>;

const props = withDefaults(
  defineProps<{
    label: string;
    helpText?: string;
    image?: ImageAsset | null;
    uploadContext: UploadContext;
    uploadLabel?: string;
    replaceLabel?: string;
    removeLabel?: string;
    disabled?: boolean;
    required?: boolean;
    accept?: string;
    busy?: boolean;
    compact?: boolean;
  }>(),
  {
    helpText: "",
    image: null,
    uploadLabel: "Upload",
    replaceLabel: "Replace",
    removeLabel: "Remove",
    disabled: false,
    required: false,
    accept: "image/*",
    busy: false,
    compact: false
  }
);

const emit = defineEmits<{
  upload: [{ file: File; context: UploadContext }];
  remove: [{ image: ImageAsset; context: UploadContext }];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const hasImage = computed(() => Boolean(props.image?.publicUrl));

function pickFile() {
  if (props.disabled || props.busy) return;
  inputRef.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit("upload", { file, context: props.uploadContext });
  input.value = "";
}

function removeImage() {
  if (props.disabled || props.busy || !props.image) return;
  emit("remove", { image: props.image, context: props.uploadContext });
}
</script>

<template>
  <div class="single-image-uploader" :class="{ compact }">
    <div class="single-image-copy">
      <strong>{{ label }}<span v-if="required"> *</span></strong>
      <p v-if="helpText" class="helper-text">{{ helpText }}</p>
    </div>

    <img
      v-if="hasImage"
      class="single-image-preview"
      :src="image?.publicUrl || ''"
      :alt="image?.altText || image?.title || label"
    />
    <button v-else class="single-image-preview empty" type="button" :disabled="disabled" @click="pickFile">
      No image
    </button>

    <div class="single-image-actions">
      <button class="button subtle" type="button" :disabled="disabled || busy" @click="pickFile">
        {{ busy ? "Working" : hasImage ? replaceLabel : uploadLabel }}
      </button>
      <button
        v-if="hasImage"
        class="button subtle danger"
        type="button"
        :disabled="disabled || busy"
        @click="removeImage"
      >
        {{ removeLabel }}
      </button>
    </div>

    <input
      ref="inputRef"
      class="single-image-input"
      type="file"
      :accept="accept"
      :disabled="disabled || busy"
      @change="handleFileChange"
    />
  </div>
</template>
