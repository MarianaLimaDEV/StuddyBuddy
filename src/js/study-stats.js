/**
 * Study statistics - tracks Pomodoro sessions and syncs with MongoDB
 * Uses Network-First: syncs with API when online, falls back to localStorage
 * Queues offline sessions for sync via pendingSync
 */
import { tr } from './i18n.js';
import { authFetch, apiUrl } from './api-base.js';
import { isAuthenticated } from './utils.js';
import { addToPendingSync } from './pwa/db.js';
import { registerBackgroundSync } from './pwa/sync.js';

const STATS_KEY = 'studdybuddy_study_stats';
const STUDY_SESSIONS_API_URL = apiUrl('/api/study-sessions');

/**
 * Get local statistics from localStorage
 */
function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { sessions: [], totalMinutes: 0 };
    const data = JSON.parse(raw);
    return { sessions: data.sessions || [], totalMinutes: data.totalMinutes || 0 };
  } catch {
    return { sessions: [], totalMinutes: 0 };
  }
}

/**
 * Save statistics to localStorage
 */
function saveStats(sessions, totalMinutes) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ sessions, totalMinutes }));
  } catch (_) {}
}

/**
 * Record a Pomodoro session
 * - Records locally first (optimistic)
 * - Attempts to sync with backend if authenticated
 * - Queues for offline sync if network fails
 * @param {number} minutes - Number of minutes for the session
 * @param {string} [type='pomodoro'] - Session type: 'pomodoro', 'focus', 'manual'
 */
export async function recordPomodoroSession(minutes, type = 'pomodoro') {
  const { sessions, totalMinutes } = getStats();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Record locally first (optimistic update)
  sessions.push({ date: dateStr, minutes, type });
  const total = totalMinutes + minutes;
  saveStats(sessions.slice(-500), total);
  window.dispatchEvent(new CustomEvent('studystats-updated'));

  // Try to sync with server if authenticated
  if (isAuthenticated()) {
    try {
      const res = await authFetch(STUDY_SESSIONS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes,
          date: dateStr,
          type
        })
      });
      
      if (!res.ok) {
        console.warn('Server rejected study session, keeping locally');
      }
    } catch (err) {
      // Network error - queue for later sync
      console.warn('Failed to sync study session, queuing for later:', err);
      try {
        await addToPendingSync({
          type: 'POST',
          url: STUDY_SESSIONS_API_URL,
          body: {
            minutes,
            date: dateStr,
            type
          }
        });
        await registerBackgroundSync();
      } catch (syncError) {
        console.warn('Failed to queue study session for sync:', syncError);
      }
    }
  }

  return total;
}

/**
 * Get study statistics
 * @returns {{sessions: Array, totalMinutes: number}}
 */
export function getStudyStats() {
  return getStats();
}

/**
 * Format minutes into human-readable string
 * @param {number} m - Minutes to format
 * @returns {string}
 */
export function formatMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h ${min}min` : `${h}h`;
}

/**
 * Render statistics in a container
 * @param {string} containerId - ID of the container element
 */
export function renderStatsIn(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { sessions, totalMinutes } = getStats();
  const today = new Date().toISOString().slice(0, 10);
  const todayMinutes = sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekMinutes = sessions.filter(s => s.date >= weekStart.toISOString().slice(0, 10)).reduce((a, s) => a + s.minutes, 0);

  container.innerHTML = `
    <div class="stats-box">
      <h4 class="stats-title">${tr('statsTitle')}</h4>
      <div class="stats-row">
        <span>${tr('statsToday')}</span>
        <strong>${formatMinutes(todayMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>${tr('statsWeek')}</span>
        <strong>${formatMinutes(weekMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>${tr('statsTotal')}</span>
        <strong>${formatMinutes(totalMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>${tr('statsSessions')}</span>
        <strong>${sessions.length}</strong>
      </div>
    </div>
  `;
}

/**
 * Sync local stats with server (for authenticated users)
 * Merges server data with local data
 */
export async function syncStudyStats() {
  if (!isAuthenticated()) return;

  try {
    const res = await authFetch(STUDY_SESSIONS_API_URL);
    if (!res.ok) return;

    const serverSessions = await res.json();
    if (!Array.isArray(serverSessions)) return;

    const { sessions: localSessions, totalMinutes: localTotal } = getStats();

    // Create a map of local sessions by date and type
    const localMap = new Map();
    localSessions.forEach(s => {
      const key = `${s.date}-${s.type}`;
      localMap.set(key, (localMap.get(key) || 0) + s.minutes);
    });

    // Merge server sessions
    const mergedMap = new Map(localMap);
    serverSessions.forEach(s => {
      const key = `${s.date}-${s.type || 'pomodoro'}`;
      mergedMap.set(key, (mergedMap.get(key) || 0) + s.minutes);
    });

    // Convert back to array format (limit to 500 most recent)
    const mergedSessions = [];
    const sortedKeys = Array.from(mergedMap.keys()).sort().reverse().slice(0, 500);
    sortedKeys.forEach(key => {
      const [date, type] = key.split('-');
      const minutes = mergedMap.get(key);
      mergedSessions.push({ date, minutes, type });
    });

    // Calculate new total
    const newTotal = Array.from(mergedMap.values()).reduce((a, b) => a + b, 0);

    // Save merged data
    saveStats(mergedSessions, newTotal);
    window.dispatchEvent(new CustomEvent('studystats-updated'));
  } catch (err) {
    console.warn('Failed to sync study stats:', err);
  }
}
