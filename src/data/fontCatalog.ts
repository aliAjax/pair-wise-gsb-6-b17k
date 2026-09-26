/**
 * 资料层（data）：字体库
 * 只描述“库里有什么”，不含任何选样流程的判断逻辑。
 * 判断层不允许反向依赖本文件。
 */

export type FontFamilyId =
  | 'fraunces'
  | 'newsreader'
  | 'playfair'
  | 'space-grotesk'
  | 'dm-sans'
  | 'ibm-plex'
  | 'inter'
  | 'noto-serif-sc'
  | 'noto-sans-sc';

export interface FontFamily {
  id: FontFamilyId;
  /** 库内显示名 */
  name: string;
  /** 分类：衬线 / 无衬线 / 中文 */
  kind: 'serif' | 'sans' | 'cjk';
  /** 界面与预览实际使用的 font-family 栈 */
  stack: string;
  /** 一句话风格说明，供挑配对时参考 */
  note: string;
}

export const FONT_FAMILIES: FontFamily[] = [
  { id: 'fraunces', name: 'Fraunces', kind: 'serif', stack: `'Fraunces', Georgia, serif`, note: '现代衬线，标题有性格' },
  { id: 'newsreader', name: 'Newsreader', kind: 'serif', stack: `'Newsreader', Georgia, serif`, note: '编辑感衬线，正文耐读' },
  { id: 'playfair', name: 'Playfair Display', kind: 'serif', stack: `'Playfair Display', Georgia, serif`, note: '高反差展示衬线' },
  { id: 'space-grotesk', name: 'Space Grotesk', kind: 'sans', stack: `'Space Grotesk', Arial, sans-serif`, note: '几何无衬线，科技感' },
  { id: 'dm-sans', name: 'DM Sans', kind: 'sans', stack: `'DM Sans', Arial, sans-serif`, note: '低噪音正文无衬线' },
  { id: 'ibm-plex', name: 'IBM Plex Sans', kind: 'sans', stack: `'IBM Plex Sans', Arial, sans-serif`, note: '理性、信息密度高' },
  { id: 'inter', name: 'Inter', kind: 'sans', stack: `'Inter', Arial, sans-serif`, note: '界面默认，中性百搭' },
  { id: 'noto-serif-sc', name: 'Noto Serif SC', kind: 'cjk', stack: `'Noto Serif SC', 'Songti SC', serif`, note: '中文衬线，适合标题' },
  { id: 'noto-sans-sc', name: 'Noto Sans SC', kind: 'cjk', stack: `'Noto Sans SC', 'PingFang SC', sans-serif`, note: '中文正文黑体' },
];

export function fontFamily(id: FontFamilyId): FontFamily {
  const found = FONT_FAMILIES.find((f) => f.id === id);
  if (!found) throw new Error(`字体库中不存在该字体：${id}`);
  return found;
}

/** 用途词典：同一种用途在各层统一显示名称 */
export const PURPOSES = [
  '封面标题',
  '章节标题',
  '正文',
  '引文',
  '图注',
  '按钮与界面',
] as const;

export type Purpose = (typeof PURPOSES)[number] | string;

/** 库里预设的字体配对：从库里挑配对时可直接取用 */
export interface CatalogPairing {
  id: string;
  label: string;
  scenario: string;
  heading: { family: FontFamilyId; size: number; lineHeight: number };
  body: { family: FontFamilyId; size: number; lineHeight: number };
}

export const CATALOG_PAIRINGS: CatalogPairing[] = [
  {
    id: 'editorial-calm',
    label: '编辑的安静',
    scenario: '封面标题 + 正文',
    heading: { family: 'fraunces', size: 42, lineHeight: 1.1 },
    body: { family: 'dm-sans', size: 15, lineHeight: 1.7 },
  },
  {
    id: 'portfolio-rhythm',
    label: '作品集节奏',
    scenario: '章节标题 + 正文',
    heading: { family: 'space-grotesk', size: 28, lineHeight: 1.2 },
    body: { family: 'newsreader', size: 16, lineHeight: 1.65 },
  },
  {
    id: 'brand-voice',
    label: '品牌之声',
    scenario: '封面标题 + 引文',
    heading: { family: 'playfair', size: 38, lineHeight: 1.12 },
    body: { family: 'inter', size: 14, lineHeight: 1.6 },
  },
  {
    id: 'data-console',
    label: '数据控制台',
    scenario: '章节标题 + 图注',
    heading: { family: 'ibm-plex', size: 24, lineHeight: 1.3 },
    body: { family: 'inter', size: 13, lineHeight: 1.55 },
  },
  {
    id: 'cjk-editorial',
    label: '中文编辑',
    scenario: '封面标题 + 正文',
    heading: { family: 'noto-serif-sc', size: 34, lineHeight: 1.25 },
    body: { family: 'noto-sans-sc', size: 15, lineHeight: 1.8 },
  },
];

/** 预览样例文案 */
export const SAMPLE_TEXT = {
  heading: '让节奏替品牌开口',
  body: '好的字体配对比“好看”更实用：标题定调，正文保证长读不累。参数一旦随清单发出去，就成为客户判断的依据。',
};
