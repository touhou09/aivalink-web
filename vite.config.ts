import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@framework': path.resolve(__dirname, './src/WebSDK/Framework/src'),
      '@cubismsdksamples': path.resolve(__dirname, './src/WebSDK/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync('/tmp/aivalink-key.pem'),
      cert: fs.readFileSync('/tmp/aivalink-cert.pem'),
    },
    hmr: {
      host: '192.168.55.100',
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
})
