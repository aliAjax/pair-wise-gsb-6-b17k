/**
 * 存档层（archive）：持久化仓储
 * 把 ManifestState 存进 localStorage（可替换成接口实现，判断层不知情）。
 * 带版本号和最小结构校验；损坏或版本不符时回落到初始资料。
 */
import type { ManifestState } from '../domain/types';
import { createInitialState } from './initialState';

const STORAGE_KEY = 'type-pairer:manifest:v1';

function isValidState(value: unknown): value is ManifestState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ManifestState>;
  return (
    typeof v.projectName === 'string' &&
    Array.isArray(v.revisions) &&
    v.revisions.length > 0 &&
    Array.isArray(v.decisions) &&
    typeof v.seqCounter === 'number' &&
    v.revisions.every(
      (r) =>
        typeof r.id === 'string' &&
        typeof r.version === 'number' &&
        (r.status === 'pending' || r.status === 'confirmed') &&
        Array.isArray(r.entries),
    )
  );
}

export const manifestRepository = {
  load(): ManifestState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed: unknown = JSON.parse(raw);
      return isValidState(parsed) ? parsed : createInitialState();
    } catch {
      return createInitialState();
    }
  },

  save(state: ManifestState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时静默降级为内存态，不影响当前会话
    }
  },

  reset(): ManifestState {
    const fresh = createInitialState();
    this.save(fresh);
    return fresh;
  },

  STORAGE_KEY,
};
