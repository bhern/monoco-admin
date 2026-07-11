<script setup lang="ts">
import { Save } from "@lucide/vue";
import AppShell from "@/components/AppShell.vue";
</script>

<template>
  <AppShell>
    <template #title>Call editor</template>
    <template #actions>
      <button class="button primary" type="button" disabled>
        <Save :size="16" />
        Save
      </button>
    </template>

    <section class="editor-grid">
      <form class="panel">
        <h2>Call basics</h2>
        <label class="field">
          <span>Title</span>
          <input type="text" placeholder="Solitude" />
        </label>
        <label class="field">
          <span>Slug</span>
          <input type="text" placeholder="solitude-july-2026" />
        </label>
        <label class="field">
          <span>Brief</span>
          <textarea rows="5" placeholder="Short public-facing call description"></textarea>
        </label>
      </form>

      <section class="panel">
        <h2>Status and timing</h2>
        <div class="two-column">
          <label class="field">
            <span>Status</span>
            <select>
              <option>draft</option>
              <option>scheduled</option>
              <option>open</option>
              <option>closed</option>
              <option>archived</option>
            </select>
          </label>
          <label class="field">
            <span>Entry limit</span>
            <input type="number" min="1" placeholder="1" />
          </label>
        </div>
        <div class="two-column">
          <label class="field">
            <span>Open at</span>
            <input type="datetime-local" />
          </label>
          <label class="field">
            <span>Close at</span>
            <input type="datetime-local" />
          </label>
        </div>
      </section>

      <section class="panel wide">
        <h2>Assets and categories</h2>
        <p class="muted">
          Hero images, category thumbnails, examples, and OG images will attach here once the Worker
          exposes call asset endpoints.
        </p>
      </section>
    </section>
  </AppShell>
</template>
