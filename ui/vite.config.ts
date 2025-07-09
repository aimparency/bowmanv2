import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    target: 'es2020',    
    chunkSizeWarningLimit: 1000
  },
  css: {
    preprocessorOptions: {
      less: {
        additionalData: '@import "./src/global.scss";'
      }
    }
  }
})

