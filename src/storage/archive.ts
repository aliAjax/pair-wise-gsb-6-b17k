// 存档层：清单的本地持久化。只管读写，不含业务规则。
import type {Shortlist} from '../domain/types';

const KEY = 'type-shortlist-v1';

export function loadShortlist(): Shortlist | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Shortlist;
    if (!parsed || !Array.isArray(parsed.slots) || !Array.isArray(parsed.decisions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveShortlist(list: Shortlist | null): void {
  try {
    if (list) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    // 存储不可用时静默失败，界面状态仍在内存中
  }
}
