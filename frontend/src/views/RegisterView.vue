<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AuthLayout from "../components/AuthLayout.vue";
import { registerUser } from "../utils/api";

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const form = reactive({
  username: "",
  email: "",
  password: "",
  referralCode: ""
});

const handleRegister = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  isLoading.value = true;

  try {
    const result = await registerUser(form);

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
    title="Create account"
    subtitle="Register with your details and a unique six-number referral code."
  >
    <form class="auth-form" @submit.prevent="handleRegister">
      <label>
        Username
        <input v-model.trim="form.username" type="text" placeholder="amos" required />
      </label>
      <label>
        Email
        <input v-model.trim="form.email" type="email" placeholder="amos@example.com" required />
      </label>
      <label>
        Password
        <input v-model="form.password" type="password" placeholder="Create password" required />
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
