import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Redireciona chamadas /api do frontend (5173) para o backend Express
      // Usamos 3001 no "npm run start" para evitar conflitos com 3000.
      '/api': 'http://localhost:3001',
    },
  },
});

