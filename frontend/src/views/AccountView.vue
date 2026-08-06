<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getAccountTransfers, getMyWithdrawalAddress, getUserById } from "../utils/api";

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem("leqvoUser") || "{}"));
const copiedId = ref(false);
const eligibility = ref({
  hasTradingEntry: false,
  canMoveTradingToMain: false,
  completedTradingDays: 0,
  remainingTradingDays: 10,
  requiredTradingDays: 10
});
const withdrawalAddress = ref(null);
const now = ref(Date.now());
let countdownTimer = null;

const initials = computed(() => {
  return (user.value.username || "Member")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const balance = computed(() => {
  return Number(user.value.balance || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});

const tradingBalance = computed(() => {
  return Number(user.value.tradingBalance || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});

const hasTradingCountdown = computed(() => {
  return false;
});

const trialBonusActive = computed(() => {
  return Boolean(
    Number(user.value.trialBonusAmount || 0) > 0 &&
      !user.value.trialBonusExpired &&
      user.value.trialBonusExpiresAt &&
      new Date(user.value.trialBonusExpiresAt).getTime() > now.value
  );
});

const trialBonusCountdown = computed(() => {
  const expiresAt = user.value.trialBonusExpiresAt ? new Date(user.value.trialBonusExpiresAt).getTime() : 0;
  const remaining = Math.max(expiresAt - now.value, 0);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
});

const trialBonusAmount = computed(() => {
  return Number(user.value.trialBonusAmount || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});

const refreshUser = async () => {
  if (!user.value.id) {
    return;
  }

  try {
    const result = await getUserById(user.value.id);
    user.value = result.data;
    localStorage.setItem("leqvoUser", JSON.stringify(result.data));

    const transferResult = await getAccountTransfers();
    eligibility.value = transferResult.data?.eligibility || eligibility.value;

    const addressResult = await getMyWithdrawalAddress();
    withdrawalAddress.value = addressResult.data;
  } catch (error) {
    console.warn("Could not refresh account details", error);
  }
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

const copyUserId = async () => {
  if (!user.value.id) {
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(user.value.id);
  } else {
    const input = document.createElement("input");
    input.value = user.value.id;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  copiedId.value = true;

  setTimeout(() => {
    copiedId.value = false;
  }, 1400);
};

onMounted(() => {
  refreshUser();
  countdownTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<template>
  <section class="phone-shell page-enter app-page account-page premium-account">
    <header class="account-topbar">
      <div>
        <p>Leqvo profile</p>
        <h1>Account</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="premium-profile-card">
      <div class="profile-glow"></div>
      <div class="premium-profile-head">
        <div class="premium-avatar">{{ initials }}</div>
        <div class="premium-identity">
          <div>
            <h2>{{ user.username || "Member" }}</h2>
            <span class="verified-badge premium">Verified</span>
          </div>
          <p>{{ user.email || "No email available" }}</p>
        </div>
      </div>

      <div class="profile-meta-grid">
        <div>
          <span>Leqvo ID</span>
          <strong class="copy-id-row">
            {{ user.id || "Unavailable" }}
            <button v-if="user.id" class="copy-id-button" type="button" @click="copyUserId">
              <span class="copy-icon"></span>
            </button>
          </strong>
          <small v-if="copiedId" class="copy-feedback">Copied</small>
        </div>
        <div>
          <span>Status</span>
          <strong>Active</strong>
        </div>
      </div>
    </section>

    <section class="portfolio-card">
      <div>
        <span>Main balance</span>
        <strong>{{ balance }}</strong>
        <p>Trading balance: {{ tradingBalance }}</p>
      </div>
      <div v-if="trialBonusActive" class="trading-countdown">
        <div class="trial-bonus-countdown-row">
          <span><strong>{{ trialBonusCountdown.days }}</strong><small>Days</small></span>
          <span><strong>{{ trialBonusCountdown.hours }}</strong><small>Hours</small></span>
          <span><strong>{{ trialBonusCountdown.minutes }}</strong><small>Minutes</small></span>
          <span><strong>{{ trialBonusCountdown.seconds }}</strong><small>Seconds</small></span>
        </div>
      </div>
      <div v-else class="trading-countdown ready">
        <div class="trial-bonus-countdown-row">
          <span><strong>0</strong><small>Days</small></span>
          <span><strong>0</strong><small>Hours</small></span>
          <span><strong>0</strong><small>Minutes</small></span>
          <span><strong>0</strong><small>Seconds</small></span>
        </div>
      </div>
    </section>

    <section class="premium-settings personal-section">
      <h2>Personal Details</h2>
      <div class="premium-list">
        <button @click="router.push('/account/profile')">
          <span class="settings-icon icon-profile"></span>
          <div>
            <strong>Profile information</strong>
            <p>Update username and review protected account details</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/account/change-password')">
          <span class="settings-icon icon-shield"></span>
          <div>
            <strong>Change password</strong>
            <p>Protect your account with a new password</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/account/kyc')">
          <span class="settings-icon icon-shield"></span>
          <div>
            <strong>Verification</strong>
            <p>Identity status and account trust level</p>
          </div>
          <i></i>
        </button>
      </div>
    </section>

    <section class="premium-settings finance-section">
      <h2>Finance</h2>
      <div class="premium-list">
        <button @click="router.push('/deposit/history')">
          <span class="settings-icon icon-deposits"></span>
          <div>
            <strong>Deposit history</strong>
            <p>View completed and pending account funding</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/withdrawal/history')">
          <span class="settings-icon icon-withdrawals"></span>
          <div>
            <strong>Withdrawal history</strong>
            <p>Track payout requests and withdrawal records</p>
          </div>
          <i></i>
        </button>
        <button v-if="!user.hasWithdrawalPin" @click="router.push('/withdrawal/pin/set')">
          <span class="settings-icon icon-pin"></span>
          <div>
            <strong>Set withdrawal PIN</strong>
            <p>Create a secure PIN if this is your first setup</p>
          </div>
          <i></i>
        </button>
        <button v-else @click="router.push('/withdrawal/pin/change')">
          <span class="settings-icon icon-pin"></span>
          <div>
            <strong>Change withdrawal PIN</strong>
            <p>Update your existing payout security PIN</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/withdrawal/address')">
          <span class="settings-icon icon-address"></span>
          <div>
            <strong>{{ withdrawalAddress ? "Change withdrawal address" : "Set withdrawal address" }}</strong>
            <p>{{ withdrawalAddress ? "Update your approved or pending payout wallet" : "Add your payout wallet for admin approval" }}</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/rewards')">
          <span class="settings-icon icon-rewards"></span>
          <div>
            <strong>Rewards</strong>
            <p>View lucky box, daily spin, and leadership reward records</p>
          </div>
          <i></i>
        </button>
      </div>
    </section>

    <section class="premium-settings preferences-section">
      <h2>Preferences</h2>
      <div class="premium-list">
        <button>
          <span class="settings-icon icon-preferences"></span>
          <div>
            <strong>Notifications</strong>
            <p>Manage alerts for trades, deposits, and withdrawals</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-preferences"></span>
          <div>
            <strong>Language</strong>
            <p>Choose your preferred app language</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-preferences"></span>
          <div>
            <strong>Time and region</strong>
            <p>Set timezone, date format, and regional display</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/invite')">
          <span class="settings-icon icon-preferences"></span>
          <div>
            <strong>Invite</strong>
            <p>Share your referral link and grow your team securely from one place</p>
          </div>
          <i></i>
        </button>
        <button @click="router.push('/support')">
          <span class="settings-icon icon-preferences"></span>
          <div>
            <strong>Help / Online support</strong>
            <p>Chat live with a Leqvo support agent</p>
          </div>
          <i></i>
        </button>
      </div>
    </section>

    <button class="logout-action premium account-logout-section" @click="handleLogout">Logout</button>
  </section>
</template>
