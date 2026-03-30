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
      // onnxruntime-web CJS require workaround for Vite 8
      'onnxruntime-web/wasm': path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.bundle.min.mjs'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['aivalink.dororong.dev', 'localhost'],
  },
  optimizeDeps: {
    include: ['onnxruntime-web'],
  },
})
