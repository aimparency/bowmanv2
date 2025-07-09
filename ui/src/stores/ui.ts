import { defineStore } from 'pinia'

import * as vec2 from '../vec2'

interface LogEntry {
  message: string
  type: string
  key: number 
  fade: boolean
} 

export const useUi = defineStore('ui', {
  state() {
    return {
      screenSize: vec2.create(),
      sideMenuOpen: true,
      logEntries: [] as LogEntry[], 
      nextLogId: 0, 
      tabs: ['aims', 'changes'], 
      openTab: 'aims', 
      confirmExit: false, 
    }
  }, 
  actions: {
    setScreenSize(x: number, y: number) {
      this.screenSize = vec2.fromValues(x, y)
    }, 
    toggleSideMenu() {
      this.sideMenuOpen = !this.sideMenuOpen
    }, 
    log(message: string, type: string) {
      let logEntry = {
        message, 
        type, 
        key: this.nextLogId++,
        fade: false
      } 
      this.logEntries.push(logEntry)
      logEntry = this.logEntries[this.logEntries.length - 1]
      setTimeout(() => {
        logEntry.fade = true
        setTimeout(() => {
          this.logEntries.shift()
        }, 2000)
      }, 10000)
    }, 
    promtOnExit() {
      this.confirmExit = true
      this.openTab = 'changes'
      this.sideMenuOpen = true
    }
  }
})
