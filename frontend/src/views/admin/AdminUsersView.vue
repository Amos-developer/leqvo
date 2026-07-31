<script setup>
import { computed, ref } from "vue";
import { createAdminUser, deleteAdminUser, getAdminUserDetails, updateAdminUser } from "../../utils/api";

const props = defineProps({
  users: {
    type: Array,
    required: true
  },
  summary: {
    type: Object,
    required: true
  },
  money: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["refresh", "error", "loading"]);

const page = ref(1);
const usersPerPage = 8;
const showForm = ref(false);
const editingUserId = ref("");
const selectedUserDetails = ref(null);
const form = ref({
  username: "",
  email: "",
  password: "",
  referralCode: "",
  inviterCode: "",
  balance: 0,
  isAdmin: false,
  emailVerified: false
});

const totalPages = computed(() => Math.max(1, Math.ceil(props.users.length / usersPerPage)));
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * usersPerPage;

  return props.users.slice(start, start + usersPerPage);
});
const cards = computed(() => [
  { label: "Total Users", value: props.summary.total || 0, note: "Registered accounts", tone: "blue" },
  { label: "Active Users", value: props.summary.active || 0, note: "Users with credited deposits", tone: "green" },
  { label: "Inactive Users", value: props.summary.inactive || 0, note: "No credited deposit yet", tone: "muted" },
  { label: "Verified Users", value: props.summary.verified || 0, note: "Email verified accounts", tone: "amber" }
]);

const generateReferralCode = () => String(Math.floor(100000 + Math.random() * 900000));

const openAddUser = () => {
  editingUserId.value = "";
  showForm.value = true;
  selectedUserDetails.value = null;
  form.value = {
    username: "",
    email: "",
    password: "",
    referralCode: generateReferralCode(),
    inviterCode: "",
    balance: 0,
    isAdmin: false,
    emailVerified: false
  };
};

const editUser = (user) => {
  editingUserId.value = user.id;
  showForm.value = true;
  selectedUserDetails.value = null;
  form.value = {
    username: user.username,
    email: user.email,
    password: "",
    referralCode: user.referralCode,
    inviterCode: "",
    balance: Number(user.balance || 0),
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified
  };
};

const saveUser = async () => {
  emit("error", "");
  emit("loading", true);

  try {
    const payload = { ...form.value };

    if (editingUserId.value && !payload.password) {
      delete payload.password;
    }

    if (editingUserId.value) {
      delete payload.referralCode;
      await updateAdminUser(editingUserId.value, payload);
    } else {
      await createAdminUser(payload);
    }

    showForm.value = false;
    emit("refresh");
  } catch (error) {
    emit("error", error.message);
  } finally {
    emit("loading", false);
  }
};

const viewUser = async (user) => {
  emit("error", "");
  emit("loading", true);
  showForm.value = false;

  try {
    const result = await getAdminUserDetails(user.id);
    selectedUserDetails.value = result.data;
  } catch (error) {
    emit("error", error.message);
  } finally {
    emit("loading", false);
  }
};

const removeUser = async (user) => {
  if (!window.confirm(`Delete ${user.username}? This cannot be undone.`)) {
    return;
  }

  emit("error", "");
  emit("loading", true);

  try {
    await deleteAdminUser(user.id);
    emit("refresh");
  } catch (error) {
    emit("error", error.message);
  } finally {
    emit("loading", false);
  }
};
</script>

