<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const languages = [
  { code: "ENG", label: "English", flag: "GB" },
  { code: "ESP", label: "Spanish", flag: "ES" },
  { code: "FRA", label: "France", flag: "FR" },
  { code: "ARB", label: "Arabic", flag: "SA" },
  { code: "PER", label: "Persian", flag: "IR" },
  { code: "POR", label: "Portuguese", flag: "PT" },
  { code: "HIN", label: "Hindu", flag: "IN" },
  { code: "VIE", label: "Vietnum", flag: "VN" }
];

const selectedLanguage = ref(languages[0]);
const isOpen = ref(false);
const dropdownRef = ref(null);

const toFlagEmoji = (countryCode) => {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
};

const activeFlag = computed(() => toFlagEmoji(selectedLanguage.value.flag));

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const selectLanguage = (language) => {
  selectedLanguage.value = language;
  isOpen.value = false;
};

const handleDocumentClick = (event) => {
  if (!dropdownRef.value?.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <div ref="dropdownRef" class="auth-language-dropdown">
    <button
      class="auth-language-button auth-language-trigger"
      type="button"
      aria-label="Change language"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9" />
        <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
      </svg>
      <span class="auth-language-flag" aria-hidden="true">{{ activeFlag }}</span>
      <span>{{ selectedLanguage.code }}</span>
      <span class="auth-language-caret" :class="{ open: isOpen }" aria-hidden="true"></span>
    </button>

    <transition name="language-menu">
      <div v-if="isOpen" class="auth-language-menu">
        <button
          v-for="language in languages"
          :key="language.code"
          type="button"
          class="auth-language-option"
          :class="{ active: selectedLanguage.code === language.code }"
          @click="selectLanguage(language)"
        >
          <span class="auth-language-flag" aria-hidden="true">{{ toFlagEmoji(language.flag) }}</span>
          <span class="auth-language-label">{{ language.label }}</span>
          <span class="auth-language-code">{{ language.code }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>
