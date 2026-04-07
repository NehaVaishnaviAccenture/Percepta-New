'use client';

import { useState } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string, string> = {
  'visibility score': 'measures how often your brand appears in ai-generated responses across key industry queries.',
  'citation score': 'reflects how authoritatively ai models reference your brand compared to competitors.',
  'sentiment score': 'captures the tone and favorability of ai responses when your brand is mentioned.',
  'avg rank': 'your average mention position across all ai responses where your brand appeared.',
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
        <span style={{ position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', fontSize: '0.72rem', lineHeight: 1.6, borderRadius: 8, padding: '10px 14px', width: 210, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'normal' as const }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: '#1F2937 transparent transparent transparent' }} />
        </span>
      )}
    </span>
  );
}

function MetricCard({ label, val, color = '#7C3AED' }: { label: string; val: any; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 18px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}
        {METRIC_TIPS[label.toLowerCase()] && <Tooltip text={METRIC_TIPS[label.toLowerCase()]} />}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
    </div>
  );
}

// ── GAUGE — SVG semicircle like image 1 ──────────────────────
function GeoGauge({ score, brand }: { score: number; brand: string }) {
  const badge = scoreBadge(score);
  // SVG dimensions
  const W = 400, H = 230;
  const cx = W / 2, cy = H - 30;
  const Ro = 160, Ri = 110; // outer/inner radius

  // Convert value 0–100 to angle: 0=180°(left), 100=0°(right)
  const valToAngle = (v: number) => Math.PI - (v / 100) * Math.PI;

  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  // Donut arc segment path
  const arcSegment = (v0: number, v1: number, color: string) => {
    const a0 = valToAngle(v0), a1 = valToAngle(v1);
    const p0o = polar(a0, Ro), p1o = polar(a1, Ro);
    const p0i = polar(a0, Ri), p1i = polar(a1, Ri);
    const large = Math.abs(v1 - v0) > 50 ? 1 : 0;
    return (
      <path
        d={`M ${p0o.x} ${p0o.y} A ${Ro} ${Ro} 0 ${large} 0 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${Ri} ${Ri} 0 ${large} 1 ${p0i.x} ${p0i.y} Z`}
        fill={color} stroke="white" strokeWidth="1.5"
      />
    );
  };

  // Filled progress arc (purple)
  const progressArc = () => {
    if (score <= 0) return null;
    const a0 = valToAngle(0), a1 = valToAngle(score);
    const p0o = polar(a0, Ro - 1), p1o = polar(a1, Ro - 1);
    const p0i = polar(a0, Ri + 1), p1i = polar(a1, Ri + 1);
    const large = score > 50 ? 1 : 0;
    return (
      <path
        d={`M ${p0o.x} ${p0o.y} A ${Ro - 1} ${Ro - 1} 0 ${large} 0 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${Ri + 1} ${Ri + 1} 0 ${large} 1 ${p0i.x} ${p0i.y} Z`}
        fill="#6D28D9" opacity={0.95}
      />
    );
  };

  // Needle
  const needleAngle = valToAngle(score);
  const needleTip = polar(needleAngle, Ri + 2);

  // Tick marks
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 16px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>{brand}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {/* Background zones */}
        {arcSegment(0, 44, '#FECACA')}
        {arcSegment(44, 69, '#FEF08A')}
        {arcSegment(69, 79, '#BAE6FD')}
        {arcSegment(79, 100, '#BBF7D0')}
        {/* Purple progress fill */}
        {progressArc()}
        {/* Tick marks */}
        {ticks.map(t => {
          const a = valToAngle(t);
          const inner = polar(a, Ri - 6);
          const outer = polar(a, Ro + 6);
          const lbl = polar(a, Ro + 18);
          return (
            <g key={t}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#9CA3AF" strokeWidth="1" />
              <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{t}</text>
            </g>
          );
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={8} fill="#111827" />
        <circle cx={cx} cy={cy} r={4} fill="white" />
        {/* Score number */}
        <text x={cx} y={cy - 32} textAnchor="middle" style={{ fontSize: 44, fontWeight: 900, fill: '#7C3AED', fontFamily: 'Inter,sans-serif' }}>{score}</text>
      </svg>
      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '5px 18px', fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
    </div>
  );
}

// ── SANKEY — SVG, interactive hover ─────────────────────────
function SankeyChart({ result }: { result: any }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const vis = result.visibility ?? 0;
  const cit = result.citation_share ?? 0;
  const sent = result.sentiment ?? 0;
  const prom = result.prominence ?? 0;
  const sov = result.share_of_voice ?? 0;
  const geo = result.overall_geo_score ?? 0;

  const inputs = [
    { label: 'Visibility', value: vis, color: '#7C3AED', weight: 30 },
    { label: 'Sentiment', value: sent, color: '#10B981', weight: 20 },
    { label: 'Prominence', value: prom, color: '#3B82F6', weight: 20 },
    { label: 'Citation', value: cit, color: '#F59E0B', weight: 15 },
    { label: 'Share of Voice', value: sov, color: '#EF4444', weight: 15 },
  ];

  const W = 800, H = 400;
  const leftX = 240, rightX = 620;
  const nodeW = 28;
  const geoH = 160, geoCY = H / 2;
  const nodeH = 36, gap = 28;
  const totalH = inputs.length * nodeH + (inputs.length - 1) * gap;
  const startY = (H - totalH) / 2;

  const nodes = inputs.map((n, i) => ({ ...n, y: startY + i * (nodeH + gap) }));

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px', marginTop: 24 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>GEO Score Composition</div>
      <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 20 }}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {nodes.map((n, i) => {
          const srcMidY = n.y + nodeH / 2;
          const bandH = geoH / inputs.length;
          const dstMidY = geoCY - geoH / 2 + i * bandH + bandH / 2;
          const halfSrc = nodeH / 2;
          const halfDst = bandH / 2;
          const cp1x = leftX + nodeW + (rightX - leftX - nodeW) * 0.4;
          const cp2x = leftX + nodeW + (rightX - leftX - nodeW) * 0.6;
          const isHov = hovered === i;

          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {/* Band */}
              <path
                d={`M ${leftX + nodeW} ${srcMidY - halfSrc}
                    C ${cp1x} ${srcMidY - halfSrc}, ${cp2x} ${dstMidY - halfDst}, ${rightX} ${dstMidY - halfDst}
                    L ${rightX} ${dstMidY + halfDst}
                    C ${cp2x} ${dstMidY + halfDst}, ${cp1x} ${srcMidY + halfSrc}, ${leftX + nodeW} ${srcMidY + halfSrc} Z`}
                fill={n.color} opacity={isHov ? 0.35 : 0.18}
                style={{ transition: 'opacity 0.2s' }}
              />
              {/* Source node */}
              <rect x={leftX} y={n.y} width={nodeW} height={nodeH} rx={6} fill={n.color} opacity={isHov ? 1 : 0.9} />
              {/* Label */}
              <text x={leftX - 10} y={n.y + nodeH / 2 - 6} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 14, fill: '#111827', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.label}</text>
              <text x={leftX - 10} y={n.y + nodeH / 2 + 10} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 12, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.value}</text>
              {/* Weight % */}
              <text x={(leftX + nodeW + rightX) / 2} y={srcMidY + 2} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 600, opacity: isHov ? 1 : 0.8 }}>{n.weight}%</text>
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect x={(leftX + nodeW + rightX) / 2 - 70} y={srcMidY - 32} width={140} height={26} rx={6} fill="#1F2937" />
                  <text x={(leftX + nodeW + rightX) / 2} y={srcMidY - 19} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'white', fontFamily: 'Inter,sans-serif' }}>
                    {n.label}: {n.value} · weight {n.weight}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* GEO node */}
        <rect x={rightX} y={geoCY - geoH / 2} width={nodeW} height={geoH} rx={6} fill="#7C3AED" />
        <text x={rightX + nodeW + 16} y={geoCY - 16} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 14, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>GEO Score</text>
        <text x={rightX + nodeW + 16} y={geoCY + 14} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 32, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', fontWeight: 900 }}>{geo}</text>
      </svg>
    </div>
  );
}

