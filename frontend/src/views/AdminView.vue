<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getAdminDeposits,
  getAdminLeaders,
  getAdminKyc,
  getAdminOverview,
  getAdminUsers,
  getAdminWithdrawals,
  grantAdminLeadershipReward,
  deleteAdminKyc,
  updateAdminKycStatus
} from "../utils/api";
import AdminUsersView from "./admin/AdminUsersView.vue";

const router = useRouter();
const route = useRoute();
const admin = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isLoading = ref(true);
const errorMessage = ref("");
const overview = ref(null);
const users = ref([]);
const userSummary = ref({ total: 0, active: 0, inactive: 0, verified: 0 });
const deposits = ref([]);
const withdrawals = ref([]);
const leaders = ref([]);
const leaderRewards = ref([]);
const leaderSummary = ref({ total: 0, qualified: 0, totalGranted: 0, topRank: "No rank" });
const rewardLoadingId = ref("");
const kycSubmissions = ref([]);
const kycReviewId = ref("");
const previewDocument = ref(null);
const rejectingKyc = ref(null);
const rejectionNote = ref("");
const deletingKycId = ref("");

const menuItems = [
  "Overview",
  "Users",
  "Deposits",
  "Withdrawals",
  "KYC",
  "Copy Signals",
  "Telegram Signals",
  "Balance Tracking",
  "Refund Audit",
  "Leaders"
];

const tabToSlug = (tab) => tab.toLowerCase().replace(/\s+/g, "-");
const slugToTab = (slug) => {
  return menuItems.find((item) => tabToSlug(item) === slug) || "Overview";
};
const activeTab = ref(slugToTab(route.params.section));

const switchTab = (tab) => {
  activeTab.value = tab;
  router.push(tab === "Overview" ? "/admin" : `/admin/${tabToSlug(tab)}`);
};

const adminName = computed(() => admin.username || "Administrator");

const money = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatDate = (date) => {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(date));
};

const nowLabel = computed(() => formatDate(new Date()));

const stats = computed(() => {
  const data = overview.value;

  return [
    {
      label: "Users",
      value: data?.users?.total || 0,
      note: `${data?.users?.today || 0} joined today`,
      tone: "pink"
    },
    {
      label: "Deposits",
      value: `${money(data?.deposits?.credited_total)} USDT`,
      note: `${data?.deposits?.pending || 0} awaiting confirmation`,
      tone: "blue"
    },
    {
      label: "Withdrawals",
      value: `${money(data?.withdrawals?.approved_total)} USDT`,
      note: `${data?.withdrawals?.pending || 0} pending review`,
      tone: "green"
    },
    {
      label: "KYC Queue",
      value: kycSubmissions.value.filter((item) => item.status === "pending").length,
      note: `${kycSubmissions.value.length} submissions`,
      tone: "amber"
    }
  ];
});

const volumeBars = computed(() => overview.value?.depositVolume || []);
const recentUsers = computed(() => overview.value?.recentUsers || []);

const reviewItems = computed(() => [
  { title: "Deposit confirmations", status: `${overview.value?.deposits?.pending || 0} open`, accent: "blue" },
  { title: "Withdrawal approvals", status: `${overview.value?.withdrawals?.pending || 0} urgent`, accent: "pink" },
  { title: "Registered users", status: `${overview.value?.users?.total || 0} accounts`, accent: "amber" }
]);

const leaderCards = computed(() => [
  { label: "Tracked Leaders", value: leaderSummary.value.total || 0, note: "Leadership records" },
  { label: "Qualified", value: leaderSummary.value.qualified || 0, note: "Unlocked ranks" },
  { label: "Rewards Granted", value: `${money(leaderSummary.value.totalGranted)} USDT`, note: "Total paid" },
  { label: "Top Rank", value: leaderSummary.value.topRank || "No rank", note: "Highest current tier" }
]);

