// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import React from 'react';
import App from '../App';
import { manifestRepository } from '../archive/repository';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderApp(): HTMLElement {
  document.body.innerHTML = '<div id="root"></div>';
  const root = createRoot(document.getElementById('root')!);
  act(() => {
    root.render(React.createElement(App));
  });
  return document.body;
}

const byText = (el: HTMLElement, text: string): HTMLButtonElement =>
  [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('应用关键路径（界面 + 判断 + 存档串接）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('首次打开：显示当前清单（待确认副本）、版本、决定时间线', () => {
    const body = renderApp();
    expect(body.textContent).toContain('字体配对选样清单');
    expect(body.textContent).toContain('待确认副本');
    expect(body.textContent).toContain('每个决定');
    expect(body.textContent).toContain('客户退回');
    expect(body.textContent).toContain('换替补');
    // 存档已写入
    expect(localStorage.getItem(manifestRepository.STORAGE_KEY)).toContain('rev-seed-v2');
  });

  it('确认副本后可记录客户认可；改已确认版参数会再生成新副本', () => {
    let body = renderApp();

    // 1) 确认待确认副本
    const confirmBtn = [...body.querySelectorAll('button')].find((b) => b.textContent?.includes('确认并冻结'));
    expect(confirmBtn).toBeTruthy();
    act(() => confirmBtn!.click());

    body = document.body;
    expect(body.querySelector('.pending-banner')).toBeNull();
    expect(body.textContent).toContain('最新确认版');

    // 2) 对条目记录“客户认可”
    const approveBtn = [...body.querySelectorAll('button')].find((b) => b.textContent === '客户认可');
    expect(approveBtn).toBeTruthy();
    act(() => approveBtn!.click());
    body = document.body;
    expect(body.textContent).toContain('已记录客户认可');

    // 3) 改第一个条目的标题字号（步进器 +），应自动出现待确认副本
    const firstCard = body.querySelector('.entry-card')!;
    const plusButtons = [...firstCard.querySelectorAll('.stepper button')];
    act(() => (plusButtons[0] as HTMLButtonElement).click()); // 标题字号 +
    body = document.body;
    expect(body.textContent).toContain('待确认副本');
    expect(body.textContent).toContain('参数改动写入新的待确认副本');
    // 已确认的 v2 仍在版本列表中
    expect(body.textContent).toContain('已确认档案');

    // 4) 存档持久化：重新加载后状态保留
    const saved = JSON.parse(localStorage.getItem(manifestRepository.STORAGE_KEY)!);
    expect(saved.revisions.length).toBe(3);
  });

  it('退回并换替补：原项标退回、替补进副本，二者都可查', () => {
    let body = renderApp();
    // 先确认种子副本，进入干净的已确认态
    act(() => [...body.querySelectorAll('button')].find((b) => b.textContent?.includes('确认并冻结'))!.click());
    body = document.body;

    // 找 #04（替补条目，待决定）点“客户退回”→“退回并换替补”
    const cards = [...body.querySelectorAll('.entry-card')];
    const target = cards.find((c) => c.querySelector('.seq')?.textContent === '#04')!;
    act(() => [...target.querySelectorAll('button')].find((b) => b.textContent === '客户退回')!.click());
    body = document.body;
    act(() => [...body.querySelectorAll('button')].find((b) => b.textContent?.includes('退回并换替补'))!.click());

    // 弹窗确认
    body = document.body;
    const modalConfirm = [...body.querySelectorAll('.modal button')].find((b) =>
      b.textContent?.includes('退回原项并加入替补'),
    ) as HTMLButtonElement;
    expect(modalConfirm).toBeTruthy();
    act(() => modalConfirm!.click());

    body = document.body;
    expect(body.textContent).toContain('替补进入待确认副本');
    expect(body.textContent).toContain('替补 ← 原项');
    // 决定时间线同时有退回与换替补
    const decisions = body.querySelector('.decision-list')!;
    expect(decisions.textContent).toContain('退回');
    expect(decisions.textContent).toContain('换替补');
  });

  it('从字体库加入与清单相同的组合会被拒绝并提示', () => {
    const body = renderApp();
    // 种子当前清单的 #02 与库中“作品集节奏”同参数；该卡片的“加入清单”应被拦截
    const portfolio = [...body.querySelectorAll('.pair-card')].find((c) => c.textContent?.includes('作品集节奏'))!;
    const addBtn = [...portfolio.querySelectorAll('button')].find((b) => b.textContent === '加入清单') as HTMLButtonElement;
    act(() => addBtn.click());
    expect(document.body.textContent).toContain('完全相同');
  });
});
