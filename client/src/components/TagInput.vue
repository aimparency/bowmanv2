<template>
  <div class="tag-input">
    <div class="label">{{ label || 'Tags' }}:</div>
    <div class="tag-area">
      <!-- Current tags -->
      <div v-for="tag in modelValue" :key="tag" class="tag">
        {{ tag }}
        <button class="tag-remove" @click="removeTag(tag)" type="button" :disabled="disabled">
          ✖
        </button>
      </div>
      
      <!-- Input for new tags -->
      <div class="tag-input-container">
        <FuzzySearchInput
          ref="fuzzySearchRef"
          v-model="input"
          :suggestions="availableTags"
          :placeholder="placeholder || 'Add a tag...'"
          :disabled="disabled"
          :getSuggestionText="(tag: TagSuggestion) => tag.name"
          :getSuggestionKey="(tag: TagSuggestion) => tag.name"
          @select="handleSelect"
          @enter="handleEnter"
          @keydown="handleKeydown"
        >
          <template #suggestion="{ suggestion }">
            <div class="tag-suggestion">
              <span class="tag-name">{{ suggestion.name }}</span>
              <span class="tag-count">({{ suggestion.count }})</span>
            </div>
          </template>
        </FuzzySearchInput>
        
        <button 
          v-if="input.trim()"
          @click="addTag" 
          type="button"
          class="add-button"
          :disabled="disabled"
        >
          Add
        </button>
      </div>
    </div>
    
    <!-- Validation error display -->
    <div v-if="validationError" class="validation-error">
      {{ validationError.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FuzzySearchInput from './FuzzySearchInput.vue';

// Define error types
interface ValidationError {
  field: string;
  message: string;
}

export interface TagSuggestion {
  name: string;
  count: number;
}

interface Props {
  modelValue: string[];
  availableTags?: TagSuggestion[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  availableTags: () => [],
  maxLength: 25
});

const emit = defineEmits<{
  'update:modelValue': [tags: string[]];
  'tag-added': [tag: string];
  'tag-removed': [tag: string];
  'validation-error': [error: ValidationError];
}>();

// Refs
const input = ref('');
const fuzzySearchRef = ref<any>();
const validationError = ref<ValidationError | null>(null);

// Computed
const availableTags = computed(() => {
  // Filter out already selected tags and sort by usage count
  return props.availableTags
    .filter(tag => !props.modelValue.includes(tag.name))
    .sort((a, b) => b.count - a.count);
});

// Methods
const addTag = () => {
  const tagName = input.value.trim();
  
  if (!tagName) return;
  
  // Validate tag length
  if (tagName.length > props.maxLength) {
    const error: ValidationError = {
      field: 'tag',
      message: `Tag must be ${props.maxLength} characters or less`
    };
    validationError.value = error;
    emit('validation-error', error);
    return;
  }
  
  // Clear any previous validation errors
  validationError.value = null;
  
  // Check if tag already exists
  if (props.modelValue.includes(tagName)) {
    input.value = '';
    return;
  }
  
  // Add the tag
  const newTags = [...props.modelValue, tagName];
  emit('update:modelValue', newTags);
  emit('tag-added', tagName);
  
  // Clear input and refocus
  input.value = '';
  setTimeout(() => {
    fuzzySearchRef.value?.focus();
  }, 10);
};

const removeTag = (tagToRemove: string) => {
  const newTags = props.modelValue.filter(tag => tag !== tagToRemove);
  emit('update:modelValue', newTags);
  emit('tag-removed', tagToRemove);
};

const handleSelect = (suggestion: TagSuggestion) => {
  input.value = suggestion.name;
  addTag();
};

const handleEnter = () => {
  addTag();
};

const handleKeydown = (event: KeyboardEvent) => {
  // Remove last tag on backspace when input is empty
  if (event.key === 'Backspace' && !input.value && props.modelValue.length > 0) {
    removeTag(props.modelValue[props.modelValue.length - 1]);
  }
};

// Public methods
const focus = () => {
  fuzzySearchRef.value?.focus();
};

defineExpose({ focus });
</script>

<style scoped>
.tag-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.tag-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  min-height: 44px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  max-width: 150px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  margin-left: 2px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.tag-remove:hover:not(:disabled) {
  opacity: 1;
}

.tag-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tag-input-container {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 150px;
}

.tag-input-container :deep(.suggestion-input) {
  flex: 1;
}

.tag-input-container :deep(.input-field) {
  border: none;
  padding: 4px 0;
  font-size: 14px;
}

.tag-input-container :deep(.input-field):focus {
  box-shadow: none;
}

.add-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.add-button:hover:not(:disabled) {
  background: #218838;
}

.add-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.tag-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tag-name {
  font-weight: 500;
}

.tag-count {
  color: #666;
  font-size: 12px;
}

.validation-error {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .tag-area {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tag-input-container {
    width: 100%;
    min-width: unset;
  }
}
</style>