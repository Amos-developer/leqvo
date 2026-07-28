<script setup>
import { computed } from "vue";

const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const balance = computed(() => {
  return Number(user.balance || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});
</script>

<template>
  <section class="phone-shell page-enter app-page">
    <div class="simple-page-header">
      <p>Profile</p>
      <h1>Account</h1>
    </div>
    <div class="account-panel">
      <strong>{{ user.username || "Member" }}</strong>
      <span>{{ user.id }}</span>
      <p>{{ balance }}</p>
    </div>
  </section>
</template>
