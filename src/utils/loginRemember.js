const LAST_EMAIL_KEY = 'w4h.lastLoginEmail';

export function readLastLoginEmail() {
  try {
    return String(localStorage.getItem(LAST_EMAIL_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function rememberLoginEmail(email) {
  const next = String(email || '').trim();
  try {
    if (next) localStorage.setItem(LAST_EMAIL_KEY, next);
    else localStorage.removeItem(LAST_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}
