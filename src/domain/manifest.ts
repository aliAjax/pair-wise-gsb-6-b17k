/**
 * 判断层（domain）：选样清单的全部业务规则
 *
 * 关键不变量：
 * 1. 已确认（confirmed）的修订是冻结档案，任何参数改动都产生 pending 副本，原件不动。
 * 2. 同一清单内，标题与正文“字体/字号/行高”完全相同的组合只保留一套（用途不参与判重）。
 * 3. 客户退回与替补都是 append-only 的“决定”，原项与替补各自有条目可查。
 * 4. 决定只能挂在已确认版本上——客户看到的必须是发出去的定稿。
 *
 * 所有函数为纯函数，返回新状态，不接触 React / localStorage。
 */
import type { Purpose } from '../data/fontCatalog';
import type {
  Decision,
  Entry,
  FieldChange,
  FieldName,
  ManifestState,
  PairingSpec,
  Revision,
  TypeSpec,
} from './types';

export interface Env {
  id: () => string;
  now: () => string;
}

export const defaultEnv: Env = {
  id: () => Math.random().toString(36).slice(2, 10),
  now: () => new Date().toISOString(),
};

export type Outcome =
  | { ok: true; state: ManifestState; revisionId: string; cloned: boolean }
  | { ok: false; state: ManifestState; reason: 'duplicate' | 'no-pending' | 'revision-not-confirmed' | 'entry-not-found'; duplicateEntryId?: string };

/* ------------------------------ 基础查询 ------------------------------ */

export function getPending(state: ManifestState): Revision | undefined {
  return state.revisions.find((r) => r.status === 'pending');
}

export function getLatestConfirmed(state: ManifestState): Revision | undefined {
  return state.revisions
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => b.version - a.version)[0];
}

/** 当前清单：有待确认副本时展示副本，否则展示最近确认版 */
export function getCurrentRevision(state: ManifestState): Revision {
  return getPending(state) ?? getLatestConfirmed(state) ?? state.revisions[state.revisions.length - 1];
}

export function getRevision(state: ManifestState, revisionId: string): Revision | undefined {
  return state.revisions.find((r) => r.id === revisionId);
}

/* --------------------------- 组合签名与去重 --------------------------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 组合签名：标题与正文的字体、字号、行高全部相同即视为同一组合。
 * 用途（purpose）不参与签名——同一组合换个用途仍然只留一套。
 */
export function signature(spec: PairingSpec): string {
  const h = spec.heading;
  const b = spec.body;
  return [h.family, round2(h.size), round2(h.lineHeight), b.family, round2(b.size), round2(b.lineHeight)].join('|');
}

export function sameSpec(a: PairingSpec, b: PairingSpec): boolean {
  return signature(a) === signature(b);
}

/** 该条目是否已被客户决定淘汰（退回或已换替补）——判重时跳过这些“死位” */
export function isSuperseded(state: ManifestState, entryId: string): boolean {
  const d = latestDecision(state.decisions, entryId);
  return d?.kind === 'rejected' || d?.kind === 'substituted';
}

/** 在指定修订中寻找相同的活跃组合；excludeEntryId 为当前正在编辑的条目 */
export function findDuplicate(
  state: ManifestState,
  revision: Revision,
  spec: PairingSpec,
  excludeEntryId?: string,
): Entry | undefined {
  const sig = signature(spec);
  return revision.entries.find(
    (e) =>
      e.id !== excludeEntryId &&
      !isSuperseded(state, e.id) &&
      signature(e.spec) === sig,
  );
}

/* ------------------------------ 决定查询 ------------------------------ */

/** 某条目的最新决定（按时间，时间相同按记录先后） */
export function latestDecision(decisions: Decision[], entryId: string): Decision | undefined {
  let result: Decision | undefined;
  for (const d of decisions) {
    if (d.entryId !== entryId) continue;
    if (!result || d.at >= result.at) result = d;
  }
  return result;
}

export type EntryStatus =
  | { kind: 'undecided' }
  | { kind: 'approved'; decision: Decision }
  | { kind: 'rejected'; decision: Decision }
  | { kind: 'substituted'; decision: Decision };

export function getEntryStatus(state: ManifestState, entryId: string): EntryStatus {
  const d = latestDecision(state.decisions, entryId);
  if (!d) return { kind: 'undecided' };
  return { kind: d.kind, decision: d } as EntryStatus;
}

/* --------------------------- 修订副本（冻结规则） --------------------------- */

