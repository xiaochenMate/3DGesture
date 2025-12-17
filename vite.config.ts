
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    host: true
  }
});
