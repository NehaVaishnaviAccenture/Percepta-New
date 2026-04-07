'use client';

import { useState, useEffect, useRef } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string, string> = {
  'visibility score': 'how many of 20 generic ai queries mentioned your brand.',
  'citation score': 'how authoritatively your brand was cited across ai responses.',
  'sentiment score': 'the tone and favorability of ai responses when your brand appeared.',
  'avg rank': 'the average position your brand appeared across all ai responses.',
};

function scoreBadge(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (score >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (score >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s => dl.includes(s))) return { label: 'Social', color: '#7C3AED', bg: '#EDE9FE' };
  if (['wikipedia','gov','edu','consumerreports','bbb.org','federalreserve','fdic'].some(s => dl.includes(s))) return { label: 'Institution', color: '#1E40AF', bg: '#DBEAFE' };
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters'].some(s => dl.includes(s))) return { label: 'Earned Media', color: '#065F46', bg: '#D1FAE5' };
  return { label: 'Other', color: '#374151', bg: '#F3F4F6' };
}

const TABS = ['GEO Score', 'Competitors', 'Visibility', 'Sentiment', 'Citations', 'Prompts', 'Recommendations', 'Live Prompt'];

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#E5E7EB', color: '#6B7280', fontSize: '0.6rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>?</span>
      {show && (
        <span style={{ position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', fontSize: '0.72rem', lineHeight: 1.5, borderRadius: 8, padding: '8px 12px', width: 200, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'normal' as const }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: '#1F2937 transparent transparent transparent' }} />
        </span>
      )}
    </span>
  );
}

function MetricCard({ label, val, color = '#7C3AED' }: { label: string; val: any; color?: string }) {
  const tipKey = label.toLowerCase();
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 18px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}
        {METRIC_TIPS[tipKey] && <Tooltip text={METRIC_TIPS[tipKey]} />}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
    </div>
  );
}

