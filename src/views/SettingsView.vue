<script setup lang="ts">
import AppShell from "@/components/AppShell.vue";

const apiUrl = import.meta.env.VITE_MONOCO_API_URL || "https://monoco-api.ben-505.workers.dev";
const appEnv = import.meta.env.VITE_APP_ENV || "development";
</script>

<template>
  <AppShell>
    <template #title>Settings</template>

    <section class="panel">
      <h2>Environment</h2>
      <dl class="settings-list">
        <div>
          <dt>API URL</dt>
          <dd>{{ apiUrl }}</dd>
        </div>
        <div>
          <dt>App environment</dt>
          <dd>{{ appEnv }}</dd>
        </div>
      </dl>
    </section>
  </AppShell>
</template>
