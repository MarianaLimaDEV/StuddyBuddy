import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Redireciona chamadas /api do frontend (5173) para o backend Express (3000)
      '/api': 'http://localhost:3000',
    },
  },
});

