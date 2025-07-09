<template>
  <div class="log" :style="{width}">
    <div v-for="logEntry in ui.logEntries" :key="logEntry.key">
      <div
        class="entry" :key="logEntry.key" 
        :class="{[logEntry.type]: true, fading: logEntry.fade}"
        >
        {{logEntry.type}}: {{ logEntry.message }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

import { useUi } from "../stores/ui"

export default defineComponent({
  name: "Log",
  data() {
    return {
      ui: useUi()
    }
  }, 
  computed: {
    width() {
      const screenSize = this.ui.screenSize
      const portrait = screenSize[0] > screenSize[1]
      let width = 0
      if(!portrait) {
        width = 100
      } else {
        width = 100 - Math.max(50 * screenSize[1] / screenSize[0], 20) 
      }
      return width + "%"
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.log{
  position: fixed;
  right: 0; 
  bottom: 1rem; 
  pointer-events: none; 
  text-align: right; 
  .entry{
    position: relative; 
    display: inline-block; 
    pointer-events: all; 
    cursor: text; 
    margin: 0.25rem; 
    max-width: calc(100% - 2.5rem); 
    right: 1rem; 
    box-sizing: border-box;
    padding: 0.25rem;
    border-radius: 0.25rem; 
    color: white; 
    opacity: 0.7; 
    transition: opacity 0.2s;
    &.error{
      background-color: #900; 
    }
    &.info{
      background-color: #369; 
    }
    &:hover {
      opacity: 1; 
    }
    &.fading {
      transition: opacity 2s;
      opacity: 0; 
    }
  }
}
</style>
