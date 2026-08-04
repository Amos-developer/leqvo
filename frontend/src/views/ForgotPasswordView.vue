<script setup>
import { reactive, ref } from "vue";
import AuthLayout from "../components/AuthLayout.vue";
import { requestForgotPassword } from "../utils/api";

const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const form = reactive({
  email: ""
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const handleContinue = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const email = form.email.trim().toLowerCase();

  if (!email) {
    errorMessage.value = "Email is required.";
    return;
  }

  if (!emailPattern.test(email)) {
    errorMessage.value = "Enter a valid email address.";
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await requestForgotPassword({ email });
    successMessage.value = result.message || `Recovery request prepared for ${email}.`;
  } catch (error) {
    errorMessage.value = error.message || "Could not validate this email.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <AuthLayout
    title="Recover account access"
    subtitle="Enter your account email to prepare a secure password reset request."
  >
    <form class="auth-form forgot-password-form" @submit.prevent="handleContinue">
      <div class="login-card-header">
        <span class="secure-badge">Account recovery</span>
        <span class="pulse-dot"></span>
      </div>

      <section class="forgot-password-intro">
        <div class="forgot-password-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3a4 4 0 0 1 4 4v2" />
            <path d="M8 11h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
            <path d="M12 15v2" />
          </svg>
        </div>
        <div>
          <strong>Secure reset flow</strong>
          <p>We will use your account email to verify ownership before any password update is allowed.</p>
        </div>
      </section>

      <label>
        Email
        <input v-model.trim="form.email" type="email" placeholder="Enter email" autocomplete="email" required />
      </label>

      <div class="forgot-password-steps">
        <article>
          <span>1</span>
          <div>
            <strong>Submit your email</strong>
            <p>Use the same email linked to your Leqvo account.</p>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <strong>Verify ownership</strong>
            <p>Email confirmation will be required before the reset is completed.</p>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <strong>Create a new password</strong>
            <p>Choose a stronger password and keep it private.</p>
          </div>
        </article>
      </div>

      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="form-message success">{{ successMessage }}</p>

      <button type="submit" class="primary-button" :disabled="isSubmitting">
        {{ isSubmitting ? "Preparing..." : "Continue" }}
      </button>
    </form>

    <div class="forgot-password-support-row">
      <article class="forgot-password-support-card">
        <span aria-hidden="true">🔒</span>
        <strong>Private reset</strong>
      </article>
      <article class="forgot-password-support-card">
        <span aria-hidden="true">⏱️</span>
        <strong>Fast review</strong>
      </article>
      <article class="forgot-password-support-card">
        <span aria-hidden="true">💬</span>
        <strong>Support help</strong>
      </article>
    </div>

    <p class="auth-footer">Remembered it? <RouterLink to="/login">Back to login</RouterLink></p>

    <template #visual>
      <aside class="forgot-password-visual" aria-hidden="true">
        <div class="forgot-password-orbit"></div>
        <div class="forgot-password-card primary">
          <small>Recovery</small>
          <strong>Identity check first</strong>
        </div>
        <div class="forgot-password-card secondary">
          <small>Security</small>
          <strong>Email confirmation required</strong>
        </div>
        <div class="forgot-password-lock">
          <svg viewBox="0 0 24 24">
            <path d="M12 3a4 4 0 0 1 4 4v2" />
            <path d="M8 11h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
            <path d="M12 15v2" />
          </svg>
        </div>
      </aside>
    </template>
  </AuthLayout>
</template>
