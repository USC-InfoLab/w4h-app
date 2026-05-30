// Utility to check if a folder exists (browser/Node hybrid)
export async function folderExists(path) {
  // In browser, can't check filesystem directly; always return true for default path
  if (typeof window !== 'undefined') {
    // You may want to check with the backend in a real app
    return true;
  }
  // In Node (SSR), use fs
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
