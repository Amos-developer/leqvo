<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AuthLayout from "../components/AuthLayout.vue";
import { registerUser } from "../utils/api";

const router = useRouter();
const isLoading = ref(false);
const isCodeRequested = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const form = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
  emailCode: "",
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
  const referralCode = form.referralCode.trim();
  const emailCode = form.emailCode.trim();

  if (!validators.username.test(username)) {
    return "Username must be 3-20 English letters only.";
  }

  if (!validators.email.test(email)) {
    return "Enter a valid email address.";
  }

  if (!validators.sixDigits.test(emailCode)) {
    return "Email verification code must be 6 numbers.";
  }

  if (!validators.password.test(form.password)) {
    return "Password must be at least 8 characters and include letters and numbers.";
  }

  if (form.password !== form.confirmPassword) {
    return "Passwords do not match.";
  }

  if (!validators.sixDigits.test(referralCode)) {
    return "Referral code must be exactly 6 numbers.";
  }

  if (!form.agreed) {
    return "You must agree to the terms and privacy policy.";
  }

  return "";
};

const requestEmailCode = () => {
  errorMessage.value = "";
  successMessage.value = "";

  if (!validators.email.test(form.email.trim())) {
    errorMessage.value = "Enter a valid email before requesting a verification code.";
    return;
  }

  isCodeRequested.value = true;
  successMessage.value = `Verification code requested for ${form.email}.`;
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
      referralCode: form.referralCode.trim()
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
    subtitle="Open your Leqvo trading access with verified email and referral code."
  >
    <form class="auth-form register-form" @submit.prevent="handleRegister">
      <label>
        Username
        <input
          v-model.trim="form.username"
          type="text"
          placeholder="Amos"
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
        <input v-model.trim="form.email" type="email" placeholder="amos@example.com" autocomplete="email" required />
      </label>
      <div class="register-code-row">
        <label>
          Email verification
          <input
            v-model.trim="form.emailCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            pattern="[0-9]{6}"
            placeholder="Enter code"
            required
          />
        </label>
        <button type="button" @click="requestEmailCode">{{ isCodeRequested ? "Resend" : "Get code" }}</button>
      </div>
      <label>
        Password
        <input
          v-model="form.password"
          type="password"
          minlength="8"
          placeholder="Create password"
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
          placeholder="Repeat password"
          autocomplete="new-password"
          required
        />
      </label>
      <label>
        Referral code
        <input
          v-model.trim="form.referralCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          pattern="[0-9]{6}"
          placeholder="482917"
          required
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
