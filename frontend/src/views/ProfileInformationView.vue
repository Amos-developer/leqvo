<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { updateMyProfile } from "../utils/api";

const router = useRouter();
const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const form = ref({
  username: storedUser.username || ""
});
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const initials = computed(() => {
  return (form.value.username || storedUser.username || "Member")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const validateForm = () => {
  const username = form.value.username.trim();

  if (!/^[A-Za-z]{3,20}$/.test(username)) {
    return "Username must be 3-20 English letters only.";
  }

  return "";
};

const saveProfile = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const validationError = validateForm();

  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isSaving.value = true;

  try {
    const result = await updateMyProfile({
      username: form.value.username.trim()
    });

    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
    successMessage.value = "Profile information updated.";
  } catch (error) {
    errorMessage.value = error.message || "Could not update profile.";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="profile-info-page phone-shell page-enter app-page">
    <header class="profile-info-header">
      <div>
        <p>Personal details</p>
        <h1>Profile Information</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="profile-info-hero">
      <div class="profile-info-avatar">{{ initials }}</div>
      <div>
        <span>Leqvo ID</span>
        <strong>{{ storedUser.id || "Unavailable" }}</strong>
        <p>Your email is protected and cannot be changed from this page.</p>
      </div>
    </section>

    <section class="profile-info-card">
      <label class="profile-info-field">
        <span>Username</span>
        <input v-model.trim="form.username" type="text" placeholder="Enter username" autocomplete="username" />
      </label>

      <label class="profile-info-field readonly">
        <span>Email address</span>
        <input :value="storedUser.email || 'No email available'" type="email" readonly />
      </label>

      <div class="profile-info-note">
        <strong>Email locked</strong>
        <p>Contact support if you need to recover or change the email linked to your account.</p>
      </div>

      <button class="profile-info-submit" type="button" :disabled="isSaving" @click="saveProfile">
        {{ isSaving ? "Saving..." : "Save Changes" }}
      </button>

      <p v-if="errorMessage" class="profile-info-message error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="profile-info-message success">{{ successMessage }}</p>
    </section>

    <section class="profile-security-guide">
      <div class="profile-guide-heading">
        <span>Security guide</span>
        <h2>Keep your identity safe</h2>
      </div>
      <div class="profile-guide-list">
        <article>
          <strong>Use your real account name</strong>
          <p>Choose a username you can recognize easily when checking account activity and support records.</p>
        </article>
        <article>
          <strong>Email is protected</strong>
          <p>Your login email is locked to reduce account takeover risk. Support review is required for email recovery.</p>
        </article>
        <article>
          <strong>Review changes after saving</strong>
          <p>After updating your details, check your Account page and make sure the information looks correct.</p>
        </article>
      </div>
    </section>
  </section>
</template>
