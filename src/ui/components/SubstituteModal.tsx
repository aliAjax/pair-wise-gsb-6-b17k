/** 界面层：换替补弹窗——客户退回某条目后从库中挑替补 */
import { useMemo, useState } from 'react';
import {
  CATALOG_PAIRINGS,
  PURPOSES,
  SAMPLE_TEXT,
  type CatalogPairing,
  type Purpose,
} from '../../data/fontCatalog';
import type { Entry, PairingSpec } from '../../domain/types';
import { fontStack, seqLabel } from './Controls';

interface Props {
  original: Entry;
  existingSpecs: PairingSpec[];
  onCancel: () => void;
  onConfirm: (originalEntryId: string, purpose: Purpose, spec: PairingSpec, note?: string) => void;
}

export function SubstituteModal({ original, existingSpecs, onCancel, onConfirm }: Props) {
  const [selectedId, setSelectedId] = useState<string>(CATALOG_PAIRINGS[0].id);
  const [purpose, setPurpose] = useState<Purpose>(String(original.purpose));
  const [note, setNote] = useState('');
  const [blocked, setBlocked] = useState(false);

  const existingSignatures = useMemo(
    () => new Set(existingSpecs.map((s) => `${s.heading.family}|${s.heading.size}|${s.heading.lineHeight}|${s.body.family}|${s.body.size}|${s.body.lineHeight}`)),
    [existingSpecs],
  );

  const chosen = CATALOG_PAIRINGS.find((p) => p.id === selectedId) ?? CATALOG_PAIRINGS[0];
  const spec: PairingSpec = { heading: { ...chosen.heading }, body: { ...chosen.body } };
  const isDup = existingSignatures.has(
    `${spec.heading.family}|${spec.heading.size}|${spec.heading.lineHeight}|${spec.body.family}|${spec.body.size}|${spec.body.lineHeight}`,
  );

  return (
    <div className="backdrop" onMouseDown={onCancel}>
      <div className="modal substitute-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>为 {seqLabel(original.seq)} 换替补</h2>
        <p className="modal-sub">
          原项将记为“客户退回”并原样留在档案；替补进入待确认副本，两条记录都能查。
        </p>

        <label className="field">
          替补用途
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
            {PURPOSES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <div className="sub-options">
          {CATALOG_PAIRINGS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`sub-option ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => { setSelectedId(p.id); setBlocked(false); }}
            >
              <strong style={{ fontFamily: fontStack(p.heading.family), fontSize: 18, lineHeight: p.heading.lineHeight }}>
                {SAMPLE_TEXT.heading}
              </strong>
              <span style={{ fontFamily: fontStack(p.body.family), fontSize: 12, lineHeight: p.body.lineHeight }}>
                {p.label} · {p.scenario}
              </span>
            </button>
          ))}
        </div>

        <label className="field">
          客户意见（可选，会附在退回决定上）
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：引文太华丽，想更安静" />
        </label>

        {isDup && <p className="dup-warn">这套与清单中仍有效的一套组合完全相同，判重规则会拒绝；请选别的。</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isDup || blocked}
            onClick={() => {
              if (isDup) { setBlocked(true); return; }
              onConfirm(original.id, purpose, spec, note.trim() || undefined);
            }}
          >
            退回原项并加入替补
          </button>
        </div>
      </div>
    </div>
  );
}
