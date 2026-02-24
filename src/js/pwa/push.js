/**
 * PWA — Push API / Web Push
 * Pedir permissão, subscrever com VAPID e enviar a subscrição ao backend.
 * O Service Worker já trata os eventos push e notificationclick.
 */

import { apiFetch, apiUrl } from '../api-base.js';

const VAPID_PUBLIC_ENDPOINT = apiUrl('/api/push/vapid-public');
const SUBSCRIBE_ENDPOINT = apiUrl('/api/push/subscribe');
const UNSUBSCRIBE_ENDPOINT = apiUrl('/api/push/unsubscribe');

/**
 * Obtém a chave pública VAPID do backend (para PushManager.subscribe).
 */
export async function getVapidPublicKey() {
  const res = await apiFetch(VAPID_PUBLIC_ENDPOINT);
  if (!res.ok) throw new Error('VAPID public key not available');
  const data = await res.json();
  const key = data.publicKey || data.public_key;
  if (!key) throw new Error('Invalid VAPID response');
  return key;
}

/**
 * Converte a chave pública (base64url) para Uint8Array para o PushManager.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Subscreve o PushManager do Service Worker com a chave VAPID.
 */
export async function subscribePush(registration) {
  const key = await getVapidPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(key);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  return subscription;
}

/**
 * Envia a subscrição (JSON) ao backend para o servidor poder enviar notificações.
 */
export async function sendSubscriptionToBackend(subscription, authToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await apiFetch(SUBSCRIBE_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(subscription.toJSON ? subscription.toJSON() : subscription),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Subscribe failed: ${res.status}`);
  }
  return res.json();
}

/** Remove a subscrição do backend (por endpoint). */
export async function removeSubscriptionFromBackend(endpoint, authToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await apiFetch(UNSUBSCRIBE_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Unsubscribe failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Verifica se as notificações estão permitidas.
 */
export function getNotificationPermission() {
  if (!('Notification' in self)) return 'unsupported';
  return Notification.permission;
}

/**
 * Pede permissão para notificações (resolve com 'granted' | 'denied' | 'default').
 */
export async function requestNotificationPermission() {
  if (!('Notification' in self)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Inicializa Web Push: pede permissão, subscreve e envia ao backend.
 * Opcional: passar getAuthToken() para associar a um utilizador.
 * Chamar após o utilizador aceitar (ex.: botão "Ativar notificações").
 */
export async function initPush(options = {}) {
  const { getAuthToken } = options;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await subscribePush(reg);
    const token = typeof getAuthToken === 'function' ? await getAuthToken() : null;
    await sendSubscriptionToBackend(subscription, token);
    return { ok: true, subscription };
  } catch (e) {
    console.warn('Push init failed', e);
    return { ok: false, reason: e.message };
  }
}

/**
 * Desativa Web Push: unsubscribe local e remove do backend.
 */
export async function disablePush(options = {}) {
  const { getAuthToken } = options;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true, removed: false };
  const endpoint = sub.endpoint;

  try {
    await sub.unsubscribe();
  } catch {
    // best-effort
  }

  const token = typeof getAuthToken === 'function' ? await getAuthToken() : null;
  await removeSubscriptionFromBackend(endpoint, token).catch(() => {});
  return { ok: true, removed: true };
}

/**
 * Verifica se já existe uma subscrição ativa.
 */
export async function hasActivePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
