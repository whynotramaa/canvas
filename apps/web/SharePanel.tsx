import { useEffect, useState } from 'react';
import { api, shareUrl, setAuthToken, type Role } from './collab';
type User = { id: string; name: string };
type Team = { id: string; name: string; role: Role; members: { id: string; name: string; role: Role }[] };
type Link = { token: string; role: string; expires: number | null; protected: number; revoked: number };
type Room = { id: string; title: string; teamId: string | null; owned: number };
export interface ShareInfo { room: string; key: string; link?: string; title?: string }
interface Props { user: User | null; setUser: (user: User | null) => void; share: ShareInfo | null; role: Role | null; start: (teamId: string | null) => Promise<void>; rotate: () => Promise<void>; stop: () => void; known: ShareInfo[]; openShared: (info: ShareInfo) => void; teamLibrary: (teamId: string, mode: 'push' | 'pull') => Promise<void>; close: () => void }
export function SharePanel({ user, setUser, share, role, start, rotate, stop, known, openShared, teamLibrary, close }: Props) {
  const [name, setName] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [teams, setTeams] = useState<Team[]>([]), [links, setLinks] = useState<Link[]>([]), [rooms, setRooms] = useState<Room[]>([]);
  const [linkRole, setLinkRole] = useState('view'), [expiry, setExpiry] = useState(''), [linkPassword, setLinkPassword] = useState(''), [created, setCreated] = useState(''), [teamName, setTeamName] = useState(''), [member, setMember] = useState(''), [memberRole, setMemberRole] = useState<Role>('editor'), [teamId, setTeamId] = useState('');
  const run = (task: () => Promise<unknown>) => { setError(''); task().catch(e => setError(String(e instanceof Error ? e.message : e))); };
  const refresh = () => { if (!user) return; run(async () => { setTeams((await api<{ teams: Team[] }>('/api/teams')).teams); setRooms((await api<{ rooms: Room[] }>('/api/rooms')).rooms); if (share && role === 'owner') setLinks((await api<{ links: Link[] }>(`/api/rooms/${share.room}/links`)).links); }); };
  useEffect(refresh, [user, share?.room, role]);
  const auth = (kind: 'login' | 'register') => run(async () => { const result = await api<{ user: User; token: string }>(`/api/auth/${kind}`, { method: 'POST', body: JSON.stringify({ name, password }) }); setAuthToken(result.token); setUser(result.user); setPassword(''); });
  return <section className="code-panel share-panel" aria-label="Share and collaborate">
    <div className="workspace-heading"><strong>Share and collaborate</strong><button onClick={close} aria-label="Close sharing">×</button></div>
    {!user ? <form onSubmit={e => { e.preventDefault(); auth('login'); }}><p>Sign in to share drawings and join teams. Opening a link someone sent you needs no account.</p><label>Name<input value={name} onChange={e => setName(e.target.value)} autoComplete="username"/></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/></label><div className="code-actions"><button>Sign in</button><button type="button" onClick={() => auth('register')}>Create account</button></div></form>
      : <p>Signed in as <strong>{user.name}</strong> <button onClick={() => run(async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setAuthToken(null); setUser(null); })}>Sign out</button></p>}
    <h3>This drawing</h3>
    {share ? <>
      <p role="status">Live session · your role: {role || 'connecting'}. Content is end-to-end encrypted; the key lives only in the link after #.</p>
      {role === 'owner' && <>
        <form className="rich-controls" onSubmit={e => { e.preventDefault(); run(async () => { const { token } = await api<{ token: string }>(`/api/rooms/${share.room}/links`, { method: 'POST', body: JSON.stringify({ role: linkRole, expiresAt: expiry ? new Date(expiry).getTime() : undefined, password: linkPassword || undefined }) }); setCreated(shareUrl(share.room, share.key, token)); setLinkPassword(''); refresh(); }); }}>
          <label>Access<select value={linkRole} onChange={e => setLinkRole(e.target.value)}><option value="view">Can view</option><option value="comment">Can comment</option><option value="edit">Can edit</option></select></label>
          <label>Expires<input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)}/></label>
          <label>Password (optional)<input type="password" value={linkPassword} onChange={e => setLinkPassword(e.target.value)}/></label>
          <button>Create link</button>
        </form>
        {created && <p><input readOnly aria-label="Share link" value={created} onFocus={e => e.currentTarget.select()}/><button onClick={() => void navigator.clipboard.writeText(created)}>Copy</button><button onClick={() => { const url = new URL(created); void navigator.clipboard.writeText(`<iframe src="${url.origin}/embed${url.hash}" width="800" height="500" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin" style="border:0"></iframe>`); }} disabled={!created.includes('link=') || linkRole !== 'view'}>Copy read-only embed</button></p>}
        <div className="snapshot-list">{links.map(l => <div key={l.token}><span>{l.role}{l.protected ? ' · password' : ''}{l.expires ? ` · until ${new Date(l.expires).toLocaleString()}` : ''}{l.revoked ? ' · revoked' : ''}</span>{!l.revoked && <button onClick={() => run(async () => { await api(`/api/rooms/${share.room}/links/${l.token}`, { method: 'DELETE' }); refresh(); })}>Revoke</button>}</div>)}</div>
        <p>Revoking closes open sessions for that link. People who already downloaded or cached the drawing keep their copy; rotate the key to stop old links decrypting new edits.</p>
        <button onClick={() => run(async () => { if (confirm('Move this drawing to a new encrypted room and revoke every existing link?')) await rotate(); })}>Rotate key and revoke all links</button>
      </>}
      <button onClick={stop}>Leave live session (keep local copy)</button>
    </> : user ? <div className="rich-controls"><label>Share with team<select value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">Only people with a link</option>{teams.filter(t => t.role === 'owner' || t.role === 'editor').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button onClick={() => run(() => start(teamId || null))}>Start live sharing</button></div> : <p>Sign in to start sharing this drawing.</p>}
    <h3>Shared with me</h3>
    <div className="snapshot-list">{known.map(k => <div key={k.room}><button onClick={() => openShared(k)}>{k.title || 'Shared drawing'}</button></div>)}{rooms.filter(r => !known.some(k => k.room === r.id)).map(r => <div key={r.id}><span>{r.title || 'Untitled'} · {r.owned ? 'yours' : 'team'} · open it from its share link (the server never holds the key)</span></div>)}{!known.length && !rooms.length && <p>Nothing shared yet.</p>}</div>
    {user && <><h3>Teams</h3>
      <form className="rich-controls" onSubmit={e => { e.preventDefault(); run(async () => { await api('/api/teams', { method: 'POST', body: JSON.stringify({ name: teamName }) }); setTeamName(''); refresh(); }); }}><label>New team<input value={teamName} onChange={e => setTeamName(e.target.value)}/></label><button disabled={!teamName.trim()}>Create</button></form>
      {teams.map(t => <div key={t.id} className="snapshot-list"><strong>{t.name} · {t.role}</strong>{t.members.map(m => <div key={m.id}><span>{m.name} · {m.role}</span>{t.role === 'owner' && m.id !== user.id && <button onClick={() => run(async () => { await api(`/api/teams/${t.id}/members/${m.id}`, { method: 'DELETE' }); refresh(); })}>Remove</button>}</div>)}
        {t.role === 'owner' && <form className="rich-controls" onSubmit={e => { e.preventDefault(); run(async () => { await api(`/api/teams/${t.id}/members`, { method: 'POST', body: JSON.stringify({ name: member, role: memberRole }) }); setMember(''); refresh(); }); }}><label>Add member<input value={member} onChange={e => setMember(e.target.value)}/></label><select aria-label="Member role" value={memberRole} onChange={e => setMemberRole(e.target.value as Role)}>{['owner', 'editor', 'commenter', 'viewer'].map(r => <option key={r}>{r}</option>)}</select><button disabled={!member}>Add</button></form>}
        <div className="code-actions"><button onClick={() => run(() => teamLibrary(t.id, 'pull'))}>Import team icon library</button>{(t.role === 'owner' || t.role === 'editor') && <button onClick={() => run(() => teamLibrary(t.id, 'push'))}>Publish my icon library to team</button>}</div>
      </div>)}</>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
