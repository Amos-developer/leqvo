<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getLuckyBoxStatus, openLuckyBox } from "../utils/api";

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem("leqvoUser") || "{}"));
const isLoading = ref(true);
const isOpening = ref(false);
const errorMessage = ref("");
const selectedBox = ref(null);
const openedBox = ref(null);
const reward = ref(null);
const canOpen = ref(false);
const availableChances = ref(0);
const selfQualifiedCount = ref(0);
const referralQualifiedCount = ref(0);
const qualifyingDepositAmount = ref(100);
const history = ref([]);
const prizes = ref([0.5, 1, 3, 5, 8, 10, 15, 17, 20]);

const boxes = computed(() => Array.from({ length: 9 }, (_, index) => index + 1));
const balance = computed(() => Number(user.value.balance || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD"
}));
const instructions = computed(() => [
  `Each credited deposit of $${Number(qualifyingDepositAmount.value).toFixed(0)} or more gives one lucky box chance.`,
  `A direct invited member who deposits $${Number(qualifyingDepositAmount.value).toFixed(0)} or more gives you one leader chance.`,
  "Each earned chance can be used only once, and your reward is credited instantly after opening a box."
]);
const lastPrize = computed(() => reward.value || history.value[0] || null);

const formatPrize = (value) => `$${Number(value || 0).toFixed(2)}`;

const loadStatus = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getLuckyBoxStatus();
    canOpen.value = result.data.canOpen;
    availableChances.value = Number(result.data.availableChances || 0);
    selfQualifiedCount.value = Number(result.data.selfQualifiedCount || 0);
    referralQualifiedCount.value = Number(result.data.referralQualifiedCount || 0);
    qualifyingDepositAmount.value = Number(result.data.qualifyingDepositAmount || 100);
    history.value = result.data.history || [];
    prizes.value = result.data.prizes || prizes.value;
    openedBox.value = null;
    selectedBox.value = null;
    reward.value = null;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const chooseBox = async (boxNumber) => {
  if (!canOpen.value || isOpening.value) {
    return;
  }

  selectedBox.value = boxNumber;
  openedBox.value = null;
  reward.value = null;
  errorMessage.value = "";
  isOpening.value = true;

  try {
    const result = await openLuckyBox(boxNumber);

    window.setTimeout(() => {
      reward.value = result.data.reward;
      openedBox.value = boxNumber;
      user.value = result.data.user;
      localStorage.setItem("leqvoUser", JSON.stringify(result.data.user));
      isOpening.value = false;
      loadStatus();
    }, 900);
  } catch (error) {
    errorMessage.value = error.message;
    isOpening.value = false;
    loadStatus();
  }
};

onMounted(loadStatus);
</script>

<template>
  <section class="lucky-page phone-shell page-enter">
    <header class="lucky-header">
      <div>
        <p>Reward chance</p>
        <h1>Lucky Box</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="lucky-hero">
      <div>
        <span>Available balance</span>
        <strong>{{ balance }}</strong>
        <p>Earn a chance from your own 100 USDT+ deposit, or from a direct invited member who deposits 100 USDT+.</p>
      </div>
      <div class="lucky-box-visual" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </section>

    <section class="lucky-status-card">
      <div>
        <span>Status</span>
        <strong>{{ canOpen ? "Chance available" : "No earned chance yet" }}</strong>
      </div>
      <div>
        <span>Available chances</span>
        <strong>{{ availableChances }}</strong>
      </div>
      <div>
        <span>Your deposit chances</span>
        <strong>{{ selfQualifiedCount }}</strong>
      </div>
      <div>
        <span>Leader chances</span>
        <strong>{{ referralQualifiedCount }}</strong>
      </div>
    </section>

    <section class="lucky-board-card">
      <div class="lucky-board-head">
        <div>
          <p>Choose carefully</p>
          <h2>Pick 1 of 9 boxes</h2>
        </div>
        <span>{{ availableChances }} chance{{ availableChances === 1 ? "" : "s" }}</span>
      </div>

      <article v-if="isLoading" class="lucky-state">Loading lucky box...</article>
      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>

      <div v-else class="lucky-grid">
        <button
          v-for="box in boxes"
          :key="box"
          type="button"
          :disabled="!canOpen || isOpening"
          :class="{
            selected: selectedBox === box,
            opened: openedBox === box,
            locked: !canOpen && openedBox !== box
          }"
          @click="chooseBox(box)"
        >
          <span class="box-shine"></span>
          <span class="box-lid"></span>
          <span class="box-ribbon"></span>
          <span class="box-body"></span>
          <strong v-if="openedBox === box && lastPrize">{{ formatPrize(lastPrize.prizeAmount) }}</strong>
          <small v-else aria-hidden="true"></small>
        </button>
      </div>
    </section>

    <section v-if="lastPrize" class="lucky-result-card">
      <span>Latest prize</span>
      <strong>{{ formatPrize(lastPrize.prizeAmount) }}</strong>
      <p>Your prize has been credited to your Leqvo balance.</p>
    </section>

    <section class="lucky-prize-card">
      <div class="lucky-board-head">
        <div>
          <p>Prize pool</p>
          <h2>Possible Rewards</h2>
        </div>
      </div>
      <div class="lucky-prize-list">
        <span v-for="prize in prizes" :key="prize">{{ formatPrize(prize) }}</span>
      </div>
    </section>

    <section class="lucky-instruction-card">
      <div class="lucky-board-head">
        <div>
          <p>Eligibility rule</p>
          <h2>How Lucky Box Works</h2>
        </div>
      </div>
      <div class="lucky-instruction-list">
        <article v-for="(instruction, index) in instructions" :key="instruction">
          <span>{{ index + 1 }}</span>
          <p>{{ instruction }}</p>
        </article>
      </div>
    </section>
  </section>
</template>
