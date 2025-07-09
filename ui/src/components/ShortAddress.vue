<template>
  <span v-if="justCopiedToClipboard" class="short-address copied">
    copied!
  </span>
  <span v-else class="short-address" @click="toggle">
    {{ expanded ? address : shortAddress }}
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useWeb3Connection } from '../stores/web3-connection'

export default defineComponent({
  emits: ['update', 'drag-end'],
  props: {
    address: {
      type: String,
      required: true,
    }
  },
  data() {
    let w3c = useWeb3Connection()
    return {
      expanded: false,
      justCopiedToClipboard: false, 
      myeself: w3c.address
    }
  },
  computed: {
    shortAddress() {
      if(this.address == this.myeself) {
        return 'myself'
      }
      return this.address.substring(0, 6) + '...' + this.address.slice(-4)
    },
  },
  watch: {
    address() {
      this.expanded = false
      this.justCopiedToClipboard = false
    },
  }, 
  methods: {
    toggle() {
      if(this.expanded) {
        navigator.clipboard.writeText(this.address).then(() => {
          this.justCopiedToClipboard = true
          setTimeout(() => {
            this.justCopiedToClipboard = false
          }, 1700)
        })
      }
      this.expanded = !this.expanded
    },
  }
})
</script>

<style lang="less">
.short-address {
  cursor: pointer;
  white-space: nowrap;
  background-color: fade(@c1, 50%);
  padding: 0.25rem;  
  vertical-align: middle;
  border-radius: 0.3rem;
  user-select: none; 
}
.copied {
  background-color: fade(@c3, 50%);
}
</style>