function nextVersion(state: ManifestState): number {
  return state.revisions.reduce((m, r) => Math.max(m, r.version), 0) + 1;
}

/**
 * 把某个已确认修订复制为待确认副本。
 * 条目 id / seq 全部保留，因此决定记录可以跨版本追同一个条目。
 */
function cloneToPending(
  state: ManifestState,
  base: Revision,
  env: Env,
  changes: FieldChange[] = [],
): { state: ManifestState; draft: Revision } {
  const draft: Revision = {
    id: env.id(),
    version: nextVersion(state),
    status: 'pending',
    createdAt: env.now(),
    basedOnRevisionId: base.id,
    entries: base.entries.map((e) => ({ ...e, spec: { heading: { ...e.spec.heading }, body: { ...e.spec.body } } })),
    changes,
  };
  return { state: { ...state, revisions: [...state.revisions, draft] }, draft };
}

/* ------------------------------- 字段比对 ------------------------------- */

const FIELD_PATHS: { field: FieldName; read: (e: Entry) => string | number }[] = [
  { field: 'heading.family', read: (e) => e.spec.heading.family },
  { field: 'heading.size', read: (e) => e.spec.heading.size },
  { field: 'heading.lineHeight', read: (e) => e.spec.heading.lineHeight },
  { field: 'body.family', read: (e) => e.spec.body.family },
  { field: 'body.size', read: (e) => e.spec.body.size },
  { field: 'body.lineHeight', read: (e) => e.spec.body.lineHeight },
  { field: 'purpose', read: (e) => String(e.purpose) },
];

export function diffEntries(before: Entry, after: Entry): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const { field, read } of FIELD_PATHS) {
    const b = read(before);
    const a = read(after);
    if (String(b) !== String(a)) changes.push({ field, before: b, after: a });
  }
  return changes;
}

/** 副本相对其所依据版本的逐条目差异，供“待确认副本”提示 */
export interface EntryDiff {
  kind: 'added' | 'changed' | 'removed' | 'unchanged';
  changes: FieldChange[];
}

export function diffRevision(state: ManifestState, revision: Revision): Map<string, EntryDiff> {
  const result = new Map<string, EntryDiff>();
  const base = revision.basedOnRevisionId
    ? state.revisions.find((r) => r.id === revision.basedOnRevisionId)
    : undefined;
  if (!base) {
    revision.entries.forEach((e) => result.set(e.id, { kind: 'unchanged', changes: [] }));
    return result;
  }
  for (const e of revision.entries) {
    const old = base.entries.find((x) => x.id === e.id);
    if (!old) {
      result.set(e.id, { kind: 'added', changes: [] });
    } else {
      const changes = diffEntries(old, e);
      result.set(e.id, changes.length ? { kind: 'changed', changes } : { kind: 'unchanged', changes: [] });
    }
  }
  for (const old of base.entries) {
    if (!revision.entries.some((e) => e.id === old.id)) {
      result.set(old.id, { kind: 'removed', changes: [] });
    }
  }
  return result;
}

/* ------------------------------- 写入操作 ------------------------------- */

export interface EditInput {
  heading?: Partial<TypeSpec>;
  body?: Partial<TypeSpec>;
  purpose?: Purpose;
}

function applyEdit(entry: Entry, input: EditInput): Entry {
  return {
    ...entry,
    purpose: input.purpose ?? entry.purpose,
    spec: {
      heading: { ...entry.spec.heading, ...input.heading },
      body: { ...entry.spec.body, ...input.body },
    },
  };
}

/**
 * 改参数 / 改用途：
 * - 改的是已确认版 → 自动生成待确认副本，已确认清单原样保留；
 * - 改的是待确认副本 → 只动副本；
 * - 与清单中另一套活跃组合完全相同 → 拒绝写入。
 */
export function editEntry(
  prev: ManifestState,
  entryId: string,
  input: EditInput,
  env: Env = defaultEnv,
): Outcome {
  const pending = getPending(prev);
  const confirmed = getLatestConfirmed(prev);

  let working = prev;
  let target: Revision;
  let cloned = false;

  if (pending) {
    target = pending;
  } else if (confirmed) {
    const clonedResult = cloneToPending(prev, confirmed, env);
    working = clonedResult.state;
    target = clonedResult.draft;
    cloned = true;
  } else {
    return { ok: false, state: prev, reason: 'no-pending' };
  }

  const index = target.entries.findIndex((e) => e.id === entryId);
  if (index < 0) return { ok: false, state: prev, reason: 'entry-not-found' };

  const before = target.entries[index];
  const after = applyEdit(before, input);

  const dup = findDuplicate(working, target, after.spec, entryId);
  if (dup) return { ok: false, state: prev, reason: 'duplicate', duplicateEntryId: dup.id };

  const extraChanges = diffEntries(before, after);
  const newRevision: Revision = {
    ...target,
    entries: target.entries.map((e) => (e.id === entryId ? after : e)),
    changes: [...target.changes, ...extraChanges],
  };
  return {
    ok: true,
    cloned,
    revisionId: target.id,
    state: { ...working, revisions: working.revisions.map((r) => (r.id === target.id ? newRevision : r)) },
  };
}

