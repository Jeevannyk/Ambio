import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pin the dev server so it never silently jumps to 5174/5175 (which led to
  // viewing a different app on the wrong port). Fail loudly if 5173 is taken.
  server: {
    port: 5173,
    strictPort: true,
    // In dev the token server runs separately (npm run server, :3001).
    // Proxy /api so the frontend can fetch join tokens same-origin.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
