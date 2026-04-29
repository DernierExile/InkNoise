import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: 'static',
  build: {
    copyPublicDir: true,
    assetsInlineLimit: 0,
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
