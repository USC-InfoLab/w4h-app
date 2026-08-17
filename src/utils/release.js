import pkg from '../../package.json';

export const releaseName =
  import.meta.env.VITE_RELEASE_NAME || pkg.releaseName || '';

export const appVersion =
  import.meta.env.VITE_VERSION || import.meta.env.VITE_APP_VERSION || pkg.version;

export const gitHash = import.meta.env.VITE_GIT_HASH || '';

export function formatReleaseLabel() {
  return [releaseName, appVersion].filter(Boolean).join(' ');
}
