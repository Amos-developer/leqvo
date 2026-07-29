<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { loginUser } from "../utils/api";
import authLogo from "../assets/icons/leqvo-wordmark.svg";

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const form = reactive({
  email: "",
  password: ""
});

const handleLogin = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  isLoading.value = true;

  try {
    const result = await loginUser(form);

    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
    successMessage.value = `Welcome back, ${result.data.username}.`;
    setTimeout(() => {
      router.push(result.data.isAdmin ? "/admin" : "/");
    }, 700);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <section class="login-page page-enter">
    <div class="login-form-panel">
      <div class="auth-topbar login-topbar">
        <RouterLink class="auth-wordmark" to="/login" aria-label="Leqvo">
          <img :src="authLogo" alt="Leqvo" />
        </RouterLink>
        <button class="auth-language-button" type="button" aria-label="Change language">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9" />
            <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
          </svg>
          <span>ENG</span>
        </button>
      </div>

      <div class="login-welcome-copy">
        <h1>Trade with confidence</h1>
        <p>Access your Leqvo market workspace and continue your next signal session.</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="login-card-header">
          <span class="secure-badge">Secure login</span>
          <span class="pulse-dot"></span>
        </div>

        <label>
          Email
          <input v-model.trim="form.email" type="email" placeholder="amos@example.com" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" placeholder="Enter password" required />
        </label>

        <div class="form-row">
          <label class="check-label"><input type="checkbox" /> Remember me</label>
          <RouterLink to="/forgot-password">Forgot password?</RouterLink>
        </div>

        <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="form-message success">{{ successMessage }}</p>

        <button type="submit" class="primary-button" :disabled="isLoading">
          {{ isLoading ? "Signing in..." : "Login" }}
        </button>
      </form>

      <p class="login-footer">New to Leqvo? <RouterLink to="/register">Create account</RouterLink></p>

      <div class="login-security-tip">
        <div class="security-tip-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l7 3v5c0 4.6-2.8 8.6-7 10-4.2-1.4-7-5.4-7-10V6l7-3Z" />
            <path d="M9 12l2 2 4-5" />
          </svg>
        </div>
        <div>
          <strong>Security tip</strong>
          <p>Always confirm you are signing in from the official Leqvo domain before entering your password.</p>
        </div>
      </div>
    </div>
  </section>
</template>
