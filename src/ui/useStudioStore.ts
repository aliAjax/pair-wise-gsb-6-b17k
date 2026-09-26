/**
 * 界面层（ui）：状态编排
 * 把界面事件翻译为判断层的纯函数动作，再通过存档层持久化。
 * 界面规则（看档案时只读、提示文案）不进判断层。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Purpose } from '../data/fontCatalog';
import { manifestRepository } from '../archive/repository';
import type { ManifestState, PairingSpec } from '../domain/types';
import {
  addEntry,
  approveEntry,
  buildRows,
  confirmPending,
  discardPending,
  editEntry,
  getCurrentRevision,
  getLatestConfirmed,
  getPending,
  getRevision,
  rejectEntry,
  rejectWithSubstitute,
} from '../domain/manifest';

export type Notice =
  | { kind: 'info'; text: string }
  | { kind: 'warn'; text: string };

export function useStudioStore() {
  const [state, setState] = useState<ManifestState>(() => manifestRepository.load());
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    manifestRepository.save(state);
  }, [state]);

  const pending = useMemo(() => getPending(state), [state]);
  const latestConfirmed = useMemo(() => getLatestConfirmed(state), [state]);
  const current = useMemo(() => getCurrentRevision(state), [state]);
  const viewing = useMemo(
    () => (viewingRevisionId ? getRevision(state, viewingRevisionId) : undefined) ?? current,
    [state, viewingRevisionId, current],
  );

  /** 当前清单 = 待确认副本（若有）否则最近确认版；看其他版本即“查档案” */
  const isArchiveView = viewing.id !== current.id;
  const rows = useMemo(() => buildRows(state, viewing), [state, viewing]);

  const flash = useCallback((n: Notice) => {
    setNotice(n);
    window.setTimeout(() => setNotice(null), 3600);
  }, []);

  const viewRevision = useCallback((id: string | null) => setViewingRevisionId(id), []);

  /** 对当前清单执行一次写入；看旧档案时拦截，重复组合给出提示 */
  const applyToCurrent = useCallback(
    (
      fn: (prev: ManifestState) =>
        | ReturnType<typeof editEntry>
        | ReturnType<typeof addEntry>,
      clonedText: string,
    ) => {
      if (isArchiveView) {
        flash({ kind: 'warn', text: '这是已归档的历史版本，保持只读；请回到当前清单操作。' });
        return;
      }
      setState((prev) => {
        const result = fn(prev);
        if (!result.ok) {
          if (result.reason === 'duplicate') {
            const cur = getCurrentRevision(prev);
            const dup = cur.entries.find((e) => e.id === result.duplicateEntryId);
            flash({
              kind: 'warn',
              text: dup
                ? `与 #${String(dup.seq).padStart(2, '0')} 的组合完全相同，同一组合只留一套。`
                : '清单里已有完全相同的组合，未保存。',
            });
          }
          return prev;
        }
        if (result.cloned) flash({ kind: 'info', text: clonedText });
        setViewingRevisionId(result.revisionId);
        return result.state;
      });
    },
    [flash, isArchiveView],
  );

  const changeParam = useCallback(
    (entryId: string, patch: { heading?: Partial<PairingSpec['heading']>; body?: Partial<PairingSpec['body']> }) => {
      applyToCurrent(
        (prev) => editEntry(prev, entryId, patch),
        '已确认清单保持原样，参数改动写入新的待确认副本。',
      );
    },
    [applyToCurrent],
  );

  const changePurpose = useCallback(
    (entryId: string, purpose: Purpose) => {
      applyToCurrent(
        (prev) => editEntry(prev, entryId, { purpose }),
        '已确认清单保持原样，用途改动写入新的待确认副本。',
      );
    },
    [applyToCurrent],
  );

  const addFromLibrary = useCallback(
    (purpose: Purpose, spec: PairingSpec) => {
      applyToCurrent(
        (prev) => addEntry(prev, { purpose, spec }),
        '已加入待确认副本，已确认清单未改动。',
      );
    },
    [applyToCurrent],
  );

  const decide = useCallback(
    (entryId: string, kind: 'approved' | 'rejected', note?: string) => {
      setState((prev) => {
        const rev = getLatestConfirmed(prev);
        if (!rev) return prev;
        const result =
          kind === 'approved'
            ? approveEntry(prev, rev.id, entryId, note)
            : rejectEntry(prev, rev.id, entryId, note);
        if (!result.ok) {
          flash({ kind: 'warn', text: '决定只能记录在已确认版本上。' });
          return prev;
        }
        flash({ kind: 'info', text: kind === 'approved' ? '已记录客户认可。' : '已记录客户退回，可从字体库换替补。' });
        return result.state;
      });
    },
    [flash],
  );

  const substitute = useCallback(
    (originalEntryId: string, purpose: Purpose, spec: PairingSpec, note?: string) => {
      setState((prev) => {
        const rev = getLatestConfirmed(prev);
        if (!rev) return prev;
        const result = rejectWithSubstitute(prev, rev.id, originalEntryId, { purpose, spec }, note);
        if (!result.ok) {
          if (result.reason === 'duplicate') {
            flash({ kind: 'warn', text: '替补组合与清单中另一套活跃组合相同，请换一套。' });
          }
          return prev;
        }
        flash({ kind: 'info', text: '原项退回已记录，替补进入待确认副本，已确认清单保持原样。' });
        setViewingRevisionId(result.revisionId);
        return result.state;
      });
    },
    [flash],
  );

  const confirmDraft = useCallback(() => {
    setState((prev) => confirmPending(prev));
    setViewingRevisionId(null);
    flash({ kind: 'info', text: '副本已确认为新版本，可发给客户选样。' });
  }, [flash]);

  const discardDraft = useCallback(() => {
    setState((prev) => discardPending(prev));
    setViewingRevisionId(null);
    flash({ kind: 'info', text: '待确认副本已撤销；客户的退回意见仍保留在决定记录里。' });
  }, [flash]);

  const reset = useCallback(() => {
    setState(manifestRepository.reset());
    setViewingRevisionId(null);
    flash({ kind: 'info', text: '已恢复示例资料。' });
  }, [flash]);

  return {
    state,
    rows,
    viewing,
    current,
    pending,
    latestConfirmed,
    isArchiveView,
    notice,
    actions: {
      viewRevision,
      changeParam,
      changePurpose,
      addFromLibrary,
      decide,
      substitute,
      confirmDraft,
      discardDraft,
      reset,
    },
  };
}
