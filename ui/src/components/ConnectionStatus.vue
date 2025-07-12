<template>
  <div class="connection-status">
    <input 
      ref="pathInput"
      type="text" 
      placeholder="Enter absolute path to repository directory"
      v-model="repositoryPath"
      @input="onPathInput"
      class="path-input"
    />
    <p v-if="apiConnection.connected && apiConnection.currentRepo" class="status-success">
      connected - repo found
    </p>
    <p v-else-if="apiConnection.connected" class="status-warning">
      connected - no repo selected
    </p>
    <p v-else class="status-error">
      no connection
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useApiConnection } from "../stores/api-connection";
import { useAimNetwork } from "../stores/aim-network-git";
import { useUi } from "../stores/ui";

export default defineComponent({
  name: "ConnectionStatus",
  props: {
    msg: String,
  },
  data() {
    return {
      repositoryPath: import.meta.env.DEV ? '/home/felix/dev/aimparency/bowman-v2/test-repo' : '',
      debounceTimer: null as ReturnType<typeof setTimeout> | null
    }
  },
  computed: {
    connected() {
      return this.apiConnection.connected
    }, 
    repoName() {
      let full = this.apiConnection.currentRepo
      if (!full) return ""
      const parts = full.split('/')
      return parts[parts.length - 1]
    }
  }, 
  setup() {
    const apiConnection = useApiConnection()
    const aimNetwork = useAimNetwork()
    const ui = useUi()
    return {
      apiConnection,
      aimNetwork,
      ui
    }
  },
  methods: {
    onPathInput() {
      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      
      // Set new timer for 500ms debounce
      this.debounceTimer = setTimeout(() => {
        this.trySetRepository()
      }, 500)
    },

    async trySetRepository() {
      const path = this.repositoryPath.trim()
      if (!path) {
        return
      }
      
      try {
        await this.setRepository(path)
      } catch (error) {
        // Silently handle errors - status will show "no repo selected"
      }
    },


    async setRepository(path: string) {
      try {
        this.ui.log(`Setting repository to: ${path}`, 'info')
        
        // First try to set the repository
        const result = await this.apiConnection.setRepository(path)
        
        if (result.success) {
          this.ui.log(`Repository set successfully: ${result.path}`, 'success')
          
          // Load the repository data
          await this.aimNetwork.loadRepository(result.path)
          
          this.ui.log('Repository loaded successfully', 'success')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Check if it's a "repository not initialized" error
        if (errorMessage.includes('not initialized') || errorMessage.includes('meta.json')) {
          const shouldInitialize = confirm(
            `Repository not found or not initialized at: ${path}\n\nWould you like to initialize a new Bowman repository here?`
          )
          
          if (shouldInitialize) {
            await this.initializeRepository(path)
          }
        } else {
          this.ui.log(`Failed to set repository: ${errorMessage}`, 'error')
        }
      }
    },

    async initializeRepository(path: string) {
      try {
        const title = prompt('Enter a title for the root aim of this repository:', 'Main Project Goal')
        if (!title) return

        const description = prompt('Enter a description for the root aim:', 'This is the main objective of this project')
        if (!description) return

        this.ui.log(`Initializing repository at: ${path}`, 'info')
        
        await this.aimNetwork.initializeRepository(path, {
          title: title.trim(),
          description: description.trim(),
          effort: 5
        })
        
        this.ui.log('Repository initialized and loaded successfully', 'success')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.ui.log(`Failed to initialize repository: ${errorMessage}`, 'error')
      }
    },

    async waitForServerAndConnect() {
      // Wait for server connection to be established
      let attempts = 0
      const maxAttempts = 20 // 10 seconds max
      
      while (attempts < maxAttempts) {
        if (this.apiConnection.connected && !this.apiConnection.currentRepo) {
          // Server is connected and no repo is set, try connecting
          await this.trySetRepository()
          return
        }
        
        if (this.apiConnection.currentRepo) {
          // Already has a repo, no need to auto-connect
          return
        }
        
        // Wait 500ms before trying again
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
      }
    }

  },
  mounted() {
    // Auto-connect to test-repo in development mode after server is ready
    if (import.meta.env.DEV && this.repositoryPath) {
      this.waitForServerAndConnect()
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.connection-status {
  position: fixed; 
  right: 2rem; 
  top: 2rem; 
  text-align: right; 
  background-color: shade(@mid1, 35%);
  opacity: 0.7; 
  padding: 1rem; 
  border-radius: 1rem; 
  transition: all 0.2s ease;
  min-width: 280px;
  
  &:hover {
    opacity: 1; 
    background-color: @mid1;
    box-shadow: 0 0 2rem #0008; 
  }
  
  .path-input {
    width: 100%;
    padding: 0.5rem;
    background-color: #333;
    color: white;
    border: 1px solid #555;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    
    &:focus {
      outline: none;
      border-color: #88ccff;
    }
    
    &::placeholder {
      color: #888;
    }
  }
  
  .status-success {
    color: #88ff88;
    font-size: 0.8rem;
    margin: 0;
  }
  
  .status-warning {
    color: #ffaa88;
    font-size: 0.8rem;
    margin: 0;
  }
  
  .status-error {
    color: #ff6666;
    font-size: 0.8rem;
    margin: 0;
  }
}
</style>
