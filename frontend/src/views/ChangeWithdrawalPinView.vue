<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { changeWithdrawalPin, requestWithdrawalPinCode } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const form = ref({
  code: "",
  currentPin: "",
  newPin: "",
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
  if (!codeRequested.value) return "Request an email code first.";
  if (!/^\d{6}$/.test(form.value.code.trim())) return "Email code must be exactly 6 numbers.";
  if (!/^\d{4}$/.test(form.value.currentPin.trim())) return "Current PIN must be exactly 4 digits.";
  if (!/^\d{4}$/.test(form.value.newPin.trim())) return "New PIN must be exactly 4 digits.";
  if (form.value.newPin !== form.value.confirmPin) return "New PIN and confirmation do not match.";
  if (form.value.currentPin === form.value.newPin) return "New PIN must be different from current PIN.";

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
    const result = await changeWithdrawalPin({
      code: form.value.code.trim(),
      currentPin: form.value.currentPin.trim(),
      newPin: form.value.newPin.trim(),
      confirmPin: form.value.confirmPin.trim()
    });

    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
    successMessage.value = "Withdrawal PIN changed successfully.";
    setTimeout(() => router.push("/account"), 900);
  } catch (error) {
    errorMessage.value = error.message || "Could not change withdrawal PIN.";
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
        <h1>Change Withdrawal PIN</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="withdrawal-pin-hero">
      <div>
        <span>Email protected</span>
        <strong>Update your PIN</strong>
        <p>Request an email code, verify your current PIN, then set a new 4-digit PIN.</p>
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
        <span>Current PIN</span>
        <input v-model.trim="form.currentPin" type="password" maxlength="4" inputmode="numeric" placeholder="Enter current PIN" />
      </label>

      <label class="withdrawal-pin-field">
        <span>New PIN</span>
        <input v-model.trim="form.newPin" type="password" maxlength="4" inputmode="numeric" placeholder="Enter new 4-digit PIN" />
      </label>

      <label class="withdrawal-pin-field">
        <span>Confirm new PIN</span>
        <input v-model.trim="form.confirmPin" type="password" maxlength="4" inputmode="numeric" placeholder="Confirm new PIN" />
      </label>

      <button class="withdrawal-pin-submit" type="button" :disabled="isSaving" @click="submitPin">
        {{ isSaving ? "Saving..." : "Change PIN" }}
      </button>

      <p v-if="errorMessage" class="withdrawal-pin-message error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="withdrawal-pin-message success">{{ successMessage }}</p>
    </section>

    <section class="withdrawal-pin-guide">
      <div>
        <span>Security guide</span>
        <h2>Before you change it</h2>
      </div>
      <article>
        <strong>Choose a new PIN</strong>
        <p>Do not reuse your old PIN or simple repeated digits.</p>
      </article>
      <article>
        <strong>Keep email code private</strong>
        <p>Anyone with your email code and PIN could try to access payout settings.</p>
      </article>
      <article>
        <strong>Update only on your device</strong>
        <p>Change payout security only from a phone or computer you trust.</p>
      </article>
    </section>
  </section>
</template>
