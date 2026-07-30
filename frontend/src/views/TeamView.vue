<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getTeamOverview } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isLoading = ref(true);
const errorMessage = ref("");
const isCopied = ref(false);
const team = ref({
  summary: {},
  levels: []
});

const money = (value) => Number(value || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD"
});

const cards = computed(() => {
  const summary = team.value.summary || {};

  return [
    { label: "Total Members", value: summary.totalMembers || 0 },
    { label: "Total Team", value: summary.totalTeam || 0 },
    { label: "Active Members", value: summary.activeMembers || 0 },
    { label: "Inactive Members", value: summary.inactiveMembers || 0 },
    { label: "Team Deposit", value: money(summary.teamDeposit) },
    { label: "Team Withdrawal", value: money(summary.teamWithdrawal) }
  ];
});

const leaderLevel = computed(() => `LEVEL ${team.value.summary?.leaderLevel || 1}`);
const inviteLink = computed(() => {
  const code = team.value.summary?.referralCode || user.referralCode || "";

  return `${window.location.origin}/register?ref=${code}`;
});
const shareText = computed(() => `Join me on Leqvo: ${inviteLink.value}`);
const shareLinks = computed(() => [
  { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText.value)}`, icon: "whatsapp" },
  { name: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink.value)}&text=${encodeURIComponent("Join me on Leqvo")}`, icon: "telegram" },
  { name: "Instagram", url: "https://www.instagram.com/", icon: "instagram" },
  { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink.value)}`, icon: "facebook" }
]);

const fetchTeam = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getTeamOverview(user.id);
    team.value = result.data;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

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
  }, 2600);
};

onMounted(fetchTeam);
</script>

<template>
  <section class="team-page phone-shell page-enter">
    <header class="team-header">
      <div>
        <p>Referral network</p>
        <h1>Team</h1>
      </div>
      <span>{{ leaderLevel }}</span>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="team-hero">
      <p>Total Earnings</p>
      <strong>{{ money(team.summary?.totalEarnings) }}</strong>
      <div class="team-invite-link">
        <span>{{ inviteLink }}</span>
        <button type="button" :class="{ copied: isCopied }" @click="copyInviteLink">
          <svg v-if="isCopied" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6" /></svg>
          {{ isCopied ? "Copied" : "Copy" }}
        </button>
      </div>
      <div class="team-share-actions">
        <a v-for="share in shareLinks" :key="share.name" :href="share.url" target="_blank" rel="noreferrer" :aria-label="share.name">
          <svg v-if="share.icon === 'whatsapp'" viewBox="0 0 24 24"><path d="M4 20l1.1-4A8 8 0 1 1 8.4 19L4 20Z"/><path d="M9 8.8c.2 3 2.1 4.9 5.2 5.7l1.2-1.4c.2-.2.2-.5 0-.7l-1.1-1c-.2-.2-.5-.2-.7 0l-.6.6c-1.1-.5-1.9-1.3-2.4-2.4l.6-.6c.2-.2.2-.5 0-.7l-1-1.1c-.2-.2-.5-.2-.7 0L9 8.8Z"/></svg>
          <svg v-else-if="share.icon === 'telegram'" viewBox="0 0 24 24"><path d="M21 4L3 11.2l6.8 2.4L18 7.5l-6.2 7.3L18 20l3-16Z"/></svg>
          <svg v-else-if="share.icon === 'instagram'" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M17 7.2h.1"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.6.4-1 1-1Z"/></svg>
        </a>
      </div>
    </section>

    <section class="team-performance">
      <article v-for="card in cards" :key="card.label">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
    <article v-if="isLoading" class="team-state">Loading team...</article>

    <section v-else class="team-levels">
      <article v-for="level in team.levels" :key="level.level" class="team-level-card">
        <div class="team-level-head">
          <div>
            <p>Level {{ level.level }}</p>
            <h2>{{ level.level === 1 ? "Direct Members" : `Level ${level.level} Members` }}</h2>
          </div>
          <span>{{ level.members.length }}</span>
        </div>

        <div class="team-member-list">
          <div v-if="!level.members.length" class="team-empty">No members yet</div>
          <div v-for="member in level.members" :key="member.id" class="team-member">
            <div class="team-avatar">{{ member.username.charAt(0).toUpperCase() }}</div>
            <div>
              <strong>{{ member.username }}</strong>
              <p>{{ member.id }} · {{ member.isActive ? "Active" : "Inactive" }}</p>
            </div>
            <span>{{ money(member.totalDeposit) }}</span>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