const loadAdminData = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const [overviewResult, usersResult, depositsResult, withdrawalsResult, leadersResult, kycResult] = await Promise.all([
      getAdminOverview(),
      getAdminUsers(),
      getAdminDeposits(),
      getAdminWithdrawals(),
      getAdminLeaders(),
      getAdminKyc()
    ]);

    overview.value = overviewResult.data;
    users.value = usersResult.data.users;
    userSummary.value = usersResult.data.summary;
    deposits.value = depositsResult.data;
    withdrawals.value = withdrawalsResult.data;
    leaders.value = leadersResult.data.leaders;
    leaderRewards.value = leadersResult.data.rewards;
    leaderSummary.value = leadersResult.data.summary;
    kycSubmissions.value = kycResult.data;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const reviewKyc = async (submission, status) => {
  kycReviewId.value = `${submission.id}-${status}`;
  errorMessage.value = "";

  try {
    await updateAdminKycStatus(submission.id, {
      status,
      note: status === "approved" ? "Approved by admin" : "Rejected by admin"
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    kycReviewId.value = "";
  }
};

const startRejectKyc = (submission) => {
  rejectingKyc.value = submission;
  rejectionNote.value = "";
  errorMessage.value = "";
};

const submitKycRejection = async () => {
  if (!rejectionNote.value.trim()) {
    errorMessage.value = "Enter a rejection reason before rejecting KYC.";
    return;
  }

  kycReviewId.value = `${rejectingKyc.value.id}-rejected`;
  errorMessage.value = "";

  try {
    await updateAdminKycStatus(rejectingKyc.value.id, {
      status: "rejected",
      note: rejectionNote.value.trim()
    });
    rejectingKyc.value = null;
    rejectionNote.value = "";
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    kycReviewId.value = "";
  }
};

const deleteKyc = async (submission) => {
  if (!window.confirm(`Delete KYC submission for ${submission.username}?`)) {
    return;
  }

  deletingKycId.value = submission.id;
  errorMessage.value = "";

  try {
    await deleteAdminKyc(submission.id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    deletingKycId.value = "";
  }
};

const openKycPreview = (submission, label, image) => {
  previewDocument.value = {
    label,
    image,
    username: submission.username,
    userId: submission.userId
  };
};

const grantLeaderReward = async (leader, rewardType, amount) => {
  rewardLoadingId.value = `${leader.userId}-${rewardType}`;
  errorMessage.value = "";

  try {
    await grantAdminLeadershipReward(leader.userId, {
      rewardType,
      amount,
      note: `${rewardType.replace("_", " ")} granted from admin Leaders panel`
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    rewardLoadingId.value = "";
  }
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

watch(
  () => route.params.section,
  (section) => {
    activeTab.value = slugToTab(section);
  }
);

onMounted(loadAdminData);
</script>

<template>
  <main class="admin-shell page-enter">
    <aside class="admin-sidebar">
      <div class="admin-brand-row">
        <div class="admin-brand-mark">LQ</div>
        <div>
          <strong>Leqvo</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav class="admin-nav" aria-label="Admin management">
        <p>Management</p>
        <button
          v-for="item in menuItems"
          :key="item"
          type="button"
          :class="{ active: item === activeTab }"
          @click="switchTab(item)"
        >
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />
            </svg>
          </span>
          {{ item }}
        </button>
      </nav>

      <div class="admin-sidebar-actions">
        <button type="button" @click="router.push('/')">
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </span>
          Back To App
        </button>
        <button class="danger" type="button" @click="handleLogout">
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5M20 12H9M10 5H5v14h5" /></svg>
          </span>
          Logout
        </button>
      </div>
    </aside>

    <section class="admin-workspace">
      <header class="admin-topbar">
        <div>
          <p>Workspace</p>
          <h1>{{ activeTab }}</h1>
        </div>

        <div class="admin-top-actions">
          <button class="admin-refresh" type="button" @click="loadAdminData">Refresh</button>
          <div class="admin-clock">
            <span aria-hidden="true"></span>
            <div>
              <strong>Live</strong>
              <small>{{ nowLabel }} · UTC</small>
            </div>
          </div>
          <button class="admin-user-chip" type="button" @click="handleLogout">
            <span>{{ adminName.charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ adminName }}</strong>
            </div>
          </button>
        </div>
      </header>

      <nav class="admin-mobile-nav" aria-label="Admin shortcuts">
        <button
          v-for="item in menuItems"
          :key="item"
          type="button"
          :class="{ active: item === activeTab }"
          @click="switchTab(item)"
        >
          {{ item }}
        </button>
      </nav>

      <p v-if="errorMessage" class="form-message error admin-error">{{ errorMessage }}</p>

      <section v-if="activeTab === 'Overview'" class="admin-view-stack">
        <section class="admin-foundation">
          <div>
            <p>Live Control</p>
            <h2>Keep Leqvo operations moving with one clear command center.</h2>
            <span>Review user activity, payment queues, deposits, withdrawals, and verification flow from PostgreSQL-backed data.</span>
          </div>
          <div class="admin-hero-actions">
            <button type="button" @click="switchTab('Users')">Review Users</button>
            <button type="button" @click="switchTab('Withdrawals')">Open Queue</button>
          </div>
        </section>

        <section class="admin-metrics" aria-label="Admin metrics">
          <article v-for="stat in stats" :key="stat.label" class="admin-metric-card" :class="`is-${stat.tone}`">
            <div>
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.note }}</span>
            </div>
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 11h10M7 15h7M8 7h8M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" /></svg>
            </i>
          </article>
        </section>

        <section class="admin-grid">
          <article class="admin-panel admin-volume-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Deposit Volume</h2>
                <p>Credited deposits during the last seven days</p>
              </div>
              <button type="button" @click="switchTab('Deposits')">View All</button>
            </div>

            <div class="admin-chart-bars">
              <div v-for="bar in volumeBars" :key="bar.day" class="admin-chart-column">
                <span>{{ bar.value }}</span>
                <i :style="{ height: `${bar.height}%` }"></i>
                <strong>{{ bar.day }}</strong>
              </div>
            </div>
          </article>

          <article class="admin-panel admin-users-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Recently Joined</h2>
                <p>Latest user accounts created on Leqvo</p>
              </div>
            </div>

            <div class="admin-user-list">
              <div v-for="user in recentUsers" :key="user.id" class="admin-user-row">
                <div class="admin-user-mini">{{ user.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ user.username }}</strong>
                  <span>{{ user.email }}</span>
                </div>
                <b>{{ formatDate(user.createdAt) }}</b>
              </div>
            </div>
          </article>
        </section>

        <section class="admin-review-strip" aria-label="Review queue">
          <article v-for="item in reviewItems" :key="item.title" :class="`is-${item.accent}`">
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.status }}</span>
            </div>
            <button type="button">Review</button>
          </article>
        </section>
      </section>

      <AdminUsersView
        v-else-if="activeTab === 'Users'"
        :users="users"
        :summary="userSummary"
        :money="money"
        :format-date="formatDate"
        @refresh="loadAdminData"
        @error="errorMessage = $event"
        @loading="isLoading = $event"
      />

      <section v-else-if="activeTab === 'Deposits'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Deposits</h2>
            <p>Deposit payments stored in PostgreSQL</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(deposit, index) in deposits" :key="deposit.id">
                <td>{{ index + 1 }}</td>
                <td>{{ deposit.username }}</td>
                <td>{{ money(deposit.priceAmount) }}</td>
                <td>{{ money(deposit.actuallyPaid) }}</td>
                <td>{{ deposit.payCurrency }} / {{ deposit.payNetwork }}</td>
                <td>{{ deposit.status }}</td>
                <td>{{ formatDate(deposit.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'Withdrawals'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Withdrawals</h2>
            <p>Withdrawal requests stored in PostgreSQL</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Asset</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(withdrawal, index) in withdrawals" :key="withdrawal.id">
                <td>{{ index + 1 }}</td>
                <td>{{ withdrawal.username }}</td>
                <td>{{ money(withdrawal.amount) }}</td>
                <td>{{ money(withdrawal.feeAmount) }}</td>
                <td>{{ withdrawal.asset }} / {{ withdrawal.network }}</td>
                <td>{{ withdrawal.status }}</td>
                <td>{{ formatDate(withdrawal.requestedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'KYC'" class="admin-view-stack">
        <section class="admin-panel kyc-admin-panel">
          <div class="admin-panel-head">
            <div>
              <h2>KYC Review</h2>
              <p>Approve or reject identity documents submitted by users</p>
            </div>
          </div>

          <article v-if="!kycSubmissions.length" class="admin-empty-state">
            <h2>No KYC submissions</h2>
            <p>New verification requests will appear here.</p>
          </article>

          <div v-else class="kyc-admin-list">
            <article v-for="submission in kycSubmissions" :key="submission.id" class="kyc-admin-card">
              <div class="kyc-admin-head">
                <div class="admin-user-mini">{{ submission.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ submission.username }}</strong>
                  <span>{{ submission.email }} · {{ submission.userId }}</span>
                </div>
                <b :class="submission.status">{{ submission.status }}</b>
              </div>

              <div class="kyc-admin-docs">
                <button type="button" @click="openKycPreview(submission, 'ID Front', submission.idFront)">
                  <span>ID Front</span>
                  <small>Preview document</small>
                </button>
                <button type="button" @click="openKycPreview(submission, 'ID Back', submission.idBack)">
                  <span>ID Back</span>
                  <small>Preview document</small>
                </button>
                <button type="button" @click="openKycPreview(submission, 'Selfie', submission.selfie)">
                  <span>Selfie</span>
                  <small>Preview image</small>
                </button>
              </div>

              <div class="kyc-admin-meta">
                <span>Submitted {{ formatDate(submission.submittedAt) }}</span>
                <span v-if="submission.reviewedAt">Reviewed {{ formatDate(submission.reviewedAt) }}</span>
              </div>

              <div class="kyc-admin-actions">
                <button
                  type="button"
                  :disabled="submission.status === 'approved' || kycReviewId === `${submission.id}-approved`"
                  @click="reviewKyc(submission, 'approved')"
                >
                  Approve
                </button>
                <button
                  type="button"
                  :disabled="submission.status === 'rejected' || kycReviewId === `${submission.id}-rejected`"
                  @click="startRejectKyc(submission)"
                >
                  Reject
                </button>
                <button
                  type="button"
                  :disabled="deletingKycId === submission.id"
                  @click="deleteKyc(submission)"
                >
                  {{ deletingKycId === submission.id ? "Deleting..." : "Delete" }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'Leaders'" class="admin-view-stack leaders-admin-view">
        <section class="admin-metrics leader-admin-metrics">
          <article v-for="card in leaderCards" :key="card.label" class="admin-metric-card is-green">
            <div>
              <p>{{ card.label }}</p>
              <strong>{{ card.value }}</strong>
              <span>{{ card.note }}</span>
            </div>
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 6H3v2a3 3 0 0 0 3 3h1M19 6h2v2a3 3 0 0 1-3 3h-1" /></svg>
            </i>
          </article>
        </section>

        <section class="admin-panel leaders-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Leader Performance</h2>
              <p>Rank progress, deposits, qualification status, and reward controls</p>
            </div>
          </div>

          <div class="leader-admin-list">
            <article v-for="leader in leaders" :key="leader.userId" class="leader-admin-card">
              <div class="leader-admin-head">
                <div class="admin-user-mini">{{ leader.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ leader.username }}</strong>
                  <span>{{ leader.userId }} · {{ leader.email }}</span>
                </div>
                <b :class="{ qualified: leader.isQualified }">{{ leader.rankName }}</b>
              </div>

              <div class="leader-admin-grid">
                <div>
                  <span>Active L1</span>
                  <strong>{{ leader.activeLevelOneMembers }}</strong>
                </div>
                <div>
                  <span>L1 Deposit</span>
                  <strong>{{ money(leader.levelOneDeposit) }}</strong>
                </div>
                <div>
                  <span>L2 + L3 Deposit</span>
                  <strong>{{ money(leader.levelTwoThreeDeposit) }}</strong>
                </div>
                <div>
                  <span>Granted</span>
                  <strong>{{ money(leader.totalGranted) }}</strong>
                </div>
              </div>

              <div class="leader-admin-progress">
                <span>Next: {{ leader.nextRankName || "Maximum rank" }}</span>
                <small>{{ leader.membersNeeded }} members · {{ money(leader.levelOneDepositNeeded) }} L1 deposit needed</small>
              </div>

              <div class="leader-admin-actions">
                <button
                  type="button"
                  :disabled="!leader.isQualified || rewardLoadingId === `${leader.userId}-one_time`"
                  @click="grantLeaderReward(leader, 'one_time', Number(leader.oneTimeReward || 0))"
                >
                  Grant One-time {{ money(leader.oneTimeReward) }}
                </button>
                <button
                  type="button"
                  :disabled="!leader.isQualified || rewardLoadingId === `${leader.userId}-weekly`"
                  @click="grantLeaderReward(leader, 'weekly', Number(leader.weeklySalary || 0))"
                >
                  Grant Weekly {{ money(leader.weeklySalary) }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="admin-panel admin-table-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Reward Audit</h2>
              <p>Recently granted leadership rewards</p>
            </div>
          </div>
          <div class="admin-table-scroll">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Granted By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(reward, index) in leaderRewards" :key="reward.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ reward.username }}</td>
                  <td>{{ reward.rewardType }}</td>
                  <td>{{ money(reward.amount) }}</td>
                  <td>{{ reward.grantedBy || "System" }}</td>
                  <td>{{ formatDate(reward.grantedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section v-else class="admin-panel admin-empty-state">
        <h2>{{ activeTab }}</h2>
        <p>This management section is ready for its next workflow.</p>
      </section>

      <div v-if="isLoading" class="admin-loading">Loading admin data...</div>

      <div v-if="previewDocument" class="kyc-preview-modal" role="dialog" aria-modal="true">
        <div class="kyc-preview-card">
          <div class="kyc-preview-head">
            <div>
              <span>{{ previewDocument.username }} · {{ previewDocument.userId }}</span>
              <strong>{{ previewDocument.label }}</strong>
            </div>
            <button type="button" aria-label="Close preview" @click="previewDocument = null">×</button>
          </div>
          <img :src="previewDocument.image" :alt="previewDocument.label" />
        </div>
      </div>

      <div v-if="rejectingKyc" class="kyc-preview-modal" role="dialog" aria-modal="true">
        <div class="kyc-reject-card">
          <div class="kyc-preview-head">
            <div>
              <span>{{ rejectingKyc.username }} · {{ rejectingKyc.userId }}</span>
              <strong>Reject KYC</strong>
            </div>
            <button type="button" aria-label="Close rejection form" @click="rejectingKyc = null">×</button>
          </div>
          <label>
            <span>Reason for rejection</span>
            <textarea v-model.trim="rejectionNote" rows="5" placeholder="Explain what the user must fix"></textarea>
          </label>
          <div class="kyc-reject-actions">
            <button type="button" @click="rejectingKyc = null">Cancel</button>
            <button
              type="button"
              :disabled="kycReviewId === `${rejectingKyc.id}-rejected`"
              @click="submitKycRejection"
            >
              {{ kycReviewId === `${rejectingKyc.id}-rejected` ? "Rejecting..." : "Reject KYC" }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
