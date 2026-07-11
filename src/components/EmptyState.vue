<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
}>();
</script>

<template>
  <section class="empty-state">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
  </section>
</template>
