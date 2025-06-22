<template>
  <div class="repo-selector">
    <h2>Select Repository</h2>
    
    <DirectoryPicker 
      @directory-selected="handleDirectorySelected"
      @manual-path="handleManualPath"
      @error="handlePickerError"
    />
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <!-- Show selected path -->
    <div v-if="selectedPath" class="selected-path">
      <h3>Selected: {{ selectedPath }}</h3>
      <div class="path-actions">
        <button @click="proceedWithPath" :disabled="loading" class="proceed-button">
          {{ loading ? 'Loading...' : 'Load Repository' }}
        </button>
        <button @click="clearSelection" :disabled="loading" class="clear-button">
          Choose Different Path
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DirectoryPicker from './DirectoryPicker.vue';

interface Props {
  loading?: boolean;
  error?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'repo-selected': [path: string];
  'clear-error': [];
}>();

const selectedPath = ref('');

const handleDirectorySelected = async (directoryHandle: FileSystemDirectoryHandle) => {
  // For File System Access API, we need to convert to a path
  // This is a simplified approach - in reality, we'd need to handle this differently
  selectedPath.value = directoryHandle.name;
  emit('clear-error');
};

const handleManualPath = (path: string) => {
  selectedPath.value = path;
  emit('clear-error');
};

const handlePickerError = (message: string) => {
  // Let parent handle the error display
  emit('clear-error');
};

const proceedWithPath = () => {
  if (selectedPath.value) {
    emit('repo-selected', selectedPath.value);
  }
};

const clearSelection = () => {
  selectedPath.value = '';
  emit('clear-error');
};
</script>

<style scoped>
.repo-selector {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.selected-path {
  background: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  text-align: center;
}

.selected-path h3 {
  margin: 0 0 15px 0;
  color: #2e7d32;
  word-break: break-all;
}

.path-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.proceed-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.proceed-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.clear-button {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-button:hover:not(:disabled) {
  background-color: #545b62;
}

.proceed-button:disabled, .clear-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 15px;
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #fcc;
}

@media (max-width: 768px) {
  .path-actions {
    flex-direction: column;
  }
  
  .proceed-button, .clear-button {
    width: 100%;
  }
}
</style>