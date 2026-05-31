// Offline-first support: a local cache of the user's data (so the app opens
// instantly and works with no signal) plus a durable queue of pending writes
// that replays to Supabase when connectivity returns.
//
// Everything is keyed per user and persisted in localStorage. Now that images
// live in Storage (URLs, not base64), the cached payload is small enough to fit
// comfortably.

const cacheKey = (userId) => `igt-cache-${userId}`;
const queueKey = (userId) => `igt-queue-${userId}`;

export const isOnline = () =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

// ---- Snapshot cache --------------------------------------------------------

export const loadCache = (userId) => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const saveCache = (userId, data) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch (e) {
    console.error('Local cache save failed:', e.message);
  }
};

// ---- Pending-write queue ---------------------------------------------------

const readQueue = (userId) => {
  try {
    const raw = localStorage.getItem(queueKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const writeQueue = (userId, ops) => {
  try {
    localStorage.setItem(queueKey(userId), JSON.stringify(ops));
  } catch (e) {
    console.error('Sync queue save failed:', e.message);
  }
};

export const pendingCount = (userId) => readQueue(userId).length;

// Append a write to the queue. An op is a serializable description of a
// Supabase mutation: { op: 'insert'|'update'|'delete', table, values?, match? }.
export const enqueueOp = (userId, op) => {
  const ops = readQueue(userId);
  ops.push(op);
  writeQueue(userId, ops);
};

const applyOp = (supabase, op) => {
  const table = supabase.from(op.table);
  if (op.op === 'insert') return table.insert(op.values);
  if (op.op === 'update') return table.update(op.values).eq(op.match.column, op.match.value);
  if (op.op === 'delete') return table.delete().eq(op.match.column, op.match.value);
  return Promise.resolve({ error: new Error(`unknown op ${op.op}`) });
};

let flushing = false;

// Replays queued writes in order. Stops at the first failure so ordering is
// preserved (later writes may depend on earlier ones); the rest retry on the
// next call. Safe to call often — it no-ops while offline or already running.
export const flushQueue = async (supabase, userId, onChange) => {
  if (flushing || !isOnline()) return;
  flushing = true;
  try {
    let ops = readQueue(userId);
    while (ops.length) {
      const { error } = await applyOp(supabase, ops[0]);
      if (error) {
        console.error('Sync failed, will retry:', ops[0].op, ops[0].table, error.message);
        break;
      }
      ops = ops.slice(1);
      writeQueue(userId, ops);
      if (onChange) onChange(ops.length);
    }
  } finally {
    flushing = false;
  }
};