/**
 * 从字体库往清单加一套配对。对已确认版操作时同样先生成待确认副本。
 */
export function addEntry(
  prev: ManifestState,
  item: { purpose: Purpose; spec: PairingSpec },
  env: Env = defaultEnv,
): Outcome {
  const pending = getPending(prev);
  const confirmed = getLatestConfirmed(prev);

  let working = prev;
  let target: Revision;
  let cloned = false;

  if (pending) {
    target = pending;
  } else if (confirmed) {
    const clonedResult = cloneToPending(prev, confirmed, env);
    working = clonedResult.state;
    target = clonedResult.draft;
    cloned = true;
  } else {
    return { ok: false, state: prev, reason: 'no-pending' };
  }

  const dup = findDuplicate(working, target, item.spec);
  if (dup) return { ok: false, state: prev, reason: 'duplicate', duplicateEntryId: dup.id };

  const seq = prev.seqCounter + 1;
  const entry: Entry = {
    id: env.id(),
    seq,
    purpose: item.purpose,
    spec: {
      heading: { ...item.spec.heading },
      body: { ...item.spec.body },
    },
  };
  const newRevision: Revision = {
    ...target,
    entries: [...target.entries, entry],
    changes: [...target.changes, { field: 'purpose', before: '（无）', after: `新增 #${String(seq).padStart(2, '0')}` }],
  };
  return {
    ok: true,
    cloned,
    revisionId: target.id,
    state: {
      ...working,
      seqCounter: seq,
      revisions: working.revisions.map((r) => (r.id === target.id ? newRevision : r)),
    },
  };
}

function appendDecision(
  state: ManifestState,
  decision: Omit<Decision, 'id' | 'at'>,
  env: Env,
): { state: ManifestState; decision: Decision } {
  const full: Decision = { ...decision, id: env.id(), at: env.now() };
  return { state: { ...state, decisions: [...state.decisions, full] }, decision: full };
}

/** 客户认可某条目，只能记录在已确认版本上；已认可则不重复记录 */
export function approveEntry(
  prev: ManifestState,
  revisionId: string,
  entryId: string,
  note: string | undefined,
  env: Env = defaultEnv,
): Outcome {
  const revision = prev.revisions.find((r) => r.id === revisionId);
  if (!revision || revision.status !== 'confirmed') {
    return { ok: false, state: prev, reason: 'revision-not-confirmed' };
  }
  if (latestDecision(prev.decisions, entryId)?.kind === 'approved') {
    return { ok: true, state: prev, revisionId, cloned: false };
  }
  const { state } = appendDecision(prev, { kind: 'approved', entryId, revisionId, note }, env);
  return { ok: true, state, revisionId, cloned: false };
}

/** 客户退回某条目（可只退回、稍后再换替补） */
export function rejectEntry(
  prev: ManifestState,
  revisionId: string,
  entryId: string,
  note: string | undefined,
  env: Env = defaultEnv,
): Outcome {
  const revision = prev.revisions.find((r) => r.id === revisionId);
  if (!revision || revision.status !== 'confirmed') {
    return { ok: false, state: prev, reason: 'revision-not-confirmed' };
  }
  // 已经是退回状态就不重复记录
  if (latestDecision(prev.decisions, entryId)?.kind === 'rejected') {
    return { ok: true, state: prev, revisionId, cloned: false };
  }
  const { state } = appendDecision(prev, { kind: 'rejected', entryId, revisionId, note }, env);
  return { ok: true, state, revisionId, cloned: false };
}

/**
 * 客户退回某项并换上替补（一个原子动作，保证“退回”和“替补”都可查）：
 * 1. 决定挂在客户实际看到的已确认版本上；
 * 2. 若还没有待确认副本，从该版复制一份（已确认清单不动）；
 * 3. 替补作为新条目进入副本，replacedEntryId 指回原项；
 * 4. 记录 rejected + substituted 两条决定。
 */
