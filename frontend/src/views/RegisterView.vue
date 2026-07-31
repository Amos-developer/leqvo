<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthLayout from "../components/AuthLayout.vue";
import { registerUser } from "../utils/api";

const router = useRouter();
const route = useRoute();
const isLoading = ref(false);
const isRequestingCode = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const codeMessage = ref("");

const form = reactive({
  username: "",
  email: "",
  emailCode: "",
  password: "",
  confirmPassword: "",
  inviterCode: String(route.query.ref || ""),
  agreed: false
});

const validators = {
  username: /^[A-Za-z]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
  sixDigits: /^\d{6}$/
};

const validateForm = () => {
  const username = form.username.trim();
  const email = form.email.trim();
  if (!validators.username.test(username)) {
    return "Username must be 3-20 English letters only.";
  }

  if (!validators.email.test(email)) {
    return "Enter a valid email address.";
  }

  if (form.emailCode && !validators.sixDigits.test(form.emailCode.trim())) {
    return "Email code must be 6 numbers when provided.";
  }

  if (!validators.password.test(form.password)) {
    return "Password must be at least 8 characters and include letters and numbers.";
  }

  if (form.password !== form.confirmPassword) {
    return "Passwords do not match.";
  }

  if (!validators.sixDigits.test(form.inviterCode.trim())) {
    return "Referral code is required and must be exactly 6 numbers.";
  }

  if (!form.agreed) {
    return "You must agree to the terms and privacy policy.";
  }

  return "";
};

const handleRequestCode = () => {
  errorMessage.value = "";
  codeMessage.value = "";

  if (!validators.email.test(form.email.trim())) {
    errorMessage.value = "Enter a valid email address before requesting a code.";
    return;
  }

  isRequestingCode.value = true;

  window.setTimeout(() => {
    isRequestingCode.value = false;
    codeMessage.value = "Email code request is ready. Verification will be enabled soon.";
  }, 650);
};

const handleRegister = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isLoading.value = true;

  try {
    const result = await registerUser({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      emailCode: form.emailCode.trim(),
      inviterCode: form.inviterCode.trim()
    });

    successMessage.value = `${result.data.username} registered successfully. Your ID is ${result.data.id}.`;
    setTimeout(() => {
      router.push("/login");
    }, 900);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthLayout
    title="Start trading smarter"
    subtitle="Open your Leqvo trading access with email verification and optional invite link."
  >
    <form class="auth-form register-form" @submit.prevent="handleRegister">
      <label>
        Username
        <input
          v-model.trim="form.username"
          type="text"
          minlength="3"
          maxlength="20"
          pattern="[A-Za-z]{3,20}"
          title="Use 3-20 English letters only."
          autocomplete="username"
          required
        />
      </label>
      <label>
        Email
        <input v-model.trim="form.email" type="email" autocomplete="email" required />
      </label>
      <div class="register-code-row">
        <label>
          Email code <span class="optional-label"></span>
          <input
            v-model.trim="form.emailCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            pattern="[0-9]{6}"
            autocomplete="one-time-code"
          />
        </label>
        <button type="button" :disabled="isRequestingCode" @click="handleRequestCode">
          {{ isRequestingCode ? "Sending..." : "Get Code" }}
        </button>
      </div>
      <p v-if="codeMessage" class="code-helper-message">{{ codeMessage }}</p>
      <label>
        Password
        <input
          v-model="form.password"
          type="password"
          minlength="8"
          autocomplete="new-password"
          required
        />
      </label>
      <label>
        Confirm password
        <input
          v-model="form.confirmPassword"
          type="password"
          minlength="8"
          autocomplete="new-password"
          required
        />
      </label>
      <label>
        Referral code
        <input
          v-model.trim="form.inviterCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          pattern="[0-9]{6}"
          autocomplete="off"
          required
          :readonly="Boolean(route.query.ref)"
        />
      </label>
      <div class="register-options">
        <label class="auth-check">
          <input v-model="form.agreed" type="checkbox" required />
          <span>I agree to the Terms and Privacy Policy</span>
        </label>
      </div>
      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="form-message success">{{ successMessage }}</p>
      <button type="submit" class="primary-button" :disabled="isLoading">
        {{ isLoading ? "Creating account..." : "Register" }}
      </button>
    </form>
    <p class="auth-footer">Already have an account? <RouterLink to="/login">Login</RouterLink></p>

    <template #visual>
      <aside class="register-visual" aria-hidden="true">
        <div class="register-orbit">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="register-signal-card">
          <small>Invite access</small>
          <strong>6-digit referral</strong>
          <div class="register-code-dots">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div class="register-profile-card">
          <div class="register-avatar"></div>
          <div>
            <small>New member</small>
            <strong>Verified setup</strong>
          </div>
        </div>
        <div class="register-chart">
          <i></i><i></i><i></i><i></i>
        </div>
      </aside>
    </template>
  </AuthLayout>
</template>
