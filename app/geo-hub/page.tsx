'use client';

import { useState, useEffect, useRef } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string, string> = {
  'Visibility Score': 'How many of 20 generic AI queries mentioned your brand.',
  'Citation Score': 'How authoritatively your brand was cited across AI responses.',
  'Sentiment Score': 'The tone and favorability of AI responses when your brand appeared.',
  'Prominence Score': 'How early in AI responses your brand was mentioned.',
  'Share of Voice': 'Your brand mentions as a percentage of all brand mentions in AI responses.',
  'Avg. Rank': 'The average position your brand appeared across all AI responses.',
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

// Tooltip component
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', background: '#E5E7EB',
        color: '#6B7280', fontSize: '0.65rem', fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: 'white', fontSize: '0.75rem', lineHeight: 1.5,
          borderRadius: 8, padding: '10px 14px', width: 220, textAlign: 'left',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, pointerEvents: 'none',
          whiteSpace: 'normal',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: 6, borderStyle: 'solid', borderColor: '#1F2937 transparent transparent transparent',
          }} />
        </span>
      )}
    </span>
  );
}

// Metric card
function MetricCard({ label, val, sub, color = '#7C3AED' }: { label: string; val: any; sub: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '18px 16px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
        {label}
        {METRIC_TIPS[label] && <Tooltip text={METRIC_TIPS[label]} />}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

// Gauge component
function GeoGauge({ score, brand }: { score: number; brand: string }) {
  const badge = scoreBadge(score);
  const r = 80;
  const cx = 110, cy = 105;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI;
  const scoreAngle = startAngle - (score / 100) * totalArc;

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  const describeArc = (start: number, end: number, radius: number) => {
    const s = polarToCartesian(start, radius);
    const e = polarToCartesian(end, radius);
    const large = Math.abs(start - end) > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const zones = [
    { start: Math.PI, end: Math.PI * (1 - 0.44), color: '#FEE2E2' },
    { start: Math.PI * (1 - 0.44), end: Math.PI * (1 - 0.69), color: '#FEF3C7' },
    { start: Math.PI * (1 - 0.69), end: Math.PI * (1 - 0.79), color: '#DBEAFE' },
    { start: Math.PI * (1 - 0.79), end: 0, color: '#D1FAE5' },
  ];

  const needle = polarToCartesian(scoreAngle, r - 10);

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, textAlign: 'center' }}>
      <svg viewBox="0 0 220 120" style={{ width: '100%', maxWidth: 260, margin: '0 auto', display: 'block', overflow: 'visible' }}>
        {/* Background track */}
        <path d={describeArc(Math.PI, 0, r)} fill="none" stroke="#F3F4F6" strokeWidth="18" strokeLinecap="butt" />
        {/* Color zones */}
        {zones.map((z, i) => (
          <path key={i} d={describeArc(z.start, z.end, r)} fill="none" stroke={z.color} strokeWidth="18" strokeLinecap="butt" />
        ))}
        {/* Score arc overlay */}
        <path d={describeArc(Math.PI, scoreAngle, r)} fill="none" stroke="#7C3AED" strokeWidth="14" strokeLinecap="round" />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needle.x} y2={needle.y}
          stroke="#374151" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="#374151" />
        {/* Score text */}
        <text x={cx} y={cy - 18} textAnchor="middle" style={{ fontSize: 28, fontWeight: 900, fill: '#7C3AED', fontFamily: 'Inter, sans-serif' }}>{score}</text>
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>out of 100</text>
        {/* Zone labels */}
        <text x="18" y="108" style={{ fontSize: 7, fill: '#991B1B', fontFamily: 'Inter, sans-serif' }}>Poor</text>
        <text x="185" y="108" style={{ fontSize: 7, fill: '#065F46', fontFamily: 'Inter, sans-serif' }}>Excellent</text>
      </svg>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>{brand}</div>
      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '5px 18px', fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
    </div>
  );
}

