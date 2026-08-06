<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { showUserPopup } from "../composables/useUserPopup";
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

const requestCode = async () => {
  isRequestingCode.value = true;

  try {
    const result = await requestWithdrawalPinCode();
    codeRequested.value = true;
    showUserPopup({
      tone: "success",
      title: "Code sent",
      message: result.data?.code
        ? `Testing code: ${result.data.code}`
        : `Code requested for ${user.email || "your email"}.`
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Code request failed",
      message: error.message || "Could not request email code."
    });
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
  const validationError = validateForm();

  if (validationError) {
    showUserPopup({
      tone: "error",
      title: "Check your details",
      message: validationError
    });
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
    showUserPopup({
      tone: "success",
      title: "PIN updated",
      message: "Withdrawal PIN changed successfully.",
      onConfirm: () => router.push("/account")
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Update failed",
      message: error.message || "Could not change withdrawal PIN."
    });
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
