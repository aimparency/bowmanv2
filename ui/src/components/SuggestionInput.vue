<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

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
  loading?: boolean
  searchCallback?: (value: string) => void | Promise<void>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', value: string): void
  (e: 'enter'): void
  (e: 'select', suggestion: Suggestion): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const showSuggestions = ref(false)
const highlightIndex = ref(-1)
const inputFocused = ref(false)
const inputRef = ref<HTMLInputElement>()
const suggestionRefs = ref<HTMLElement[]>([])
const containerRef = ref<HTMLElement>()
let hideTimeout: number | null = null

const filteredSuggestions = computed(() => {
  // Just return the provided suggestions as-is, limited to 7
  return props.suggestions.slice(0, 7)
})

// Watch for changes in suggestions and update showSuggestions accordingly
watch([() => props.suggestions, inputFocused], ([suggestions, focused]) => {
  // Only show suggestions if input is focused and we have suggestions
  if (focused && suggestions.length > 0) {
    showSuggestions.value = true
  } else if (!focused) {
    showSuggestions.value = false
  }
})

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  
  // If there's a search callback, use it; otherwise rely on computed suggestions
  if (props.searchCallback) {
    props.searchCallback(value)
  }
  
  // Don't immediately show suggestions here - let the watcher handle it
  // This prevents flickering while waiting for async search results
  highlightIndex.value = -1
}

function handleFocus() {
  inputFocused.value = true
  highlightIndex.value = -1
  
  // Clear any pending hide timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

function hideSuggestions() {
  // Clear any existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  
  hideTimeout = window.setTimeout(() => {
    // Only hide if focus is not within the entire component container
    const activeElement = document.activeElement
    if (!containerRef.value?.contains(activeElement)) {
      inputFocused.value = false
      showSuggestions.value = false
      highlightIndex.value = -1
    }
    hideTimeout = null
  }, 200) // Increased timeout to reduce flickering
}

function selectSuggestion(suggestion: Suggestion) {
  emit('select', suggestion)
  inputFocused.value = false
  showSuggestions.value = false
  highlightIndex.value = -1
  
  // Clear any pending hide timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

async function handleKeydown(event: KeyboardEvent) {
  // Forward the keydown event
  emit('keydown', event)
  
  if (event.key === 'Enter') {
    if (highlightIndex.value >= 0 && filteredSuggestions.value.length > 0) {
      event.preventDefault()
      selectSuggestion(filteredSuggestions.value[highlightIndex.value])
    } else {
      event.preventDefault()
      emit('enter')
    }
  } else if (event.key === 'ArrowDown' && showSuggestions.value && filteredSuggestions.value.length > 0) {
    event.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, filteredSuggestions.value.length - 1)
    // Focus the highlighted suggestion using ref
    await nextTick()
    suggestionRefs.value[highlightIndex.value]?.focus()
  } else if (event.key === 'ArrowUp' && showSuggestions.value && filteredSuggestions.value.length > 0) {
    event.preventDefault()
    if (highlightIndex.value > 0) {
      highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
      // Focus the highlighted suggestion using ref
      await nextTick()
      suggestionRefs.value[highlightIndex.value]?.focus()
    } else {
      highlightIndex.value = -1
      inputRef.value?.focus()
    }
  } else if (event.key === 'Escape' && showSuggestions.value) {
    event.preventDefault()
    event.stopPropagation()
    inputFocused.value = false
    showSuggestions.value = false
    highlightIndex.value = -1
    inputRef.value?.focus()
  }
}

// Separate handler for suggestion keydown events
async function handleSuggestionKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (index < filteredSuggestions.value.length - 1) {
      highlightIndex.value = index + 1
      await nextTick()
      suggestionRefs.value[highlightIndex.value]?.focus()
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (index > 0) {
      highlightIndex.value = index - 1
      await nextTick()
      suggestionRefs.value[highlightIndex.value]?.focus()
    } else {
      highlightIndex.value = -1
      inputRef.value?.focus()
    }
  } else if (event.key === 'Tab') {
    // If tabbing away from the last suggestion, close the suggestions
    if (index === filteredSuggestions.value.length - 1 && !event.shiftKey) {
      inputFocused.value = false
      showSuggestions.value = false
      highlightIndex.value = -1
    }
    // Let the tab event continue naturally
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    inputFocused.value = false
    showSuggestions.value = false
    highlightIndex.value = -1
    inputRef.value?.focus()
  }
}

function handleBlur() {
  emit('blur', props.modelValue)
  hideSuggestions()
}

// Cleanup timeout on component unmount
onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})

// Expose the focus method
function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div ref="containerRef" class="suggestion-input-container">
    <input 
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      :id="id"
      :name="name"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
    />
    <div v-if="loading && inputFocused && modelValue.trim()" class="loading">Searching...</div>
    <div v-if="showSuggestions && filteredSuggestions.length > 0 && !loading" class="suggestions">
      <div 
        v-for="(suggestion, index) in filteredSuggestions" 
        :key="suggestion.name"
        :ref="(el: any) => suggestionRefs[index] = el as HTMLElement"
        class="suggestion"
        :class="{ 'highlighted': index === highlightIndex }"
        tabindex="0"
        @click="selectSuggestion(suggestion)"
        @keydown.enter="selectSuggestion(suggestion)"
        @keydown="handleSuggestionKeydown($event, index)"
        @focus="highlightIndex = index"
      >
        {{ suggestion.name }} <span class="count">({{ suggestion.count }})</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.suggestion-input-container {
  position: relative;
}

.suggestions, .loading {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #222;
  border: 1px solid #555;
  border-radius: 0.5rem;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.suggestion {
  padding: 0.5rem;
  cursor: pointer;
  border-bottom: 1px solid #333;
  color: #fff;
}

.suggestion:hover, .suggestion:focus {
  background: #333;
  outline: none;
}

.suggestion.highlighted {
  background: #444;
  outline: 1px solid #666;
}

.suggestion:last-child {
  border-bottom: none;
}

.suggestion .count {
  color: #888;
  font-size: 0.8rem;
}

.loading {
  padding: 0.5rem;
  color: #ccc;
}
</style>