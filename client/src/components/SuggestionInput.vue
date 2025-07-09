<template>
  <div class="suggestion-input">
    <input
      ref="inputRef"
      :value="modelValue"
      :name="name"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
      class="input-field"
    />
    
    <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions">
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="getSuggestionKey(suggestion)"
        :class="['suggestion-item', { highlighted: index === highlightedIndex }]"
        @mousedown="selectSuggestion(suggestion)"
        @mouseenter="highlightedIndex = index"
      >
        <slot name="suggestion" :suggestion="suggestion" :index="index">
          {{ getSuggestionText(suggestion) }}
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, watch, nextTick } from 'vue';

interface Props {
  modelValue: string;
  suggestions: T[];
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  getSuggestionText?: (suggestion: T) => string;
  getSuggestionKey?: (suggestion: T) => string | number;
  maxSuggestions?: number;
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  placeholder: '',
  disabled: false,
  getSuggestionText: (suggestion: T) => String(suggestion),
  getSuggestionKey: (_: T) => {
    return Math.random();
  },
  maxSuggestions: 7
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'select': [suggestion: T];
  'enter': [];
  'keydown': [event: KeyboardEvent];
}>();

// Refs
const inputRef = ref<HTMLInputElement>();
const showSuggestions = ref(false);
const highlightedIndex = ref(-1);

// Computed
const filteredSuggestions = computed(() => {
  return props.suggestions.slice(0, props.maxSuggestions);
});

// Event handlers
const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', value);
  highlightedIndex.value = -1;
};

const handleFocus = () => {
  showSuggestions.value = true;
};

const handleBlur = () => {
  // Delay hiding suggestions to allow for click events
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
};

const handleKeydown = (event: KeyboardEvent) => {
  const suggestionsCount = filteredSuggestions.value.length;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (suggestionsCount > 0) {
        highlightedIndex.value = Math.min(highlightedIndex.value + 1, suggestionsCount - 1);
      }
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      if (suggestionsCount > 0) {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      }
      break;
      
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0 && highlightedIndex.value < suggestionsCount) {
        selectSuggestion(filteredSuggestions.value[highlightedIndex.value]);
      } else {
        emit('enter');
      }
      break;
      
    case 'Escape':
      showSuggestions.value = false;
      highlightedIndex.value = -1;
      inputRef.value?.blur();
      break;
      
    default:
      emit('keydown', event);
  }
};

const selectSuggestion = (suggestion: T) => {
  emit('select', suggestion);
  showSuggestions.value = false;
  highlightedIndex.value = -1;
};

// Public methods
const focus = () => {
  nextTick(() => {
    inputRef.value?.focus();
  });
};

defineExpose({ focus });

// Watch for suggestions changes
watch(() => props.suggestions, () => {
  highlightedIndex.value = -1;
});
</script>

<style scoped>
.suggestion-input {
  position: relative;
  width: 100%;
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.input-field:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background-color: #f8f9fa;
}

.suggestion-item.highlighted {
  background-color: #e3f2fd;
}
</style>