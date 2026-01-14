import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Se for testar no PC, deixe apenas '/'
  base: '/', 
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  }
});