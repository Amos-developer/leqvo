<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isCopied = ref(false);

const inviteLink = computed(() => {
  const code = user.referralCode || "";

  return `${window.location.origin}/register?ref=${code}`;
});

const shareText = computed(() => `Join me on Leqvo and start trading smarter: ${inviteLink.value}`);

const shareLinks = computed(() => [
  { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText.value)}`, icon: "whatsapp" },
  { name: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink.value)}&text=${encodeURIComponent("Join me on Leqvo")}`, icon: "telegram" },
  { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink.value)}`, icon: "facebook" },
  { name: "Instagram", url: "https://www.instagram.com/", icon: "instagram" }
]);

const inviteSteps = [
  "Share your invitation link with a new member.",
  "They register using your link and join your direct team.",
  "Track members, deposits, and team activity from the Team page."
];

const copyInviteLink = async () => {
  isCopied.value = false;

  try {
    await navigator.clipboard.writeText(inviteLink.value);
    isCopied.value = true;
  } catch (error) {
    isCopied.value = false;
  }

  setTimeout(() => {
    isCopied.value = false;
  }, 2500);
};
</script>

<template>
  <section class="invite-page phone-shell page-enter">
    <header class="invite-header">
      <div>
        <p>Referral access</p>
        <h1>Invite</h1>
      </div>
      <RouterLink to="/team">Team</RouterLink>
      <button type="button" @click="router.back()" aria-label="Go back">&larr;</button>
    </header>

    <section class="invite-hero">
      <div class="invite-orb" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="invite-hero-copy">
        <span>Your invitation link</span>
        <h2>Grow your Leqvo team</h2>
        <p>Invite trusted members and track referral performance securely from your account.</p>
      </div>
    </section>

    <section class="invite-link-card">
      <div class="invite-code-line">
        <span>Referral Code</span>
        <strong>{{ user.referralCode || "------" }}</strong>
      </div>
      <div class="invite-link-box">
        <span>{{ inviteLink }}</span>
        <button type="button" :class="{ copied: isCopied }" @click="copyInviteLink">
          <svg v-if="isCopied" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6" /></svg>
          {{ isCopied ? "Copied" : "Copy" }}
        </button>
      </div>
    </section>

    <section class="invite-share-card">
      <div class="invite-section-title">
        <h2>Share Invite</h2>
        <p>Send your link directly</p>
      </div>
      <div class="invite-share-grid">
        <a v-for="share in shareLinks" :key="share.name" :href="share.url" target="_blank" rel="noreferrer">
          <svg v-if="share.icon === 'whatsapp'" viewBox="0 0 24 24"><path d="M4 20l1.1-4A8 8 0 1 1 8.4 19L4 20Z"/><path d="M9 8.8c.2 3 2.1 4.9 5.2 5.7l1.2-1.4c.2-.2.2-.5 0-.7l-1.1-1c-.2-.2-.5-.2-.7 0l-.6.6c-1.1-.5-1.9-1.3-2.4-2.4l.6-.6c.2-.2.2-.5 0-.7l-1-1.1c-.2-.2-.5-.2-.7 0L9 8.8Z"/></svg>
          <svg v-else-if="share.icon === 'telegram'" viewBox="0 0 24 24"><path d="M21 4L3 11.2l6.8 2.4L18 7.5l-6.2 7.3L18 20l3-16Z"/></svg>
          <svg v-else-if="share.icon === 'facebook'" viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.6.4-1 1-1Z"/></svg>
          <svg v-else viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M17 7.2h.1"/></svg>
          <span>{{ share.name }}</span>
        </a>
      </div>
    </section>

    <section class="invite-how-card">
      <div class="invite-section-title">
        <h2>How It Works</h2>
        <p>Simple invite flow</p>
      </div>
      <div class="invite-step-list">
        <article v-for="(step, index) in inviteSteps" :key="step">
          <span>{{ index + 1 }}</span>
          <p>{{ step }}</p>
        </article>
      </div>
    </section>
  </section>
</template>
