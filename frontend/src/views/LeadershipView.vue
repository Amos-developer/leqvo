<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getTeamOverview } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isLoading = ref(true);
const errorMessage = ref("");
const team = ref({ summary: {}, levels: [] });

const levels = [
  { level: 1, title: "Starter", membersMin: 5, membersMax: 10, levelOneDeposit: 1000, oneTimeReward: 50, weeklySalary: 20 },
  { level: 2, title: "Builder", membersMin: 11, membersMax: 30, levelOneDeposit: 5000, oneTimeReward: 200, weeklySalary: 100 },
  { level: 3, title: "Pro Leader", membersMin: 31, membersMax: 50, levelOneDeposit: 10000, oneTimeReward: 500, weeklySalary: 200 },
  { level: 4, title: "Elite Leader", membersMin: 51, membersMax: 100, levelOneDeposit: 30000, oneTimeReward: 1600, weeklySalary: 400 },
  {
    level: 5,
    title: "Executive Leader",
    membersMin: 101,
    membersMax: 200,
    levelOneDeposit: 500000,
    levelTwoThreeDeposit: 500000,
    oneTimeReward: 4500,
    weeklySalary: 1200
  }
];

const money = (value) => Number(value || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const summary = computed(() => team.value.summary || {});
const levelOneMembers = computed(() => {
  return team.value.levels?.find((item) => Number(item.level) === 1)?.members?.length || 0;
});
const levelOneDeposit = computed(() => {
  const level = team.value.levels?.find((item) => Number(item.level) === 1);

  return (level?.members || []).reduce((total, member) => total + Number(member.totalDeposit || 0), 0);
});
const levelTwoThreeDeposit = computed(() => {
  return (team.value.levels || [])
    .filter((item) => [2, 3].includes(Number(item.level)))
    .flatMap((item) => item.members || [])
    .reduce((total, member) => total + Number(member.totalDeposit || 0), 0);
});
const achievedLevel = computed(() => {
  return [...levels]
    .reverse()
    .find((level) => {
      const hasMembers = levelOneMembers.value >= level.membersMin;
      const hasLevelOneDeposit = levelOneDeposit.value >= level.levelOneDeposit;
      const hasLevelTwoThreeDeposit = !level.levelTwoThreeDeposit || levelTwoThreeDeposit.value >= level.levelTwoThreeDeposit;

      return hasMembers && hasLevelOneDeposit && hasLevelTwoThreeDeposit;
    })?.level || 0;
});
const currentLevel = computed(() => achievedLevel.value || 1);
const currentLevelInfo = computed(() => levels.find((item) => item.level === currentLevel.value) || levels[0]);
const nextLevelInfo = computed(() => levels.find((item) => item.level === achievedLevel.value + 1) || null);
const teamMembers = computed(() => Number(summary.value.totalMembers || 0));
const teamDeposit = computed(() => Number(summary.value.teamDeposit || 0));

const progress = computed(() => {
  if (!nextLevelInfo.value) {
    return 100;
  }

  const memberProgress = Math.min((levelOneMembers.value / nextLevelInfo.value.membersMin) * 100, 100);
  const depositProgress = Math.min((levelOneDeposit.value / nextLevelInfo.value.levelOneDeposit) * 100, 100);
  const extraDepositProgress = nextLevelInfo.value.levelTwoThreeDeposit
    ? Math.min((levelTwoThreeDeposit.value / nextLevelInfo.value.levelTwoThreeDeposit) * 100, 100)
    : 100;

  return Math.round((memberProgress + depositProgress + extraDepositProgress) / 3);
});

const remainingMembers = computed(() => {
  if (!nextLevelInfo.value) {
    return 0;
  }

  return Math.max(nextLevelInfo.value.membersMin - levelOneMembers.value, 0);
});

const remainingLevelOneDeposit = computed(() => {
  if (!nextLevelInfo.value) {
    return 0;
  }

  return Math.max(nextLevelInfo.value.levelOneDeposit - levelOneDeposit.value, 0);
});

const remainingLevelTwoThreeDeposit = computed(() => {
  if (!nextLevelInfo.value?.levelTwoThreeDeposit) {
    return 0;
  }

  return Math.max(nextLevelInfo.value.levelTwoThreeDeposit - levelTwoThreeDeposit.value, 0);
});

const stats = computed(() => [
  { label: "Level 1 Members", value: levelOneMembers.value },
  { label: "Level 1 Deposit", value: money(levelOneDeposit.value) },
  { label: "L2 + L3 Deposit", value: money(levelTwoThreeDeposit.value) },
  { label: "Total Earnings", value: money(summary.value.totalEarnings) }
]);

const memberRange = (level) => `${level.membersMin}-${level.membersMax} active Level 1 members`;

const loadLeadership = async () => {
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

onMounted(loadLeadership);
</script>

<template>
  <section class="leadership-page phone-shell page-enter">
    <header class="leadership-header">
      <div>
        <p>Growth rank</p>
        <h1>Leadership</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="leadership-hero">
      <div>
        <span>Current rank</span>
        <strong>{{ achievedLevel ? currentLevelInfo.title : "No leader rank yet" }}</strong>
        <p>{{ achievedLevel ? `Weekly salary ${money(currentLevelInfo.weeklySalary)}` : "Build active Level 1 members to unlock your first leader rank." }}</p>
      </div>
      <div class="leader-medal" aria-hidden="true">
        <span>{{ currentLevel }}</span>
      </div>
    </section>

    <section class="leadership-progress-card">
      <div class="leadership-card-head">
        <div>
          <p>{{ nextLevelInfo ? "Next milestone" : "Maximum rank" }}</p>
          <h2>{{ nextLevelInfo ? nextLevelInfo.title : "Executive Leader unlocked" }}</h2>
        </div>
        <span>{{ progress }}%</span>
      </div>
      <div class="leader-progress-track">
        <span :style="{ width: `${progress}%` }"></span>
      </div>
      <div class="leader-requirements">
        <article>
          <span>Active members needed</span>
          <strong>{{ remainingMembers }}</strong>
        </article>
        <article>
          <span>Level 1 deposit needed</span>
          <strong>{{ money(remainingLevelOneDeposit) }}</strong>
        </article>
        <article v-if="nextLevelInfo?.levelTwoThreeDeposit">
          <span>L2 + L3 deposit needed</span>
          <strong>{{ money(remainingLevelTwoThreeDeposit) }}</strong>
        </article>
      </div>
    </section>

    <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
    <article v-if="isLoading" class="leadership-state">Loading leadership profile...</article>

    <section v-else class="leadership-stats">
      <article v-for="stat in stats" :key="stat.label">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </article>
    </section>

    <section class="leader-level-list">
      <div class="leadership-card-head">
        <div>
          <p>Rank ladder</p>
          <h2>Leadership Ranks</h2>
        </div>
      </div>

      <article
        v-for="level in levels"
        :key="level.level"
        class="leader-level-card"
        :class="{ active: level.level === achievedLevel, unlocked: level.level < achievedLevel }"
      >
        <div class="level-badge">{{ level.level }}</div>
        <div class="level-detail">
          <strong>{{ level.title }}</strong>
          <p>{{ memberRange(level) }}</p>
          <div class="level-reward-grid">
            <span>Minimum total deposit: {{ money(level.levelOneDeposit) }}</span>
            <span v-if="level.levelTwoThreeDeposit">L2 + L3 deposit: {{ money(level.levelTwoThreeDeposit) }}</span>
            <span>One-time reward: {{ money(level.oneTimeReward) }}</span>
            <span>Weekly salary: {{ money(level.weeklySalary) }}</span>
          </div>
        </div>
        <span>{{ level.level <= achievedLevel ? "Unlocked" : "Locked" }}</span>
      </article>
    </section>
  </section>
</template>
