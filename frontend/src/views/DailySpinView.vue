<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getDailySpinStatus, runDailySpin } from "../utils/api";

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem("leqvoUser") || "{}"));
const isLoading = ref(true);
const isSpinning = ref(false);
const errorMessage = ref("");
const canSpin = ref(false);
const today = ref(null);
const latest = ref(null);
const missedYesterday = ref(false);
const nextStreakDay = ref(1);
const history = ref([]);
const spinResult = ref(null);
const popupReward = ref(null);
const showWinPopup = ref(false);
const rotation = ref(0);
const segments = ref([
  { label: "$0.10", amount: 0.1, index: 0 },
  { label: "$0.20", amount: 0.2, index: 1 },
  { label: "$0.50", amount: 0.5, index: 2 },
  { label: "$1.00", amount: 1, index: 3 },
  { label: "$2.00", amount: 2, index: 4 },
  { label: "$3.00", amount: 3, index: 5 },
  { label: "$5.00", amount: 5, index: 6 },
  { label: "$10.00", amount: 10, index: 7 }
]);

const balance = computed(() => Number(user.value.balance || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD"
}));
const streakLabel = computed(() => {
  if (missedYesterday.value) {
    return "Streak reset";
  }

  return `Day ${nextStreakDay.value}`;
});

const formatDate = (value) => {
  if (!value) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const loadStatus = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getDailySpinStatus();
    canSpin.value = result.data.canSpin;
    today.value = result.data.today;
    latest.value = result.data.latest;
    missedYesterday.value = result.data.missedYesterday;
    nextStreakDay.value = result.data.nextStreakDay;
    history.value = result.data.history || [];
    segments.value = result.data.segments || segments.value;
    if (!showWinPopup.value) {
      spinResult.value = null;
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const spinWheel = async () => {
  if (!canSpin.value || isSpinning.value) {
    return;
  }

  isSpinning.value = true;
  errorMessage.value = "";
  spinResult.value = null;
  popupReward.value = null;

  try {
    const result = await runDailySpin();
    const segmentSize = 360 / segments.value.length;
    const targetAngle = 360 - (Number(result.data.spin.segmentIndex || 0) * segmentSize + segmentSize / 2);
    rotation.value += 1440 + targetAngle;

    window.setTimeout(() => {
      spinResult.value = result.data.spin;
      popupReward.value = result.data.spin;
      showWinPopup.value = true;
      canSpin.value = false;
      user.value = result.data.user;
      localStorage.setItem("leqvoUser", JSON.stringify(result.data.user));
      isSpinning.value = false;
      loadStatus();
    }, 1800);
  } catch (error) {
    errorMessage.value = error.message;
    isSpinning.value = false;
    loadStatus();
  }
};

onMounted(loadStatus);
</script>

<template>
  <section class="daily-spin-page phone-shell page-enter">
    <div v-if="showWinPopup && popupReward" class="spin-win-modal" role="dialog" aria-modal="true" aria-labelledby="spin-win-title">
      <div class="spin-win-modal-card">
        <span>Congratulations</span>
        <strong id="spin-win-title">You won {{ popupReward.prizeLabel }}</strong>
        <p>Your reward has been credited to your Leqvo balance. Come back tomorrow for your next spin.</p>
        <button
          type="button"
          @click="
            showWinPopup = false;
            popupReward = null;
            spinResult = null;
          "
        >
          OK
        </button>
      </div>
    </div>

    <header class="daily-spin-header">
      <div>
        <p>Daily reward</p>
        <h1>Daily Spin</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="spin-hero">
      <div>
        <span>Balance</span>
        <strong>{{ balance }}</strong>
        <p>Spin once per day. Missing a day resets your streak back to day 1.</p>
      </div>
      <div class="spin-streak-badge">
        <span>{{ streakLabel }}</span>
      </div>
    </section>

    <section class="spin-wheel-card">
      <div class="spin-card-head">
        <div>
          <p>{{ canSpin ? "Ready" : "Locked today" }}</p>
          <h2>{{ canSpin ? "Tap to spin" : "Come back tomorrow" }}</h2>
        </div>
        <span>1x daily</span>
      </div>

      <article v-if="isLoading" class="spin-state">Loading daily spin...</article>
      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>

      <div class="wheel-stage" aria-label="Daily spin wheel">
        <div class="wheel-pointer"></div>
        <div class="spin-wheel" :class="{ spinning: isSpinning }" :style="{ transform: `rotate(${rotation}deg)` }">
          <span
            v-for="segment in segments"
            :key="segment.index"
            :class="{ revealed: isSpinning || !!spinResult }"
            :style="{ transform: `rotate(${segment.index * (360 / segments.length)}deg)` }"
          >
            <b>{{ segment.label }}</b>
          </span>
          <i></i>
        </div>
      </div>

      <button class="spin-action-button" type="button" :disabled="!canSpin || isSpinning || isLoading" @click="spinWheel">
        {{ isSpinning ? "Spinning..." : canSpin ? "Spin Now" : "Already Spun" }}
      </button>
    </section>

    <section class="spin-rule-card">
      <div class="spin-card-head">
        <div>
          <p>Streak rule</p>
          <h2>Keep Your Process Active</h2>
        </div>
      </div>
      <div class="spin-rule-list">
        <article><span>1</span><p>You can spin only once per day.</p></article>
        <article><span>2</span><p>Spin every day to keep your streak growing.</p></article>
        <article><span>3</span><p>If you miss one day, your streak resets and starts again from day 1.</p></article>
      </div>
    </section>

    <section class="spin-history-card">
      <div class="spin-card-head">
        <div>
          <p>Records</p>
          <h2>Previous Spins</h2>
        </div>
      </div>
      <div class="spin-history-list">
        <article v-if="!history.length" class="spin-state">No spin records yet.</article>
        <article v-for="record in history" :key="record.id">
          <div>
            <strong>{{ record.prizeLabel }}</strong>
            <span>Day {{ record.streakDay }} · {{ formatDate(record.spunAt) }}</span>
          </div>
          <b>{{ record.spinDate }}</b>
        </article>
      </div>
    </section>
  </section>
</template>
