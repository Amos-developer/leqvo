<script setup>
import AuthLayout from "../components/AuthLayout.vue";
</script>

<template>
  <AuthLayout
    title="Reset password"
    subtitle="Enter your account email and we will prepare a secure reset flow for you."
  >
    <form class="auth-form">
      <div class="login-card-header">
        <span class="secure-badge">Account recovery</span>
        <span class="pulse-dot"></span>
      </div>
      <label>
        Email
        <input type="email" placeholder="Enter email" />
      </label>
      <button type="button" class="primary-button">Continue</button>
    </form>
    <p class="auth-footer">Remembered it? <RouterLink to="/login">Back to login</RouterLink></p>
  </AuthLayout>
</template>
