<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AuthLanguageDropdown from "../components/AuthLanguageDropdown.vue";
import { showUserPopup } from "../composables/useUserPopup";
import { loginUser } from "../utils/api";
import authLogo from "../assets/icons/leqvo-wordmark.svg";

const router = useRouter();
const isLoading = ref(false);

const form = reactive({
  email: "",
  password: ""
});

const handleLogin = async () => {
  const payload = {
    email: form.email.trim(),
    password: form.password
  };

  if (!payload.email || !payload.password) {
    showUserPopup({
      tone: "error",
      title: "Missing details",
      message: "Email and password are required."
    });
    return;
  }

  isLoading.value = true;

  try {
    const result = await loginUser(payload);

    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
    localStorage.setItem("leqvoToken", result.token);
    router.push(result.data.isAdmin ? "/admin" : "/");
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Sign in failed",
      message: error.message || "Could not sign in."
    });
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
        <AuthLanguageDropdown />
      </div>

      <div class="login-welcome-copy">
        <h1>Sign in to your account</h1>
        <p>Manage your Leqvo wallet, team, deposits, withdrawals, and trading activity securely.</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="login-card-header">
          <span class="secure-badge">Protected access</span>
          <span class="pulse-dot"></span>
        </div>

        <label>
          Email
          <input v-model.trim="form.email" type="email" placeholder="Enter email" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" placeholder="Enter password" required />
        </label>

        <div class="form-row">
          <label class="check-label"><input type="checkbox" /> Remember me</label>
          <RouterLink to="/forgot-password">Forgot password?</RouterLink>
        </div>
        <button type="submit" class="primary-button" :disabled="isLoading">
          {{ isLoading ? "Signing in..." : "Sign in" }}
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
          <p>Never share your email or password with anyone. Leqvo admin will never ask for your login details.</p>
        </div>
      </div>

      <section class="login-trust-row" aria-label="Platform trust points">
        <article class="login-trust-item">
          <span class="login-trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l7 3v5c0 4.6-2.8 8.6-7 10-4.2-1.4-7-5.4-7-10V6l7-3Z" />
              <path d="M9 12l2 2 4-5" />
            </svg>
          </span>
          <strong>Secure</strong>
        </article>
        <article class="login-trust-item">
          <span class="login-trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 7v5l3 3" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          </span>
          <strong>24/7 Support</strong>
        </article>
        <article class="login-trust-item">
          <span class="login-trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 16l4-4 3 3 7-7" />
              <path d="M16 8h3v3" />
            </svg>
          </span>
          <strong>Live Markets</strong>
        </article>
      </section>
    </div>
  </section>
</template>
