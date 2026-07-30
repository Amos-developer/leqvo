<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const copiedId = ref(false);

const initials = computed(() => {
  return (user.username || "Member")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const balance = computed(() => {
  return Number(user.balance || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

const copyUserId = async () => {
  if (!user.id) {
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(user.id);
  } else {
    const input = document.createElement("input");
    input.value = user.id;
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
</script>

<template>
  <section class="phone-shell page-enter app-page account-page premium-account">
    <header class="account-topbar">
      <div>
        <p>Leqvo profile</p>
        <h1>Account</h1>
      </div>
      <button aria-label="Account settings"><span class="icon-preferences"></span></button>
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
        <span>Available balance</span>
        <strong>{{ balance }}</strong>
      </div>
      <div class="portfolio-ring">
        <span>98%</span>
      </div>
    </section>

    <section class="premium-settings">
      <h2>Finance</h2>
      <div class="premium-list">
        <button>
          <span class="settings-icon icon-deposits"></span>
          <div>
            <strong>Deposit history</strong>
            <p>View completed and pending account funding</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-withdrawals"></span>
          <div>
            <strong>Withdrawal history</strong>
            <p>Track payout requests and withdrawal records</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-pin"></span>
          <div>
            <strong>Set withdrawal PIN</strong>
            <p>Create a secure PIN if this is your first setup</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-pin"></span>
          <div>
            <strong>Change withdrawal PIN</strong>
            <p>Update your existing payout security PIN</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-address"></span>
          <div>
            <strong>Set withdrawal address</strong>
            <p>Add or change your payout wallet address</p>
          </div>
          <i></i>
        </button>
      </div>
    </section>

    <section class="premium-settings">
      <h2>Personal Details</h2>
      <div class="premium-list">
        <button>
          <span class="settings-icon icon-profile"></span>
          <div>
            <strong>Profile information</strong>
            <p>Update avatar, username, email, and account data</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-shield"></span>
          <div>
            <strong>Change password</strong>
            <p>Protect your account with a new password</p>
          </div>
          <i></i>
        </button>
        <button>
          <span class="settings-icon icon-shield"></span>
          <div>
            <strong>Verification</strong>
            <p>Identity status and account trust level</p>
          </div>
          <i></i>
        </button>
      </div>
    </section>

    <section class="premium-settings">
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
      </div>
    </section>

    <button class="logout-action premium" @click="handleLogout">Logout</button>
  </section>
</template>
