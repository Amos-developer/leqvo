<script setup>
import AuthLayout from "../components/AuthLayout.vue";
</script>

<template>
  <AuthLayout
    title="Create account"
    subtitle="Register with your details and a unique six-number referral code."
  >
    <form class="auth-form">
      <label>
        Username
        <input type="text" placeholder="amos" />
      </label>
      <label>
        Email
        <input type="email" placeholder="amos@example.com" />
      </label>
      <label>
        Password
        <input type="password" placeholder="Create password" />
      </label>
      <label>
        Referral code
        <input type="text" inputmode="numeric" maxlength="6" placeholder="482917" />
      </label>
      <button type="button" class="primary-button">Register</button>
    </form>
    <p class="auth-footer">Already have an account? <RouterLink to="/login">Login</RouterLink></p>
  </AuthLayout>
</template>
