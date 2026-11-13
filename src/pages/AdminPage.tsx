import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { authButton, authInput, useAuth } from '../components/auth/AuthProvider';
import { authRequest, sessionRejected } from '../lib/auth-client';
interface ManagedUser { id: number; username: string; isActive: boolean; mustChangePassword: boolean; lastLoginAt: number | null; }
interface Audit { id: number; actor: string; action: string; target: string | null; timestamp: number; result: string; }
export function AdminPage(): JSX.Element {
  const auth = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]), [events, setEvents] = useState<Audit[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState<{ label: string; path: string; body: unknown; method: string } | null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null), secretDialog = useRef<HTMLDialogElement>(null);
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const load = async () => {
    const current = ++version.current;
    try {
      const [usersResponse, auditResponse] = await Promise.all([fetch('/api/admin/users', { cache: 'no-store' }), fetch('/api/admin/security-audit', { cache: 'no-store' })]);
      if (!usersResponse.ok || !auditResponse.ok) { if ([usersResponse.status, auditResponse.status].includes(401)) sessionRejected(); throw new Error('Unable to load administration'); }
      const userData = await usersResponse.json() as { users: ManagedUser[] }, auditData = await auditResponse.json() as { events: Audit[] };
      if (current === version.current) { setUsers(userData.users); setEvents(auditData.events); }
    } catch (failure) { if (current === version.current) setError(failure instanceof Error ? failure.message : 'Request failed'); }
  };
  useEffect(() => { if (auth.admin) void load(); return invalidate; }, [auth.admin, invalidate]);
  useEffect(() => { if (confirmation) confirmDialog.current?.showModal(); }, [confirmation]);
  useEffect(() => { if (password) secretDialog.current?.showModal(); }, [password]);
  const run = async (path: string, body: unknown, method = 'POST') => {
    setBusy(true); setError(''); setPassword('');
    try {
      const response = await authRequest(path, body, auth.adminCsrfToken, method);
      if (typeof response.temporaryPassword === 'string') setPassword(response.temporaryPassword);
      setConfirmation(null); await auth.refresh(); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Request failed'); }
    finally { setBusy(false); }
  };
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget); event.currentTarget.reset();
    try { await authRequest('/api/admin/auth/login', { password: data.get('password') }); await auth.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Login failed'); }
    finally { setBusy(false); }
  };
  const safeTransport = location.protocol === 'https:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  return <main className="min-h-screen bg-slate-950 p-5 text-slate-200 sm:p-10"><div className="mx-auto max-w-5xl space-y-6">
    <a href="/" className="text-cyan-200">← ANMI Hub</a><h1 className="text-2xl">User administration</h1>
    {error ? <p role="alert" className="text-amber-200">{error}</p> : null}
    {auth.isLoading ? <p>Checking administrator session…</p> : !auth.admin ? !safeTransport ? <p>Secure HTTPS is required before signing in.</p> : <form onSubmit={event => { void login(event); }} className="max-w-sm space-y-4"><label className="block">Administrator password<input autoFocus name="password" type="password" autoComplete="current-password" required maxLength={256} className={authInput} /></label><button disabled={busy} className={authButton}>{busy ? 'Signing in…' : 'Log in as administrator'}</button></form> : <>
      <p>Administrator access is separate from financial user access.</p>
      <button disabled={busy} className={authButton} onClick={() => { void run('/api/admin/auth/logout', {}); }}>Log out of Admin</button>
      <form className="flex max-w-lg flex-wrap gap-3" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run('/api/admin/users', { username: data.get('username') }); event.currentTarget.reset(); }}><label>Username<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,31}" className={authInput} /></label><button disabled={busy} className={authButton}>Create User</button></form>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Username','Status','Password change required','Last login','Actions'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-t border-white/10"><td className="p-2">{user.username}</td><td>{user.isActive ? 'Active' : 'Disabled'}</td><td>{user.mustChangePassword ? 'Yes' : 'No'}</td><td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td><td className="flex flex-wrap gap-2 py-2">{[
        { label: user.isActive ? 'Disable' : 'Enable', path: `/api/admin/users/${user.id}`, method: 'PATCH', body: { isActive: !user.isActive } },
        { label: 'Reset password', path: `/api/admin/users/${user.id}/reset-password`, method: 'POST', body: {} },
        { label: 'Revoke sessions', path: `/api/admin/users/${user.id}/revoke-sessions`, method: 'POST', body: {} },
      ].map(action => <button key={action.label} disabled={busy} className={authButton} onClick={() => setConfirmation({ ...action, label: `${action.label}: ${user.username}? Existing sessions may be revoked.` })}>{action.label}</button>)}</td></tr>)}</tbody></table></div>
      <h2 className="text-lg">Security audit (latest 200 events)</h2><div className="overflow-x-auto"><table className="w-full text-left text-xs"><tbody>{events.map(event => <tr key={event.id}><td className="p-2">{new Date(event.timestamp).toLocaleString()}</td><td>{event.actor}</td><td>{event.action}</td><td>{event.target}</td><td>{event.result}</td></tr>)}</tbody></table></div>
    </>}
    {confirmation ? <dialog ref={confirmDialog} onCancel={() => setConfirmation(null)} className="max-w-sm rounded-xl bg-slate-900 p-6 text-white" aria-label="Confirm user action"><p>{confirmation.label}</p><button disabled={busy} className={authButton} onClick={() => { void run(confirmation.path, confirmation.body, confirmation.method); }}>Confirm</button><button disabled={busy} className={authButton} onClick={() => setConfirmation(null)}>Cancel</button></dialog> : null}
    {password ? <dialog ref={secretDialog} onCancel={() => setPassword('')} className="max-w-sm break-all rounded-xl bg-slate-900 p-6 text-white" aria-label="Temporary password"><p>Copy this temporary password now. It is shown once.</p><code className="my-4 block select-all">{password}</code><button className={authButton} onClick={() => { void navigator.clipboard.writeText(password).catch(() => setError('Copy failed. Select and copy the password manually.')); }}>Copy password</button><button className={authButton} onClick={() => setPassword('')}>Done</button></dialog> : null}
  </div></main>;
}
