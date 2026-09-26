// 判断层：选样清单的全部业务规则。纯函数，不碰存储、不碰界面。
import type {
  Choice,
  Decision,
  DecisionKind,
  FontSpec,
  PairRef,
  Revision,
  Shortlist,
  Slot,
} from './types';

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** 标题字体 + 正文字体相同即视为同一组合 */
export const sameCombo = (a: FontSpec, b: FontSpec): boolean =>
  a.headingFont === b.headingFont && a.bodyFont === b.bodyFont;

export const currentChoice = (slot: Slot): Choice =>
  slot.choices[slot.choices.length - 1];

export const pendingRevisionOf = (list: Shortlist, slotId: string): Revision | undefined =>
  list.revisions.find(r => r.slotId === slotId && r.status === 'pending');

const comboLabel = (s: FontSpec): string => `${s.headingFont} + ${s.bodyFont}`;

const decision = (kind: DecisionKind, summary: string, at: string, slotId?: string): Decision => ({
  id: uid(),
  at,
  kind,
  summary,
  slotId,
});

export type Result = {ok: true; list: Shortlist} | {ok: false; reason: string};

export function createShortlist(name: string, now: string): Shortlist {
  return {
    id: uid(),
    name,
    status: 'open',
    createdAt: now,
    confirmedAt: null,
    slots: [],
    revisions: [],
    decisions: [],
  };
}

/** 同一清单里，其它槽位的当前选择是否已占用这个字体组合 */
function comboTaken(list: Shortlist, spec: FontSpec, exceptSlotId?: string): boolean {
  return list.slots.some(
    s => s.id !== exceptSlotId && sameCombo(currentChoice(s).spec, spec),
  );
}

/** 从库里挑一对进清单，记下当时的字体、字号、行高和用途 */
export function pickFromLibrary(
  list: Shortlist,
  pair: PairRef,
  spec: FontSpec,
  now: string,
): Result {
  if (list.status === 'confirmed') {
    return {ok: false, reason: '清单已确认，不能再加项；如需调整请走「改动参数」生成待确认副本。'};
  }
  if (comboTaken(list, spec)) {
    return {ok: false, reason: `「${comboLabel(spec)}」已在清单里，同一组合只留一套。`};
  }
  const slot: Slot = {
    id: uid(),
    addedAt: now,
    choices: [
      {id: uid(), source: 'initial', pair, spec, decidedAt: now, outcome: 'active'},
    ],
  };
  return {
    ok: true,
    list: {
      ...list,
      slots: [...list.slots, slot],
      decisions: [
        ...list.decisions,
        decision('pick', `从库中加入「${pair.title}」（${comboLabel(spec)}，${spec.headingSizePx}px / 行高 ${spec.lineHeight}，用途：${spec.purpose}）`, now, slot.id),
      ],
    },
  };
}

/**
 * 客户退回某项后换替补。
 * 未确认的清单：直接换，原项标记「已退回」留在历史里可查。
 * 已确认的清单：只生成待确认副本，原清单保持原样。
 */
export function rejectWithSubstitute(
  list: Shortlist,
  slotId: string,
  pair: PairRef,
  spec: FontSpec,
  now: string,
): Result {
  const slot = list.slots.find(s => s.id === slotId);
  if (!slot) return {ok: false, reason: '找不到这一项。'};
  if (pendingRevisionOf(list, slotId)) {
    return {ok: false, reason: '这一项已有待确认副本，请先确认或放弃。'};
  }
  if (comboTaken(list, spec, slotId)) {
    return {ok: false, reason: `「${comboLabel(spec)}」已被清单里其它项占用，同一组合只留一套。`};
  }
  const old = currentChoice(slot);

  if (list.status === 'confirmed') {
    const revision: Revision = {
      id: uid(),
      slotId,
      kind: 'substitute',
      before: {pair: old.pair, spec: old.spec},
      after: {pair, spec},
      createdAt: now,
      status: 'pending',
    };
    return {
      ok: true,
      list: {
        ...list,
        revisions: [...list.revisions, revision],
        decisions: [
          ...list.decisions,
          decision('propose-substitute', `退回「${old.pair?.title ?? '未命名'}」，提议替补「${pair.title}」（${comboLabel(spec)}），待确认`, now, slotId),
        ],
      },
    };
  }

  const substitute: Choice = {id: uid(), source: 'substitute', pair, spec, decidedAt: now, outcome: 'active'};
  const slots = list.slots.map(s =>
    s.id === slotId
      ? {
          ...s,
          choices: [
            ...s.choices.map(c => (c.id === old.id ? {...c, outcome: 'rejected' as const} : c)),
            substitute,
          ],
        }
      : s,
  );
  return {
    ok: true,
    list: {
      ...list,
      slots,
      decisions: [
        ...list.decisions,
        decision('substitute', `退回「${old.pair?.title ?? '未命名'}」，换替补「${pair.title}」（${comboLabel(spec)}）`, now, slotId),
      ],
    },
  };
}

