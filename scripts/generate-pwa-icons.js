#!/usr/bin/env node
/**
 * Gera ícones PWA a partir de SB_B.png e SB_W.png na raiz do projeto.
 * Executa: node scripts/generate-pwa-icons.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DARK = path.join(ROOT, 'SB_B.png');
const SRC_LIGHT = path.join(ROOT, 'SB_W.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

const SIZES = [48, 96, 144, 192, 256, 384, 512];

if (!fs.existsSync(SRC_DARK)) {
  console.error('SB_B.png não encontrado na raiz do projeto.');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const darkBuf = fs.readFileSync(SRC_DARK);
const lightBuf = fs.existsSync(SRC_LIGHT) ? fs.readFileSync(SRC_LIGHT) : darkBuf;

for (const size of SIZES) {
  fs.writeFileSync(path.join(OUT_DIR, `icon-${size}.png`), darkBuf);
}
fs.writeFileSync(path.join(OUT_DIR, 'apple-touch-icon.png'), darkBuf);
fs.writeFileSync(path.join(OUT_DIR, 'icon-light-192.png'), lightBuf);

console.log('✓ Ícones PWA gerados em public/icons/');
