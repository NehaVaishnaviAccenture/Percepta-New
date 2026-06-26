'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
  playbookActions?: Action[] | null;
}

interface ActionTopic { name: string; secondary?: boolean; }
interface ActionEvidence { topic: string; score: number; delta: number; prompts: number; }
interface Action {
  priority: 'High' | 'Medium' | 'Low';
  topics: ActionTopic[];
  title: string;
  teaser: string;
  who: string[];
  evidence: ActionEvidence;
  why: string;
  build: string[];
  team: string;
  type: string;
}

const NUM_WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];

function tierOf(score: number): string {
  if (score <= 44) return 'fragmented';
  if (score <= 55) return 'emerging';
  if (score <= 69) return 'competitive';
  if (score <= 79) return 'leader';
  return 'authority';
}

function StatLine({ ev }: { ev: ActionEvidence }) {
  const median = ev.score - ev.delta;
  const d = ev.delta >= 0 ? `+${ev.delta}` : `−${Math.abs(ev.delta)}`;
  return (
    <>
      {ev.topic} · <span className={`pb-tier-${tierOf(ev.score)}`}>{ev.score}</span> · {d} vs median ({median})
    </>
  );
}

function PriorityBars({ priority }: { priority: string }) {
  const onCount = priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1;
  return (
    <span className="pb-col-bars">
      {[1, 2, 3].map(i => (
        <i key={i} className={`pb-pbar pb-pbar--h${i}${i <= onCount ? ' pb-pbar--on' : ''}`} />
      ))}
    </span>
  );
}

function WhoLine({ who }: { who: string[] }) {
  const head = who.slice(0, 2).join(' · ');
  const extra = who.length > 2 ? who.length - 2 : 0;
  return (
    <>
      <span className="pb-who-lead">For</span> {head}
      {extra > 0 && <> <span className="pb-who-lead">+{extra} more</span></>}
    </>
  );
}

/* Lanes render Low → Medium → High left-to-right on desktop
   (mobile default: High) */
const LANES = [
  { key: 'low',    label: 'Low',    onCount: 1 },
  { key: 'medium', label: 'Medium', onCount: 2 },
  { key: 'high',   label: 'High',   onCount: 3 },
];

