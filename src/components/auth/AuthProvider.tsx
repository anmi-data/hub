import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { authRequest, clearPrivateData } from '../../lib/auth-client';

export interface AuthUser { id: number; username: string; mustChangePassword: boolean; }
interface State { user: AuthUser | null; admin: boolean; csrfToken: string | null; adminCsrfToken: string | null; }
interface AuthContextValue extends State {
  canViewFinancial: boolean; isLoading: boolean; epoch: number;
  openLogin: () => void; openPassword: () => void; logout: () => Promise<void>; refresh: () => Promise<void>;
}
const empty: State = { user: null, admin: false, csrfToken: null, adminCsrfToken: null };
const Context = createContext<AuthContextValue | null>(null);
export function useAuth(): AuthContextValue { const value = useContext(Context); if (!value) throw new Error('AuthProvider required'); return value; }
export const authButton = 'rounded-lg border border-cyan-200/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-200/10 disabled:opacity-50';
export const authInput = 'w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white';
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<State>(empty), current = useRef(state);
  const [epoch, setEpoch] = useState(0), [isLoading, setLoading] = useState(true);
  const [form, setForm] = useState<'login' | 'password' | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const requestVersion = useRef(0);
  const suppressUser = useRef(false);
  const apply = useCallback((next: State) => {
    const previous = current.current;
    if (previous.user?.id !== next.user?.id || previous.user?.mustChangePassword !== next.user?.mustChangePassword || previous.csrfToken !== next.csrfToken || previous.admin !== next.admin) {
      clearPrivateData(); setEpoch(value => value + 1);
    }
    current.current = next; setState(next);
    if (next.user?.mustChangePassword) setForm('password');
  }, []);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Session unavailable');
      const next = await response.json() as State;
      if (version === requestVersion.current) apply(suppressUser.current ? { ...next, user: null, csrfToken: null } : next);
    } catch { if (version === requestVersion.current) apply(empty); }
    finally { setLoading(false); }
  }, [apply]);
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15000);
    const rejected = () => { requestVersion.current++; apply(empty); void refresh(); };
    const focused = () => { void refresh(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) rejected(); };
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('anmi-auth-changed');
    if (channel) channel.onmessage = rejected;
    const changed = () => channel?.postMessage('changed');
    window.addEventListener('anmi-auth-changed', changed);
    window.addEventListener('anmi-session-rejected', rejected); window.addEventListener('focus', focused);
    window.addEventListener('pageshow', restored);
    return () => { window.clearInterval(interval); window.removeEventListener('anmi-session-rejected', rejected); window.removeEventListener('focus', focused); window.removeEventListener('pageshow', restored); window.removeEventListener('anmi-auth-changed', changed); channel?.close(); };
  }, [apply, refresh]);
  useEffect(() => { if (form) { setError(''); dialog.current?.showModal(); } else dialog.current?.close(); }, [form]);
  const logout = async () => {
    // Cancel stale inspection responses before revoking. Financial components unmount immediately.
    requestVersion.current++; suppressUser.current = true; const csrf = current.current.csrfToken;
    apply({ ...current.current, user: null, csrfToken: null }); setForm(null);
    try { await authRequest('/api/auth/logout', {}, csrf); }
    catch (failure) { setError(failure instanceof Error ? `Logout failed: ${failure.message}. Reload and retry.` : 'Logout failed'); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBusy(true); requestVersion.current++;
    const data = new FormData(event.currentTarget);
    try {
      if (form === 'login') {
        const result = await authRequest('/api/auth/login', { username: data.get('username'), password: data.get('password') });
        suppressUser.current = false;
        apply({ ...current.current, user: result.user as unknown as AuthUser, csrfToken: result.csrfToken as string });
        setForm((result.user as unknown as AuthUser).mustChangePassword ? 'password' : null);
      } else {
        const newPassword = String(data.get('newPassword'));
        if (newPassword.length < 14 || new TextEncoder().encode(newPassword).length > 256) throw new Error('Use at least 14 characters and at most 256 bytes.');
        if (newPassword !== data.get('confirmPassword')) throw new Error('Passwords do not match');
        const result = await authRequest('/api/auth/change-password', { newPassword, ...(state.user?.mustChangePassword ? {} : { currentPassword: data.get('currentPassword') }) }, state.csrfToken);
        apply({ ...current.current, user: result.user as unknown as AuthUser, csrfToken: result.csrfToken as string }); setForm(null);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Authentication failed'); }
    finally { setBusy(false); }
  };
  const safeTransport = location.protocol === 'https:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  return <Context.Provider value={{ ...state, isLoading, epoch, canViewFinancial: Boolean(state.user && !state.user.mustChangePassword), openLogin: () => setForm(state.user?.mustChangePassword ? 'password' : 'login'), openPassword: () => setForm('password'), logout, refresh }}>
    {children}
    {error && !form ? <p role="alert" className="fixed bottom-4 left-4 z-[100] rounded-lg bg-slate-900 p-4 text-amber-100">{error}</p> : null}
    {form ? <dialog ref={dialog} onCancel={event => { if (state.user?.mustChangePassword || busy) event.preventDefault(); else setForm(null); }} className="w-[min(92vw,420px)] rounded-2xl border border-white/20 bg-slate-900 p-6 text-white backdrop:bg-black/70" aria-labelledby="auth-title">
      <h2 id="auth-title" className="mb-5 text-xl">{form === 'login' ? 'Log in' : 'Change your password'}</h2>
      {!safeTransport ? <p role="alert">Secure HTTPS is required before signing in.</p> : <form key={form + String(state.user?.mustChangePassword)} onSubmit={event => { void submit(event); }} className="space-y-4">
        {form === 'login' ? <><label className="block">Username<input name="username" autoComplete="username" required maxLength={64} autoFocus className={authInput} /></label><label className="block">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} className={authInput} /></label></> : <>
          {!state.user?.mustChangePassword ? <label className="block">Current password<input name="currentPassword" type="password" autoComplete="current-password" required className={authInput} /></label> : <p>Choose a new password to unlock financial data.</p>}
          <label className="block">New password<input name="newPassword" type="password" autoComplete="new-password" required minLength={14} maxLength={256} autoFocus className={authInput} /></label>
          <label className="block">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={14} maxLength={256} className={authInput} /></label><p className="text-xs text-slate-400">At least 14 characters; use a unique passphrase.</p>
        </>}
        {error ? <p role="alert" className="text-amber-200">{error}</p> : null}
        <button disabled={busy} className={authButton}>{busy ? 'Saving…' : form === 'login' ? 'Log in' : 'Save new password'}</button>
      </form>}
      <button disabled={busy} type="button" className={`${authButton} mt-4`} onClick={() => { if (state.user?.mustChangePassword) void logout(); else setForm(null); }}>{state.user?.mustChangePassword ? 'Log out / Continue as Guest' : 'Cancel / Continue as Guest'}</button>
    </dialog> : null}
  </Context.Provider>;
}
export function AuthControl(): JSX.Element {
  const auth = useAuth();
  return <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
    <span className="max-w-[10rem] truncate">{auth.user?.username ?? 'Guest'}</span>
    {auth.user ? <><button className={authButton} onClick={auth.openPassword}>Change password</button><button className={authButton} onClick={() => { void auth.logout(); }}>Log out</button></> : <button className={authButton} onClick={auth.openLogin}>Log in</button>}
  </div>;
}
export function LockedPanel({ children }: { children: ReactNode }): JSX.Element {
  const auth = useAuth();
  return <div className="flex flex-col items-start gap-3 py-5 text-sm text-slate-400"><LockKeyhole className="h-4 w-4" aria-hidden="true" /><p>{children}</p><button className={authButton} onClick={auth.openLogin}>Log in to view</button></div>;
}
export function ProtectedValue({ children }: { children: ReactNode }): JSX.Element {
  const auth = useAuth();
  return auth.canViewFinancial ? <>{children}</> : <button type="button" onClick={auth.openLogin} title="Log in to view financial details" aria-label="Log in to view financial details"><LockKeyhole className="inline h-4 w-4" /></button>;
}
