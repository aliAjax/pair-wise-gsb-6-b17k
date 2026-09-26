// 界面层：选样清单与决定记录的展示与交互。只调用传入的领域动作，不直接改数据。
import {useState} from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  History,
  RefreshCw,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import type {Choice, Decision, FontSpec, Revision, Shortlist, Slot} from '../domain/types';
import {currentChoice, pendingRevisionOf} from '../domain/shortlist';
import type {Pair} from '../data/library';

export type StudioSpec = {
  headingFont: string;
  bodyFont: string;
  headingSizePx: number;
  lineHeight: number;
};

type Props = {
  list: Shortlist | null;
  pairs: Pair[];
  fonts: string[];
  studioSpec: StudioSpec;
  notice: string;
  onSubstitute: (slotId: string, pairId: number) => void;
  onProposeParams: (slotId: string, spec: FontSpec) => void;
  onConfirmRevision: (revisionId: string) => void;
  onDiscardRevision: (revisionId: string) => void;
  onConfirmList: () => void;
};

const fmt = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SOURCE_LABEL: Record<Choice['source'], string> = {
  initial: '原项',
  substitute: '替补',
  revision: '参数修订',
};

const OUTCOME_LABEL: Record<Choice['outcome'], string> = {
  active: '当前生效',
  rejected: '已退回',
  superseded: '已被替换',
};

const DECISION_LABEL: Record<Decision['kind'], string> = {
  pick: '加入',
  substitute: '换替补',
  'propose-substitute': '替补待确认',
  'propose-params': '参数改动待确认',
  'confirm-revision': '确认副本',
  'discard-revision': '放弃副本',
  'confirm-list': '确认清单',
};

function SpecLine({spec}: {spec: FontSpec}) {
  return (
    <div className="sl-spec">
      <b>{spec.headingFont}</b>
      <span className="sl-plus">标题</span>
      <b>{spec.bodyFont}</b>
      <span className="sl-plus">正文</span>
      <span className="sl-dot">·</span>
      <span>{spec.headingSizePx}px</span>
      <span className="sl-dot">·</span>
      <span>行高 {spec.lineHeight.toFixed(2)}</span>
    </div>
  );
}

function ChoiceRecord({choice}: {choice: Choice}) {
  return (
    <li className="sl-choice">
      <span className={`sl-outcome sl-outcome-${choice.outcome}`}>{OUTCOME_LABEL[choice.outcome]}</span>
      <span className="sl-choice-source">{SOURCE_LABEL[choice.source]}</span>
      <b>{choice.pair?.title ?? '未命名配对'}</b>
      <small>{choice.spec.headingFont} + {choice.spec.bodyFont} · {choice.spec.headingSizePx}px / {choice.spec.lineHeight.toFixed(2)}</small>
      <time>{fmt(choice.decidedAt)}</time>
    </li>
  );
}

