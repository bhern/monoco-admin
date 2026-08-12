<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ArrowDown, ArrowUp, CalendarArrowUp, ListOrdered, Plus, RefreshCw } from "@lucide/vue";
import { useRoute } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import EmptyState from "@/components/EmptyState.vue";
import { listCalls, updateCall } from "@/services/api";
import { useSessionStore } from "@/stores/session";
import type { CallSummary } from "@/types/admin";

const session = useSessionStore();
const route = useRoute();
const calls = ref<CallSummary[]>([]);
const error = ref("");
const loading = ref(false);
const sorting = ref(false);
const sortMode = ref<"date" | "manual">("date");

function chronologicalValue(call: CallSummary) {
  return call.openAt || call.closeAt || "9999-12-31";
}

const chronologicalCalls = computed(() =>
  [...calls.value].sort((a, b) => chronologicalValue(a).localeCompare(chronologicalValue(b)))
);
const sortedCalls = computed(() => {
  if (sortMode.value === "date") return chronologicalCalls.value;

  const chronologicalRanks = new Map(
    chronologicalCalls.value.map((call, index) => [call.id, index * 10])
  );
  return [...calls.value].sort((a, b) => {
    const aRank = Number(a.metadata?.adminSortOrder ?? chronologicalRanks.get(a.id));
    const bRank = Number(b.metadata?.adminSortOrder ?? chronologicalRanks.get(b.id));
    return aRank - bRank;
  });
});
const statusFilter = computed(() => {
  const status = route.query.status;
  return typeof status === "string" ? status : "";
});
const pageTitle = computed(() => {
  if (statusFilter.value === "draft") return "Draft calls";
  if (statusFilter.value === "archived") return "Archived calls";
  return "Calls";
});

async function loadCalls() {
  if (!session.token) return;

  loading.value = true;
  error.value = "";

  try {
    calls.value = await listCalls(session.token, statusFilter.value || undefined);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load calls.";
  } finally {
    loading.value = false;
  }
}

async function moveCall(index: number, direction: -1 | 1) {
  if (!session.token || sorting.value) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= sortedCalls.value.length) return;

  const current = sortedCalls.value[index];
  const target = sortedCalls.value[targetIndex];
  sorting.value = true;
  error.value = "";

  try {
    const [updatedCurrent, updatedTarget] = await Promise.all([
      updateCall(session.token, current.id, {
        metadata: { ...(current.metadata || {}), adminSortOrder: targetIndex * 10 }
      }),
      updateCall(session.token, target.id, {
        metadata: { ...(target.metadata || {}), adminSortOrder: index * 10 }
      })
    ]);
    calls.value = calls.value.map((call) => {
      if (call.id === updatedCurrent.id) return updatedCurrent;
      if (call.id === updatedTarget.id) return updatedTarget;
      return call;
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to save the manual order.";
  } finally {
    sorting.value = false;
  }
}

onMounted(loadCalls);
watch(statusFilter, loadCalls);
</script>

<template>
  <AppShell>
    <template #title>{{ pageTitle }}</template>
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
        <span>{{ statusFilter || "all" }} calls</span>
      </div>
      <div class="sort-controls">
        <span class="muted">{{ sortMode === "date" ? "Soonest to latest" : "Manual order" }}</span>
        <button
          class="button subtle"
          type="button"
          :aria-pressed="sortMode === 'manual'"
          @click="sortMode = sortMode === 'date' ? 'manual' : 'date'"
        >
          <ListOrdered v-if="sortMode === 'date'" :size="16" />
          <CalendarArrowUp v-else :size="16" />
          {{ sortMode === "date" ? "Sort manually" : "Sort by date" }}
        </button>
      </div>
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
            <th>Opens</th>
            <th>Closes</th>
            <th>Entries</th>
            <th v-if="sortMode === 'manual'">Order</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(call, index) in sortedCalls" :key="call.id">
            <td>
              <RouterLink class="table-link" :to="`/calls/${call.id}`">{{ call.title }}</RouterLink>
              <span>{{ call.slug }}</span>
            </td>
            <td>{{ call.callType }}</td>
            <td><span class="status-pill">{{ call.status }}</span></td>
            <td>{{ call.openAt || "Not set" }}</td>
            <td>{{ call.closeAt || "Not set" }}</td>
            <td>{{ call.entryCount ?? 0 }}</td>
            <td v-if="sortMode === 'manual'">
              <div class="order-controls">
                <button class="button subtle icon compact" type="button" :disabled="sorting || index === 0" aria-label="Move call up" @click="moveCall(index, -1)">
                  <ArrowUp :size="15" />
                </button>
                <button class="button subtle icon compact" type="button" :disabled="sorting || index === sortedCalls.length - 1" aria-label="Move call down" @click="moveCall(index, 1)">
                  <ArrowDown :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <EmptyState
      v-else
      :title="statusFilter ? `No ${statusFilter} calls` : 'No calls yet'"
      :message="statusFilter ? `There are no calls with the ${statusFilter} status.` : 'Create a call to get started.'"
    />
  </AppShell>
</template>
