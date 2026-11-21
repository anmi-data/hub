let generation = 0;
const clearers = new Set<() => void>();
export function registerPrivateCache(clear: () => void): void { clearers.add(clear); }
export function clearPrivateData(): void { generation++; clearers.forEach(clear => clear()); }
export function authGeneration(): number { return generation; }
export function sessionRejected(): void { window.dispatchEvent(new Event('anmi-session-rejected')); }
export async function authRequest(path: string, body?: unknown, csrfToken?: string | null, method = 'POST'): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Anmi-Request': '1', ...(csrfToken ? { 'X-Anmi-Csrf': csrfToken } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401 || response.status === 403) sessionRejected();
    const text = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(text); }
    catch { throw new Error(`The server returned an empty or invalid response (HTTP ${response.status}). Please try again.`); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`The server returned an invalid response (HTTP ${response.status}). Please try again.`);
    }
    const result = payload as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof result.error === 'string' ? result.error : `Request failed (HTTP ${response.status}). Please try again.`);
    }
    if (method !== 'GET') window.dispatchEvent(new Event('anmi-auth-changed'));
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The server took too long to respond. Please try again.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}
