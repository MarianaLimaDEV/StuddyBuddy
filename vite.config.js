import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const CERT_DIR = path.resolve(process.cwd(), 'certs');
const CERT_FILE = path.join(CERT_DIR, 'localhost.pem');
const KEY_FILE = path.join(CERT_DIR, 'localhost-key.pem');

const hasHttpsCerts = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);

export default defineConfig({
  // Vercel deploys at the site root.
  base: '/',
  css: {
    // Ensures SCSS preprocessing is configured for production builds.
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  server: {
    https: hasHttpsCerts
      ? {
          cert: fs.readFileSync(CERT_FILE),
          key: fs.readFileSync(KEY_FILE),
        }
      : false,
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
  preview: {
    https: hasHttpsCerts
      ? {
          cert: fs.readFileSync(CERT_FILE),
          key: fs.readFileSync(KEY_FILE),
        }
      : false,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/js/utils.js')) return 'utils';
          if (id.includes('/src/js/pwa/')) return 'pwa';
          return undefined;
        },
      },
    },
  },
});

