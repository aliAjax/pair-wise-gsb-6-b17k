// 资料层：字体库、用途建议与配对种子数据。不含任何判断逻辑。
export type Pair = {
  id: number;
  title: string;
  heading: string;
  body: string;
  category: string;
  favorite: boolean;
};

export const FONTS = [
  'Fraunces',
  'DM Sans',
  'Space Grotesk',
  'Newsreader',
  'IBM Plex Sans',
  'Playfair Display',
];

export const PURPOSE_SUGGESTIONS = [
  '官网首页横幅',
  '产品详情页',
  '品牌宣传册',
  '移动端落地页',
  '新闻通讯',
];

export const SEED_PAIRS: Pair[] = [
  {
    id: 1,
    title: 'Editorial calm',
    heading: 'A slower way to see',
    body: 'Good typography creates space for ideas to breathe. Pair a confident display face with a quiet, generous text face.',
    category: 'Editorial',
    favorite: true,
  },
  {
    id: 2,
    title: 'Studio notes',
    heading: 'Make room for the unexpected',
    body: 'A thoughtful pairing can add rhythm to even the simplest interface. Try contrast in shape, not just size.',
    category: 'Portfolio',
    favorite: false,
  },
  {
    id: 3,
    title: 'Field guide',
    heading: 'Small details, lasting impressions',
    body: 'Typography is the voice of a page. Find a combination that feels clear, warm and distinctly yours.',
    category: 'Brand',
    favorite: false,
  },
];
