import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — se carga siempre
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — se carga siempre (auth)
          'vendor-supabase': ['@supabase/supabase-js'],
          // Formularios + validación
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Iconos
          'vendor-icons': ['lucide-react'],
          // Exportación Excel — solo cuando se usa
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