export function rejectWithSubstitute(
  prev: ManifestState,
  confirmedRevisionId: string,
  originalEntryId: string,
  substitute: { purpose: Purpose; spec: PairingSpec },
  note: string | undefined,
  env: Env = defaultEnv,
): Outcome {
  const base = prev.revisions.find((r) => r.id === confirmedRevisionId);
  if (!base || base.status !== 'confirmed') {
    return { ok: false, state: prev, reason: 'revision-not-confirmed' };
  }
  if (!base.entries.some((e) => e.id === originalEntryId)) {
    return { ok: false, state: prev, reason: 'entry-not-found' };
  }

  // 准备或复用待确认副本
  let working = prev;
  let draft = getPending(prev);
  let draftId = draft?.id;
  let cloned = false;
  if (!draft) {
    const r = cloneToPending(prev, base, env);
    working = r.state;
    draft = r.draft;
    draftId = draft.id;
    cloned = true;
  }

  // 替补组合不能与副本中仍活跃的组合撞车
  const dup = findDuplicate(working, draft!, substitute.spec, originalEntryId);
  if (dup) return { ok: false, state: prev, reason: 'duplicate', duplicateEntryId: dup.id };

  const seq = prev.seqCounter + 1;
  const subEntry: Entry = {
    id: env.id(),
    seq,
    purpose: substitute.purpose,
    spec: {
      heading: { ...substitute.spec.heading },
      body: { ...substitute.spec.body },
    },
    replacedEntryId: originalEntryId,
  };

  const updatedDraft: Revision = {
    ...draft!,
    entries: [...draft!.entries, subEntry],
    changes: [
      ...draft!.changes,
      { field: 'purpose', before: `退回 #${String(base.entries.find((e) => e.id === originalEntryId)!.seq).padStart(2, '0')}`, after: `替补 #${String(seq).padStart(2, '0')}` },
    ],
  };
  working = {
    ...working,
    seqCounter: seq,
    revisions: working.revisions.map((r) => (r.id === draftId ? updatedDraft : r)),
  };

  // 原项若尚未记退回，先补一条退回决定
  const prior = latestDecision(working.decisions, originalEntryId);
  if (prior?.kind !== 'rejected' && prior?.kind !== 'substituted') {
    const r1 = appendDecision(working, { kind: 'rejected', entryId: originalEntryId, revisionId: confirmedRevisionId, note }, env);
    working = r1.state;
  }
  const r2 = appendDecision(
    working,
    { kind: 'substituted', entryId: originalEntryId, revisionId: confirmedRevisionId, note, substituteEntryId: subEntry.id },
    env,
  );
  working = r2.state;

  return { ok: true, state: working, revisionId: draftId!, cloned };
}

/* ----------------------------- 副本定稿 / 撤销 ----------------------------- */

/** 确认待确认副本：冻结为新版本；历史版本与决定原样保留 */
export function confirmPending(prev: ManifestState, env: Env = defaultEnv): ManifestState {
  const pending = getPending(prev);
  if (!pending) return prev;
  return {
    ...prev,
    revisions: prev.revisions.map((r) =>
      r.id === pending.id ? { ...r, status: 'confirmed', confirmedAt: env.now() } : r,
    ),
  };
}

/**
 * 撤销待确认副本：
 * - 删掉副本及其新增的替补条目；
 * - 随替补产生的 substituted 决定一并删除（替补不存在了）；
 * - 客户对原项说的 rejected 保留——决定是客户的话，不随草稿抹掉。
 */
export function discardPending(prev: ManifestState): ManifestState {
  const pending = getPending(prev);
  if (!pending) return prev;
  const draftEntryIds = new Set(pending.entries.map((e) => e.id));
  return {
    ...prev,
    revisions: prev.revisions.filter((r) => r.id !== pending.id),
    decisions: prev.decisions.filter(
      (d) => !(d.kind === 'substituted' && d.substituteEntryId && draftEntryIds.has(d.substituteEntryId)),
    ),
  };
}

/* ------------------------------- 界面投影 ------------------------------- */

export interface ManifestRow {
  entry: Entry;
  status: EntryStatus;
  diff: EntryDiff;
}

/** 界面渲染某修订时需要的逐行视图 */
export function buildRows(state: ManifestState, revision: Revision): ManifestRow[] {
  const diffs = diffRevision(state, revision);
  return revision.entries.map((entry) => ({
    entry,
    status: getEntryStatus(state, entry.id),
    diff: diffs.get(entry.id) ?? { kind: 'unchanged', changes: [] },
  }));
}
