// Durable local edits plus serialized remote writes. Inject storage/write for tests.
export function createWorkoutDraft({ key, storage, write, onState = () => {} }) {
  let queue = Promise.resolve();
  let latest = null;
  let revision = 0;
  function read() {
    try { const value = JSON.parse(storage.getItem(key)); return Array.isArray(value?.exercises) ? value.exercises : null; }
    catch { return null; }
  }
  function stage(exercises) {
    latest = exercises;
    revision += 1;
    try { storage.setItem(key, JSON.stringify({ exercises, savedAt: Date.now() })); onState('pending'); }
    catch { onState('storage-error'); }
  }
  function save() {
    if (!latest) return queue;
    const snapshot = structuredClone(latest);
    const version = revision;
    queue = queue.catch(() => {}).then(async () => {
      onState('saving');
      try {
        await write(snapshot);
        if (revision === version) {
          latest = null;
          storage.removeItem(key);
          onState('saved');
        }
      } catch (error) { onState('error'); throw error; }
    });
    return queue;
  }
  async function flush() {
    await save();
    if (latest) await flush();
  }
  function clear() { latest = null; revision += 1; storage.removeItem(key); }
  return { read, stage, save, flush, clear };
}
