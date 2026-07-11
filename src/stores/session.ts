import { defineStore } from "pinia";
import type { AdminSession } from "@/types/admin";

const STORAGE_KEY = "monoco.admin.session";

function readSession(): AdminSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    session: readSession()
  }),
  getters: {
    token: (state) => state.session?.token ?? null,
    isAuthenticated: (state) => Boolean(state.session?.token)
  },
  actions: {
    setSession(session: AdminSession) {
      this.session = session;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    clearSession() {
      this.session = null;
      localStorage.removeItem(STORAGE_KEY);
    }
  }
});