<template>
  <section class="admin-panel admin-table-panel">
    <div class="admin-panel-head">
      <div>
        <h2>Manage Users</h2>
        <p>Review, track, and remove user accounts</p>
      </div>
      <button type="button" @click="openAddUser">Add User</button>
    </div>

    <section class="admin-metrics admin-user-summary-grid" aria-label="User summary">
      <article v-for="card in cards" :key="card.label" class="admin-metric-card" :class="`is-${card.tone}`">
        <div>
          <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
          <span>{{ card.note }}</span>
        </div>
        <i aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7 11h10M7 15h7M8 7h8M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" /></svg>
        </i>
      </article>
    </section>

    <form v-if="showForm" class="admin-user-form" @submit.prevent="saveUser">
      <label>
        Username
        <input v-model.trim="form.username" type="text" placeholder="Enter username" required />
      </label>
      <label>
        Email
        <input v-model.trim="form.email" type="email" placeholder="Enter email" required />
      </label>
      <label>
        Password
        <input
          v-model="form.password"
          type="password"
          :required="!editingUserId"
          :placeholder="editingUserId ? 'Leave unchanged' : 'Create password'"
        />
      </label>
      <label>
        Referral code
        <input v-model.trim="form.referralCode" type="text" maxlength="6" :disabled="Boolean(editingUserId)" required />
      </label>
      <label>
        Inviter code
        <input v-model.trim="form.inviterCode" type="text" maxlength="6" placeholder="Enter referral code" :disabled="Boolean(editingUserId)" />
      </label>
      <label>
        Balance
        <input v-model.number="form.balance" type="number" min="0" step="0.01" />
      </label>
      <div class="admin-user-switches">
        <label>
          <input v-model="form.emailVerified" type="checkbox" />
          Verified
        </label>
        <label>
          <input v-model="form.isAdmin" type="checkbox" />
          Admin
        </label>
      </div>
      <div class="admin-user-form-actions">
        <button type="submit">{{ editingUserId ? "Update User" : "Create User" }}</button>
        <button type="button" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <section v-if="selectedUserDetails" class="admin-user-detail">
      <div class="admin-user-detail-head">
        <div>
          <p>User Profile</p>
          <h3>{{ selectedUserDetails.user.username }}</h3>
          <span>{{ selectedUserDetails.user.email }} · {{ selectedUserDetails.user.id }}</span>
        </div>
        <button type="button" @click="selectedUserDetails = null">Close</button>
      </div>

      <div class="admin-user-detail-cards">
        <article>
          <span>Total Balance</span>
          <strong>{{ money(selectedUserDetails.totals.balance) }}</strong>
        </article>
        <article>
          <span>Total Deposit</span>
          <strong>{{ money(selectedUserDetails.totals.deposits) }}</strong>
        </article>
        <article>
          <span>Total Withdrawal</span>
          <strong>{{ money(selectedUserDetails.totals.withdrawals) }}</strong>
        </article>
        <article>
          <span>Joined</span>
          <strong>{{ formatDate(selectedUserDetails.user.createdAt) }}</strong>
        </article>
      </div>

      <div class="admin-user-detail-grid">
        <article>
          <h4>Details</h4>
          <p>Referral: {{ selectedUserDetails.user.referralCode }}</p>
          <p>Referred by: {{ selectedUserDetails.user.referredBy || "Direct" }}</p>
          <p>Members: {{ selectedUserDetails.user.memberCount || 0 }}</p>
          <p>Status: {{ selectedUserDetails.user.isActive ? "Active" : "Inactive" }}</p>
          <p>Email: {{ selectedUserDetails.user.emailVerified ? "Verified" : "Unverified" }}</p>
          <p>Role: {{ selectedUserDetails.user.isAdmin ? "Admin" : "Member" }}</p>
        </article>
        <article>
          <h4>Balance Tracking</h4>
          <div v-for="activity in selectedUserDetails.activities" :key="activity.id" class="admin-user-activity">
            <span>{{ activity.type }}</span>
            <strong>{{ activity.title }}</strong>
            <p>{{ money(activity.amount) }} · {{ activity.status }} · {{ formatDate(activity.date) }}</p>
          </div>
          <p v-if="!selectedUserDetails.activities.length">No user activity yet.</p>
        </article>
      </div>
    </section>

    <div class="admin-table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>ID</th>
            <th>Balance</th>
            <th>Referred By</th>
            <th>Members</th>
            <th>Status</th>
            <th>Verified</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(user, index) in paginatedUsers" :key="user.id">
            <td>{{ (page - 1) * usersPerPage + index + 1 }}</td>
            <td>
              <strong>{{ user.username }}</strong>
              <span>{{ user.email }}</span>
            </td>
            <td>{{ user.id }}</td>
            <td>{{ money(user.balance) }}</td>
            <td>{{ user.referredBy || "Direct" }}</td>
            <td>{{ user.memberCount || 0 }}</td>
            <td>
              <span class="admin-status-pill" :class="{ inactive: !user.isActive }">
                {{ user.isActive ? "Active" : "Inactive" }}
              </span>
            </td>
            <td>{{ user.emailVerified ? "Verified" : "Unverified" }}</td>
            <td>{{ user.isAdmin ? "Admin" : "Member" }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <div class="admin-table-actions">
                <button type="button" @click="viewUser(user)">View</button>
                <button type="button" @click="editUser(user)">Edit</button>
                <button type="button" class="danger" @click="removeUser(user)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-pagination">
      <button type="button" :disabled="page === 1" @click="page -= 1">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button type="button" :disabled="page === totalPages" @click="page += 1">Next</button>
    </div>
  </section>
</template>
