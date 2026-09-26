/** 界面层：每个决定的时间线——认可 / 退回 / 换替补全部可查 */
import type { ManifestState } from '../../domain/types';
import { decisionLabel, formatDate, seqLabel } from './Controls';

export function DecisionTimeline({ state }: { state: ManifestState }) {
  const entryById = new Map<string, { seq: number; purpose: string }>();
  state.revisions.forEach((r) =>
    r.entries.forEach((e) => {
      if (!entryById.has(e.id)) entryById.set(e.id, { seq: e.seq, purpose: String(e.purpose) });
    }),
  );
  const revisionVersion = new Map(state.revisions.map((r) => [r.id, r.version]));

  const ordered = [...state.decisions].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <section className="panel decisions-panel">
      <header className="panel-head">
        <h2>每个决定</h2>
        <p>客户回话逐条记录，均挂在其看到的已确认版本上；决定只追加，不改写。</p>
      </header>
      {ordered.length === 0 && <p className="empty-hint">还没有客户决定。把确认版发给客户后，在这里记录认可或退回。</p>}
      <ol className="decision-list">
        {ordered.map((d) => {
          const meta = entryById.get(d.entryId);
          return (
            <li key={d.id} className={`decision decision-${d.kind}`}>
              <span className={`decision-dot dot-${d.kind}`} />
              <div className="decision-body">
                <div className="decision-line">
                  <b>
                    {meta ? seqLabel(meta.seq) : '?'} {meta?.purpose ?? ''}
                  </b>
                  <span className={`tag tag-${d.kind}`}>{decisionLabel(d.kind)}</span>
                  <small>客户在 v{revisionVersion.get(d.revisionId) ?? '?'} 上的回话</small>
                </div>
                {d.note && <p className="decision-note">“{d.note}”</p>}
                {d.substituteEntryId && (
                  <p className="decision-sub">
                    → 替补为{' '}
                    {seqLabel(entryById.get(d.substituteEntryId)?.seq ?? 0)} {entryById.get(d.substituteEntryId)?.purpose ?? ''}
                  </p>
                )}
                <time>{formatDate(d.at)}</time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
