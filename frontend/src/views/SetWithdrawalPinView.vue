<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { requestWithdrawalPinCode, setWithdrawalPin } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const form = ref({
  code: "",
  pin: "",
  confirmPin: ""
});
const codeRequested = ref(false);
const isRequestingCode = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const codeMessage = ref("");

const requestCode = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  codeMessage.value = "";
  isRequestingCode.value = true;

  try {
    const result = await requestWithdrawalPinCode();
    codeRequested.value = true;
    codeMessage.value = result.data?.code
      ? `Code requested. Test code: ${result.data.code}`
      : `Code requested for ${user.email || "your email"}.`;
  } catch (error) {
    errorMessage.value = error.message || "Could not request email code.";
  } finally {
    isRequestingCode.value = false;
  }
};

const validateForm = () => {
  if (!codeRequested.value) {
    return "Request an email code first.";
  }

  if (!/^\d{6}$/.test(form.value.code.trim())) {
    return "Email code must be exactly 6 numbers.";
  }

  if (!/^\d{4}$/.test(form.value.pin.trim())) {
    return "Withdrawal PIN must be exactly 4 digits.";
  }

  if (form.value.pin !== form.value.confirmPin) {
    return "PIN and confirmation do not match.";
  }

  return "";
};

const submitPin = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const validationError = validateForm();

  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isSaving.value = true;

  try {
    const result = await setWithdrawalPin({
      code: form.value.code.trim(),
      pin: form.value.pin.trim(),
      confirmPin: form.value.confirmPin.trim()
    });

    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
    successMessage.value = "Withdrawal PIN set successfully.";
    setTimeout(() => router.push("/account"), 900);
  } catch (error) {
    errorMessage.value = error.message || "Could not set withdrawal PIN.";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="withdrawal-pin-page phone-shell page-enter app-page">
    <header class="withdrawal-pin-header">
      <div>
        <p>Payout security</p>
        <h1>Set Withdrawal PIN</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="withdrawal-pin-hero">
      <div>
        <span>4-digit PIN</span>
        <strong>Secure withdrawals</strong>
        <p>Request an email code first, then create a private 4-digit withdrawal PIN.</p>
      </div>
      <button type="button" :disabled="isRequestingCode" @click="requestCode">
        {{ isRequestingCode ? "Sending..." : codeRequested ? "Resend Code" : "Get Code" }}
      </button>
    </section>

    <section class="withdrawal-pin-card">
      <p v-if="codeMessage" class="withdrawal-pin-message info">{{ codeMessage }}</p>

      <label class="withdrawal-pin-field">
        <span>Email code</span>
        <input v-model.trim="form.code" type="text" maxlength="6" inputmode="numeric" placeholder="Enter email code" />
      </label>

      <label class="withdrawal-pin-field">
        <span>Withdrawal PIN</span>
        <input v-model.trim="form.pin" type="password" maxlength="4" inputmode="numeric" placeholder="Enter 4-digit PIN" />
      </label>

      <label class="withdrawal-pin-field">
        <span>Confirm PIN</span>
        <input v-model.trim="form.confirmPin" type="password" maxlength="4" inputmode="numeric" placeholder="Confirm 4-digit PIN" />
      </label>

      <button class="withdrawal-pin-submit" type="button" :disabled="isSaving" @click="submitPin">
        {{ isSaving ? "Saving..." : "Set PIN" }}
      </button>

      <p v-if="errorMessage" class="withdrawal-pin-message error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="withdrawal-pin-message success">{{ successMessage }}</p>
    </section>

    <section class="withdrawal-pin-guide">
      <div>
        <span>Security guide</span>
        <h2>Protect your payouts</h2>
      </div>
      <article>
        <strong>Use a private PIN</strong>
        <p>Do not use easy numbers like 0000, 1111, or your birthday.</p>
      </article>
      <article>
        <strong>Keep it separate</strong>
        <p>Your withdrawal PIN should not be the same as your phone lock or card PIN.</p>
      </article>
      <article>
        <strong>Never share it</strong>
        <p>Leqvo admin will never ask for your withdrawal PIN or email code.</p>
      </article>
    </section>
  </section>
</template>
