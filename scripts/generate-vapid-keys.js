#!/usr/bin/env node
/**
 * Gera um par de chaves VAPID para Web Push.
 * Copiar o output para .env:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 */
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('Adiciona ao teu .env:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
