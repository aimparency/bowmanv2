<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div 
        v-for="notification in notifications.notifications" 
        :key="notification.id"
        class="notification"
        :class="[`notification--${notification.type}`]"
        @click="removeNotification(notification.id)"
      >
        <div class="notification__content">
          <div class="notification__icon">
            <span v-if="notification.type === 'success'">✓</span>
            <span v-else-if="notification.type === 'error'">✗</span>
            <span v-else-if="notification.type === 'warning'">⚠</span>
            <span v-else-if="notification.type === 'info'">ℹ</span>
          </div>
          <div class="notification__message">{{ notification.message }}</div>
          <button 
            class="notification__close"
            @click.stop="removeNotification(notification.id)"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useNotifications } from '../stores/notifications'

const notifications = useNotifications()

function removeNotification(id: string) {
  notifications.removeNotification(id)
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10000;
  pointer-events: none;
}

.notification {
  background: #333;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  min-width: 300px;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: pointer;
  border-left: 4px solid;
}

.notification--success {
  border-left-color: #4ade80;
  background: linear-gradient(to right, #065f46, #333);
}

.notification--error {
  border-left-color: #f87171;
  background: linear-gradient(to right, #7f1d1d, #333);
}

.notification--warning {
  border-left-color: #fbbf24;
  background: linear-gradient(to right, #78350f, #333);
}

.notification--info {
  border-left-color: #60a5fa;
  background: linear-gradient(to right, #1e3a8a, #333);
}

.notification__content {
  display: flex;
  align-items: center;
  padding: 1rem;
  color: white;
}

.notification__icon {
  font-size: 1.2rem;
  font-weight: bold;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.notification__message {
  flex: 1;
  line-height: 1.4;
}

.notification__close {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  margin-left: 0.75rem;
  line-height: 1;
  flex-shrink: 0;
}

.notification__close:hover {
  color: white;
}

/* Transition animations */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>