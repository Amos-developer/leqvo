<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { showUserPopup } from "../composables/useUserPopup";
import { changeMyPassword, requestPasswordChangeCode } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const form = ref({
  code: "",
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const codeRequested = ref(false);
const isRequestingCode = ref(false);
const isSaving = ref(false);

const maskedEmail = computed(() => {
  const email = user.email || "";
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "your email";
  }

  return `${name.slice(0, 2)}***@${domain}`;
});

const passwordStrength = computed(() => {
  const password = form.value.newPassword;
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
});

const requestCode = async () => {
  isRequestingCode.value = true;

  try {
    const result = await requestPasswordChangeCode();
    codeRequested.value = true;
    showUserPopup({
      tone: "success",
      title: "Code sent",
      message: result.data?.code
        ? `Testing code: ${result.data.code}`
        : `Code requested for ${maskedEmail.value}.`
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Code request failed",
      message: error.message || "Could not request email code."
    });
  } finally {
    isRequestingCode.value = false;
  }
};

const validateForm = () => {
  if (!codeRequested.value) {
    return "Request an email code first.";
  }

  if (!/^\d{6}$/.test(form.value.code.trim())) {
    return "Email code must be exactly 6 numbers.";
  }

  if (!form.value.oldPassword || !form.value.newPassword || !form.value.confirmPassword) {
    return "Fill all password fields.";
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.value.newPassword)) {
    return "New password must be at least 8 characters and include a letter and number.";
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    return "New password and confirmation do not match.";
  }

  if (form.value.oldPassword === form.value.newPassword) {
    return "New password must be different from old password.";
  }

  return "";
};

const submitPasswordChange = async () => {
  const validationError = validateForm();

  if (validationError) {
    showUserPopup({
      tone: "error",
      title: "Check your details",
      message: validationError
    });
    return;
  }

  isSaving.value = true;

  try {
    await changeMyPassword({
      code: form.value.code.trim(),
      oldPassword: form.value.oldPassword,
      newPassword: form.value.newPassword,
      confirmPassword: form.value.confirmPassword
    });

    form.value = {
      code: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: ""
    };
    codeRequested.value = false;
    showUserPopup({
      tone: "success",
      title: "Password updated",
      message: "Password changed successfully."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Update failed",
      message: error.message || "Could not change password."
    });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="change-password-page phone-shell page-enter app-page">
    <header class="change-password-header">
      <div>
        <p>Account security</p>
        <h1>Change Password</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="change-password-hero">
      <div>
        <span>Protected by email</span>
        <strong>{{ maskedEmail }}</strong>
        <p>Request a verification code before changing your password.</p>
      </div>
      <button type="button" :disabled="isRequestingCode" @click="requestCode">
        {{ isRequestingCode ? "Sending..." : codeRequested ? "Resend Code" : "Get Code" }}
      </button>
    </section>

    <section class="change-password-card">
      <label class="change-password-field">
        <span>Email code</span>
        <input v-model.trim="form.code" type="text" maxlength="6" inputmode="numeric" placeholder="Enter email code" />
      </label>

      <label class="change-password-field">
        <span>Old password</span>
        <input v-model="form.oldPassword" type="password" placeholder="Enter old password" autocomplete="current-password" />
      </label>

      <label class="change-password-field">
        <span>New password</span>
        <input v-model="form.newPassword" type="password" placeholder="Enter new password" autocomplete="new-password" />
      </label>

      <div class="password-strength" :data-score="passwordStrength">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <label class="change-password-field">
        <span>Confirm new password</span>
        <input v-model="form.confirmPassword" type="password" placeholder="Confirm new password" autocomplete="new-password" />
      </label>

      <button class="change-password-submit" type="button" :disabled="isSaving" @click="submitPasswordChange">
        {{ isSaving ? "Updating..." : "Update Password" }}
      </button>
    </section>

    <section class="password-security-guide">
      <div class="password-guide-heading">
        <span>Security guide</span>
        <h2>Protect your login</h2>
      </div>
      <div class="password-guide-list">
        <article>
          <strong>Use a fresh password</strong>
          <p>Do not reuse passwords from email, wallets, exchanges, or other trading platforms.</p>
        </article>
        <article>
          <strong>Keep codes private</strong>
          <p>Never share your email code, password, or account ID with anyone. Leqvo admin will never ask for them.</p>
        </article>
        <article>
          <strong>Sign out on shared devices</strong>
          <p>After changing your password, logout from any phone or computer you do not personally control.</p>
        </article>
      </div>
    </section>
  </section>
</template>
