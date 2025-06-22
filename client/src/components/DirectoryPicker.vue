<template>
  <div class="directory-picker">
    <h3>Select Repository Directory</h3>
    
    <!-- Browser-based directory picker -->
    <div v-if="supportsDirectoryPicker" class="picker-section">
      <h4>📁 Browse for Directory</h4>
      <p class="help-text">Use your browser's directory picker to select a folder</p>
      <button 
        @click="pickDirectory" 
        :disabled="loading"
        data-testid="browser-picker"
        class="pick-button"
      >
        {{ loading ? 'Selecting...' : '🗂 Pick Directory' }}
      </button>
    </div>

    <div class="divider">
      <span>or</span>
    </div>

    <!-- Manual path input -->
    <div class="picker-section" data-testid="manual-input">
      <h4>📝 Enter Path Manually</h4>
      <p class="help-text">Type the full path to your project directory</p>
      <div class="input-group">
        <input
          v-model="manualPath"
          type="text"
          placeholder="e.g., /home/user/my-project"
          @keyup.enter="selectManualPath"
          :disabled="loading"
        />
        <button 
          @click="selectManualPath" 
          :disabled="loading || !manualPath.trim()"
        >
          Select
        </button>
      </div>
    </div>

    <!-- Fallback message for unsupported browsers -->
    <div v-if="!supportsDirectoryPicker" class="fallback-message">
      <p>⚠️ Browser directory picker is not supported in your browser. Please use manual path entry.</p>
    </div>

    <!-- Error display -->
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits<{
  'directory-selected': [directoryHandle: FileSystemDirectoryHandle];
  'manual-path': [path: string];
  'error': [message: string];
}>();

const loading = ref(false);
const error = ref('');
const manualPath = ref('');

const supportsDirectoryPicker = computed(() => {
  return 'showDirectoryPicker' in window;
});

const pickDirectory = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Request directory picker - start with read-only mode
    const directoryHandle = await (window as any).showDirectoryPicker();
    
    // Check read permission first
    const readPermission = await directoryHandle.queryPermission({ mode: 'read' });
    if (readPermission !== 'granted') {
      const requestResult = await directoryHandle.requestPermission({ mode: 'read' });
      if (requestResult !== 'granted') {
        throw new Error('Permission denied to access directory');
      }
    }
    
    emit('directory-selected', directoryHandle);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled, don't show error
      return;
    }
    
    const message = err instanceof Error ? err.message : 'Failed to select directory';
    error.value = message;
    emit('error', message);
  } finally {
    loading.value = false;
  }
};

const selectManualPath = () => {
  const path = manualPath.value.trim();
  if (path) {
    emit('manual-path', path);
  }
};

onMounted(() => {
  // Clear any previous state
  error.value = '';
  manualPath.value = '';
});
</script>

<style scoped>
.directory-picker {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h3 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.picker-section {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1em;
}

.help-text {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9em;
}

.pick-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
}

.pick-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.pick-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
  color: #999;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
  z-index: 1;
}

.divider span {
  background: white;
  padding: 0 15px;
  position: relative;
  z-index: 2;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.input-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.input-group button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.input-group button:hover:not(:disabled) {
  background-color: #218838;
}

.input-group button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.fallback-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.fallback-message p {
  margin: 0;
  color: #856404;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-top: 15px;
  border: 1px solid #fcc;
}

@media (max-width: 768px) {
  .directory-picker {
    padding: 15px;
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .input-group button {
    width: 100%;
  }
}
</style>