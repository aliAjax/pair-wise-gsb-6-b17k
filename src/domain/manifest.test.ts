import { describe, expect, it } from 'vitest';
import type { ManifestState, PairingSpec } from './types';
import {
  addEntry,
  approveEntry,
  buildRows,
  confirmPending,
  discardPending,
  editEntry,
  findDuplicate,
  getCurrentRevision,
  getLatestConfirmed,
  getPending,
  rejectEntry,
  rejectWithSubstitute,
  signature,
} from './manifest';

const envSeq = (() => {
  let n = 0;
  return {
    id: () => `id-${++n}`,
    now: () => new Date(Date.UTC(2026, 8, 1 + Math.floor(n / 5))).toISOString(),
  };
})();

function specA(): PairingSpec {
  return {
    heading: { family: 'fraunces', size: 42, lineHeight: 1.1 },
    body: { family: 'dm-sans', size: 15, lineHeight: 1.7 },
  };
}
function specB(): PairingSpec {
  return {
    heading: { family: 'playfair', size: 38, lineHeight: 1.12 },
    body: { family: 'inter', size: 14, lineHeight: 1.6 },
  };
}

function freshState(): ManifestState {
  const state: ManifestState = {
    projectName: 'P',
    clientName: 'C',
    seqCounter: 1,
    revisions: [
      {
        id: 'r1',
        version: 1,
        status: 'confirmed',
        createdAt: '2026-09-01T00:00:00.000Z',
        confirmedAt: '2026-09-01T01:00:00.000Z',
        changes: [],
        entries: [
          { id: 'e1', seq: 1, purpose: '封面标题', spec: specA() },
          { id: 'e2', seq: 2, purpose: '正文', spec: specB() },
        ],
      },
    ],
    decisions: [],
  };
  return state;
}

describe('组合签名与去重', () => {
  it('标题+正文字体/字号/行高全相同即同签名，用途不参与', () => {
    const s = specA();
    expect(signature(s)).toBe(signature({ heading: { ...s.heading }, body: { ...s.body } }));
    expect(signature(specA())).not.toBe(signature(specB()));
  });

  it('加入相同组合被拒绝，且返回撞车条目', () => {
    const state = freshState();
    const result = addEntry(state, { purpose: '换个用途', spec: specA() }, envSeq);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('duplicate');
  });

  it('已退回条目的组合可以重新加入（死位不占签名）', () => {
    let state = freshState();
    const rejected = rejectEntry(state, 'r1', 'e2', '不喜欢', envSeq);
    expect(rejected.ok).toBe(true);
    if (rejected.ok) state = rejected.state;
    const result = addEntry(state, { purpose: '正文', spec: specB() }, envSeq);
    expect(result.ok).toBe(true);
  });

  it('编辑成另一套已有组合被拒绝', () => {
    const state = freshState();
    const result = editEntry(state, 'e1', { heading: { size: 38, family: 'playfair', lineHeight: 1.12 }, body: { family: 'inter', size: 14, lineHeight: 1.6 } }, envSeq);
    expect(result.ok).toBe(false);
  });

  it('findDuplicate 排除自身条目', () => {
    const state = freshState();
    const rev = state.revisions[0];
    expect(findDuplicate(state, rev, specA(), 'e1')).toBeUndefined();
  });
});

describe('已确认清单冻结，改动生成待确认副本', () => {
  it('编辑已确认版条目时生成 pending 副本，原确认版不动', () => {
    const state = freshState();
    const confirmedSnapshot = JSON.stringify(getLatestConfirmed(state));
    const result = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cloned).toBe(true);
      const confirmed = getLatestConfirmed(result.state)!;
      expect(JSON.stringify(confirmed)).toBe(confirmedSnapshot);
      expect(confirmed.entries[0].spec.heading.size).toBe(42);
      const pending = getPending(result.state)!;
      expect(pending.basedOnRevisionId).toBe(confirmed.id);
      expect(pending.entries[0].spec.heading.size).toBe(48);
      // 条目 id 跨版本稳定
      expect(pending.entries[0].id).toBe('e1');
    }
  });

  it('有待确认副本时继续编辑只动副本，不再复制', () => {
    let state = freshState();
    const r1 = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(r1.ok).toBe(true);
    if (r1.ok) state = r1.state;
    const revisionCount = state.revisions.length;
    const r2 = editEntry(state, 'e1', { body: { size: 16 } }, envSeq);
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.cloned).toBe(false);
      expect(r2.state.revisions.length).toBe(revisionCount);
      expect(getPending(r2.state)!.entries[0].spec.heading.size).toBe(48);
      expect(getPending(r2.state)!.entries[0].spec.body.size).toBe(16);
    }
  });

  it('addEntry 对已确认版操作也生成副本', () => {
    const state = freshState();
    const result = addEntry(
      state,
      {
        purpose: '图注',
        spec: {
          heading: { family: 'ibm-plex', size: 22, lineHeight: 1.3 },
          body: { family: 'ibm-plex', size: 12, lineHeight: 1.5 },
        },
      },
      envSeq,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cloned).toBe(true);
      expect(getLatestConfirmed(result.state)!.entries).toHaveLength(2);
      expect(getPending(result.state)!.entries).toHaveLength(3);
    }
  });

  it('确认副本后冻结为新版本，历史版本保留', () => {
    let state = freshState();
    const r = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(r.ok).toBe(true);
    if (r.ok) {
      state = confirmPending(r.state, envSeq);
      expect(getPending(state)).toBeUndefined();
      expect(state.revisions).toHaveLength(2);
      expect(getCurrentRevision(state).status).toBe('confirmed');
      expect(getCurrentRevision(state).version).toBe(2);
      // v1 原参数仍可查
      expect(state.revisions[0].entries[0].spec.heading.size).toBe(42);
    }
  });
});

