<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AuthLayout from "../components/AuthLayout.vue";
import { loginUser } from "../utils/api";

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
      router.push("/");
    }, 700);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthLayout
    title="Welcome back"
    subtitle="Access your Leqvo account and continue managing your trading balance."
  >
    <form class="auth-form" @submit.prevent="handleLogin">
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
    <p class="auth-footer">New to Leqvo? <RouterLink to="/register">Register now</RouterLink></p>
  </AuthLayout>
</template>
