<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-content" @click.stop>
      <h2>🎯 Initialize Bowman</h2>
      <p class="subtitle">Set up aim management for this project</p>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="title">Project Goal Title*</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="e.g., Build Amazing Software"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="description">Goal Description*</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Describe the main goal or purpose of this project..."
            required
            :disabled="loading"
            rows="4"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="statusNote">Status Note (optional)</label>
          <input
            id="statusNote"
            v-model="form.statusNote"
            type="text"
            placeholder="e.g., Waiting for approval, Research phase..."
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error">{{ error }}</div>

        <div class="button-row">
          <button 
            type="button" 
            @click="$emit('cancel')"
            :disabled="loading"
            data-testid="cancel-button"
            class="cancel-button"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            :disabled="loading || !isFormValid"
            class="submit-button"
          >
            {{ loading ? 'Initializing...' : '🚀 Initialize Bowman' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  visible: boolean;
  loading?: boolean;
  error?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'initialize': [rootAim: {
    title: string;
    description: string;
    statusNote?: string;
  }];
  'cancel': [];
}>();

const form = ref({
  title: '',
  description: '',
  statusNote: ''
});

const isFormValid = computed(() => {
  return form.value.title.trim() !== '' && form.value.description.trim() !== '';
});

const handleSubmit = () => {
  if (isFormValid.value) {
    emit('initialize', {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      statusNote: form.value.statusNote.trim() || undefined
    });
  }
};

const handleOverlayClick = () => {
  emit('cancel');
};

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    statusNote: ''
  };
};

defineExpose({ resetForm });
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h2 {
  margin: 0 0 8px 0;
  color: #333;
  text-align: center;
  font-size: 1.5em;
}

.subtitle {
  margin: 0 0 25px 0;
  color: #666;
  text-align: center;
  font-size: 0.95em;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.9em;
}

input, textarea, select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

input:disabled, textarea:disabled, select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.button-row {
  display: flex;
  gap: 12px;
  margin-top: 25px;
}

.cancel-button, .submit-button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #ddd;
}

.cancel-button:hover:not(:disabled) {
  background: #e9ecef;
}

.submit-button {
  background: #007bff;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #0056b3;
}

.cancel-button:disabled, .submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #fcc;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .dialog-overlay {
    padding: 10px;
  }
  
  .dialog-content {
    padding: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .button-row {
    flex-direction: column;
  }
}
</style>