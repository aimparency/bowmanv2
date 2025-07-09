<template>
  <div 
    @click="selectRepository"
    class="connection-status"
    :class="{ clickable: !apiConnection.currentRepo }">
    <h4>bowman server</h4>
    <p v-if="apiConnection.connected"> status: connected </p>
    <p v-else class="warning">no connection</p>
    <p v-if="apiConnection.currentRepo"> repo: {{ repoName }} </p>
    <p v-else class="warning clickable-hint">no repository - click to select</p>
    
    <!-- Hidden file input for directory selection -->
    <input 
      ref="directoryInput"
      type="file" 
      webkitdirectory 
      directory 
      multiple
      style="display: none"
      @change="handleDirectorySelect"
    />
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
    selectRepository() {
      // Only allow selection if no repository is currently set
      if (!this.apiConnection.currentRepo && this.apiConnection.connected) {
        const input = this.$refs.directoryInput as HTMLInputElement
        input.click()
      }
    },

    async handleDirectorySelect(event: Event) {
      const input = event.target as HTMLInputElement
      const files = input.files
      
      if (!files || files.length === 0) {
        return
      }

      // Get the directory path from the first file
      // We need to extract the directory path, not the file path
      const firstFile = files[0]
      const fullPath = firstFile.webkitRelativePath || firstFile.name
      
      // Extract directory path (everything before the first file)
      let directoryPath = ''
      
      // Try to get the actual directory path
      if (firstFile.webkitRelativePath) {
        // webkitRelativePath gives us "folder/subfolder/file.txt"
        // We want just the base folder path
        const pathParts = firstFile.webkitRelativePath.split('/')
        if (pathParts.length > 1) {
          directoryPath = pathParts[0]
        }
      }

      // For security reasons, browsers don't give us the full absolute path
      // But we can get the directory name and let the user specify the full path
      if (directoryPath) {
        const fullPathInput = prompt(
          `Selected directory: "${directoryPath}"\n\nPlease enter the full absolute path to this directory:`,
          `/path/to/${directoryPath}`
        )
        
        if (fullPathInput && fullPathInput.trim()) {
          await this.setRepository(fullPathInput.trim())
        }
      } else {
        // Fallback: ask user to enter the full path manually
        const pathInput = prompt('Please enter the full path to your repository directory:')
        if (pathInput && pathInput.trim()) {
          await this.setRepository(pathInput.trim())
        }
      }
      
      // Clear the input for next use
      input.value = ''
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
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.connection-status {
  * {
    margin: 0.1rem;
    pointer-events: none; 
  }
  position: fixed; 
  right: 2rem; 
  top: 2rem; 
  text-align: right; 
  background-color: shade(@mid1, 35%);
  opacity: 0.7; 
  padding: 1rem; 
  border-radius: 1rem; 
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 1; 
    background-color: @mid1;
    box-shadow: 0 0 2rem #0008; 
  }
  
  &.clickable {
    cursor: pointer;
    
    &:hover {
      background-color: shade(@mid1, 20%);
      transform: translateY(-1px);
    }
  }
  
  .clickable-hint {
    color: #88ccff !important;
    font-weight: bold;
    
    &:hover {
      color: #aaddff !important;
    }
  }
  
  .warning {
    color: #ffaa88;
  }
}
</style>