describe('退回与替补', () => {
  it('决定只能记录在已确认版本上', () => {
    let state = freshState();
    const r = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(r.ok).toBe(true);
    if (r.ok) {
      state = r.state;
      const pendingId = getPending(state)!.id;
      const bad = approveEntry(state, pendingId, 'e1', undefined, envSeq);
      expect(bad.ok).toBe(false);
    }
  });

  it('退回 + 替补是一个原子动作：原项退回、替补进副本、两条决定可查', () => {
    const state = freshState();
    const result = rejectWithSubstitute(
      state,
      'r1',
      'e2',
      {
        purpose: '正文',
        spec: {
          heading: { family: 'newsreader', size: 26, lineHeight: 1.25 },
          body: { family: 'ibm-plex', size: 14, lineHeight: 1.65 },
        },
      },
      '想换个更安静的',
      envSeq,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cloned).toBe(true);
      const pending = getPending(result.state)!;
      const sub = pending.entries.find((e) => e.replacedEntryId === 'e2')!;
      expect(sub).toBeTruthy();
      const decisions = result.state.decisions;
      expect(decisions.some((d) => d.entryId === 'e2' && d.kind === 'rejected')).toBe(true);
      const substituted = decisions.find((d) => d.kind === 'substituted');
      expect(substituted?.substituteEntryId).toBe(sub.id);
      expect(substituted?.revisionId).toBe('r1');
    }
  });

  it('替补组合与活跃组合撞车时被拒绝，状态不变', () => {
    const state = freshState();
    const result = rejectWithSubstitute(state, 'r1', 'e2', { purpose: '正文', spec: specA() }, undefined, envSeq);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('duplicate');
    expect(getPending(state)).toBeUndefined();
    expect(state.decisions).toHaveLength(0);
  });

  it('撤销副本删掉替补与 substituted 决定，但保留客户对原项的退回', () => {
    let state = freshState();
    const result = rejectWithSubstitute(
      state,
      'r1',
      'e2',
      {
        purpose: '正文',
        spec: {
          heading: { family: 'newsreader', size: 26, lineHeight: 1.25 },
          body: { family: 'ibm-plex', size: 14, lineHeight: 1.65 },
        },
      },
      undefined,
      envSeq,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      state = discardPending(result.state);
      expect(getPending(state)).toBeUndefined();
      expect(state.decisions.some((d) => d.kind === 'substituted')).toBe(false);
      expect(state.decisions.some((d) => d.kind === 'rejected' && d.entryId === 'e2')).toBe(true);
    }
  });
});

describe('当前清单与每个决定的视图', () => {
  it('有待确认副本时当前清单是副本，否则是最近确认版', () => {
    const state = freshState();
    expect(getCurrentRevision(state).id).toBe('r1');
    const r = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(r.ok).toBe(true);
    if (r.ok) expect(getCurrentRevision(r.state).status).toBe('pending');
  });

  it('buildRows 给出每行状态与差异', () => {
    let state = freshState();
    const approved = approveEntry(state, 'r1', 'e1', '好', envSeq);
    expect(approved.ok).toBe(true);
    if (approved.ok) state = approved.state;
    const r = editEntry(state, 'e1', { heading: { size: 48 } }, envSeq);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const pending = getPending(r.state)!;
      const rows = buildRows(r.state, pending);
      const row1 = rows.find((x) => x.entry.id === 'e1')!;
      expect(row1.status.kind).toBe('approved');
      expect(row1.diff.kind).toBe('changed');
      expect(row1.diff.changes[0].field).toBe('heading.size');
    }
  });
});
