<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Plus, RefreshCw } from "@lucide/vue";
import AppShell from "@/components/AppShell.vue";
import EmptyState from "@/components/EmptyState.vue";
import { listCalls } from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { CallSummary } from "@/types/admin";

const session = useSessionStore();
const calls = ref<CallSummary[]>([]);
const error = ref("");
const loading = ref(false);

const sortedCalls = computed(() =>
  [...calls.value].sort((a, b) => (b.closeAt || "").localeCompare(a.closeAt || ""))
);

async function loadCalls() {
  if (!session.token) return;

  loading.value = true;
  error.value = "";

  try {
    calls.value = await listCalls(session.token);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load calls.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadCalls);
</script>

<template>
  <AppShell>
    <template #title>Calls</template>
    <template #actions>
      <button class="button subtle" type="button" @click="loadCalls">
        <RefreshCw :size="16" />
      </button>
      <RouterLink class="button primary" to="/calls/new">
        <Plus :size="16" />
        New call
      </RouterLink>
    </template>

    <section class="toolbar">
      <div>
        <strong>{{ calls.length }}</strong>
        <span>calls</span>
      </div>
      <span class="muted">Monthly challenges first, Feature submissions next.</span>
    </section>

    <p v-if="error" class="notice warning">{{ error }}</p>

    <section v-if="loading" class="table-card">
      <div class="loading-row">Loading calls...</div>
    </section>

    <section v-else-if="sortedCalls.length" class="table-card">
      <table>
        <thead>
          <tr>
            <th>Call</th>
            <th>Type</th>
            <th>Status</th>
            <th>Closes</th>
            <th>Entries</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="call in sortedCalls" :key="call.id">
            <td>
              <RouterLink class="table-link" :to="`/calls/${call.id}`">{{ call.title }}</RouterLink>
              <span>{{ call.slug }}</span>
            </td>
            <td>{{ call.callType }}</td>
            <td><span class="status-pill">{{ call.status }}</span></td>
            <td>{{ call.closeAt || "Not set" }}</td>
            <td>{{ call.entryCount ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <EmptyState
      v-else
      title="No calls yet"
      message="The schema is ready. The next Worker pass will expose call management endpoints for this screen."
    />
  </AppShell>
</template>
