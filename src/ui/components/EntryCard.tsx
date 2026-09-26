/** 界面层：清单中的一套配对条目（预览、参数、用途、决定操作） */
import { useState } from 'react';
import type { FontFamilyId, Purpose } from '../../data/fontCatalog';
import { PURPOSES, SAMPLE_TEXT } from '../../data/fontCatalog';
import type { Entry, Revision } from '../../domain/types';
import type { EntryDiff, EntryStatus } from '../../domain/manifest';
import { DiffChip, fieldLabel, FontSelect, fontName, fontStack, seqLabel, Stepper, valuePreview } from './Controls';

interface EntryCardProps {
  entry: Entry;
  status: EntryStatus;
  diff: EntryDiff;
  revision: Revision;
  /** 界面是否允许编辑（当前清单且非历史档案） */
  editable: boolean;
  /** 是否展示客户决定按钮（最近确认版、没有未决副本时） */
  canDecide: boolean;
  onChangeParam: (
    entryId: string,
    patch: { heading?: { family?: FontFamilyId; size?: number; lineHeight?: number }; body?: { family?: FontFamilyId; size?: number; lineHeight?: number } },
  ) => void;
  onChangePurpose: (entryId: string, purpose: Purpose) => void;
  onApprove: (entryId: string) => void;
  onReject: (entryId: string, note: string) => void;
  onPickSubstitute: (entry: Entry) => void;
}

const STATUS_BADGE: Record<EntryStatus['kind'], { text: string; cls: string }> = {
  undecided: { text: '待客户决定', cls: 'st-undecided' },
  approved: { text: '客户已定', cls: 'st-approved' },
  rejected: { text: '客户退回', cls: 'st-rejected' },
  substituted: { text: '已换替补', cls: 'st-substituted' },
};

export function EntryCard(props: EntryCardProps) {
  const { entry, status, diff, revision, editable, canDecide } = props;
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const { spec } = entry;

  const dead = status.kind === 'rejected' || status.kind === 'substituted';
  const paramEditable = editable && !dead;

  return (
    <article className={`entry-card ${dead ? 'is-dead' : ''}`}>
      <div className="entry-main">
        <header className="entry-head">
          <div className="entry-title">
            <span className="seq">{seqLabel(entry.seq)}</span>
            <select
              className="purpose-select"
              value={PURPOSES.includes(entry.purpose as (typeof PURPOSES)[number]) ? entry.purpose : '__custom'}
              disabled={!paramEditable}
              onChange={(e) => {
                if (e.target.value !== '__custom') props.onChangePurpose(entry.id, e.target.value as Purpose);
              }}
            >
              {!PURPOSES.includes(entry.purpose as (typeof PURPOSES)[number]) && (
                <option value="__custom">{String(entry.purpose)}</option>
              )}
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {entry.replacedEntryId && (
              <span className="replace-flag">
                替补 ← 原项{' '}
                {seqLabel(revision.entries.find((e) => e.id === entry.replacedEntryId)?.seq ?? 0)}
              </span>
            )}
          </div>
          <span className={`badge ${STATUS_BADGE[status.kind].cls}`}>{STATUS_BADGE[status.kind].text}</span>
        </header>

        <div className="entry-preview">
          <h4 style={{ fontFamily: fontStack(spec.heading.family), fontSize: Math.min(spec.heading.size, 34), lineHeight: spec.heading.lineHeight }}>
            {SAMPLE_TEXT.heading}
          </h4>
          <p style={{ fontFamily: fontStack(spec.body.family), fontSize: Math.min(spec.body.size, 16), lineHeight: spec.body.lineHeight }}>
            {SAMPLE_TEXT.body}
          </p>
        </div>

        {diff.kind === 'changed' && (
          <div className="diff-line">
            待确认改动：
            {diff.changes.map((c, i) => (
              <DiffChip key={i}>
                {fieldLabel(c.field)}：{valuePreview(c.before)} → {valuePreview(c.after)}
              </DiffChip>
            ))}
          </div>
        )}
        {diff.kind === 'added' && <div className="diff-line"><DiffChip>本副本新增条目</DiffChip></div>}
      </div>

      <aside className="entry-params">
        <div className="param-group">
          <span className="param-role">标题</span>
          <label>
            字体
            <FontSelect
              value={spec.heading.family}
              disabled={!paramEditable}
              onChange={(family) => props.onChangeParam(entry.id, { heading: { family } })}
            />
          </label>
          <label>
            字号
            <Stepper
              value={spec.heading.size}
              min={18}
              max={72}
              step={1}
              unit="px"
              disabled={!paramEditable}
              onChange={(size) => props.onChangeParam(entry.id, { heading: { size } })}
            />
          </label>
          <label>
            行高
            <Stepper
              value={spec.heading.lineHeight}
              min={0.9}
              max={2}
              step={0.05}
              disabled={!paramEditable}
              onChange={(lineHeight) => props.onChangeParam(entry.id, { heading: { lineHeight } })}
            />
          </label>
        </div>

        <div className="param-group">
          <span className="param-role">正文</span>
          <label>
            字体
            <FontSelect
              value={spec.body.family}
              disabled={!paramEditable}
              onChange={(family) => props.onChangeParam(entry.id, { body: { family } })}
            />
          </label>
          <label>
            字号
            <Stepper
              value={spec.body.size}
              min={10}
              max={28}
              step={1}
              unit="px"
              disabled={!paramEditable}
              onChange={(size) => props.onChangeParam(entry.id, { body: { size } })}
            />
          </label>
          <label>
            行高
            <Stepper
              value={spec.body.lineHeight}
              min={1}
              max={2.4}
              step={0.05}
              disabled={!paramEditable}
              onChange={(lineHeight) => props.onChangeParam(entry.id, { body: { lineHeight } })}
            />
          </label>
        </div>

        <div className="param-meta">
          <span>标题：{fontName(spec.heading.family)} · {spec.heading.size}px / {spec.heading.lineHeight}</span>
          <span>正文：{fontName(spec.body.family)} · {spec.body.size}px / {spec.body.lineHeight}</span>
        </div>

        {canDecide && status.kind === 'undecided' && (
          <div className="decide-box">
            {!showNote ? (
              <div className="decide-row">
                <button type="button" className="btn btn-approve" onClick={() => props.onApprove(entry.id)}>
                  客户认可
                </button>
                <button type="button" className="btn btn-reject" onClick={() => setShowNote(true)}>
                  客户退回
                </button>
              </div>
            ) : (
              <div className="reject-box">
                <textarea
                  autoFocus
                  placeholder="客户的退回意见，例如：引文太华丽"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                <div className="decide-row">
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowNote(false); setNote(''); }}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-substitute"
                    onClick={() => { props.onPickSubstitute(entry); setShowNote(false); setNote(''); }}
                  >
                    退回并换替补
                  </button>
                  <button
                    type="button"
                    className="btn btn-reject"
                    onClick={() => { props.onReject(entry.id, note.trim() || '客户退回'); setShowNote(false); setNote(''); }}
                  >
                    仅退回
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canDecide && status.kind === 'rejected' && (
          <div className="decide-box">
            <button type="button" className="btn btn-substitute" onClick={() => props.onPickSubstitute(entry)}>
              为该项换替补
            </button>
          </div>
        )}
      </aside>
    </article>
  );
}
