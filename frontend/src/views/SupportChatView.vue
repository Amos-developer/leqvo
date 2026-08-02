<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isWidgetReady = ref(false);
const widgetMessage = ref("Connecting to LiveChat...");
const supportIdentity = ref({
  accountId: user.id || "",
  username: user.username || ""
});
const identityError = ref("");

const quickTopics = [
  "Deposit issue",
  "Withdrawal help",
  "KYC review",
  "Trading account"
];

const loadLiveChat = () => {
  window.__lc = window.__lc || {};
  window.__lc.license = 19877397;
  window.__lc.integration_name = "manual_channels";
  window.__lc.product_name = "livechat";

  if (window.LiveChatWidget) {
    isWidgetReady.value = true;
    widgetMessage.value = "LiveChat is ready.";
    return;
  }

  const existingScript = document.querySelector('script[src="https://cdn.livechatinc.com/tracking.js"]');

  if (existingScript) {
    existingScript.addEventListener("load", () => {
      isWidgetReady.value = true;
      widgetMessage.value = "LiveChat is ready.";
    });
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.type = "text/javascript";
  script.src = "https://cdn.livechatinc.com/tracking.js";
  script.onload = () => {
    isWidgetReady.value = true;
    widgetMessage.value = "LiveChat is ready.";
  };
  script.onerror = () => {
    widgetMessage.value = "LiveChat could not load. Please check your connection.";
  };
  document.head.appendChild(script);
};

const validateIdentity = () => {
  identityError.value = "";

  if (!supportIdentity.value.accountId.trim() || !supportIdentity.value.username.trim()) {
    identityError.value = "Enter your account ID and username before starting chat.";
    return false;
  }

  if (!/^LEQ-\d{6}$/.test(supportIdentity.value.accountId.trim())) {
    identityError.value = "Account ID must look like LEQ-123456.";
    return false;
  }

  if (!/^[A-Za-z]{3,20}$/.test(supportIdentity.value.username.trim())) {
    identityError.value = "Username must be 3-20 English letters only.";
    return false;
  }

  return true;
};

const openLiveChat = (topic = "") => {
  if (!validateIdentity()) {
    return;
  }

  if (!window.LiveChatWidget) {
    loadLiveChat();
    widgetMessage.value = "LiveChat is loading. Try again in a moment.";
    return;
  }

  if (topic) {
    window.LiveChatWidget.call("set_session_variables", {
      topic,
      account_id: supportIdentity.value.accountId.trim(),
      username: supportIdentity.value.username.trim()
    });
  } else {
    window.LiveChatWidget.call("set_session_variables", {
      account_id: supportIdentity.value.accountId.trim(),
      username: supportIdentity.value.username.trim()
    });
  }

  window.LiveChatWidget.call("maximize");
};

onMounted(loadLiveChat);
</script>

<template>
  <section class="support-page phone-shell page-enter app-page">
    <header class="support-header">
      <div>
        <p>Online help</p>
        <h1>Customer Support</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="support-agent-card">
      <div class="support-agent-avatar">LQ</div>
      <div>
        <span>Leqvo Support</span>
        <strong>Online agent</strong>
        <p>Average response: under 2 minutes</p>
      </div>
      <b>Live</b>
    </section>

    <section class="support-identity-card">
      <div>
        <span>Required before chat</span>
        <strong>Confirm your account</strong>
        <p>Agents use these details to find your Leqvo account faster.</p>
      </div>
      <label>
        Account ID
        <input v-model.trim="supportIdentity.accountId" type="text" placeholder="Enter account ID" />
      </label>
      <label>
        Username
        <input v-model.trim="supportIdentity.username" type="text" placeholder="Enter username" />
      </label>
      <p v-if="identityError" class="support-error">{{ identityError }}</p>
    </section>

    <section class="support-topic-row" aria-label="Quick support topics">
      <button v-for="topic in quickTopics" :key="topic" type="button" @click="openLiveChat(topic)">
        {{ topic }}
      </button>
    </section>

    <section class="support-live-card">
      <div class="support-live-visual">
        <span></span>
        <i></i>
      </div>
      <div>
        <span>Powered by Text.com LiveChat</span>
        <strong>Start a secure live chat</strong>
        <p>{{ widgetMessage }}</p>
      </div>
      <button type="button" @click="openLiveChat()">
        {{ isWidgetReady ? "Start Chat" : "Load Chat" }}
      </button>
    </section>

    <section class="support-guide">
      <div>
        <span>Before you chat</span>
        <h2>Never share secrets</h2>
      </div>
      <p>Support can help with deposits, withdrawals, KYC, and account questions. Never share your password, email code, withdrawal PIN, or private keys.</p>
    </section>
  </section>
</template>
