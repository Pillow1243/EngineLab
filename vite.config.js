import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative base → works at https://<user>.github.io/EngineLab/ (GitHub Pages)
  // and in dev/preview environments without path assumptions
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: { chunkSizeWarningLimit: 1600 },
});
