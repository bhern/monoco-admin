import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "@/stores/session";
import CallsView from "@/views/CallsView.vue";
import CallDetailView from "@/views/CallDetailView.vue";
import EntryDetailView from "@/views/EntryDetailView.vue";
import LoginView from "@/views/LoginView.vue";
import SettingsView from "@/views/SettingsView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/calls" },
    { path: "/login", name: "login", component: LoginView, meta: { public: true } },
    { path: "/calls", name: "calls", component: CallsView },
    { path: "/calls/new", name: "call-new", component: CallDetailView },
    { path: "/calls/:callId", name: "call-detail", component: CallDetailView },
    { path: "/calls/:callId/entries", name: "call-entries", component: CallsView },
    { path: "/entries/:entryId", name: "entry-detail", component: EntryDetailView },
    { path: "/settings", name: "settings", component: SettingsView }
  ]
});

router.beforeEach((to) => {
  const session = useSessionStore();
  if (!to.meta.public && !session.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (to.name === "login" && session.isAuthenticated) {
    return { name: "calls" };
  }

  return true;
});
