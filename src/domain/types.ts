/**
 * 判断层（domain）：选样清单的领域类型
 * 本层不依赖 React、localStorage，也不依赖 data 字体库，
 * 字体在本层仅以字符串标识存在，保证规则可独立测试。
 */
import type { Purpose } from '../data/fontCatalog';

/** 一套字体排版规格：标题与正文各自的字体 / 字号 / 行高 */
export interface TypeSpec {
  family: string;
  /** 字号，单位 px */
  size: number;
  /** 行高，无单位倍数 */
  lineHeight: number;
}

export interface PairingSpec {
  heading: TypeSpec;
  body: TypeSpec;
}

/** 清单中的一个条目（一套候选配对） */
export interface Entry {
  id: string;
  /** 编号序号，跨修订稳定，界面显示为 #01 */
  seq: number;
  purpose: Purpose;
  spec: PairingSpec;
  /** 替补自哪个原条目；原始配对为 undefined */
  replacedEntryId?: string;
}

export type RevisionStatus = 'pending' | 'confirmed';

export type FieldName =
  | 'heading.family'
  | 'heading.size'
  | 'heading.lineHeight'
  | 'body.family'
  | 'body.size'
  | 'body.lineHeight'
  | 'purpose';

export interface FieldChange {
  field: FieldName;
  before: string | number;
  after: string | number;
}

/** 一次清单修订：已确认的修订永久冻结，改动会生成 pending 副本 */
export interface Revision {
  id: string;
  /** 版本号，从 1 起 */
  version: number;
  status: RevisionStatus;
  createdAt: string;
  confirmedAt?: string;
  /** 由哪个已确认修订复制而来 */
  basedOnRevisionId?: string;
  entries: Entry[];
  /** 生成该副本时记录的改动（相对其依据的修订） */
  changes: FieldChange[];
}

export type DecisionKind = 'approved' | 'rejected' | 'substituted';

export interface Decision {
  id: string;
  kind: DecisionKind;
  /** 决定针对的条目（条目 id 跨修订稳定） */
  entryId: string;
  /** 客户是在看哪个已确认版本时做的决定 */
  revisionId: string;
  at: string;
  note?: string;
  /** kind = substituted 时，指向 pending 副本中的替补条目 */
  substituteEntryId?: string;
}

export interface ManifestState {
  projectName: string;
  clientName: string;
  revisions: Revision[];
  decisions: Decision[];
  seqCounter: number;
}
