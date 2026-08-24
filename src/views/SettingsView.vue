<script setup lang="ts">
import { ref } from "vue";
import AppShell from "@/components/AppShell.vue";
import { sendChallengeTestEmails } from "@/services/api";
import { useSessionStore } from "@/stores/session";

const session = useSessionStore();
const apiUrl = import.meta.env.VITE_MONOCO_API_URL || "https://api.monococollective.com";
const appEnv = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;
const testEmailTo = ref("ben@bhernphoto.com");
const sendingChallengeTests = ref(false);
const challengeTestNotice = ref("");
const challengeTestError = ref("");

async function sendMonthlyChallengeTests() {
  if (!session.token) return;

  sendingChallengeTests.value = true;
  challengeTestNotice.value = "";
  challengeTestError.value = "";

  try {
    const result = await sendChallengeTestEmails(session.token, { to: testEmailTo.value });
    challengeTestNotice.value = `Sent ${result.sent} challenge test email${result.sent === 1 ? "" : "s"} to ${result.to}.`;
    if (result.failed) {
      challengeTestError.value = `${result.failed} template${result.failed === 1 ? "" : "s"} failed.`;
    }
  } catch (err) {
    challengeTestError.value =
      err instanceof Error ? err.message : "Unable to send challenge test emails.";
  } finally {
    sendingChallengeTests.value = false;
  }
}
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

    <section class="panel">
      <h2>Email tests</h2>
      <p class="muted">
        Send the Monthly Challenge received, published, and Editor's Pick templates with sample data.
      </p>

      <label>
        Recipient
        <input v-model="testEmailTo" type="email" />
      </label>

      <div class="entry-actions">
        <button
          class="button publish"
          type="button"
          :disabled="sendingChallengeTests || !testEmailTo"
          @click="sendMonthlyChallengeTests"
        >
          {{ sendingChallengeTests ? "Sending..." : "Send challenge test emails" }}
        </button>
      </div>

      <p v-if="challengeTestNotice" class="notice success">{{ challengeTestNotice }}</p>
      <p v-if="challengeTestError" class="notice warning">{{ challengeTestError }}</p>
    </section>
  </AppShell>
</template>
