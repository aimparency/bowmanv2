import { defineStore } from 'pinia'

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
}

export const useNotifications = defineStore('notifications', {
  state: () => ({
    notifications: [] as Notification[]
  }),

  actions: {
    addNotification(notification: Omit<Notification, 'id'>) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const newNotification: Notification = {
        id,
        duration: 5000, // Default 5 seconds
        ...notification
      }

      this.notifications.push(newNotification)

      // Auto-remove notification after duration (unless persistent)
      if (!newNotification.persistent && newNotification.duration) {
        setTimeout(() => {
          this.removeNotification(id)
        }, newNotification.duration)
      }

      return id
    },

    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    clearAll() {
      this.notifications = []
    },

    // Convenience methods
    success(message: string, duration?: number) {
      return this.addNotification({ message, type: 'success', duration })
    },

    error(message: string, persistent = false, duration?: number) {
      return this.addNotification({ 
        message, 
        type: 'error', 
        persistent, 
        duration: persistent ? undefined : duration 
      })
    },

    warning(message: string, duration?: number) {
      return this.addNotification({ message, type: 'warning', duration })
    },

    info(message: string, duration?: number) {
      return this.addNotification({ message, type: 'info', duration })
    }
  }
})