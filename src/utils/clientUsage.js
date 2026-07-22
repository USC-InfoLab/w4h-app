import { api, authHeaders } from '@/utils/api';

const SESSION_KEY = 'w4h.usage.session_id';
const SESSION_STARTED_KEY = 'w4h.usage.session_started';

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function postClientUsage(payload) {
  const token = localStorage.getItem('w4h.user.token');
  if (!token) return;
  api.post('config/client-usage', payload, authHeaders()).catch(() => {
    /* best-effort — never block navigation */
  });
}

/** Once per browser tab session after login. */
export function trackSessionStart() {
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY)) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, '1');
  } catch {
    /* ignore */
  }
  postClientUsage({
    event_type: 'session.start',
    session_id: getOrCreateSessionId(),
    path: typeof window !== 'undefined' ? window.location.pathname : null,
  });
}

let lastPageKey = '';
let lastPageAt = 0;

/** Deduped page views for authenticated routes (not guest). */
export function trackPageView({ path, routeName } = {}) {
  const now = Date.now();
  const key = `${routeName || ''}|${path || ''}`;
  if (key === lastPageKey && now - lastPageAt < 5000) return;
  lastPageKey = key;
  lastPageAt = now;

  postClientUsage({
    event_type: 'page.view',
    session_id: getOrCreateSessionId(),
    path: path || null,
    route_name: routeName || null,
  });
}

export function clearUsageSessionFlags() {
  try {
    sessionStorage.removeItem(SESSION_STARTED_KEY);
  } catch {
    /* ignore */
  }
  lastPageKey = '';
  lastPageAt = 0;
}
