<script setup lang="ts">
import { computed, ref } from 'vue'
import Fuse from 'fuse.js'
import SuggestionInput from './SuggestionInput.vue'

interface Suggestion {
  name: string
  count: number
}

const props = defineProps<{
  modelValue: string
  suggestions: Suggestion[]
  placeholder?: string
  id?: string
  name?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', value: string): void
  (e: 'enter'): void
  (e: 'select', suggestion: Suggestion): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const suggestionInputRef = ref<InstanceType<typeof SuggestionInput>>()

// Expose the focus method
function focus() {
  suggestionInputRef.value?.focus()
}

defineExpose({ focus })

// Fuzzy search setup
const fuse = computed(() => {
  if (!props.suggestions.length) return null
  return new Fuse(props.suggestions, {
    keys: ['name'],
    threshold: 0.4,
    distance: 100,
  })
})

const filteredSuggestions = computed(() => {
  if (!fuse.value) return []
  
  // Show most common suggestions when input is empty but focused
  if (!props.modelValue.trim()) {
    return props.suggestions.slice(0, 7)
  }
  
  const results = fuse.value.search(props.modelValue.trim())
  return results
    .map(result => result.item)
    .slice(0, 7)
})
</script>

<template>
  <SuggestionInput
    ref="suggestionInputRef"
    :modelValue="modelValue"
    :suggestions="filteredSuggestions"
    :placeholder="placeholder"
    :id="id"
    :name="name"
    @update:modelValue="emit('update:modelValue', $event)"
    @blur="emit('blur', $event)"
    @enter="emit('enter')"
    @select="emit('select', $event)"
    @keydown="emit('keydown', $event)"
  />
</template>