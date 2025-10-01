import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /@cleancue\/shared/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [
        commonjs({
          include: [/node_modules/, /@cleancue\/shared/],
        }),
      ],
    },
  },
})