import { onMounted, onUnmounted } from 'vue'
import { useAimNetwork } from '../stores/aim-network-git'
import { useUi } from '../stores/ui'

export function useKeyboardShortcuts() {
  const aimNetwork = useAimNetwork()
  const ui = useUi()

  function handleKeydown(event: KeyboardEvent) {
    // Don't trigger shortcuts when typing in inputs/textareas
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return
    }

    // Ctrl/Cmd + S - Save changes
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (aimNetwork.selectedAim) {
        aimNetwork.commitAimChanges(aimNetwork.selectedAim)
      }
      return
    }

    // Escape - Deselect/close
    if (event.key === 'Escape') {
      event.preventDefault()
      if (aimNetwork.selectedAim || aimNetwork.selectedFlow) {
        aimNetwork.deselect()
      } else if (ui.sideMenuOpen) {
        ui.sideMenuOpen = false
      }
      return
    }

    // Delete - Remove selected aim/flow
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      if (aimNetwork.selectedFlow) {
        aimNetwork.removeFlow(aimNetwork.selectedFlow)
      } else if (aimNetwork.selectedAim) {
        aimNetwork.removeAim(aimNetwork.selectedAim)
      }
      return
    }

    // Tab - Toggle sidebar
    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      ui.sideMenuOpen = !ui.sideMenuOpen
      return
    }

    // Arrow keys - Navigate between aims
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      navigateAims(event.key)
      return
    }

    // Numbers 1-9 - Quick status toggle (if aim selected)
    if (event.key >= '1' && event.key <= '9' && aimNetwork.selectedAim) {
      event.preventDefault()
      const statusOptions = ['not_reached', 'reached']
      const index = parseInt(event.key) - 1
      if (index < statusOptions.length) {
        aimNetwork.selectedAim.updateStatus(statusOptions[index])
      }
      return
    }
  }

  function navigateAims(direction: string) {
    const aims = Object.values(aimNetwork.aims)
    if (aims.length === 0) return

    let currentIndex = aimNetwork.selectedAim 
      ? aims.findIndex(aim => aim.id === aimNetwork.selectedAim!.id)
      : -1

    let nextIndex: number
    switch (direction) {
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex <= 0 ? aims.length - 1 : currentIndex - 1
        break
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = currentIndex >= aims.length - 1 ? 0 : currentIndex + 1
        break
      default:
        return
    }

    if (nextIndex >= 0 && nextIndex < aims.length) {
      aimNetwork.selectAim(aims[nextIndex])
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    // Expose methods for programmatic use if needed
    navigateAims,
  }
}