function SlotCard({
  slot,
  list,
  pairs,
  fonts,
  studioSpec,
  onSubstitute,
  onProposeParams,
}: {
  slot: Slot;
  list: Shortlist;
  pairs: Pair[];
  fonts: string[];
  studioSpec: StudioSpec;
  onSubstitute: Props['onSubstitute'];
  onProposeParams: Props['onProposeParams'];
}) {
  const choice = currentChoice(slot);
  const pending = pendingRevisionOf(list, slot.id);
  const [substituting, setSubstituting] = useState(false);
  const [pairId, setPairId] = useState<number>(pairs[0]?.id ?? 0);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState<FontSpec>(choice.spec);
  const replaced = slot.choices.length > 1;

  const startEdit = () => {
    setDraft(choice.spec);
    setEditing(true);
  };

  return (
    <div className="sl-card">
      <div className="sl-card-head">
        <span className="sl-purpose">{choice.spec.purpose}</span>
        <span className={`sl-status sl-status-${list.status}`}>
          {list.status === 'confirmed' ? '清单已确认' : '待确认'}
        </span>
      </div>

      <div className="sl-card-body">
        <SpecLine spec={choice.spec} />
        <div className="sl-from">
          来自库中配对：<b>{choice.pair?.title ?? '—'}</b>
          <span className={`sl-source-tag sl-source-${choice.source}`}>{SOURCE_LABEL[choice.source]}</span>
          {replaced && <span className="sl-history-flag">{slot.choices.length - 1} 次退回记录可查</span>}
        </div>
      </div>

      <div className="sl-card-actions">
        <button className="sl-link" onClick={() => {setSubstituting(v => !v); setEditing(false);}}>
          <RefreshCw size={13} /> 客户退回 · 换替补
        </button>
        {list.status === 'confirmed' && (
          <button className="sl-link" onClick={() => {startEdit(); setSubstituting(false);}}>
            <RotateCcw size={13} /> 改参数
          </button>
        )}
        {replaced && (
          <button className="sl-link" onClick={() => setShowHistory(v => !v)}>
            <History size={13} /> {showHistory ? '收起记录' : `原项与替补（${slot.choices.length}）`}
          </button>
        )}
      </div>

      {substituting && (
        <div className="sl-sub-row">
          <select value={pairId} onChange={e => setPairId(Number(e.target.value))}>
            {pairs.map(p => <option key={p.id} value={p.id}>{p.title}（{p.category}）</option>)}
          </select>
          <small>替补将按画布当前参数记录：{studioSpec.headingFont} + {studioSpec.bodyFont} · {studioSpec.headingSizePx}px / 行高 {studioSpec.lineHeight.toFixed(2)}</small>
          <button
            className="sl-btn sl-btn-primary"
            onClick={() => {onSubstitute(slot.id, pairId); setSubstituting(false);}}
          >
            <Check size={13} /> 确定替补
          </button>
          <button className="sl-btn" onClick={() => setSubstituting(false)}><X size={13} /></button>
        </div>
      )}

      {editing && (
        <div className="sl-edit">
          <p className="sl-edit-hint">已确认清单不会改动，提交后生成待确认副本。</p>
          <div className="sl-edit-grid">
            <label>标题字体
              <select value={draft.headingFont} onChange={e => setDraft({...draft, headingFont: e.target.value})}>
                {fonts.map(f => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label>正文字体
              <select value={draft.bodyFont} onChange={e => setDraft({...draft, bodyFont: e.target.value})}>
                {fonts.map(f => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label>字号 <b>{draft.headingSizePx}px</b>
              <input type="range" min="28" max="76" value={draft.headingSizePx}
                onChange={e => setDraft({...draft, headingSizePx: Number(e.target.value)})} />
            </label>
            <label>行高 <b>{draft.lineHeight.toFixed(2)}</b>
              <input type="range" min="1" max="1.8" step="0.05" value={draft.lineHeight}
                onChange={e => setDraft({...draft, lineHeight: Number(e.target.value)})} />
            </label>
          </div>
          <div className="sl-edit-actions">
            <button className="sl-btn sl-btn-primary" onClick={() => {onProposeParams(slot.id, draft); setEditing(false);}}>
              生成待确认副本
            </button>
            <button className="sl-btn" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      )}

      {pending && (
        <div className="sl-pending-inline">
          <span className="sl-pending-flag">{pending.kind === 'substitute' ? '替补副本待确认' : '参数副本待确认'}</span>
          见下方「待确认副本」
        </div>
      )}

      {showHistory && (
        <ul className="sl-history">
          {slot.choices.map(c => <ChoiceRecord key={c.id} choice={c} />)}
        </ul>
      )}
    </div>
  );
}

function RevisionCard({
  revision,
  pairs,
  onConfirm,
  onDiscard,
}: {
  revision: Revision;
  pairs: Pair[];
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const pairTitle = (id: number | null): string => pairs.find(p => p.id === id)?.title ?? '—';
  return (
    <div className={`sl-revision sl-revision-${revision.status}`}>
      <div className="sl-revision-head">
        <span className="sl-revision-kind">{revision.kind === 'substitute' ? '替补' : '参数改动'}副本</span>
        <span className={`sl-revision-status sl-revstatus-${revision.status}`}>
          {revision.status === 'pending' ? '待确认' : revision.status === 'confirmed' ? '已确认' : '已放弃'}
        </span>
        <time>{fmt(revision.createdAt)}</time>
      </div>
      <div className="sl-diff">
        <div className="sl-diff-side sl-diff-before">
          <small>原项（{revision.kind === 'substitute' ? pairTitle(revision.before.pair?.id ?? null) : '保持不变'}）</small>
          <SpecLine spec={revision.before.spec} />
        </div>
        <span className="sl-diff-arrow">→</span>
        <div className="sl-diff-side sl-diff-after">
          <small>改为{revision.kind === 'substitute' ? `（${pairTitle(revision.after.pair?.id ?? null)}）` : ''}</small>
          <SpecLine spec={revision.after.spec} />
        </div>
      </div>
      {revision.status === 'pending' && (
        <div className="sl-revision-actions">
          <button className="sl-btn sl-btn-primary" onClick={onConfirm}><CheckCircle2 size={13} /> 确认采用</button>
          <button className="sl-btn" onClick={onDiscard}><XCircle size={13} /> 放弃，清单不动</button>
        </div>
      )}
    </div>
  );
}

export function ShortlistPanel(props: Props) {
  const {list, pairs, fonts, studioSpec, notice, onSubstitute, onProposeParams, onConfirmRevision, onDiscardRevision, onConfirmList} = props;
  const pending = list?.revisions.filter(r => r.status === 'pending') ?? [];
  const settled = list?.revisions.filter(r => r.status !== 'pending') ?? [];

  if (!list) {
    return (
      <section className="shortlist">
        <div className="sl-panel-head">
          <h2><ClipboardList size={18} /> 选样清单</h2>
        </div>
        <div className="sl-empty">
          还没有清单。在右侧画布选好字体、字号、行高并写明用途，点「加入选样清单」即可记下这一套。
        </div>
      </section>
    );
  }

  return (
    <section className="shortlist">
      <div className="sl-panel-head">
        <div>
          <h2><ClipboardList size={18} /> 选样清单 · {list.name}</h2>
          <p>同一组合（标题字体 + 正文字体）只留一套；原项退回后换替补，两者都可查。</p>
        </div>
        <div className="sl-panel-side">
          <span className={`sl-bigstatus sl-status-${list.status}`}>
            {list.status === 'confirmed'
              ? `已确认 · ${list.confirmedAt ? fmt(list.confirmedAt) : ''}`
              : '待客户确认'}
          </span>
          {list.status === 'open' && list.slots.length > 0 && (
            <button className="sl-btn sl-btn-primary" onClick={onConfirmList}><Check size={14} /> 确认清单</button>
          )}
        </div>
      </div>

      {notice && <div className="sl-notice">{notice}</div>}

      {list.slots.length === 0 && <div className="sl-empty">清单是空的，先从画布加入一套配对。</div>}

      <div className="sl-grid">
        <div className="sl-col">
          <h3 className="sl-col-title">当前清单（{list.slots.length} 项）</h3>
          {list.slots.map(slot => (
            <SlotCard
              key={slot.id}
              slot={slot}
              list={list}
              pairs={pairs}
              fonts={fonts}
              studioSpec={studioSpec}
              onSubstitute={onSubstitute}
              onProposeParams={onProposeParams}
            />
          ))}
        </div>

        <div className="sl-col">
          <h3 className="sl-col-title">待确认副本（{pending.length}）</h3>
          {pending.length === 0 && (
            <p className="sl-muted">已确认清单上的参数改动 / 替补会先出现在这里，确认前清单保持原样。</p>
          )}
          {pending.map(r => (
            <RevisionCard
              key={r.id}
              revision={r}
              pairs={pairs}
              onConfirm={() => onConfirmRevision(r.id)}
              onDiscard={() => onDiscardRevision(r.id)}
            />
          ))}

          {settled.length > 0 && (
            <>
              <h3 className="sl-col-title sl-col-title-later">已处理的副本（{settled.length}）</h3>
              {settled.map(r => (
                <RevisionCard key={r.id} revision={r} pairs={pairs} onConfirm={() => undefined} onDiscard={() => undefined} />
              ))}
            </>
          )}

          <h3 className="sl-col-title sl-col-title-later">每个决定（{list.decisions.length}）</h3>
          <ol className="sl-decisions">
            {[...list.decisions].reverse().map(d => (
              <li key={d.id}>
                <span className={`sl-dec-kind sl-dec-${d.kind}`}>{DECISION_LABEL[d.kind]}</span>
                <span className="sl-dec-text">{d.summary}</span>
                <time>{fmt(d.at)}</time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
