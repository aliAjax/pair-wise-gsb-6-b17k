/**
 * 存档层（archive）：初始资料
 * 提供一份开箱即用的示例清单（已确认 v1 + 待确认 v2 替补），
 * 让“退回 / 替补 / 改参数生成副本”的状态在首次打开时就能看到。
 */
import type { ManifestState } from '../domain/types';

export function createInitialState(): ManifestState {
  const e1 = {
    id: 'e-seed-1',
    seq: 1,
    purpose: '封面标题',
    spec: {
      heading: { family: 'fraunces', size: 42, lineHeight: 1.1 },
      body: { family: 'dm-sans', size: 15, lineHeight: 1.7 },
    },
  };
  const e2 = {
    id: 'e-seed-2',
    seq: 2,
    purpose: '章节标题',
    spec: {
      heading: { family: 'space-grotesk', size: 28, lineHeight: 1.2 },
      body: { family: 'newsreader', size: 16, lineHeight: 1.65 },
    },
  };
  const e3 = {
    id: 'e-seed-3',
    seq: 3,
    purpose: '引文',
    spec: {
      heading: { family: 'playfair', size: 38, lineHeight: 1.12 },
      body: { family: 'inter', size: 14, lineHeight: 1.6 },
    },
  };
  // 待确认 v2 中：e1 客户认可后微调了标题字号；e4 是客户退回 e3 后的替补
  const e1Tuned = {
    ...e1,
    spec: { ...e1.spec, heading: { family: 'fraunces', size: 46, lineHeight: 1.12 } },
  };
  const e4 = {
    id: 'e-seed-4',
    seq: 4,
    purpose: '引文',
    replacedEntryId: 'e-seed-3',
    spec: {
      heading: { family: 'newsreader', size: 30, lineHeight: 1.2 },
      body: { family: 'ibm-plex', size: 14, lineHeight: 1.6 },
    },
  };

  const v1Id = 'rev-seed-v1';
  const v2Id = 'rev-seed-v2';

  return {
    projectName: '山径杂志改版',
    clientName: '山径 Mountain Trail',
    seqCounter: 4,
    revisions: [
      {
        id: v1Id,
        version: 1,
        status: 'confirmed',
        createdAt: '2026-09-18T02:00:00.000Z',
        confirmedAt: '2026-09-18T03:30:00.000Z',
        entries: [e1, e2, e3],
        changes: [],
      },
      {
        id: v2Id,
        version: 2,
        status: 'pending',
        createdAt: '2026-09-24T08:10:00.000Z',
        basedOnRevisionId: v1Id,
        entries: [e1Tuned, e2, e3, e4],
        changes: [
          { field: 'heading.size', before: 42, after: 46 },
          { field: 'heading.lineHeight', before: 1.1, after: 1.12 },
          { field: 'purpose', before: '退回 #03', after: '替补 #04' },
        ],
      },
    ],
    decisions: [
      { id: 'dec-1', kind: 'approved', entryId: 'e-seed-1', revisionId: v1Id, at: '2026-09-19T01:20:00.000Z', note: '封面调性对了' },
      { id: 'dec-2', kind: 'approved', entryId: 'e-seed-2', revisionId: v1Id, at: '2026-09-19T01:22:00.000Z' },
      {
        id: 'dec-3',
        kind: 'rejected',
        entryId: 'e-seed-3',
        revisionId: v1Id,
        at: '2026-09-23T09:40:00.000Z',
        note: '引文部分太华丽，想要更安静的',
      },
      {
        id: 'dec-4',
        kind: 'substituted',
        entryId: 'e-seed-3',
        revisionId: v1Id,
        at: '2026-09-24T08:10:00.000Z',
        substituteEntryId: 'e-seed-4',
      },
    ],
  };
}