/** 参数改动：只针对已确认的清单，生成待确认副本，原清单不动 */
export function proposeParamChange(
  list: Shortlist,
  slotId: string,
  after: FontSpec,
  now: string,
): Result {
  if (list.status !== 'confirmed') {
    return {ok: false, reason: '清单还没确认，直接退回重挑即可，无需参数副本。'};
  }
  const slot = list.slots.find(s => s.id === slotId);
  if (!slot) return {ok: false, reason: '找不到这一项。'};
  if (pendingRevisionOf(list, slotId)) {
    return {ok: false, reason: '这一项已有待确认副本，请先确认或放弃。'};
  }
  if (comboTaken(list, after, slotId)) {
    return {ok: false, reason: `「${comboLabel(after)}」已被清单里其它项占用，同一组合只留一套。`};
  }
  const old = currentChoice(slot);
  const revision: Revision = {
    id: uid(),
    slotId,
    kind: 'params',
    before: {pair: old.pair, spec: old.spec},
    after: {pair: old.pair, spec: after},
    createdAt: now,
    status: 'pending',
  };
  return {
    ok: true,
    list: {
      ...list,
      revisions: [...list.revisions, revision],
      decisions: [
        ...list.decisions,
        decision('propose-params', `为「${old.pair?.title ?? '未命名'}」生成参数改动副本（${comboLabel(after)}，${after.headingSizePx}px / 行高 ${after.lineHeight}），待确认`, now, slotId),
      ],
    },
  };
}

/** 客户确认副本：改动落进清单，旧选择标记「已退回 / 已被替换」保留可查 */
export function confirmRevision(list: Shortlist, revisionId: string, now: string): Result {
  const revision = list.revisions.find(r => r.id === revisionId);
  if (!revision || revision.status !== 'pending') {
    return {ok: false, reason: '找不到待确认的副本。'};
  }
  if (comboTaken(list, revision.after.spec, revision.slotId)) {
    return {ok: false, reason: `「${comboLabel(revision.after.spec)}」已被清单里其它项占用，无法确认。`};
  }
  const slot = list.slots.find(s => s.id === revision.slotId);
  if (!slot) return {ok: false, reason: '找不到这一项。'};
  const old = currentChoice(slot);
  const applied: Choice = {
    id: uid(),
    source: revision.kind === 'substitute' ? 'substitute' : 'revision',
    pair: revision.after.pair,
    spec: revision.after.spec,
    decidedAt: now,
    outcome: 'active',
  };
  const slots = list.slots.map(s =>
    s.id === revision.slotId
      ? {
          ...s,
          choices: [
            ...s.choices.map(c =>
              c.id === old.id
                ? {...c, outcome: (revision.kind === 'substitute' ? 'rejected' : 'superseded') as Choice['outcome']}
                : c,
            ),
            applied,
          ],
        }
      : s,
  );
  return {
    ok: true,
    list: {
      ...list,
      slots,
      revisions: list.revisions.map(r =>
        r.id === revisionId ? {...r, status: 'confirmed' as const} : r,
      ),
      decisions: [
        ...list.decisions,
        decision('confirm-revision', `确认副本：「${old.pair?.title ?? '未命名'}」更新为 ${comboLabel(revision.after.spec)}（${revision.after.spec.headingSizePx}px / 行高 ${revision.after.spec.lineHeight}）`, now, revision.slotId),
      ],
    },
  };
}

/** 放弃副本：已确认的清单从头到尾没动过 */
export function discardRevision(list: Shortlist, revisionId: string, now: string): Result {
  const revision = list.revisions.find(r => r.id === revisionId);
  if (!revision || revision.status !== 'pending') {
    return {ok: false, reason: '找不到待确认的副本。'};
  }
  return {
    ok: true,
    list: {
      ...list,
      revisions: list.revisions.map(r =>
        r.id === revisionId ? {...r, status: 'discarded' as const} : r,
      ),
      decisions: [
        ...list.decisions,
        decision('discard-revision', `放弃${revision.kind === 'substitute' ? '替补' : '参数'}副本，清单保持原样`, now, revision.slotId),
      ],
    },
  };
}

/** 确认清单：此后任何改动都只能走待确认副本 */
export function confirmShortlist(list: Shortlist, now: string): Result {
  if (list.status === 'confirmed') return {ok: false, reason: '清单已经确认过了。'};
  if (list.slots.length === 0) return {ok: false, reason: '清单还是空的，先挑几套再确认。'};
  return {
    ok: true,
    list: {
      ...list,
      status: 'confirmed',
      confirmedAt: now,
      decisions: [...list.decisions, decision('confirm-list', `确认清单「${list.name}」，共 ${list.slots.length} 项`, now)],
    },
  };
}