// Full semicircle gauge like image 4
function GeoGauge({ score, brand }: { score: number; brand: string }) {
  const badge = scoreBadge(score);
  const W = 340, H = 200;
  const cx = W / 2, cy = H - 20;
  const R_outer = 150, R_inner = 105;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToXY = (deg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });

  const arcPath = (startDeg: number, endDeg: number, rOuter: number, rInner: number) => {
    const s1 = polarToXY(startDeg, rOuter);
    const e1 = polarToXY(endDeg, rOuter);
    const s2 = polarToXY(endDeg, rInner);
    const e2 = polarToXY(startDeg, rInner);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s1.x} ${s1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${rInner} ${rInner} 0 ${large} 0 ${e2.x} ${e2.y} Z`;
  };

  // 180 → 0 degrees (left to right = 0 to 100)
  const zones = [
    { from: 180, to: 136, color: '#FECACA', label: '0' },   // 0–44 poor
    { from: 136, to: 92, color: '#FEF08A', label: '44' },   // 44–69 needs work
    { from: 92, to: 72, color: '#BAE6FD', label: '69' },    // 69–79 good
    { from: 72, to: 0, color: '#BBF7D0', label: '79' },     // 79–100 excellent
  ];

  // Needle angle: 180deg = score 0, 0deg = score 100
  const needleAngle = 180 - (score / 100) * 180;
  const needleLen = R_inner - 10;
  const needleTip = polarToXY(needleAngle, needleLen);

  // Tick marks
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 24px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>{brand}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto', overflow: 'visible' }}>
        {/* Zone arcs */}
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.from, z.to, R_outer, R_inner)} fill={z.color} stroke="white" strokeWidth="1" />
        ))}
        {/* Filled progress arc */}
        {score > 0 && (
          <path d={arcPath(180, 180 - (score / 100) * 180, R_outer - 2, R_inner + 2)} fill="#7C3AED" opacity={0.9} />
        )}
        {/* Tick marks + labels */}
        {ticks.map(t => {
          const deg = 180 - (t / 100) * 180;
          const inner = polarToXY(deg, R_inner - 4);
          const outer = polarToXY(deg, R_outer + 4);
          const lbl = polarToXY(deg, R_outer + 16);
          return (
            <g key={t}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#9CA3AF" strokeWidth="1" />
              <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{t}</text>
            </g>
          );
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={7} fill="#374151" />
        <circle cx={cx} cy={cy} r={4} fill="white" />
        {/* Score */}
        <text x={cx} y={cy - 28} textAnchor="middle" style={{ fontSize: 36, fontWeight: 900, fill: '#7C3AED', fontFamily: 'Inter,sans-serif' }}>{score}</text>
      </svg>
      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '4px 16px', fontSize: '0.78rem', fontWeight: 700 }}>{badge.label}</span>
    </div>
  );
}

// Sankey — clean, expanded, like image 2
function SankeyChart({ result }: { result: any }) {
  const vis = result.visibility ?? 0;
  const cit = result.citation_share ?? 0;
  const sent = result.sentiment ?? 0;
  const prom = result.prominence ?? 0;
  const sov = result.share_of_voice ?? 0;
  const geo = result.overall_geo_score ?? 0;

  const W = 700, H = 360;
  const leftX = 200, rightX = 560;
  const nodeW = 22;
  const geoNodeH = 140;
  const geoCY = H / 2;

  const inputs = [
    { label: 'Visibility', value: vis, color: '#7C3AED', weight: 30 },
    { label: 'Sentiment', value: sent, color: '#10B981', weight: 20 },
    { label: 'Prominence', value: prom, color: '#3B82F6', weight: 20 },
    { label: 'Citation', value: cit, color: '#F59E0B', weight: 15 },
    { label: 'Share of Voice', value: sov, color: '#EF4444', weight: 15 },
  ];

  const nodeH = 28;
  const totalH = inputs.length * nodeH + (inputs.length - 1) * 24;
  const startY = (H - totalH) / 2;

  const nodes = inputs.map((n, i) => ({
    ...n,
    y: startY + i * (nodeH + 24),
  }));

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px', marginTop: 24 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>GEO Score Composition</div>
      <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 24 }}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {nodes.map((n, i) => {
          const srcMidY = n.y + nodeH / 2;
          const dstTop = geoCY - geoNodeH / 2;
          const dstBot = geoCY + geoNodeH / 2;
          const bandH = geoNodeH / inputs.length;
          const dstMidY = dstTop + i * bandH + bandH / 2;
          const halfSrc = nodeH / 2;
          const halfDst = bandH / 2;
          const cp1x = leftX + nodeW + (rightX - leftX - nodeW) * 0.45;
          const cp2x = leftX + nodeW + (rightX - leftX - nodeW) * 0.55;

          return (
            <g key={i}>
              {/* Flow band */}
              <path
                d={`M ${leftX + nodeW} ${srcMidY - halfSrc}
                    C ${cp1x} ${srcMidY - halfSrc}, ${cp2x} ${dstMidY - halfDst}, ${rightX} ${dstMidY - halfDst}
                    L ${rightX} ${dstMidY + halfDst}
                    C ${cp2x} ${dstMidY + halfDst}, ${cp1x} ${srcMidY + halfSrc}, ${leftX + nodeW} ${srcMidY + halfSrc} Z`}
                fill={n.color} opacity={0.15}
              />
              {/* Source node */}
              <rect x={leftX} y={n.y} width={nodeW} height={nodeH} rx={5} fill={n.color} />
              {/* Label left */}
              <text x={leftX - 8} y={n.y + nodeH / 2} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 13, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{n.label}</text>
              {/* Value below label */}
              <text x={leftX - 8} y={n.y + nodeH / 2 + 14} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 11, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.value}</text>
              {/* Weight % in middle of band */}
              <text x={(leftX + nodeW + rightX) / 2} y={srcMidY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 600, opacity: 0.9 }}>{n.weight}%</text>
            </g>
          );
        })}
        {/* GEO destination node */}
        <rect x={rightX} y={geoCY - geoNodeH / 2} width={nodeW} height={geoNodeH} rx={5} fill="#7C3AED" />
        {/* GEO label */}
        <text x={rightX + nodeW + 14} y={geoCY - 14} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 13, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>GEO Score</text>
        <text x={rightX + nodeW + 14} y={geoCY + 10} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 28, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', fontWeight: 900 }}>{geo}</text>
      </svg>
    </div>
  );
}

// Link Analysis — clean like image 3
function LinkAnalysis({ result }: { result: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brand = result.brand_name || 'Brand';
  const competitors = (result.competitors || []).slice(0, 4);
  const sources = (result.citation_sources || []).slice(0, 3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2 - 20;

    type Node = { x: number; y: number; label: string; color: string; r: number; type: string };
    const nodes: Node[] = [];
    nodes.push({ x: cx, y: cy, label: brand, color: '#7C3AED', r: 36, type: 'brand' });

    // Competitors — left/top arc
    competitors.forEach((c: any, i: number) => {
      const angle = Math.PI + (i / Math.max(competitors.length, 1)) * Math.PI * 0.9 - Math.PI * 0.1;
      nodes.push({ x: cx + 200 * Math.cos(angle), y: cy + 150 * Math.sin(angle), label: c.Brand, color: '#8B5CF6', r: 22, type: 'competitor' });
    });

    // Sources — right arc
    sources.forEach((s: any, i: number) => {
      const angle = -Math.PI * 0.25 + (i / Math.max(sources.length, 1)) * Math.PI * 0.7;
      nodes.push({ x: cx + 210 * Math.cos(angle), y: cy + 130 * Math.sin(angle), label: s.domain?.split('.')[0] || s.domain, color: '#10B981', r: 18, type: 'source' });
    });

    // Draw edges first
    nodes.slice(1).forEach(n => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = n.type === 'competitor' ? 'rgba(139,92,246,0.3)' : 'rgba(16,185,129,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      // Glow
      ctx.shadowColor = n.color + '55';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.type === 'brand' ? n.color : (n.type === 'competitor' ? '#C4B5FD' : '#6EE7B7');
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label below node
      ctx.fillStyle = '#374151';
      ctx.font = `600 11px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label, n.x, n.y + n.r + 5);

      // Brand label inside
      if (n.type === 'brand') {
        ctx.fillStyle = 'white';
        ctx.font = `700 12px Inter, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label.length > 10 ? n.label.slice(0, 9) + '…' : n.label, n.x, n.y);
      }
    });

    // Legend at bottom
    const legend = [
      { color: '#7C3AED', dotColor: '#7C3AED', label: 'Your Brand' },
      { color: '#8B5CF6', dotColor: '#C4B5FD', label: 'Competitors' },
      { color: '#10B981', dotColor: '#6EE7B7', label: 'Sources' },
    ];
    const legendW = legend.length * 130;
    const legendX = (W - legendW) / 2;
    legend.forEach((l, i) => {
      const x = legendX + i * 130;
      const y = H - 28;
      ctx.beginPath();
      ctx.arc(x + 8, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = l.dotColor;
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.label, x + 20, y);
    });
  }, [result, brand, competitors, sources]);

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px', marginTop: 24 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>AI Citation Network</div>
      <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Brands and sources co-cited with {brand} in AI responses</div>
      <div style={{ background: '#F8FAFC', borderRadius: 12, overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={700} height={420} style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );
}

export default function GeoHub() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [promptInput, setPromptInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<{ q: string; a: string }[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');

  async function runAnalysis() {
    if (!url.trim() || !url.startsWith('http')) { setError('Please enter a valid URL starting with http:// or https://'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/geo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); setActiveTab(0); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function runPrompt() {
    if (!promptInput.trim()) return;
    setPromptLoading(true);
    try {
      const res = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptInput }) });
      const data = await res.json();
      setPromptHistory(h => [{ q: promptInput, a: data.response }, ...h]);
      setPromptInput('');
    } catch {}
    setPromptLoading(false);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)', padding: '64px 40px 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 50, padding: '8px 24px', fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: 32, background: 'rgba(255,255,255,0.15)' }}>
          ✦ &nbsp;Real Time GEO Scoring
        </div>
        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>GEO Scorecard</h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 20px' }}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '8px 22px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.12)' }}>
          ⏱ &nbsp;Live data · Updated in real-time · Not cached like competitors
        </div>
      </div>

      {!result ? (
        <div style={{ padding: '48px 40px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24, marginBottom: 40 }}>
            {bands.map((b, i) => (
              <div key={i} style={{ background: b.bg, borderRadius: 20, padding: '36px 28px', textAlign: 'center', border: `1.5px solid ${b.border}` }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: b.color, marginBottom: 8 }}>{b.range}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: b.color, marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontSize: '0.85rem', color: b.color, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.14em', color: '#9CA3AF', textTransform: 'uppercase' as const }}>Brand URL</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && runAnalysis()} placeholder="https://www.capitalone.com/"
                style={{ flex: 1, borderRadius: 12, border: '1.5px solid #E5E7EB', padding: '14px 20px', fontSize: '0.95rem', height: 52, background: 'white', outline: 'none', color: '#374151', boxSizing: 'border-box' as const }} />
              <button onClick={runAnalysis} disabled={loading}
                style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', height: 52, padding: '0 28px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.4)', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                🔍 {loading ? 'Analysing...' : 'Run Live AI Analysis'}
              </button>
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: 10 }}>{error}</div>}
          </div>
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #E5E7EB', background: 'white', display: 'flex', padding: '0 40px', gap: 4 }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{ background: 'none', border: 'none', borderBottom: activeTab === i ? '2px solid #7C3AED' : '2px solid transparent', color: activeTab === i ? '#7C3AED' : '#6B7280', fontWeight: activeTab === i ? 700 : 500, fontSize: '0.85rem', padding: '12px 20px', cursor: 'pointer', transition: 'all 0.15s' }}>
                {t}
              </button>
            ))}
            <button onClick={() => { setResult(null); setUrl(''); }} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, color: '#6B7280', fontSize: '0.78rem', padding: '6px 14px', cursor: 'pointer', alignSelf: 'center' }}>
              ← New Analysis
            </button>
          </div>

          <div style={{ padding: '32px 40px 60px' }}>

            {/* TAB 0: GEO Score */}
            {activeTab === 0 && (() => {
              const geo = result.overall_geo_score;
              const badge = scoreBadge(geo);
              const vis = result.visibility;
              const cit = result.citation_share;
              const sent = result.sentiment;
              const avgRank = result.avg_rank;
              const prom = result.prominence;
              const sov = result.share_of_voice;

              return (
                <div>
                  {/* Top row: gauge + summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, marginBottom: 24 }}>
                    <GeoGauge score={geo} brand={result.brand_name} />
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 6 }}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontSize: '0.84rem' }}>{result.page_url?.slice(0, 60)}{result.page_url?.length > 60 ? '...' : ''}</a>
                      <div style={{ margin: '14px 0 6px', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>Status</div>
                      <span style={{ background: badge.bg, color: badge.color, padding: '5px 16px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
                      <div style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.8, borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 14 }}>
                        GEO Score of {geo} reflects {vis}% Visibility
                        {[cit < 40 ? `Citation (${cit}): rarely top pick` : null, prom < 40 ? `Prominence (${prom}): typically mentioned mid-list rather than first` : null, sov < 20 ? `Share of Voice (${sov}), competitors dominating more of the AI conversation` : null].filter(Boolean).length > 0
                          ? ` but is held back by: ${[cit < 40 ? `Citation (${cit}): rarely top pick` : null, prom < 40 ? `Prominence (${prom}): typically mentioned mid-list rather than first` : null, sov < 20 ? `Share of Voice (${sov}), competitors dominating more of the AI conversation` : null].filter(Boolean).join('; ')}.`
                          : '. Strong performance across all metrics.'}
                      </div>
                    </div>
                  </div>

                  {/* Metrics row: visibility, sentiment, citation, avg rank */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="visibility score" val={vis} color="#7C3AED" />
                    <MetricCard label="sentiment score" val={sent} color="#10B981" />
                    <MetricCard label="citation score" val={cit} color="#F59E0B" />
                    <MetricCard label="avg rank" val={avgRank} color="#3B82F6" />
                  </div>

                  {/* Sankey */}
                  <SankeyChart result={result} />

                  {/* Link Analysis */}
                  <LinkAnalysis result={result} />
                </div>
              );
            })()}

            {/* TAB 1: Competitors */}
            {activeTab === 1 && (() => {
              const geo = result.overall_geo_score;
              const vis = result.visibility; const cit = result.citation_share;
              const sent = result.sentiment; const sov = result.share_of_voice;
              const avgRank = result.avg_rank;
              const top10 = [
                { Brand: result.brand_name, URL: result.domain, GEO: geo, Vis: vis, Cit: cit, Sen: sent, Sov: sov, Rank: avgRank, isYou: true },
                ...(result.competitors || []).map((c: any) => ({ ...c, isYou: false }))
              ].sort((a, b) => b.GEO - a.GEO);
              return (
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 28 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>{result.domain} vs Competitors — {result.ind_label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>Real-time GEO scores. Highlighted row is you.</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>
                        {['#', 'Brand', 'GEO', 'Visibility', 'Citation', 'Sentiment', 'Share of Voice', 'Avg Rank'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {top10.map((c: any, i: number) => {
                        const gcol = c.GEO >= 80 ? '#10B981' : c.GEO >= 60 ? '#F59E0B' : '#EF4444';
                        return (
                          <tr key={i} style={{ background: c.isYou ? '#F5F3FF' : i % 2 === 0 ? 'white' : '#FAFAFA', borderLeft: c.isYou ? '3px solid #7C3AED' : 'none' }}>
                            <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: '0.86rem', fontWeight: c.isYou ? 700 : 400, color: '#111827' }}>
                                {c.Brand} {c.isYou && <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>You</span>}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.URL}</div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.9rem', fontWeight: 700, color: gcol }}>{c.GEO}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Vis}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Cit}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Sen}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Sov}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Rank}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* TAB 2: Visibility */}
            {activeTab === 2 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <MetricCard label="visibility score" val={result.visibility} />
                  <MetricCard label="avg rank" val={result.avg_rank} color="#3B82F6" />
                  <MetricCard label="citation score" val={`${result.responses_with_brand}/20`} color="#10B981" />
                </div>
                {(result.internal_links || []).length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Page Intelligence</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Which pages of {result.domain} are being cited by AI.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>
                          {['Page', 'Path', 'Status'].map(h => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(result.internal_links || []).slice(0, 8).map((lk: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: 600, color: '#111827' }}>{lk.label}</td>
                            <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#9CA3AF' }}>{lk.path}</td>
                            <td style={{ padding: '10px 14px' }}><span style={{ background: '#F3F4F6', color: '#9CA3AF', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>Detected</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Sentiment */}
            {activeTab === 3 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <MetricCard label="sentiment score" val={result.sentiment} color="#10B981" />
                  <MetricCard label="visibility score" val={result.prominence} color="#3B82F6" />
                  <MetricCard label="avg rank" val={result.avg_rank} color="#F59E0B" />
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Sentiment Strengths</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                      <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0FDF4' }}>
                        <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: Citations */}
            {activeTab === 4 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <MetricCard label="citation score" val={result.citation_share} />
                  <MetricCard label="avg rank" val={result.share_of_voice} color="#F59E0B" />
                </div>
                {(result.citation_sources || []).length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Sources AI is Pulling From</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Domains influencing AI knowledge about this brand.</div>
                    {(result.citation_sources || []).map((s: any, i: number) => {
                      const cls = classifyDomain(s.domain);
                      const bw = Math.min(s.citation_share * 3, 100);
                      return (
                        <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, width: 18 }}>{s.rank}</span>
                            <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=14`} width={14} height={14} alt="" />
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', flex: 1 }}>{s.domain}</span>
                            <span style={{ background: cls.bg, color: cls.color, borderRadius: 50, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600 }}>{cls.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, width: 80, overflow: 'hidden' }}>
                                <div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: bw }} />
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED' }}>{s.citation_share}%</span>
                            </div>
                          </div>
                          {s.top_pages?.length > 0 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #F3F4F6' }}>
                              {s.top_pages.slice(0, 3).map((pg: string, j: number) => <div key={j} style={{ fontSize: '0.75rem', color: '#7C3AED', padding: '2px 0' }}>{pg}</div>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Prompts */}
            {activeTab === 5 && (() => {
              const rd = result.responses_detail || [];
              const cats = ['All', ...Array.from(new Set(rd.map((r: any) => r.category))) as string[]];
              const filtered = rd.filter((r: any) => filterCat === 'All' || r.category === filterCat).slice(0, 10);
              const catStats: Record<string, { total: number; mentioned: number }> = {};
              rd.forEach((r: any) => {
                if (!catStats[r.category]) catStats[r.category] = { total: 0, mentioned: 0 };
                catStats[r.category].total++;
                if (r.mentioned) catStats[r.category].mentioned++;
              });
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {Object.entries(catStats).map(([c, v]) => (
                      <div key={c} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginBottom: 6 }}>{c}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, flex: 1, overflow: 'hidden' }}>
                            <div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: `${Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED' }}>{Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{v.mentioned} of {v.total} queries</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem', color: '#374151', background: 'white', outline: 'none' }}>
                      {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Top 10 Prompts</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Generic consumer questions. No brand name used.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>
                          {['#', 'Query', 'Rank'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item: any, i: number) => {
                          const rp = item.position; const rd2 = rp > 0 ? `#${rp}` : 'N/A';
                          const rc = rp === 1 ? '#10B981' : rp <= 3 ? '#7C3AED' : item.mentioned ? '#F59E0B' : '#9CA3AF';
                          return (
                            <tr key={i} style={{ background: item.mentioned ? '#F5F3FF' : 'white', borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                                  <span style={{ background: '#EDE9FE', color: '#5B21B6', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 600 }}>{item.category}</span>
                                  <span style={{ background: item.mentioned ? '#D1FAE5' : '#F3F4F6', color: item.mentioned ? '#065F46' : '#9CA3AF', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{item.mentioned ? 'Appeared' : 'Not Mentioned'}</span>
                                </div>
                                <div style={{ fontSize: '0.83rem', color: '#374151' }}>{item.query}</div>
                              </td>
                              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rc }}>{rd2}</div>
                                <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Rank</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 6: Recommendations */}
            {activeTab === 6 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46', marginBottom: 16 }}>What is Working Well</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                        <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0FDF4' }}>
                          <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9F1239', marginBottom: 16 }}>What Needs Improvement</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {(result.improvements_list || []).slice(0, 5).map((w: string, i: number) => (
                        <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #FFF1F2' }}>
                          <span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>x</span><span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Priority Actions</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>Each action mapped to the relevant Accenture workstream deliverable.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', borderBottom: '2px solid #E5E7EB', paddingBottom: 8, marginBottom: 4 }}>
                    {['Priority', 'Action', 'Linked Deliverable'].map(h => <div key={h} style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</div>)}
                  </div>
                  {(result.actions || []).map((a: any, i: number) => {
                    const dm: Record<string, [string, string]> = { High: ['Workstream 01: ARD', 'AXO Baseline Report and Brand Ranking Index'], Medium: ['Workstream 02: AOP', 'LLM-Ready Content Package and Content Influence Blueprint'], Low: ['Workstream 03: DTI', 'Schema Optimization Guide and Metadata Remediation Plan'] };
                    const priBg: Record<string, string> = { High: '#FEE2E2', Medium: '#FEF3C7', Low: '#DCFCE7' };
                    const priTc: Record<string, string> = { High: '#991B1B', Medium: '#92400E', Low: '#166534' };
                    const [pk, deliv] = dm[a.priority] || ['', ''];
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 0, borderBottom: '1px solid #F3F4F6', padding: '14px 0', alignItems: 'start' }}>
                        <div><span style={{ background: priBg[a.priority], color: priTc[a.priority], borderRadius: 4, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{a.priority}</span></div>
                        <div style={{ fontSize: '0.84rem', color: '#374151', paddingRight: 16 }}>{a.action}</div>
                        <div>
                          <span style={{ background: '#EDE9FE', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600 }}>{pk}</span>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>{deliv}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: Live Prompt */}
            {activeTab === 7 && (
              <div>
                <div style={{ background: '#7C3AED', borderRadius: 12, padding: '24px 28px', color: 'white', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Live AI Prompt Lab</h3>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Type any prompt and see exactly how GPT-4o responds in real time.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <input type="text" value={promptInput} onChange={e => setPromptInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runPrompt()} placeholder="e.g. What is the best travel credit card for high net worth individuals?"
                    style={{ flex: 1, borderRadius: 12, border: '1.5px solid #DDD6FE', padding: '14px 18px', fontSize: '0.95rem', height: 52, background: '#FAFAFE', outline: 'none' }} />
                  <button onClick={runPrompt} disabled={promptLoading} style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', padding: '0 24px', height: 52, cursor: 'pointer' }}>
                    {promptLoading ? '...' : 'Run'}
                  </button>
                </div>
                {promptHistory.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0 10px' }}>
                      <div style={{ background: '#F4F4F4', color: '#111827', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '60%', fontSize: '0.95rem' }}>{item.q}</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.a}</div>
                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />
                  </div>
                ))}
                {promptHistory.length > 0 && (
                  <button onClick={() => setPromptHistory([])} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, color: '#6B7280', fontSize: '0.78rem', padding: '6px 14px', cursor: 'pointer' }}>Clear history</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
