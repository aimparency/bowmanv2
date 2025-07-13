<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApiConnection } from '../stores/api-connection'
import FuzzySearchInput from './FuzzySearchInput.vue'

const props = defineProps<{
  modelValue: string[]
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', tags: string[]): void
}>()

const input = ref('')
const allTags = ref<{ name: string; count: number }[]>([])
const fuzzySearchRef = ref<InstanceType<typeof FuzzySearchInput>>()
const apiConnection = useApiConnection()
const isLoading = ref(false)
const error = ref('')

// Cache tags to avoid repeated API calls
const tagCache = ref<{ data: { name: string; count: number }[], timestamp: number } | null>(null)
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function addTag() {
  const cleaned = input.value.trim()
  if (!cleaned) return
  
  // Validate tag length
  if (cleaned.length > maxTagLength) {
    error.value = `Tag too long (max ${maxTagLength} characters)`
    return
  }
  
  // Check for duplicates
  if (props.modelValue.includes(cleaned)) {
    error.value = 'Tag already exists'
    return
  }
  
  // Clear any previous errors
  error.value = ''
  
  emit('update:modelValue', [...props.modelValue, cleaned])
  input.value = ''
  
  // Refocus the input after adding a tag
  setTimeout(() => {
    fuzzySearchRef.value?.focus()
  }, 0)
}

function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

function removePreviousIfEmpty() {
  if (input.value === '') {
    removeTag(props.modelValue[props.modelValue.length - 1])
  }
}

const maxTagLength = 25
function ensureMaxLength() {
  if (input.value.length > maxTagLength) {
    input.value = input.value.slice(0, maxTagLength)
  }
}

// Filter out already selected tags
const availableTags = computed(() => {
  return allTags.value.filter(tag => !props.modelValue.includes(tag.name))
})

function handleInput(value: string) {
  input.value = value
  ensureMaxLength()
  
  // Clear error when user starts typing
  if (error.value) {
    error.value = ''
  }
}

function handleSelect(suggestion: { name: string; count: number }) {
  input.value = suggestion.name
  addTag()
}

function handleEnter() {
  addTag()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    removePreviousIfEmpty()
  }
}

async function loadAllTags() {
  if (!apiConnection.currentRepo) return
  
  // Check cache first
  const now = Date.now()
  if (tagCache.value && (now - tagCache.value.timestamp) < CACHE_DURATION) {
    allTags.value = tagCache.value.data
    return
  }
  
  try {
    isLoading.value = true
    error.value = ''
    const api = apiConnection.getAPI()
    const tags = await api.getTags()
    
    // Update cache
    tagCache.value = { data: tags, timestamp: now }
    allTags.value = tags
  } catch (err) {
    console.error('Failed to load tags:', err)
    error.value = 'Failed to load tags'
    allTags.value = []
  } finally {
    isLoading.value = false
  }
}

// Watch for repository changes to reload tags
watch(() => apiConnection.currentRepo, (newRepo) => {
  if (newRepo) {
    loadAllTags()
  }
})

onMounted(() => {
  loadAllTags()
})
</script>

<template>
  <div class="tag-input-area">
    <div class="label"> {{ label ?? 'Tags' }}: </div>
    <div v-for="tag in modelValue" :key="tag" class="tag">
      {{ tag }}
      <button class="x" @click="removeTag(tag)">✖</button>
    </div>
    <div class="no-wrap">
      <div class="input-container">
        <FuzzySearchInput
          ref="fuzzySearchRef"
          :modelValue="input"
          :suggestions="availableTags"
          :loading="isLoading"
          name="new-tag"
          placeholder="Add tag..."
          @update:modelValue="handleInput"
          @select="handleSelect"
          @enter="handleEnter"
          @keydown="handleKeydown"
        />
      </div>
      <button @click="addTag" class="add" :disabled="!input.trim()">Add</button>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.label {
  display: inline-block;
  margin-left: 1rem;
  color: #ccc;
  font-size: 0.9rem;
}

.tag, .add {
  display: inline-block;
  padding: 0.5rem 1rem; 
  border-radius: 1rem;
  border: none;
  margin: 0.25rem; 
  min-width: 0;
}

.add {
  background-color: #fff2;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
}

.add:hover:not(:disabled) {
  background-color: #fff3;
}

.add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ff6b6b;
  font-size: 0.8rem;
  margin: 0.25rem 0;
  padding: 0 1rem;
}

.tag-input-area {
  width: 100%;
  padding: 0.5rem;
  background: linear-gradient(15deg, #333, #444);
  border-radius: 1rem;
  margin: 0.5rem 0;
}

.no-wrap {
  display: inline-block;
  white-space: nowrap;
}

.input-container {
  display: inline-block;
}

.input-container :deep(input) {
  border: none;
  background-color: #0004;
  display: inline-block;
  padding: 0.5rem 1rem; 
  border-radius: 1rem;
  margin: 0.25rem; 
  min-width: 0;
  color: #fff;
}

.input-container :deep(input)::placeholder {
  color: #888;
}

.tag {
  position: relative;
  background-color: #fff3;
  color: #333;
  padding: 0.25rem 1rem; 
  padding-right: 2rem;
}

.tag .x {
  position: absolute;
  right: 0;
  top: 50%;
  margin: 0;
  transform: translateY(-50%);
  height: 100%;
  aspect-ratio: 1;
  border: none;
  background: none;
  cursor: pointer;
  color: #666;
  font-size: 0.8rem;
}

.tag .x:hover {
  color: #333;
}
</style>