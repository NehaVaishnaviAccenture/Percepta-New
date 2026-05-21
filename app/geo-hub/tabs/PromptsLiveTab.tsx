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
    <div id="tab-live-prompt" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 200px)' }}>
      <style>{`
        .lp-pill:hover { border-color: #A100FF !important; color: #6B00A8 !important; }
        .lp-search-bar:focus-within { border-color: #A100FF !important; }
        .lp-see-tested:hover { text-decoration: underline; }
      `}</style>

      {/* ── Empty state only: headline + meta + divider ── */}
      {isEmpty && (
        <>
          <h1 id="lp-headline" style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            color: '#0A0A0A',
            margin: '0 0 14px',
            maxWidth: '22ch',
          }}>
            Test how AI <span id="lp-headline-accent" style={{ color: '#A100FF' }}>ranks you</span>, right now.
          </h1>
          <div id="lp-meta" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11.5,
            color: '#6B6B6B',
            margin: '0 0 24px',
            lineHeight: 1.7,
          }}>
            Sent to ChatGPT, Claude, Gemini
            <span id="lp-meta-sep" style={{ color: '#B8B8B8', margin: '0 10px' }}>·</span>
            ~8–12s response
          </div>
          <div id="lp-meta-divider" style={{ height: 1, background: '#E5E5E5', marginBottom: 22 }} />
        </>
      )}

      {/* ── Search block ── */}
      <div id="lp-blk" style={{
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        padding: '22px 26px 24px',
        marginBottom: isEmpty ? 0 : 16,
      }}>
        <div id="lp-blk-top" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
        }}>
          <span id="lp-eyebrow" style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            color: '#A100FF',
            display: 'block',
          }}>Run a prompt</span>
          <button
            id="lp-see-tested"
            className="lp-see-tested"
            onClick={() => setActiveSub(0)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: '#6B00A8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >See Tested Prompts →</button>
        </div>

        <div
          id="lp-search-bar"
          className="lp-search-bar"
          style={{ display: 'flex', border: '1px solid #B8B8B8', background: '#FFFFFF', transition: 'border-color 120ms' }}
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
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              padding: '0 18px',
              height: 56,
              color: '#0A0A0A',
              background: 'transparent',
              minWidth: 0,
            }}
          />
          <button
            id="lp-run-btn"
            onClick={() => runPrompt()}
            disabled={promptLoading}
            style={{
              background: promptLoading ? '#8600D4' : '#A100FF',
              color: '#FFFFFF',
              border: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              padding: '0 26px',
              height: 56,
              cursor: promptLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap' as const,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              opacity: promptLoading ? 0.75 : 1,
              transition: 'background 120ms',
            }}
          >{promptLoading ? 'Running…' : 'Run prompt →'}</button>
        </div>

        {/* Pills — empty state only */}
        {isEmpty && (
          <div id="lp-suggested" style={{ marginTop: 24 }}>
            <div id="lp-suggested-eyebrow" style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase' as const,
              color: '#6B6B6B',
              marginBottom: 12,
            }}>Examples by intent</div>
            <div id="lp-pill-row" style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {examplePrompts.map((p, i) => (
                <button
                  key={i}
                  id={`lp-pill-${p.intent.toLowerCase()}`}
                  className="lp-pill"
                  onClick={() => runPrompt(p.text)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: '#1A1A1A',
                    background: '#FFFFFF',
                    border: '1px solid #D6D6D6',
                    padding: '7px 13px',
                    cursor: 'pointer',
                    lineHeight: 1.3,
                    textAlign: 'left' as const,
                    transition: 'all 120ms',
                  }}
                >
                  <span id={`lp-pill-prefix-${i}`} style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: '#8E8E8E',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em',
                    marginRight: 7,
                    fontWeight: 600,
                  }}>{p.intent}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Response area ── */}
      {(!isEmpty || promptLoading) && (
        <div id="lp-response-area" style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, flex: 1, marginTop: 12 }}>
          {promptLoading && (
            <div id="lp-loading" style={{
              background: 'white',
              border: '1px solid #E5E5E5',
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#8E8E8E',
              fontSize: '0.88rem',
            }}>
              <div style={{ width: 18, height: 18, border: '2px solid #E6C2FF', borderTopColor: '#A100FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Querying AI model…
            </div>
          )}
          {promptHistory.map((h, i) => (
            <div key={i} id={`lp-response-${i}`} style={{ background: 'white', border: '1px solid #E5E5E5', overflow: 'hidden' }}>
              <div className={`lp-response-q lp-response-q--${i}`} style={{
                background: '#F5E6FF',
                padding: '10px 18px',
                borderBottom: '1px solid #E6C2FF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#A100FF', background: '#E6C2FF', borderRadius: 50, padding: '2px 8px' }}>Q</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#6B00A8' }}>{h.q}</span>
              </div>
              <div className={`lp-response-a lp-response-a--${i}`} style={{ padding: '16px 18px' }}>
                <MarkdownText text={h.a} />
              </div>
            </div>
          ))}
          {promptHistory.length > 0 && (
            <button
              id="lp-clear-btn"
              onClick={() => setPromptHistory([])}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: '1px solid #E5E5E5',
                padding: '7px 12px',
                fontSize: '0.75rem',
                color: '#6B6B6B',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >Clear history</button>
          )}
        </div>
      )}
    </div>
  );
}
