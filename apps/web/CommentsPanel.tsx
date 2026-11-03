import { useState } from 'react';
import type { Thread } from './collab';
interface Props { threads: Thread[]; me: string; canComment: boolean; reply: (threadId: string, text: string) => void; resolve: (threadId: string, resolved: boolean) => void; jump: (thread: Thread) => void; close: () => void; seen: (ids: string[]) => void }
export function CommentsPanel({ threads, me, canComment, reply, resolve, jump, close, seen }: Props) {
  const [filter, setFilter] = useState<'open' | 'mentions' | 'resolved'>('open'), [drafts, setDrafts] = useState<Record<string, string>>({});
  const mentioned = (t: Thread) => t.comments.some(c => c.text.includes('@' + me));
  const shown = threads.filter(t => filter === 'resolved' ? t.resolved : filter === 'mentions' ? mentioned(t) : !t.resolved);
  return <section className="code-panel" aria-label="Comments">
    <div className="workspace-heading"><strong>Comments</strong><button onClick={close} aria-label="Close comments">×</button></div>
    <div className="workspace-views">{(['open', 'mentions', 'resolved'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => { setFilter(f); if (f === 'mentions') seen(threads.filter(mentioned).map(t => t.id)); }}>{f}</button>)}</div>
    <p>Press C, then click the canvas or a shape to pin a thread. Type @name to mention someone.</p>
    <div className="snapshot-list">{shown.map(t => <article key={t.id} aria-label={`Thread by ${t.comments[0]?.author}`}>
      <button onClick={() => jump(t)}>Show on canvas</button>
      {t.comments.map(c => <p key={c.id}><strong>{c.author}</strong> · {new Date(c.time).toLocaleString()}<br/>{c.text}</p>)}
      {canComment && <form onSubmit={e => { e.preventDefault(); const text = drafts[t.id]?.trim(); if (text) { reply(t.id, text); setDrafts(d => ({ ...d, [t.id]: '' })); } }}><input aria-label="Reply" value={drafts[t.id] || ''} onChange={e => setDrafts(d => ({ ...d, [t.id]: e.target.value }))} placeholder="Reply"/><button>Reply</button><button type="button" onClick={() => resolve(t.id, !t.resolved)}>{t.resolved ? 'Reopen' : 'Resolve'}</button></form>}
    </article>)}{!shown.length && <p>No {filter} threads.</p>}</div>
  </section>;
}
