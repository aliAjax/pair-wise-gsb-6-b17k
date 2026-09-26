/** 界面层：字体库面板——从库里挑配对加入当前清单 */
import { useState } from 'react';
import {
  CATALOG_PAIRINGS,
  PURPOSES,
  SAMPLE_TEXT,
  type CatalogPairing,
  type Purpose,
} from '../../data/fontCatalog';
import type { PairingSpec } from '../../domain/types';
import { fontStack } from './Controls';

export function LibraryPanel({ onAdd, disabled }: { onAdd: (purpose: Purpose, spec: PairingSpec) => void; disabled?: boolean }) {
  const [purposeByPair, setPurposeByPair] = useState<Record<string, Purpose>>({});

  const add = (p: CatalogPairing) => {
    onAdd(purposeByPair[p.id] ?? (p.scenario.split('+')[0]?.trim() as Purpose) ?? '正文', {
      heading: { ...p.heading },
      body: { ...p.body },
    });
  };

  return (
    <section className="panel library-panel">
      <header className="panel-head">
        <h2>字体库 · 配对候选</h2>
        <p>挑一套加入当前清单；记下字体、字号、行高与用途。</p>
      </header>
      <div className="pair-grid">
        {CATALOG_PAIRINGS.map((p) => (
          <div key={p.id} className="pair-card">
            <div className="pair-preview">
              <strong
                style={{
                  fontFamily: fontStack(p.heading.family),
                  fontSize: Math.min(p.heading.size, 24),
                  lineHeight: p.heading.lineHeight,
                }}
              >
                {SAMPLE_TEXT.heading}
              </strong>
              <span
                style={{
                  fontFamily: fontStack(p.body.family),
                  fontSize: Math.min(p.body.size, 13),
                  lineHeight: p.body.lineHeight,
                }}
              >
                {SAMPLE_TEXT.body}
              </span>
            </div>
            <div className="pair-info">
              <b>{p.label}</b>
              <small>
                {p.heading.size}/{p.heading.lineHeight} · {p.body.size}/{p.body.lineHeight}
              </small>
            </div>
            <div className="pair-add">
              <select
                aria-label={`${p.label} 用途`}
                value={purposeByPair[p.id] ?? p.scenario.split('+')[0]?.trim() ?? PURPOSES[2]}
                onChange={(e) => setPurposeByPair((m) => ({ ...m, [p.id]: e.target.value as Purpose }))}
                disabled={disabled}
              >
                {PURPOSES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => add(p)}>
                加入清单
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
