'use client';

import React, { useState } from 'react';
import { MarkdownText } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

type ExamplePrompt = { intent: string; text: string };

export default function PromptsLiveTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [promptInput, setPromptInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<{q:string;a:string}[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);

  async function runPrompt(q?: string) {
    const query = q || promptInput;
    if (!query.trim()) return;
    setPromptLoading(true);
    if (!q) setPromptInput('');
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          system: result
            ? `You are a knowledgeable consumer advisor. The user is researching ${result.brand_name} in the ${result.ind_label} industry. Answer accurately and naturally -- do not favour any brand, but be specific and factual.`
            : undefined,
        }),
      });
      const data = await res.json();
      const answer = data.response ?? data.error ?? 'No response received.';
      setPromptHistory(h => [{ q: query, a: answer }, ...h]);
    } catch {}
    setPromptLoading(false);
  }

  const examplePrompts: ExamplePrompt[] = result?.ind_key === 'fin' ? [
    { intent: 'Compare',   text: 'Chase Sapphire Reserve vs Capital One Venture X for travel' },
    { intent: 'Recommend', text: 'Best credit card for someone who travels internationally' },
    { intent: 'Feature',   text: 'Credit card with no foreign transaction fees' },
    { intent: 'Pricing',   text: 'Best no-annual-fee rewards card' },
  ] : result?.ind_key === 'auto' ? [
    { intent: 'Compare',   text: 'Tesla Model 3 vs BMW i4' },
    { intent: 'Recommend', text: 'Best electric vehicle for long road trips' },
    { intent: 'Feature',   text: 'Most reliable SUV for families' },
    { intent: 'Pricing',   text: 'Best car for first-time buyers under $30,000' },
  ] : [
    { intent: 'Compare',   text: 'Top brands for value and quality' },
    { intent: 'Recommend', text: 'Most trusted brands right now' },
    { intent: 'Feature',   text: 'Companies leading in innovation' },
    { intent: 'Pricing',   text: 'Best companies for customer service' },
  ];

  const isEmpty = promptHistory.length === 0 && !promptLoading;

  return (
    <div id="tab-live-prompt" className="lpTab">

      {/* ── Empty state only: headline + meta + divider ── */}
      {isEmpty && (
        <>
          <h1 id="lp-headline" className="lpHeadline">
            Test how AI <span id="lp-headline-accent" className="lpHeadlineAccent">ranks you</span>, right now.
          </h1>
          <div id="lp-meta" className="lpMeta">
            Sent to ChatGPT, Claude, Gemini
            <span id="lp-meta-sep" className="lpMetaSep">·</span>
            ~8–12s response
          </div>
          <div id="lp-meta-divider" className="lpMetaDivider" />
        </>
      )}

      {/* ── Search block ── */}
      <div id="lp-blk" className="lpSearchCard" style={{ marginBottom: isEmpty ? 0 : 16 }}>
        <div id="lp-blk-top" className="lpSearchCardTop">
          <span id="lp-eyebrow" className="lpEyebrow">Run a prompt</span>
          <button
            id="lp-see-tested"
            className="lpSeeTestedBtn"
            onClick={() => setActiveSub(0)}
          >See Tested Prompts →</button>
        </div>

        <div
          id="lp-search-bar"
          className="lpSearchBar"
        >
          <input
            id="lp-search-input"
            type="text"
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runPrompt()}
            placeholder={
              result?.ind_key === 'fin' ? 'best credit card for travel rewards in 2026'
              : result?.ind_key === 'auto' ? 'best electric SUV for families in 2026'
              : 'ask a question about your category…'
            }
            className="lpSearchInput"
          />
          <button
            id="lp-run-btn"
            onClick={() => runPrompt()}
            disabled={promptLoading}
            className="lpRunBtn"
            style={{
              background: promptLoading ? '#8600D4' : '#A100FF',
              cursor: promptLoading ? 'not-allowed' : 'pointer',
              opacity: promptLoading ? 0.75 : 1,
            }}
          >{promptLoading ? 'Running…' : 'Run prompt →'}</button>
        </div>

        {/* Pills — empty state only */}
        {isEmpty && (
          <div id="lp-suggested" className="lpSuggestedSection">
            <div id="lp-suggested-eyebrow" className="lpSuggestedEyebrow">Examples by intent</div>
            <div id="lp-pill-row" className="lpPillRow">
              {examplePrompts.map((p, i) => (
                <button
                  key={i}
                  id={`lp-pill-${p.intent.toLowerCase()}`}
                  className="lpPill"
                  onClick={() => runPrompt(p.text)}
                >
                  <span id={`lp-pill-prefix-${i}`} className="lpPillPrefix">{p.intent}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Response area ── */}
      {(!isEmpty || promptLoading) && (
        <div id="lp-response-area" className="lpResponseArea">
          {promptLoading && (
            <div id="lp-loading" className="lpLoadingRow">
              <div className="lpSpinner" />
              Querying AI model…
            </div>
          )}
          {promptHistory.map((h, i) => (
            <div key={i} id={`lp-response-${i}`} className="lpResponseCard">
              <div className={`lp-response-q lp-response-q--${i} lpResponseQ`}>
                <span className="lpResponseQLabel">Q</span>
                <span className="lpResponseQText">{h.q}</span>
              </div>
              <div className={`lp-response-a lp-response-a--${i} lpResponseA`}>
                <MarkdownText text={h.a} />
              </div>
            </div>
          ))}
          {promptHistory.length > 0 && (
            <button
              id="lp-clear-btn"
              onClick={() => setPromptHistory([])}
              className="lpClearBtn"
            >Clear history</button>
          )}
        </div>
      )}
    </div>
  );
}
