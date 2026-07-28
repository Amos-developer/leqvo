<script setup>
import AuthLayout from "../components/AuthLayout.vue";
</script>

<template>
  <AuthLayout
    title="Welcome back"
    subtitle="Access your Leqvo account and continue managing your trading balance."
  >
    <form class="auth-form">
      <div class="login-card-header">
        <span class="secure-badge">Secure login</span>
        <span class="pulse-dot"></span>
      </div>
      <label>
        Email
        <input type="email" placeholder="amos@example.com" />
      </label>
      <label>
        Password
        <input type="password" placeholder="Enter password" />
      </label>
      <div class="form-row">
        <label class="check-label"><input type="checkbox" /> Remember me</label>
        <RouterLink to="/forgot-password">Forgot password?</RouterLink>
      </div>
      <button type="button" class="primary-button">Login</button>
    </form>
    <p class="auth-footer">New to Leqvo? <RouterLink to="/register">Register now</RouterLink></p>
  </AuthLayout>
</template>
