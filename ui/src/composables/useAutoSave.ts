import { ref, nextTick } from 'vue'
import { useNotifications } from '../stores/notifications'

interface AutoSaveOptions {
  delay?: number
  immediate?: boolean
}

export function useAutoSave(
  saveFunction: () => Promise<void> | void,
  options: AutoSaveOptions = {}
) {
  const { delay = 1000, immediate = false } = options
  const notifications = useNotifications()
  
  const isSaving = ref(false)
  const isDirty = ref(false)
  const saveTimeout = ref<number | null>(null)
  
  const save = async () => {
    if (isSaving.value) return
    
    try {
      isSaving.value = true
      isDirty.value = false
      
      await saveFunction()
      
      // Brief success indication
      await nextTick()
      
    } catch (error) {
      console.error('Auto-save failed:', error)
      notifications.error('Failed to save changes')
      isDirty.value = true // Mark as dirty again since save failed
    } finally {
      isSaving.value = false
    }
  }
  
  const debouncedSave = () => {
    isDirty.value = true
    
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    
    if (immediate) {
      save()
    } else {
      saveTimeout.value = window.setTimeout(() => {
        save()
        saveTimeout.value = null
      }, delay)
    }
  }
  
  const saveImmediately = () => {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
      saveTimeout.value = null
    }
    save()
  }
  
  const cancelSave = () => {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
      saveTimeout.value = null
    }
    isDirty.value = false
  }
  
  return {
    isSaving,
    isDirty,
    debouncedSave,
    saveImmediately,
    cancelSave
  }
}