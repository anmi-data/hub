let generation = 0;
const clearers = new Set<() => void>();
export function registerPrivateCache(clear: () => void): void { clearers.add(clear); }
export function clearPrivateData(): void { generation++; clearers.forEach(clear => clear()); }
export function authGeneration(): number { return generation; }
export function sessionRejected(): void { window.dispatchEvent(new Event('anmi-session-rejected')); }
export async function authRequest(path: string, body?: unknown, csrfToken?: string | null, method = 'POST'): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Anmi-Request': '1', ...(csrfToken ? { 'X-Anmi-Csrf': csrfToken } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) sessionRejected();
    throw new Error(typeof result.error === 'string' ? result.error : 'Request failed');
  }
  if (method !== 'GET') window.dispatchEvent(new Event('anmi-auth-changed'));
  return result;
}
