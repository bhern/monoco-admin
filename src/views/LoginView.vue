<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LogIn } from "@lucide/vue";
import { login } from "@/services/api";
import { useSessionStore } from "@/stores/session";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const passcode = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;

  try {
    const nextSession = await login(passcode.value);
    session.setSession(nextSession);
    router.push((route.query.redirect as string) || "/calls");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to sign in.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand brand-large">
        <span class="brand-mark">m</span>
        <span>
          <strong>monoCO</strong>
          <small>Admin</small>
        </span>
      </div>

      <div>
        <h1>Sign in</h1>
        <p>Manage calls, entries, call assets, and publication workflow.</p>
      </div>

      <label class="field">
        <span>Admin passcode</span>
        <input v-model="passcode" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="button primary full-width" type="submit" :disabled="loading">
        <LogIn :size="17" />
        {{ loading ? "Signing in" : "Sign in" }}
      </button>
    </form>
  </main>
</template>