// Sankey Chart
function SankeyChart({ result }: { result: any }) {
  const vis = result.visibility ?? 0;
  const cit = result.citation_share ?? 0;
  const sent = result.sentiment ?? 0;
  const prom = result.prominence ?? 0;
  const sov = result.share_of_voice ?? 0;
  const geo = result.overall_geo_score ?? 0;

  const total = vis + cit + sent + prom + sov || 1;
  const h = 320;
  const nodeW = 24;
  const gap = 12;

  const inputs = [
    { label: 'Visibility', value: vis, color: '#7C3AED', weight: 0.30 },
    { label: 'Sentiment', value: sent, color: '#10B981', weight: 0.20 },
    { label: 'Prominence', value: prom, color: '#3B82F6', weight: 0.20 },
    { label: 'Citation', value: cit, color: '#F59E0B', weight: 0.15 },
    { label: 'Share of Voice', value: sov, color: '#EF4444', weight: 0.15 },
  ];

  const totalH = h - gap * (inputs.length - 1);
  let leftY = 20;
  const nodes = inputs.map(n => {
    const nodeH = Math.max(20, (n.value / 100) * totalH * 0.8);
    const y = leftY;
    leftY += nodeH + gap;
    return { ...n, y, h: nodeH };
  });

  const rightY = h / 2 - 60;
  const rightH = 120;

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24, marginTop: 24 }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>GEO Score Composition</div>
      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>How each signal flows into your overall GEO Score</div>
      <svg viewBox="0 0 520 360" style={{ width: '100%', maxHeight: 360 }}>
        {nodes.map((n, i) => {
          const srcX = 60 + nodeW;
          const dstX = 360;
          const srcMidY = n.y + n.h / 2;
          const dstMidY = rightY + rightH / 2;
          const cp1x = srcX + (dstX - srcX) * 0.4;
          const cp2x = srcX + (dstX - srcX) * 0.6;
          const halfSrc = n.h / 2;
          const halfDst = (n.h / totalH) * rightH / 2;

          return (
            <g key={i}>
              {/* Flow band */}
              <path
                d={`M ${srcX} ${n.y} C ${cp1x} ${n.y}, ${cp2x} ${dstMidY - halfDst}, ${dstX} ${dstMidY - halfDst}
                    L ${dstX} ${dstMidY + halfDst} C ${cp2x} ${dstMidY + halfDst}, ${cp1x} ${n.y + n.h}, ${srcX} ${n.y + n.h} Z`}
                fill={n.color} opacity={0.18}
              />
              {/* Source node */}
              <rect x={60} y={n.y} width={nodeW} height={n.h} rx={4} fill={n.color} />
              {/* Label */}
              <text x={52} y={n.y + n.h / 2 + 4} textAnchor="end" style={{ fontSize: 11, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{n.label}</text>
              <text x={52} y={n.y + n.h / 2 + 16} textAnchor="end" style={{ fontSize: 10, fill: n.color, fontFamily: 'Inter,sans-serif' }}>{n.value}</text>
            </g>
          );
        })}

        {/* Destination GEO node */}
        <rect x={360} y={rightY} width={nodeW} height={rightH} rx={4} fill="#7C3AED" />
        <text x={360 + nodeW + 8} y={rightY + rightH / 2 - 8} style={{ fontSize: 12, fill: '#111827', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>GEO Score</text>
        <text x={360 + nodeW + 8} y={rightY + rightH / 2 + 8} style={{ fontSize: 22, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', fontWeight: 900 }}>{geo}</text>

        {/* Weight labels */}
        {nodes.map((n, i) => (
          <text key={i} x={200} y={n.y + n.h / 2 + 4}
            textAnchor="middle"
            style={{ fontSize: 9, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>
            {Math.round(n.weight * 100)}%
          </text>
        ))}
      </svg>
    </div>
  );
}

// Link Analysis Network
function LinkAnalysis({ result }: { result: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brand = result.brand_name || 'Brand';
  const competitors = (result.competitors || []).slice(0, 6);
  const sources = (result.citation_sources || []).slice(0, 5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;

    // Nodes
    const nodes: { x: number; y: number; label: string; color: string; r: number; type: string }[] = [];

    // Center — brand
    nodes.push({ x: cx, y: cy, label: brand, color: '#7C3AED', r: 28, type: 'brand' });

    // Competitors — left arc
    competitors.forEach((c: any, i: number) => {
      const angle = Math.PI * 0.25 + (i / Math.max(competitors.length - 1, 1)) * Math.PI * 1.1;
      nodes.push({ x: cx - 160 * Math.cos(angle), y: cy - 120 * Math.sin(angle), label: c.Brand, color: '#EF4444', r: 16, type: 'competitor' });
    });

    // Citation sources — right arc
    sources.forEach((s: any, i: number) => {
      const angle = -Math.PI * 0.3 + (i / Math.max(sources.length - 1, 1)) * Math.PI * 0.9;
      nodes.push({ x: cx + 170 * Math.cos(angle), y: cy - 100 * Math.sin(angle), label: s.domain, color: '#10B981', r: 14, type: 'source' });
    });

    // Draw edges
    nodes.slice(1).forEach(n => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = n.type === 'competitor' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)';
      ctx.lineWidth = n.type === 'competitor' ? 2 : 1.5;
      ctx.setLineDash(n.type === 'source' ? [4, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow
      const angle = Math.atan2(n.y - cy, n.x - cx);
      const ax = n.x - (n.r + 4) * Math.cos(angle);
      const ay = n.y - (n.r + 4) * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay - 8 * Math.sin(angle - 0.4));
      ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay - 8 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = n.type === 'competitor' ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)';
      ctx.fill();
    });

    // Draw nodes
    nodes.forEach(n => {
      // Shadow
      ctx.shadowColor = n.color + '44';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.type === 'brand' ? n.color : 'white';
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = n.type === 'brand' ? 0 : 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = n.type === 'brand' ? 'white' : '#111827';
      ctx.font = `${n.type === 'brand' ? '700' : '600'} ${n.type === 'brand' ? 11 : 9}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = n.label.split(' ');
      if (words.length > 1 && n.type !== 'brand') {
        ctx.fillText(words[0], n.x, n.y - 5);
        ctx.fillText(words.slice(1).join(' '), n.x, n.y + 6);
      } else {
        ctx.fillText(n.label.length > 12 ? n.label.slice(0, 11) + '…' : n.label, n.x, n.y);
      }
    });

    // Legend
    const legend = [{ color: '#7C3AED', label: 'Your Brand' }, { color: '#EF4444', label: 'Competitors' }, { color: '#10B981', label: 'Citation Sources' }];
    legend.forEach((l, i) => {
      ctx.beginPath();
      ctx.arc(20, H - 50 + i * 18, 5, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, 30, H - 46 + i * 18);
    });

  }, [result, brand, competitors, sources]);

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24, marginTop: 24 }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Brand Link Analysis</div>
      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>
        How your brand connects to competitors and citation sources in AI responses.
        <span style={{ marginLeft: 12, color: '#EF4444' }}>— Competitors</span>
        <span style={{ marginLeft: 12, color: '#10B981' }}>– – Citation Sources</span>
      </div>
      <canvas ref={canvasRef} width={700} height={380} style={{ width: '100%', borderRadius: 8, background: '#FAFAFA' }} />
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
        <div style={{ padding: '0 0 40px' }}>
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

          <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>

            {/* TAB 0: GEO Score */}
            {activeTab === 0 && (() => {
              const geo = result.overall_geo_score;
              const badge = scoreBadge(geo);
              const vis = result.visibility; const cit = result.citation_share;
              const sent = result.sentiment; const prom = result.prominence;
              const sov = result.share_of_voice; const avgRank = result.avg_rank;
              const top10 = [
                { Brand: result.brand_name, URL: result.domain, GEO: geo, Vis: vis, Cit: cit, Sen: sent, Sov: sov, Rank: avgRank, isYou: true },
                ...(result.competitors || []).map((c: any) => ({ ...c, isYou: false }))
              ].sort((a, b) => b.GEO - a.GEO);
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
                    <GeoGauge score={geo} brand={result.brand_name} />
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24 }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontSize: '0.82rem' }}>{result.page_url?.slice(0, 70)}{result.page_url?.length > 70 ? '...' : ''}</a>
                      <div style={{ margin: '8px 0 4px', fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>Status</div>
                      <span style={{ background: badge.bg, color: badge.color, padding: '4px 14px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 700 }}>{badge.label}</span>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.7, borderTop: '1px solid #F3F4F6', paddingTop: 12, marginTop: 12 }}>
                        GEO Score of {geo} reflects {vis}% Visibility{
                          [cit < 40 ? `Citation (${cit}): rarely top pick` : null, prom < 40 ? `Prominence (${prom}): typically mentioned mid-list rather than first` : null, sov < 20 ? `Share of Voice (${sov}), competitors dominating more of the AI conversation` : null].filter(Boolean).length > 0
                            ? ` but is held back by: ${[cit < 40 ? `Citation (${cit}): rarely top pick` : null, prom < 40 ? `Prominence (${prom}): typically mentioned mid-list rather than first` : null, sov < 20 ? `Share of Voice (${sov}), competitors dominating more of the AI conversation` : null].filter(Boolean).join('; ')}.`
                            : '. Strong performance across all metrics.'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="Visibility Score" val={vis} sub="out of 100" />
                    <MetricCard label="Citation Score" val={cit} sub="out of 100" />
                    <MetricCard label="Sentiment Score" val={sent} sub="out of 100" color="#10B981" />
                    <MetricCard label="Prominence Score" val={prom} sub="out of 100" color="#3B82F6" />
                    <MetricCard label="Share of Voice" val={sov} sub="out of 100" color="#F59E0B" />
                  </div>

                  {/* Sankey */}
                  <SankeyChart result={result} />

                  {/* Link Analysis */}
                  <LinkAnalysis result={result} />

                  {/* Competitor Table */}
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24, marginTop: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>{result.domain} vs Competitors — {result.ind_label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Real-time GEO scores. Highlighted row is you.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                          {['#', 'Brand', 'GEO', 'Visibility', 'Citation', 'Sentiment', 'Share of Voice', 'Avg Rank'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {top10.map((c: any, i: number) => {
                          const gcol = c.GEO >= 80 ? '#10B981' : c.GEO >= 60 ? '#F59E0B' : '#EF4444';
                          return (
                            <tr key={i} style={{ background: c.isYou ? '#F5F3FF' : i % 2 === 0 ? 'white' : '#FAFAFA', borderLeft: c.isYou ? '3px solid #7C3AED' : 'none' }}>
                              <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: c.isYou ? 700 : 400, color: '#111827' }}>
                                  {c.Brand} {c.isYou && <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>You</span>}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.URL}</div>
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '0.88rem', fontWeight: 700, color: gcol }}>{c.GEO}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Vis}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Cit}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sen}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sov}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Rank}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 1: Competitors */}
            {activeTab === 1 && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                <p style={{ color: '#6B7280' }}>Competitor breakdown is shown in the GEO Score tab.</p>
              </div>
            )}

            {/* TAB 2: Visibility */}
            {activeTab === 2 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <MetricCard label="Visibility Score" val={result.visibility} sub={`Appeared in ${result.responses_with_brand} of 20 queries`} />
                  <MetricCard label="Avg. Rank" val={result.avg_rank} sub="Position when mentioned" color="#3B82F6" />
                  <MetricCard label="Citation Score" val={`${result.responses_with_brand}/20`} sub="Out of 20 generic industry queries" color="#10B981" />
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
                  <MetricCard label="Sentiment Score" val={result.sentiment} sub={result.sentiment >= 70 ? 'Positive — AI speaks favorably' : result.sentiment >= 45 ? 'Neutral — room to improve' : 'Needs attention'} color="#10B981" />
                  <MetricCard label="Prominence Score" val={result.prominence} sub={result.prominence >= 70 ? 'Named first — strong prominence' : result.prominence >= 45 ? 'Mid-list mentions' : 'Buried in responses'} color="#3B82F6" />
                  <MetricCard label="Avg. Rank" val={result.avg_rank} sub="Average mention position" color="#F59E0B" />
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
                  <MetricCard label="Citation Score" val={result.citation_share} sub="How authoritatively your brand was cited" />
                  <MetricCard label="Share of Voice" val={result.share_of_voice} sub="Your brand mentions as % of all mentions" color="#F59E0B" />
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