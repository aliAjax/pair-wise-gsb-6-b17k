/**
 * 界面层（ui）：选样清单主页面
 * 页面始终回答两件事：当前清单是什么、每个条目客户怎么决定的。
 */
import { useState } from 'react';
import { useStudioStore } from './ui/useStudioStore';
import { EntryCard } from './ui/components/EntryCard';
import { LibraryPanel } from './ui/components/LibraryPanel';
import { DecisionTimeline } from './ui/components/DecisionTimeline';
import { PendingBanner, RevisionList } from './ui/components/RevisionPanel';
import { SubstituteModal } from './ui/components/SubstituteModal';
import type { Entry, PairingSpec } from './domain/types';

export default function App() {
  const { state, rows, viewing, current, pending, isArchiveView, notice, actions } = useStudioStore();
  const [substituteFor, setSubstituteFor] = useState<Entry | null>(null);

  const canDecide =
    !isArchiveView &&
    viewing.status === 'confirmed' &&
    !pending;

  const activeSpecs = (): PairingSpec[] => current.entries.map((e) => e.spec);

  return (
    <div className="page">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">字</span>
          <div>
            <b>选样清单</b>
            <small>TYPE SELECTION MANIFEST</small>
          </div>
        </div>

        <div className="project-meta">
          <h2>{state.projectName}</h2>
          <p>客户：{state.clientName}</p>
        </div>

        <RevisionList
          state={state}
          currentId={current.id}
          viewingId={viewing.id}
          onView={actions.viewRevision}
        />

        <button type="button" className="btn btn-ghost reset-btn" onClick={actions.reset}>
          恢复示例资料
        </button>

        <div className="layer-legend">
          <p>资料 = 字体库</p>
          <p>判断 = 去重 / 冻结 / 替补规则</p>
          <p>存档 = 版本与决定记录</p>
          <p>界面 = 当前清单与决定</p>
        </div>
      </aside>

      <main className="content">
        <header className="page-head">
          <div>
            <span className="crumb">
              当前查看：v{viewing.version}
              {isArchiveView ? ' · 已归档（只读）' : pending ? ' · 待确认副本' : ' · 最新确认版'}
            </span>
            <h1>{isArchiveView ? `v${viewing.version} 存档` : '字体配对选样清单'}</h1>
            <p className="head-sub">
              每套配对记录标题与正文的字体、字号、行高和用途；相同组合只留一套，客户退回可换替补。
            </p>
          </div>
        </header>

        {notice && <div className={`notice notice-${notice.kind}`}>{notice.text}</div>}

        {pending && !isArchiveView && (
          <PendingBanner state={state} pending={pending} onConfirm={actions.confirmDraft} onDiscard={actions.discardDraft} />
        )}

        <section className="entries-section">
          <div className="section-head">
            <h2>
              当前清单
              <span className="count">{rows.length} 套</span>
            </h2>
            <p>
              {isArchiveView
                ? '正在查看历史档案，参数不可编辑；点左侧“当前清单”回到工作版本。'
                : pending
                  ? '你正在编辑待确认副本；确认后才会成为发给客户的新版本。'
                  : '这是最近一次发给客户的确认版；改任何参数都会自动生成待确认副本。'}
            </p>
          </div>

          <div className="entry-list">
            {rows.map(({ entry, status, diff }) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                status={status}
                diff={diff}
                revision={viewing}
                editable={!isArchiveView}
                canDecide={canDecide}
                onChangeParam={actions.changeParam}
                onChangePurpose={actions.changePurpose}
                onApprove={(id) => actions.decide(id, 'approved')}
                onReject={(id, n) => actions.decide(id, 'rejected', n)}
                onPickSubstitute={(e) => setSubstituteFor(e)}
              />
            ))}
          </div>
        </section>

        <LibraryPanel onAdd={actions.addFromLibrary} disabled={isArchiveView} />

        <DecisionTimeline state={state} />
      </main>

      {substituteFor && (
        <SubstituteModal
          original={substituteFor}
          existingSpecs={activeSpecs()}
          onCancel={() => setSubstituteFor(null)}
          onConfirm={(origId, purpose, spec, note) => {
            actions.substitute(origId, purpose, spec, note);
            setSubstituteFor(null);
          }}
        />
      )}
    </div>
  );
}