// ── LINK ANALYSIS — pure SVG, crisp, interactive ─────────────
function LinkAnalysis({ result }: { result: any }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const brand = result.brand_name || 'Brand';
  const competitors = (result.competitors || []).slice(0, 4);
  const sources = (result.citation_sources || []).slice(0, 4);

  const W = 800, H = 480;
  const cx = W / 2, cy = H / 2 - 10;

  type NodeDef = { id: string; x: number; y: number; label: string; sublabel?: string; color: string; fillColor: string; r: number; type: string };
  const nodes: NodeDef[] = [];

  nodes.push({ id: 'brand', x: cx, y: cy, label: brand.length > 10 ? brand.slice(0, 9) + '…' : brand, sublabel: brand, color: '#7C3AED', fillColor: '#7C3AED', r: 44, type: 'brand' });

  // Competitors on left arc
  const compAngles = competitors.length === 1 ? [Math.PI] : competitors.map((_: any, i: number) => Math.PI * 0.55 + (i / (competitors.length - 1)) * Math.PI * 0.9);
  competitors.forEach((c: any, i: number) => {
    const a = compAngles[i];
    nodes.push({ id: `comp-${i}`, x: cx + 210 * Math.cos(a), y: cy - 170 * Math.sin(a), label: c.Brand?.length > 12 ? c.Brand.slice(0, 11) + '…' : c.Brand, sublabel: c.Brand, color: '#8B5CF6', fillColor: '#C4B5FD', r: 26, type: 'competitor' });
  });

  // Sources on right arc
  const srcAngles = sources.length === 1 ? [0] : sources.map((_: any, i: number) => -Math.PI * 0.3 + (i / (sources.length - 1)) * Math.PI * 0.75);
  sources.forEach((s: any, i: number) => {
    const a = srcAngles[i];
    const domain = (s.domain || '').split('.')[0];
    nodes.push({ id: `src-${i}`, x: cx + 220 * Math.cos(a), y: cy - 150 * Math.sin(a), label: domain, sublabel: s.domain, color: '#10B981', fillColor: '#6EE7B7', r: 22, type: 'source' });
  });

  const center = nodes[0];

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px', marginTop: 24 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>AI Citation Network</div>
      <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Brands and sources co-cited with {brand} in AI responses</div>
      <div style={{ background: '#F8FAFC', borderRadius: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          {/* Edges */}
          {nodes.slice(1).map(n => {
            const isHov = hovered === n.id || hovered === 'brand';
            return (
              <line key={n.id}
                x1={center.x} y1={center.y} x2={n.x} y2={n.y}
                stroke={n.type === 'competitor' ? '#C4B5FD' : '#6EE7B7'}
                strokeWidth={isHov ? 2 : 1.2}
                opacity={hovered && !isHov ? 0.2 : 0.7}
                style={{ transition: 'all 0.2s' }}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map(n => {
            const isHov = hovered === n.id;
            return (
              <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                {/* Glow ring on hover */}
                {isHov && <circle cx={n.x} cy={n.y} r={n.r + 8} fill={n.color} opacity={0.15} />}
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.fillColor} opacity={hovered && !isHov ? 0.4 : 1} style={{ transition: 'all 0.2s' }} />
                {/* Label inside brand node */}
                {n.type === 'brand' && (
                  <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: 'white', fontFamily: 'Inter,sans-serif', fontWeight: 700, pointerEvents: 'none' }}>{n.label}</text>
                )}
                {/* Label below other nodes */}
                {n.type !== 'brand' && (
                  <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 500, pointerEvents: 'none' }}>{n.label}</text>
                )}
                {/* Brand name below brand node */}
                {n.type === 'brand' && (
                  <text x={n.x} y={n.y + n.r + 16} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 600, pointerEvents: 'none' }}>{brand}</text>
                )}
                {/* Hover tooltip */}
                {isHov && n.type !== 'brand' && (
                  <g>
                    <rect x={n.x - 60} y={n.y - n.r - 30} width={120} height={22} rx={5} fill="#1F2937" />
                    <text x={n.x} y={n.y - n.r - 19} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: 'white', fontFamily: 'Inter,sans-serif' }}>{n.sublabel}</text>
                  </g>
                )}
              </g>
            );
          })}
          {/* Legend */}
          {[{ color: '#7C3AED', fill: '#7C3AED', label: 'Your Brand' }, { color: '#8B5CF6', fill: '#C4B5FD', label: 'Competitors' }, { color: '#10B981', fill: '#6EE7B7', label: 'Sources' }].map((l, i) => (
            <g key={i} transform={`translate(${W / 2 - 180 + i * 130}, ${H - 28})`}>
              <circle cx={8} cy={0} r={8} fill={l.fill} />
              <text x={22} y={0} dominantBaseline="middle" style={{ fontSize: 12, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>{l.label}</text>
            </g>
          ))}
        </svg>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24, marginBottom: 24 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="visibility score" val={vis} color="#7C3AED" />
                    <MetricCard label="sentiment score" val={sent} color="#10B981" />
                    <MetricCard label="citation score" val={cit} color="#F59E0B" />
                    <MetricCard label="avg rank" val={avgRank} color="#3B82F6" />
                  </div>
                  <SankeyChart result={result} />
                  <LinkAnalysis result={result} />
                </div>
              );
            })()}

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
                      <thead><tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>{['Page', 'Path', 'Status'].map(h => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                      <tbody>{(result.internal_links || []).slice(0, 8).map((lk: any, i: number) => (<tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}><td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: 600, color: '#111827' }}>{lk.label}</td><td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#9CA3AF' }}>{lk.path}</td><td style={{ padding: '10px 14px' }}><span style={{ background: '#F3F4F6', color: '#9CA3AF', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>Detected</span></td></tr>))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

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
                      const cls = classifyDomain(s.domain); const bw = Math.min(s.citation_share * 3, 100);
                      return (
                        <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, width: 18 }}>{s.rank}</span>
                            <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=14`} width={14} height={14} alt="" />
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', flex: 1 }}>{s.domain}</span>
                            <span style={{ background: cls.bg, color: cls.color, borderRadius: 50, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600 }}>{cls.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, width: 80, overflow: 'hidden' }}><div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: bw }} /></div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED' }}>{s.citation_share}%</span>
                            </div>
                          </div>
                          {s.top_pages?.length > 0 && (<div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #F3F4F6' }}>{s.top_pages.slice(0, 3).map((pg: string, j: number) => <div key={j} style={{ fontSize: '0.75rem', color: '#7C3AED', padding: '2px 0' }}>{pg}</div>)}</div>)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 5 && (() => {
              const rd = result.responses_detail || [];
              const cats = ['All', ...Array.from(new Set(rd.map((r: any) => r.category))) as string[]];
              const filtered = rd.filter((r: any) => filterCat === 'All' || r.category === filterCat).slice(0, 10);
              const catStats: Record<string, { total: number; mentioned: number }> = {};
              rd.forEach((r: any) => { if (!catStats[r.category]) catStats[r.category] = { total: 0, mentioned: 0 }; catStats[r.category].total++; if (r.mentioned) catStats[r.category].mentioned++; });
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {Object.entries(catStats).map(([c, v]) => (
                      <div key={c} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginBottom: 6 }}>{c}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, flex: 1, overflow: 'hidden' }}><div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: `${Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%` }} /></div><span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED' }}>{Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%</span></div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{v.mentioned} of {v.total} queries</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}><select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem', color: '#374151', background: 'white', outline: 'none' }}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Top 10 Prompts</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Generic consumer questions. No brand name used.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>{['#', 'Query', 'Rank'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}</tr></thead>
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
                              <td style={{ padding: '10px 16px', textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 800, color: rc }}>{rd2}</div><div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Rank</div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab === 6 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46', marginBottom: 16 }}>What is Working Well</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (<li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0FDF4' }}><span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span></li>))}</ul>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9F1239', marginBottom: 16 }}>What Needs Improvement</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{(result.improvements_list || []).slice(0, 5).map((w: string, i: number) => (<li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #FFF1F2' }}><span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>x</span><span>{w}</span></li>))}</ul>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Priority Actions</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>Each action mapped to the relevant Accenture workstream deliverable.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', borderBottom: '2px solid #E5E7EB', paddingBottom: 8, marginBottom: 4 }}>{['Priority', 'Action', 'Linked Deliverable'].map(h => <div key={h} style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</div>)}</div>
                  {(result.actions || []).map((a: any, i: number) => {
                    const dm: Record<string, [string, string]> = { High: ['Workstream 01: ARD', 'AXO Baseline Report and Brand Ranking Index'], Medium: ['Workstream 02: AOP', 'LLM-Ready Content Package and Content Influence Blueprint'], Low: ['Workstream 03: DTI', 'Schema Optimization Guide and Metadata Remediation Plan'] };
                    const priBg: Record<string, string> = { High: '#FEE2E2', Medium: '#FEF3C7', Low: '#DCFCE7' };
                    const priTc: Record<string, string> = { High: '#991B1B', Medium: '#92400E', Low: '#166534' };
                    const [pk, deliv] = dm[a.priority] || ['', ''];
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 0, borderBottom: '1px solid #F3F4F6', padding: '14px 0', alignItems: 'start' }}>
                        <div><span style={{ background: priBg[a.priority], color: priTc[a.priority], borderRadius: 4, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{a.priority}</span></div>
                        <div style={{ fontSize: '0.84rem', color: '#374151', paddingRight: 16 }}>{a.action}</div>
                        <div><span style={{ background: '#EDE9FE', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600 }}>{pk}</span><div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>{deliv}</div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0 10px' }}><div style={{ background: '#F4F4F4', color: '#111827', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '60%', fontSize: '0.95rem' }}>{item.q}</div></div>
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.a}</div>
                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />
                  </div>
                ))}
                {promptHistory.length > 0 && <button onClick={() => setPromptHistory([])} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, color: '#6B7280', fontSize: '0.78rem', padding: '6px 14px', cursor: 'pointer' }}>Clear history</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
