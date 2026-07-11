<script setup lang="ts">
import {
  Archive,
  CircleDot,
  FileImage,
  GalleryHorizontalEnd,
  LogOut,
  Settings,
  SquarePen
} from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const navItems = [
  { label: "Calls", to: "/calls", icon: GalleryHorizontalEnd },
  { label: "Entries", to: "/entries", icon: FileImage },
  { label: "Drafts", to: "/calls?status=draft", icon: SquarePen },
  { label: "Archive", to: "/calls?status=archived", icon: Archive },
  { label: "Settings", to: "/settings", icon: Settings }
];

function signOut() {
  session.clearSession();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink class="brand" to="/calls" aria-label="monoCO Admin">
        <span class="brand-mark">m</span>
        <span>
          <strong>monoCO</strong>
          <small>Admin</small>
        </span>
      </RouterLink>

      <nav class="nav-list" aria-label="Admin navigation">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          class="nav-item"
          :class="{ active: route.fullPath === item.to || route.path === item.to }"
          :to="item.to"
        >
          <component :is="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <button class="nav-item sign-out" type="button" @click="signOut">
        <LogOut :size="17" />
        <span>Sign out</span>
      </button>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <div>
          <div class="eyebrow">
            <CircleDot :size="14" />
            Call and entry operations
          </div>
          <h1><slot name="title">monoCO Admin</slot></h1>
        </div>
        <slot name="actions" />
      </header>

      <slot />
    </main>
  </div>
</template>
