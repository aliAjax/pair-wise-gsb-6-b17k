/** 界面层：小型展示组件与格式化辅助 */
import type { ReactNode } from 'react';
import { fontFamily, FONT_FAMILIES, type FontFamilyId } from '../../data/fontCatalog';
import type { Decision } from '../../domain/types';
import type { EntryStatus } from '../../domain/manifest';

export const seqLabel = (seq: number) => `#${String(seq).padStart(2, '0')}`;

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fontStack(id: string): string {
  const f = FONT_FAMILIES.find((x) => x.id === id);
  return f ? f.stack : `'${id}', sans-serif`;
}

export function fontName(id: string): string {
  const f = FONT_FAMILIES.find((x) => x.id === id);
  return f ? f.name : id;
}

const STATUS_META: Record<EntryStatus['kind'], { label: string; cls: string }> = {
  undecided: { label: '待客户决定', cls: 'st-undecided' },
  approved: { label: '客户已定', cls: 'st-approved' },
  rejected: { label: '客户退回', cls: 'st-rejected' },
  substituted: { label: '已换替补', cls: 'st-substituted' },
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  const meta = STATUS_META[status.kind];
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

const DECISION_LABEL: Record<Decision['kind'], string> = {
  approved: '认可',
  rejected: '退回',
  substituted: '换替补',
};

export function decisionLabel(kind: Decision['kind']): string {
  return DECISION_LABEL[kind];
}

export function FontSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: FontFamilyId) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="font-select"
      value={FONT_FAMILIES.some((f) => f.id === value) ? value : ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as FontFamilyId)}
    >
      {!FONT_FAMILIES.some((f) => f.id === value) && <option value={value}>{value}</option>}
      {FONT_FAMILIES.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}（{f.kind === 'serif' ? '衬线' : f.kind === 'sans' ? '无衬线' : '中文'}）
        </option>
      ))}
    </select>
  );
}

export function Stepper({
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const fmt = (n: number) => (step < 1 ? n.toFixed(2).replace(/0$/, '') : String(n));
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <span className="stepper">
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(+(value - step).toFixed(2)))}>
        −
      </button>
      <b>
        {fmt(value)}
        {unit ? <i>{unit}</i> : null}
      </b>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(+(value + step).toFixed(2)))}>
        +
      </button>
    </span>
  );
}

export function DiffChip({ children }: { children: ReactNode }) {
  return <span className="diff-chip">{children}</span>;
}

export function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    'heading.family': '标题字体',
    'heading.size': '标题字号',
    'heading.lineHeight': '标题行高',
    'body.family': '正文字体',
    'body.size': '正文字号',
    'body.lineHeight': '正文行高',
    purpose: '用途/条目',
  };
  return map[field] ?? field;
}

export function valuePreview(v: string | number): string {
  return typeof v === 'string' && FONT_FAMILIES.some((f) => f.id === v) ? fontFamily(v as FontFamilyId).name : String(v);
}
