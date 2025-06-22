<template>
  <SuggestionInput
    :modelValue="modelValue"
    :suggestions="filteredSuggestions"
    :name="name"
    :placeholder="placeholder"
    :disabled="disabled"
    :getSuggestionText="getSuggestionText"
    :getSuggestionKey="getSuggestionKey"
    :maxSuggestions="maxSuggestions"
    @update:modelValue="$emit('update:modelValue', $event)"
    @select="$emit('select', $event)"
    @enter="$emit('enter')"
    @keydown="$emit('keydown', $event)"
    ref="suggestionInputRef"
  >
    <template #suggestion="{ suggestion }">
      <slot name="suggestion" :suggestion="suggestion">
        {{ getSuggestionText(suggestion) }}
      </slot>
    </template>
  </SuggestionInput>
</template>

<script setup lang="ts" generic="T">
import { computed, ref } from 'vue';
import Fuse from 'fuse.js';
import SuggestionInput from './SuggestionInput.vue';

interface Props {
  modelValue: string;
  suggestions: T[];
  searchKeys?: string[] | ((item: T) => string)[];
  threshold?: number;
  distance?: number;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  getSuggestionText?: (suggestion: T) => string;
  getSuggestionKey?: (suggestion: T) => string | number;
  maxSuggestions?: number;
}

const props = withDefaults(defineProps<Props>(), {
  searchKeys: () => ['name'],
  threshold: 0.4,
  distance: 100,
  name: '',
  placeholder: '',
  disabled: false,
  getSuggestionText: (suggestion: T) => {
    // Try common property names
    if (typeof suggestion === 'string') return suggestion;
    if (suggestion && typeof suggestion === 'object') {
      const obj = suggestion as any;
      return obj.name || obj.title || obj.label || String(suggestion);
    }
    return String(suggestion);
  },
  getSuggestionKey: (suggestion: T, index: number) => index,
  maxSuggestions: 7
});

defineEmits<{
  'update:modelValue': [value: string];
  'select': [suggestion: T];
  'enter': [];
  'keydown': [event: KeyboardEvent];
}>();

// Refs
const suggestionInputRef = ref<InstanceType<typeof SuggestionInput>>();

// Fuse.js instance
const fuse = computed(() => {
  if (!props.suggestions.length) return null;
  
  return new Fuse(props.suggestions, {
    keys: props.searchKeys,
    threshold: props.threshold,
    distance: props.distance,
    includeScore: true,
  });
});

// Filtered suggestions using fuzzy search
const filteredSuggestions = computed(() => {
  if (!fuse.value) return [];
  
  // Show most common suggestions when input is empty but focused
  if (!props.modelValue.trim()) {
    return props.suggestions.slice(0, props.maxSuggestions);
  }
  
  const results = fuse.value.search(props.modelValue.trim());
  return results
    .map(result => result.item)
    .slice(0, props.maxSuggestions);
});

// Public methods
const focus = () => {
  suggestionInputRef.value?.focus();
};

defineExpose({ focus });
</script>