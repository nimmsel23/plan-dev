// Only used by browser-server.mjs; never part of a release build.
export * from '../../src/lib/db/index.js';
export const getUid = () => localStorage.getItem('test-persona') || 'client';
export function watchAuth(callback) {
  const uid = getUid();
  document.cookie = `test-persona=${uid}; path=/; SameSite=Lax`;
  callback({ uid, displayName: uid === 'coach' ? 'Test Coach' : 'Test Client', email: `${uid}@isolated.test` });
  return () => {};
}
export async function getUserProfile() { return {}; }
