'use client';

import React, { useState } from 'react';

type TierStyle = { text: string; bg: string };

interface SignalTiers {
  visibility?: TierStyle;
  sentiment?:  TierStyle;
  prominence?: TierStyle;
  citation?:   TierStyle;
  sov?:        TierStyle;
}

interface GeoExplainerProps {
  onSignalsClick: () => void;
  label?: React.ReactNode;
  hint?:  string;
  signalTiers?: SignalTiers;
}

const SIGNALS: { key: keyof SignalTiers; name: string; wt: string; def: string }[] = [
  { key: 'visibility', name: 'Visibility',     wt: '30%', def: 'How often your brand appears in AI answers.' },
  { key: 'sentiment',  name: 'Sentiment',      wt: '20%', def: 'Whether AI talks about your brand in a positive, neutral, or negative way.' },
  { key: 'prominence', name: 'Prominence',     wt: '20%', def: 'Where your brand appears in the answer, higher up the more prominent.' },
  { key: 'citation',   name: 'Citation',       wt: '15%', def: 'How often AI uses your website or content as a source.' },
  { key: 'sov',        name: 'Share of Voice', wt: '15%', def: 'How much your brand is mentioned compared to competitors.' },
];

export function GeoExplainer({ onSignalsClick, label, hint, signalTiers }: GeoExplainerProps) {
  const [open, setOpen] = useState(false);
  const st = signalTiers || {};

  return (
    <section className={`geoExplainer${open ? ' geoExplainer--open' : ''}`}>
      <button className="geoExplainerBar" aria-expanded={open} aria-controls="geo-explainer-body" onClick={() => setOpen(o => !o)}>
        <span className="geoExplainerLabel">{label ?? 'How GEO Score Works'}</span>
        <span className="geoExplainerHint">{hint ?? 'Formula · 5 signals · 5 tiers'}</span>
        <span className="geoExplainerSpacer" />
        <span className="geoExplainerLearnMore">Learn more</span>
        <svg className="geoExplainerChev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
      </button>
      <div className="geoExplainerReveal">
        <div className="geoExplainerInner">
          <div className="geoExplainerPad" id="geo-explainer-body" role="region" aria-label="How GEO Score Works">

            <p className="geoExplainerEyebrow">The formula</p>
            <p className="geoExplainerLede">
              Your GEO Score is a <strong>weighted average of five AI-driven signals</strong>, each scored 0–100. The weights reflect how much each signal shapes whether AI assistants surface — and how they frame — your brand.
            </p>

            <div className="geoExplainerFormula" role="img" aria-label="Formula">
              {SIGNALS.map((s, i) => {
                const t = st[s.key];
                return (
                  <React.Fragment key={s.key}>
                    <span className="geoFmlTerm" style={t ? { borderColor: t.text, background: t.bg, color: t.text } : undefined}>
                      <span className="geoFmlName">{s.name}</span>
                      <span className="geoFmlOp">×</span>
                      <span className="geoFmlWt" style={t ? { color: t.text } : undefined}>{s.wt}</span>
                    </span>
                    {i < SIGNALS.length - 1 && <span className="geoFmlPlus">+</span>}
                  </React.Fragment>
                );
              })}
              <span className="geoFmlPlus">=</span>
              <span className="geoFmlEq"><span className="geoFmlResult">GEO Score</span></span>
            </div>

            <div className="geoExplainerGrid">

              <div className="geoExplainerSection">
                <p className="geoExplainerEyebrow">The five signals</p>
                {SIGNALS.map(s => {
                  const t = st[s.key];
                  return (
                    <div key={s.key} className="geoSig" style={t ? { background: t.bg, margin: '0 -8px', padding: '9px 8px' } : undefined}>
                      <span className="geoSigName" style={t ? { color: t.text } : undefined}>{s.name}</span>
                      <span className="geoSigWt" style={t ? { color: t.text, background: t.bg } : undefined}>{s.wt}</span>
                      <span className="geoSigDef">{s.def}</span>
                    </div>
                  );
                })}
              </div>

              <div className="geoExplainerSection">
                <p className="geoExplainerEyebrow">Score tiers</p>
                <div className="geoTier geoTier--fragmented"><span className="geoTierMeta"><span className="geoTierDot" /><span className="geoTierName">Fragmented</span></span><span className="geoTierRange">0–44</span><span className="geoTierDef">AI assistants rarely surface you, and rivals dominate the answer when they do.</span></div>
                <div className="geoTier geoTier--emerging"><span className="geoTierMeta"><span className="geoTierDot" /><span className="geoTierName">Emerging</span></span><span className="geoTierRange">45–55</span><span className="geoTierDef">You show up occasionally but inconsistently; competitors are cited more and more favourably.</span></div>
                <div className="geoTier geoTier--competitive"><span className="geoTierMeta"><span className="geoTierDot" /><span className="geoTierName">Competitive</span></span><span className="geoTierRange">56–69</span><span className="geoTierDef">You're a regular part of the AI conversation, holding your ground on most signals.</span></div>
                <div className="geoTier geoTier--leader"><span className="geoTierMeta"><span className="geoTierDot" /><span className="geoTierName">Leader</span></span><span className="geoTierRange">70–79</span><span className="geoTierDef">AI assistants surface you often, with strong, favourable framing. You set the category pace.</span></div>
                <div className="geoTier geoTier--authority"><span className="geoTierMeta"><span className="geoTierDot" /><span className="geoTierName">Authority</span></span><span className="geoTierRange">80–100</span><span className="geoTierDef">You're the default reference — cited first, consistently, and on-message across signals.</span></div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
