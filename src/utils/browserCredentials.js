/**
 * Chrome/Edge password manager helpers for the SPA login form.
 * Safari still uses the native Save Password / AutoFill UI.
 */
export async function storeLoginCredential(email, password) {
  const id = String(email || '').trim();
  if (!id || password == null || password === '') return;
  try {
    if (typeof PasswordCredential === 'undefined' || !navigator.credentials?.store) return;
    await navigator.credentials.store(new PasswordCredential({ id, password: String(password), name: id }));
  } catch {
    // User or browser declined.
  }
}

export async function getLoginCredential() {
  try {
    if (!navigator.credentials?.get) return null;
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'optional',
    });
    if (!cred || !('password' in cred)) return null;
    const id = String(cred.id || '').trim();
    const password = cred.password == null ? '' : String(cred.password);
    if (!id && !password) return null;
    return { email: id, password };
  } catch {
    return null;
  }
}
