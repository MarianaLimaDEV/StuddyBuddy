/**
 * Study statistics - tracks Pomodoro sessions and displays stats
 */
const STATS_KEY = 'studdybuddy_study_stats';

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

function saveStats(sessions, totalMinutes) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ sessions, totalMinutes }));
  } catch (_) {}
}

export function recordPomodoroSession(minutes) {
  const { sessions, totalMinutes } = getStats();
  const now = new Date();
  sessions.push({ date: now.toISOString().slice(0, 10), minutes });
  const total = totalMinutes + minutes;
  saveStats(sessions.slice(-500), total);
  return total;
}

export function getStudyStats() {
  return getStats();
}

export function formatMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h ${min}min` : `${h}h`;
}

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
      <h4 class="stats-title">Estatísticas de estudo</h4>
      <div class="stats-row">
        <span>Hoje:</span>
        <strong>${formatMinutes(todayMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>Últimos 7 dias:</span>
        <strong>${formatMinutes(weekMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>Total:</span>
        <strong>${formatMinutes(totalMinutes)}</strong>
      </div>
      <div class="stats-row">
        <span>Sessões:</span>
        <strong>${sessions.length}</strong>
      </div>
    </div>
  `;
}
