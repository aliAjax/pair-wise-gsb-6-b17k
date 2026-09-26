/** 界面层：版本列表 + 待确认副本横幅 */
import type { Revision } from '../../domain/types';
import { diffRevision } from '../../domain/manifest';
import type { ManifestState } from '../../domain/types';
import { fieldLabel, formatDate, valuePreview } from './Controls';

export function RevisionList({
  state,
  currentId,
  viewingId,
  onView,
}: {
  state: ManifestState;
  currentId: string;
  viewingId: string;
  onView: (id: string | null) => void;
}) {
  const ordered = [...state.revisions].sort((a, b) => b.version - a.version);
  return (
    <div className="revision-list">
      <div className="list-caption">清单版本</div>
      <button
        type="button"
        className={`revision-item ${viewingId === currentId ? 'active' : ''}`}
        onClick={() => onView(null)}
      >
                <div className="rev-top">
          <b>当前清单</b>
          {(() => {
            const cur = state.revisions.find((r) => r.id === currentId)!;
            return (
              <span className={`rev-status ${cur.status}`}>{cur.status === 'pending' ? '待确认副本' : '已确认'}</span>
            );
          })()}
        </div>
        <small>v{state.revisions.find((r) => r.id === currentId)?.version} · {formatDate(state.revisions.find((r) => r.id === currentId)?.createdAt)}</small>
      </button>

      {ordered
        .filter((r) => r.id !== currentId)
        .map((r) => (
          <button
            key={r.id}
            type="button"
            className={`revision-item ${viewingId === r.id ? 'active' : ''}`}
            onClick={() => onView(r.id)}
          >
            <div className="rev-top">
              <b>v{r.version}</b>
              <span className={`rev-status ${r.status}`}>{r.status === 'pending' ? '待确认' : '已确认档案'}</span>
            </div>
            <small>{formatDate(r.confirmedAt ?? r.createdAt)}</small>
          </button>
        ))}
    </div>
  );
}

export function PendingBanner({
  state,
  pending,
  onConfirm,
  onDiscard,
}: {
  state: ManifestState;
  pending: Revision;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const base = state.revisions.find((r) => r.id === pending.basedOnRevisionId);
  const diffs = diffRevision(state, pending);
  const changedEntries = [...diffs.entries()].filter(([, d]) => d.kind !== 'unchanged');

  return (
    <div className="pending-banner">
      <div className="pending-text">
        <b>v{pending.version} 待确认副本</b>
        <span>
          {base ? `基于 v${base.version} 复制，` : ''}共 {changedEntries.length} 处改动。已确认的 v{base?.version ?? '?'} 保持原样。
        </span>
        <ul className="pending-diffs">
          {[...diffs.entries()].map(([entryId, d]) => {
            if (d.kind === 'unchanged') return null;
            const e = pending.entries.find((x) => x.id === entryId) ?? base?.entries.find((x) => x.id === entryId);
            return (
              <li key={entryId}>
                {e ? `#${String(e.seq).padStart(2, '0')}：` : ''}
                {d.kind === 'added' ? (
                  <em>新增条目</em>
                ) : d.kind === 'removed' ? (
                  <em>移除该条目</em>
                ) : (
                  d.changes.map((c) => (
                    <span key={c.field} className="diff-chip">
                      {fieldLabel(c.field)} {valuePreview(c.before)} → {valuePreview(c.after)}
                    </span>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="pending-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          确认并冻结为新版本
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDiscard}>
          撤销副本
        </button>
      </div>
    </div>
  );
}
