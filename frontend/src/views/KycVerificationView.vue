<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyKyc, submitKyc } from "../utils/api";

const router = useRouter();
const MAX_FILE_SIZE = 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const documents = ref({
  idFront: null,
  idBack: null,
  selfie: null
});
const previews = ref({
  idFront: "",
  idBack: "",
  selfie: ""
});
const currentKyc = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const documentCards = [
  { key: "idFront", title: "ID front", text: "Upload the front page clearly" },
  { key: "idBack", title: "ID back", text: "Upload the back page clearly" },
  { key: "selfie", title: "Selfie", text: "Take a bright selfie holding no document" }
];

const canSubmit = computed(() => {
  return documents.value.idFront && documents.value.idBack && documents.value.selfie && currentKyc.value?.status !== "pending";
});

const statusLabel = computed(() => {
  if (!currentKyc.value) {
    return "Not submitted";
  }

  return currentKyc.value.status;
});

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
};

const handleFile = async (event, key) => {
  const file = event.target.files?.[0];
  errorMessage.value = "";
  successMessage.value = "";

  if (!file) {
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = "Only JPG, PNG, or WEBP images are allowed.";
    event.target.value = "";
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = "Each document must be 1MB or smaller.";
    event.target.value = "";
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  documents.value[key] = dataUrl;
  previews.value[key] = dataUrl;
};

const loadKyc = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyKyc();
    currentKyc.value = result.data;
  } catch (error) {
    errorMessage.value = error.message || "Could not load KYC status.";
  } finally {
    isLoading.value = false;
  }
};

const submitDocuments = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  if (!canSubmit.value) {
    errorMessage.value = "Upload all three documents before submitting.";
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await submitKyc(documents.value);
    currentKyc.value = result.data;
    documents.value = { idFront: null, idBack: null, selfie: null };
    previews.value = { idFront: "", idBack: "", selfie: "" };
    successMessage.value = "KYC submitted for admin review.";
  } catch (error) {
    errorMessage.value = error.message || "Could not submit KYC.";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(loadKyc);
</script>

<template>
  <section class="kyc-page phone-shell page-enter app-page">
    <header class="kyc-header">
      <div>
        <p>Identity check</p>
        <h1>KYC Verification</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="kyc-hero">
      <div>
        <span>Status</span>
        <strong>{{ statusLabel }}</strong>
        <p>Submit small, clear images. Admin will review and approve your verification.</p>
      </div>
      <div class="kyc-badge" :class="currentKyc?.status || 'new'">
        {{ currentKyc?.status === "approved" ? "OK" : currentKyc?.status === "pending" ? "..." : "ID" }}
      </div>
    </section>

    <section v-if="currentKyc?.status === 'pending'" class="kyc-status-card">
      <strong>Review in progress</strong>
      <p>Your documents are waiting for admin approval. You can submit again only if rejected.</p>
    </section>

    <section v-else-if="currentKyc?.status === 'approved'" class="kyc-status-card approved">
      <strong>KYC approved</strong>
      <p>Your account verification is complete.</p>
    </section>

    <section v-else class="kyc-upload-grid">
      <article v-for="card in documentCards" :key="card.key" class="kyc-upload-card">
        <div class="kyc-preview">
          <img v-if="previews[card.key]" :src="previews[card.key]" :alt="card.title" />
          <span v-else>{{ card.title.charAt(0) }}</span>
        </div>
        <div>
          <strong>{{ card.title }}</strong>
          <p>{{ card.text }}</p>
          <label>
            Choose file
            <input type="file" accept="image/png,image/jpeg,image/webp" @change="handleFile($event, card.key)" />
          </label>
        </div>
      </article>
    </section>

    <section class="kyc-guide">
      <div>
        <span>Upload rules</span>
        <h2>Small files, clear details</h2>
      </div>
      <article>
        <strong>Maximum 1MB each</strong>
        <p>Crop unnecessary background and upload JPG, PNG, or WEBP images only.</p>
      </article>
      <article>
        <strong>Readable document</strong>
        <p>Make sure names, photo, document number, and expiry date are visible.</p>
      </article>
      <article>
        <strong>No screenshots</strong>
        <p>Use a real photo of the document and a fresh selfie taken in good light.</p>
      </article>
    </section>

    <button
      v-if="currentKyc?.status !== 'pending' && currentKyc?.status !== 'approved'"
      class="kyc-submit"
      type="button"
      :disabled="isSubmitting || !canSubmit"
      @click="submitDocuments"
    >
      {{ isSubmitting ? "Submitting..." : "Submit for Review" }}
    </button>

    <p v-if="errorMessage" class="kyc-message error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="kyc-message success">{{ successMessage }}</p>
    <p v-if="isLoading" class="kyc-message info">Loading verification status...</p>
  </section>
</template>
