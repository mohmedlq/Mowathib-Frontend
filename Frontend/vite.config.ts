import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7273',
        changeOrigin: true,
        secure: false,
      },
      '/hub': {
        target: 'https://localhost:7273',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

