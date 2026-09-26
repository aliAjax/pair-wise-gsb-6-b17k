// 领域模型：选样清单的全部数据结构。纯类型，无副作用。

/** 挑中配对那一刻记下的排版参数快照 */
export type FontSpec = {
  headingFont: string;
  bodyFont: string;
  headingSizePx: number;
  lineHeight: number;
  purpose: string; // 用途，如「官网首页横幅」
};

/** 库里的一对配对（只引用 id 与标题，不复制内容） */
export type PairRef = {
  id: number;
  title: string;
};

/** 一次选择：原项、替补或参数修订。被退回/被替换的旧选择保留在槽位历史里可查 */
export type Choice = {
  id: string;
  source: 'initial' | 'substitute' | 'revision';
  pair: PairRef | null;
  spec: FontSpec;
  decidedAt: string; // ISO 时间
  outcome: 'active' | 'rejected' | 'superseded';
};

/** 清单里的一个坑位：同一用途的当前选择 + 全部历史选择 */
export type Slot = {
  id: string;
  addedAt: string;
  choices: Choice[]; // 最后一个为当前生效选择
};

/** 待确认副本：对已确认清单的改动，客户确认前原清单保持原样 */
export type Revision = {
  id: string;
  slotId: string;
  kind: 'params' | 'substitute';
  before: {pair: PairRef | null; spec: FontSpec};
  after: {pair: PairRef | null; spec: FontSpec};
  createdAt: string;
  status: 'pending' | 'confirmed' | 'discarded';
};

export type DecisionKind =
  | 'pick'
  | 'substitute'
  | 'propose-substitute'
  | 'propose-params'
  | 'confirm-revision'
  | 'discard-revision'
  | 'confirm-list';

/** 每个决定都留痕，页面按时间展示 */
export type Decision = {
  id: string;
  at: string;
  kind: DecisionKind;
  summary: string;
  slotId?: string;
};

export type Shortlist = {
  id: string;
  name: string;
  status: 'open' | 'confirmed';
  createdAt: string;
  confirmedAt: string | null;
  slots: Slot[];
  revisions: Revision[];
  decisions: Decision[];
};
