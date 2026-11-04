/** Memory only: account responses must not be persisted in browser storage. */
export function createRequestCache(ttlMs = 60_000, maxEntries = 150, now = Date.now) {
  const entries = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();
  let revision: number | undefined;

  return {
    setRevision(nextRevision: number): boolean {
      if (!Number.isSafeInteger(nextRevision) || nextRevision < 0) throw new Error("Invalid data revision");
      // Ignore a late poll from an older published generation.
      if (revision !== undefined && nextRevision <= revision) return false;
      revision = nextRevision;
      entries.clear();
      return true;
    },
    clear() {
      entries.clear();
    },
    get(key: string, load: () => Promise<unknown>): Promise<unknown> {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now()) return cached.promise;

      // Pending requests share one promise, including React StrictMode remounts.
      const entry = { promise: Promise.resolve<unknown>(undefined), expiresAt: Infinity };
      entry.promise = Promise.resolve().then(load).then(
        value => {
          entry.expiresAt = now() + ttlMs;
          return value;
        },
        (error: unknown) => {
          // An invalidated, older request must not remove its replacement.
          if (entries.get(key) === entry) entries.delete(key);
          throw error;
        },
      );
      entries.delete(key);
      entries.set(key, entry);
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
      return entry.promise;
    },
  };
}