/* ─── Individual board card ───────────────────────────────────── */
function ActionCard({
  action, index, expanded, topicFilter, onToggle, onOpen,
}: {
  action: Action; index: number; expanded: boolean; topicFilter: string;
  onToggle: (i: number) => void; onOpen: (i: number) => void;
}) {
  const topics = action.topics.map(t => t.name);
  const hidden = topicFilter !== 'all' && !topics.includes(topicFilter);

  return (
    <div
      className={[
        'pb-card',
        expanded ? 'pb-card--expanded' : '',
        hidden ? 'pb-card--hidden' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Top row: topic chip + chevron */}
      <div className="pb-card-top" onClick={() => onToggle(index)}>
        <div className="pb-card-topics">
          <span className="pb-topic-chip">{action.topics[0].name}</span>
        </div>
        <span className="pb-card-chev">⌄</span>
      </div>

      <div className="pb-card-title" onClick={() => onToggle(index)}>
        {action.title}
      </div>
      <div className="pb-card-teaser">{action.teaser}</div>
      <div className="pb-card-who" onClick={() => onToggle(index)}>
        <WhoLine who={action.who} />
      </div>

      {/* Inline peek drawer */}
      <div className="pb-card-drawer">
        <div className="pb-card-drawer-pad">
          <div className="pb-evidence">
            <div className="pb-ev-label">Why {action.priority.toLowerCase()} priority</div>
            <span className="pb-ev-stat"><StatLine ev={action.evidence} /></span>
            <p className="pb-why" dangerouslySetInnerHTML={{ __html: action.why }} />
          </div>
          <button className="pb-open-action" onClick={() => onOpen(index)}>
            Open the full action <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Board view ──────────────────────────────────────────────── */
function BoardView({
  actions, brandName, onOpenAction,
}: {
  actions: Action[]; brandName: string; onOpenAction: (i: number) => void;
}) {
  const [activeLane, setActiveLane] = useState('high');
  const [topicFilter, setTopicFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (i: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const allTopics = [...new Set(actions.flatMap(a => a.topics.map(t => t.name)))].sort();

  const visibleCountForLane = (laneKey: string) => {
    const laneItems = actions.filter(a => a.priority.toLowerCase() === laneKey);
    if (topicFilter === 'all') return laneItems.length;
    return laneItems.filter(a => a.topics.some(t => t.name === topicFilter)).length;
  };

  const total = actions.length;
  const highCount = actions.filter(a => a.priority === 'High').length;
  const totalWord = NUM_WORDS[total] ?? String(total);

  return (
    <div>
      <div className="pb-eyebrow">Priority actions · implementable</div>
      <h2 className="pb-lead">
        {totalWord} moves, sorted by opportunity — not just where the gap is biggest,
        but where it's biggest <i>and</i> winnable.
      </h2>
      <div className="pb-lead-sub">
        <b>{total}</b> actions<span className="pb-sep">·</span>
        <b>{highCount}</b> high priority<span className="pb-sep">·</span>
        each tied to a topic and the audiences it affects
      </div>

      <div className="pb-board-card">
        {/* Block header */}
        <div className="pb-block-head">
          <div className="pb-bh-left">
            <span className="pb-block-title">Priority actions</span>
            <span className="pb-block-meta">
              AI-generated from your topic gaps · click a card to peek, open for the full play
            </span>
          </div>
          {allTopics.length > 0 && (
            <div className="pb-topic-filter">
              <span className="pb-tf-label">Topic</span>
              <select
                className="pb-tf-select"
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
              >
                <option value="all">All topics</option>
                {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Mobile lane toggle — hidden on desktop via CSS */}
        <div className="pb-board-toggle">
          {LANES.map(lane => (
            <button
              key={lane.key}
              className={`pb-lt-btn${activeLane === lane.key ? ' pb-lt-btn--active' : ''}`}
              onClick={() => setActiveLane(lane.key)}
            >
              {lane.label}
              <span className="pb-lt-count">{visibleCountForLane(lane.key)}</span>
            </button>
          ))}
        </div>

        {/* Board grid */}
        <div className="pb-board">
          {LANES.map(lane => {
            const laneItems = actions
              .map((a, i) => ({ a, i }))
              .filter(({ a }) => a.priority.toLowerCase() === lane.key);
            const isActive = activeLane === lane.key;
            const visibleCount = visibleCountForLane(lane.key);

            return (
              <div
                key={lane.key}
                className={[
                  'pb-column',
                  `pb-column--${lane.key}`,
                  isActive ? 'pb-column--active' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="pb-col-header-row">
                  <PriorityBars priority={lane.label} />
                  <span className="pb-col-label">{lane.label}</span>
                  <span className="pb-col-count">{visibleCount}</span>
                </div>
                <div className="pb-col-underline" />
                <div className="pb-col-body">
                  {laneItems.length === 0 ? (
                    <div className="pb-col-empty">No actions yet</div>
                  ) : (
                    laneItems.map(({ a, i }) => (
                      <ActionCard
                        key={i}
                        action={a}
                        index={i}
                        expanded={expandedCards.has(i)}
                        topicFilter={topicFilter}
                        onToggle={toggleCard}
                        onOpen={onOpenAction}
                      />
                    ))
                  )}
                  {/* Show empty state when filter hides all cards in this lane */}
                  {laneItems.length > 0 && visibleCount === 0 && (
                    <div className="pb-col-empty">No actions for this topic</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="pb-board-note">
          Actions are AI-generated from {brandName}'s topic-level coverage and sorted by
          opportunity — gap size weighed against how winnable it is. Lane = priority; it does
          not reflect delivery effort. Team owners are AI-suggested.
        </p>
      </div>
    </div>
  );
}

/* ─── Full action / spec-sheet view ──────────────────────────── */
function ActionView({
  action, onBack,
}: {
  action: Action; onBack: () => void;
}) {
  const prioCls = action.priority.toLowerCase() as 'high' | 'medium' | 'low';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="pb-av-crumb">
        <button className="pb-av-back" onClick={onBack}>‹ Playbook</button>
        <span className="pb-av-crumb-sep">/</span>
        <span className="pb-av-crumb-cur">{action.title}</span>
      </div>

      {/* Hero card */}
      <div className="pb-av-card">
        <span className={`pb-av-prio-strip pb-av-prio--${prioCls} pb-av-prio-strip--pinned`}>
          <PriorityBars priority={action.priority} />
          <span className="pb-av-prio-label">{action.priority} priority</span>
        </span>
        <div className="pb-av-eyebrow">{action.topics[0].name}</div>
        <h2 className="pb-av-title" style={{ paddingRight: '160px' }}>{action.title}</h2>
        <div className="pb-av-teaser">{action.teaser}</div>
      </div>

      {/* Spec grid: main (why + what to build) + rail sidebar */}
      <div className="pb-spec-grid">
        <div className="pb-spec-main">

          {/* Why this is a priority */}
          <div className="pb-av-card">
            <div className="pb-av-label">Why this is a priority</div>
            <div className="pb-av-evidence-stat"><StatLine ev={action.evidence} /></div>
            <div className="pb-av-why" dangerouslySetInnerHTML={{ __html: action.why }} />
            <button className="pb-av-evidence-link">
              See the {action.evidence.prompts} prompts →
            </button>
          </div>

          {/* What to build checklist */}
          <div className="pb-av-card">
            <div className="pb-av-label">What to build</div>
            <ul className="pb-checklist">
              {action.build.map((item, i) => (
                <li key={i} className="pb-check-item">
                  <span className="pb-cbox" />
                  <span
                    className="pb-check-text"
                    dangerouslySetInnerHTML={{ __html: item }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rail sidebar */}
        <aside className="pb-spec-rail">
          <div className="pb-rail-head">At a glance</div>
          <div className="pb-rail-fields">

            <div className="pb-rail-row">
              <span className="pb-rail-k">Priority</span>
              <span className={`pb-rail-v pb-rail-prio pb-rail-prio--${prioCls}`}>
                <PriorityBars priority={action.priority} />
                {action.priority}
              </span>
            </div>

            <div className="pb-rail-row">
              <span className="pb-rail-k">Likely owner</span>
              <span className="pb-rail-v">
                {action.team} <span className="pb-ai-hint">· AI-suggested</span>
              </span>
            </div>

            <div className="pb-rail-row">
              <span className="pb-rail-k">Action type</span>
              <span className="pb-rail-v">{action.type}</span>
            </div>

            <div className="pb-rail-row">
              <span className="pb-rail-k">Topics</span>
              <span className="pb-rail-v">
                {action.topics.map(t => (
                  <span key={t.name} className="pb-topic-chip">{t.name}</span>
                ))}
              </span>
            </div>

            <div className="pb-rail-row">
              <span className="pb-rail-k">Audiences</span>
              <span className="pb-rail-v">
                <ul className="pb-avd-list">
                  {action.who.map(w => <li key={w}>{w}</li>)}
                </ul>
              </span>
            </div>

          </div>

          <div className="pb-rail-actions">
            <button className="pb-avf-btn">See supporting prompts →</button>
            <button className="pb-avd-link">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1v6.5M3.5 5.5L6 8l2.5-2.5"/><path d="M1.5 10.5h9"/>
              </svg>
              Export this action
            </button>
            <button className="pb-avd-link">See these segments in Coverage →</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Root export ─────────────────────────────────────────────── */
export default function PrioritiesPlaybookTab({
  result, resultComps, playbookActions,
}: TabProps) {
  const [viewState, setViewState]       = useState<'board' | 'action'>('board');
  const [selectedAction, setSelectedAction] = useState<number | null>(null);

  const openAction = (index: number) => {
    setSelectedAction(index);
    setViewState('action');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeAction = () => {
    setViewState('board');
    setSelectedAction(null);
  };

  if (!playbookActions) return <div id="tab-priorities-playbook" />;
  if (playbookActions.length === 0) {
    return (
      <div id="tab-priorities-playbook" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        <p style={{ fontSize: '1rem', marginBottom: '8px' }}>No playbook actions found.</p>
        <p style={{ fontSize: '0.875rem' }}>Run a new analysis to generate your priority action plan.</p>
      </div>
    );
  }

  return (
    <div id="tab-priorities-playbook">
      {viewState === 'board' && (
        <BoardView
          actions={playbookActions}
          brandName={result.brand_name}
          onOpenAction={openAction}
        />
      )}
      {viewState === 'action' && selectedAction !== null && (
        <ActionView
          action={playbookActions[selectedAction]}
          onBack={closeAction}
        />
      )}
    </div>
  );
}
