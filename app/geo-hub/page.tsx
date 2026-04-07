'use client';

import { useState } from 'react';

// ── CONSTANTS ─────────────────────────────────────────────────
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

const TABS = ['GEO Score', 'Competitors', 'Visibility', 'Sentiment', 'Citations', 'Prompts', 'Recommendations', 'Live Prompt'];

function scoreBadge(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (score >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (score >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s => dl.includes(s))) return { label: 'Social', color: '#F59E0B', bg: '#FEF3C7' };
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s => dl.includes(s))) return { label: 'Institution', color: '#3B82F6', bg: '#DBEAFE' };
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s => dl.includes(s))) return { label: 'Earned Media', color: '#10B981', bg: '#D1FAE5' };
  return { label: 'Other', color: '#6B7280', bg: '#F3F4F6' };
}

// ── TOOLTIP ───────────────────────────────────────────────────
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

// ── METRIC CARD ───────────────────────────────────────────────
function MetricCard({ label, val, sub, color = '#7C3AED' }: { label: string; val: any; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 18px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}{METRIC_TIPS[label.toLowerCase()] && <Tooltip text={METRIC_TIPS[label.toLowerCase()]} />}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── GAUGE — fixed semicircle ──────────────────────────────────
function GeoGauge({ score, brand }: { score: number; brand: string }) {
  const badge = scoreBadge(score);
  const W = 360, H = 210;
  const cx = W / 2, cy = H - 20;
  const Ro = 155, Ri = 105;

  const toRad = (deg: number) => (Math.PI / 180) * deg;
  const pt = (deg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy - r * Math.sin(toRad(deg)),
  });

  // deg: 0=right, 90=top, 180=left → score 0 = 180deg, score 100 = 0deg
  const seg = (d0: number, d1: number, color: string) => {
    const p0o = pt(d0, Ro), p1o = pt(d1, Ro);
    const p0i = pt(d0, Ri), p1i = pt(d1, Ri);
    const lg = Math.abs(d1 - d0) > 180 ? 1 : 0;
    return <path d={`M${p0o.x},${p0o.y} A${Ro},${Ro} 0 ${lg} 0 ${p1o.x},${p1o.y} L${p1i.x},${p1i.y} A${Ri},${Ri} 0 ${lg} 1 ${p0i.x},${p0i.y}Z`} fill={color} stroke="white" strokeWidth="1.5" />;
  };

  // progress arc from 180deg down to score angle
  const scoreAngle = 180 - (score / 100) * 180;
  const progSeg = () => {
    if (score <= 0) return null;
    const d0 = 180, d1 = scoreAngle;
    const p0o = pt(d0, Ro - 1), p1o = pt(d1, Ro - 1);
    const p0i = pt(d0, Ri + 1), p1i = pt(d1, Ri + 1);
    const lg = score > 50 ? 1 : 0;
    return <path d={`M${p0o.x},${p0o.y} A${Ro-1},${Ro-1} 0 ${lg} 0 ${p1o.x},${p1o.y} L${p1i.x},${p1i.y} A${Ri+1},${Ri+1} 0 ${lg} 1 ${p0i.x},${p0i.y}Z`} fill="#6D28D9" opacity="0.95" />;
  };

  const needle = pt(scoreAngle, Ri + 4);
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 16px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 2 }}>{brand}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {seg(180, 136, '#FECACA')}
        {seg(136, 92, '#FEF08A')}
        {seg(92, 72, '#BAE6FD')}
        {seg(72, 0, '#BBF7D0')}
        {progSeg()}
        {ticks.map(t => {
          const a = 180 - (t / 100) * 180;
          const inner = pt(a, Ri - 5), outer = pt(a, Ro + 5), lbl = pt(a, Ro + 18);
          return (
            <g key={t}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#9CA3AF" strokeWidth="1" />
              <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{t}</text>
            </g>
          );
        })}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={8} fill="#111827" />
        <circle cx={cx} cy={cy} r={4} fill="white" />
        <text x={cx} y={cy - 28} textAnchor="middle" style={{ fontSize: 44, fontWeight: 900, fill: '#7C3AED', fontFamily: 'Inter,sans-serif' }}>{score}</text>
      </svg>
      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '5px 18px', fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
    </div>
  );
}

// ── SANKEY ────────────────────────────────────────────────────
function SankeyChart({ result }: { result: any }) {
  const [hov, setHov] = useState<number | null>(null);
  const vis = result.visibility ?? 0, cit = result.citation_share ?? 0;
  const sent = result.sentiment ?? 0, prom = result.prominence ?? 0;
  const sov = result.share_of_voice ?? 0, geo = result.overall_geo_score ?? 0;
  const inputs = [
    { label: 'Visibility', value: vis, color: '#7C3AED', weight: 30 },
    { label: 'Sentiment', value: sent, color: '#10B981', weight: 20 },
    { label: 'Prominence', value: prom, color: '#3B82F6', weight: 20 },
    { label: 'Citation', value: cit, color: '#F59E0B', weight: 15 },
    { label: 'Share of Voice', value: sov, color: '#EF4444', weight: 15 },
  ];
  const W = 520, H = 360, leftX = 180, rightX = 430, nodeW = 24, geoH = 150, geoCY = H / 2;
  const nodeH = 32, gap = 22, totalH = inputs.length * nodeH + (inputs.length - 1) * gap;
  const startY = (H - totalH) / 2;
  const nodes = inputs.map((n, i) => ({ ...n, y: startY + i * (nodeH + gap) }));
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px', flex: 1 }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>GEO Score Composition</div>
      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {nodes.map((n, i) => {
          const srcMid = n.y + nodeH / 2;
          const bandH = geoH / inputs.length;
          const dstMid = geoCY - geoH / 2 + i * bandH + bandH / 2;
          const cp1x = leftX + nodeW + (rightX - leftX - nodeW) * 0.4;
          const cp2x = leftX + nodeW + (rightX - leftX - nodeW) * 0.6;
          const hH = nodeH / 2, dH = bandH / 2;
          const isH = hov === i;
          return (
            <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
              <path d={`M${leftX+nodeW},${srcMid-hH} C${cp1x},${srcMid-hH} ${cp2x},${dstMid-dH} ${rightX},${dstMid-dH} L${rightX},${dstMid+dH} C${cp2x},${dstMid+dH} ${cp1x},${srcMid+hH} ${leftX+nodeW},${srcMid+hH}Z`}
                fill={n.color} opacity={isH ? 0.32 : 0.15} style={{ transition: 'opacity 0.2s' }} />
              <rect x={leftX} y={n.y} width={nodeW} height={nodeH} rx={5} fill={n.color} />
              <text x={leftX - 8} y={n.y + nodeH / 2 - 6} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 13, fill: '#111827', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.label}</text>
              <text x={leftX - 8} y={n.y + nodeH / 2 + 10} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 11, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.value}</text>
              <text x={(leftX + nodeW + rightX) / 2} y={srcMid + 2} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{n.weight}%</text>
            </g>
          );
        })}
        <rect x={rightX} y={geoCY - geoH / 2} width={nodeW} height={geoH} rx={5} fill="#7C3AED" />
        <text x={rightX + nodeW + 12} y={geoCY - 12} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 13, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>GEO Score</text>
        <text x={rightX + nodeW + 12} y={geoCY + 14} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 28, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', fontWeight: 900 }}>{geo}</text>
      </svg>
    </div>
  );
}

// ── BUSINESS IMPACT (Image 3) ─────────────────────────────────
function BusinessImpact({ result }: { result: any }) {
  const geo = result.overall_geo_score ?? 0;
  const brand = result.brand_name ?? 'Your Brand';
  const badge = scoreBadge(geo);
  const nextTier = geo >= 80 ? null : geo >= 70 ? { score: 80, label: 'Excellent' } : geo >= 45 ? { score: 70, label: 'Good' } : { score: 45, label: 'Needs Work' };
  const steps = [
    { title: 'Higher GEO Score', sub: '→ Stronger AI visibility' },
    { title: 'Stronger AI Visibility', sub: '→ More surfaces where brand is recommended' },
    { title: 'More Surfaces', sub: '→ Higher organic traffic' },
    { title: 'Higher Traffic', sub: '→ More conversions' },
    { title: 'More Conversions', sub: '→ More revenue' },
  ];
  return (
    <div style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '24px 28px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.1rem' }}>↗</span>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>What does this score mean for your business?</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #DDD6FE', padding: '8px 14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED' }}>{s.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#7C3AED' }}>{s.sub}</div>
            </div>
            {i < steps.length - 1 && <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>→</span>}
          </div>
        ))}
      </div>
      {nextTier && (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #DDD6FE', padding: '14px 18px', fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: '#7C3AED' }}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate — directly increasing brand surfacing per AI query. Each tier jump reflects a materially higher chance AI recommends your brand first.
        </div>
      )}
    </div>
  );
}

// ── LINK ANALYSIS ─────────────────────────────────────────────
function LinkAnalysis({ result }: { result: any }) {
  const [hov, setHov] = useState<string | null>(null);
  const brand = result.brand_name || 'Brand';
  const competitors = (result.competitors || []).slice(0, 4);
  const sources = (result.citation_sources || []).slice(0, 4);
  const W = 700, H = 440, cx = W / 2, cy = H / 2 - 10;

  type N = { id: string; x: number; y: number; label: string; full: string; r: number; fill: string; stroke: string; type: string; pct?: number };
  const nodes: N[] = [];
  nodes.push({ id: 'brand', x: cx, y: cy, label: brand.length > 10 ? brand.slice(0, 9) + '…' : brand, full: brand, r: 42, fill: '#7C3AED', stroke: '#7C3AED', type: 'brand' });

  const cAngles = competitors.map((_: any, i: number) => Math.PI * 0.6 + (i / Math.max(competitors.length - 1, 1)) * Math.PI * 0.85);
  competitors.forEach((c: any, i: number) => {
    nodes.push({ id: `c${i}`, x: cx + 210 * Math.cos(cAngles[i]), y: cy - 165 * Math.sin(cAngles[i]), label: (c.Brand || '').length > 12 ? c.Brand.slice(0, 11) + '…' : c.Brand, full: c.Brand, r: 24, fill: '#C4B5FD', stroke: '#8B5CF6', type: 'competitor' });
  });

  const sAngles = sources.map((_: any, i: number) => -Math.PI * 0.25 + (i / Math.max(sources.length - 1, 1)) * Math.PI * 0.65);
  sources.forEach((s: any, i: number) => {
    const dom = (s.domain || '').split('.')[0];
    nodes.push({ id: `s${i}`, x: cx + 215 * Math.cos(sAngles[i]), y: cy - 155 * Math.sin(sAngles[i]), label: dom, full: s.domain, r: 20, fill: '#6EE7B7', stroke: '#10B981', type: 'source', pct: s.citation_share });
  });

  const center = nodes[0];
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px', marginTop: 24 }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>AI Citation Network</div>
      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 12 }}>Brands and sources co-cited with {brand} in AI responses</div>
      <div style={{ background: '#F8FAFC', borderRadius: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          {nodes.slice(1).map(n => (
            <line key={n.id} x1={center.x} y1={center.y} x2={n.x} y2={n.y}
              stroke={n.type === 'competitor' ? '#C4B5FD' : '#6EE7B7'}
              strokeWidth={hov === n.id || hov === 'brand' ? 2 : 1.2}
              opacity={hov && hov !== n.id && hov !== 'brand' ? 0.15 : 0.65}
              style={{ transition: 'all 0.2s' }} />
          ))}
          {nodes.map(n => {
            const isH = hov === n.id;
            return (
              <g key={n.id} onMouseEnter={() => setHov(n.id)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
                {isH && <circle cx={n.x} cy={n.y} r={n.r + 8} fill={n.stroke} opacity="0.15" />}
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} opacity={hov && !isH && hov !== 'brand' ? 0.35 : 1} style={{ transition: 'all 0.2s' }} />
                {n.type === 'brand' && <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'white', fontFamily: 'Inter,sans-serif', fontWeight: 700, pointerEvents: 'none' }}>{n.label}</text>}
                {n.type !== 'brand' && <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 500, pointerEvents: 'none' }}>{n.label}</text>}
                {n.type === 'brand' && <text x={n.x} y={n.y + n.r + 16} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 600, pointerEvents: 'none' }}>{brand}</text>}
                {n.type === 'source' && n.pct != null && (
                  <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: '#065F46', fontFamily: 'Inter,sans-serif', fontWeight: 700, pointerEvents: 'none' }}>{n.pct}%</text>
                )}
                {isH && n.type !== 'brand' && (
                  <g>
                    <rect x={n.x - 55} y={n.y - n.r - 28} width={110} height={20} rx={5} fill="#1F2937" />
                    <text x={n.x} y={n.y - n.r - 18} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: 'white', fontFamily: 'Inter,sans-serif' }}>{n.full}</text>
                  </g>
                )}
              </g>
            );
          })}
          {[{ fill: '#7C3AED', label: 'Your Brand' }, { fill: '#C4B5FD', label: 'Competitors' }, { fill: '#6EE7B7', label: 'Sources' }].map((l, i) => (
            <g key={i} transform={`translate(${W / 2 - 160 + i * 120}, ${H - 24})`}>
              <circle cx={8} cy={0} r={7} fill={l.fill} />
              <text x={20} y={0} dominantBaseline="middle" style={{ fontSize: 11, fill: '#374151', fontFamily: 'Inter,sans-serif' }}>{l.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── MARKDOWN RENDERER ─────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.8 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
        // Bold **text**
        const renderBold = (t: string) => {
          const parts = t.split(/\*\*(.*?)\*\*/g);
          return parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);
        };
        // Heading ##
        if (line.startsWith('## ')) return <div key={i} style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 12, marginBottom: 4 }}>{renderBold(line.slice(3))}</div>;
        if (line.startsWith('# ')) return <div key={i} style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginTop: 12, marginBottom: 4 }}>{renderBold(line.slice(2))}</div>;
        // Numbered list
        if (/^\d+\.\s/.test(line)) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>{line.match(/^\d+/)![0]}.</span><span>{renderBold(line.replace(/^\d+\.\s/, ''))}</span></div>;
        // Bullet
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 8 }}><span style={{ color: '#7C3AED', flexShrink: 0 }}>•</span><span>{renderBold(line.slice(2))}</span></div>;
        // Indent bullet
        if (line.startsWith('  - ') || line.startsWith('    - ')) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 24 }}><span style={{ color: '#9CA3AF', flexShrink: 0 }}>–</span><span>{renderBold(line.replace(/^\s+[-•]\s/, ''))}</span></div>;
        return <p key={i} style={{ margin: '4px 0' }}>{renderBold(line)}</p>;
      })}
    </div>
  );
}

// ── RADAR CHART (Sentiment tab) ───────────────────────────────
function RadarChart({ sent, prom, vis }: { sent: number; prom: number; vis: number }) {
  const dims = [
    { label: 'Positivity', val: sent },
    { label: 'Authority', val: Math.round(sent * 0.85) },
    { label: 'Trust', val: Math.round(vis * 0.9) },
    { label: 'Relevance', val: Math.round(prom * 0.95) },
    { label: 'Clarity', val: Math.round(sent * 0.75) },
    { label: 'Recommendation', val: Math.round(vis * 0.8) },
  ];
  const cx = 160, cy = 160, R = 110, n = dims.length;
  const angle = (i: number) => (Math.PI / 2) - (2 * Math.PI * i) / n;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy - r * Math.sin(angle(i)) });
  const rings = [25, 50, 75, 100];
  const polyPts = dims.map((d, i) => pt(i, (d.val / 100) * R));
  const polyStr = polyPts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 320 }}>
      {rings.map(r => {
        const pts = dims.map((_, i) => pt(i, (r / 100) * R));
        return <polygon key={r} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1" />;
      })}
      {dims.map((_, i) => { const p = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1" />; })}
      <polygon points={polyStr} fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="2" />
      {dims.map((d, i) => { const lp = pt(i, R + 20); return <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: '#374151', fontFamily: 'Inter,sans-serif' }}>{d.label}</text>; })}
    </svg>
  );
}

// ── VISIBILITY BAR CHART (Image 5) ───────────────────────────
function VisibilityBars({ brand, vis, competitors }: { brand: string; vis: number; competitors: any[] }) {
  const all = [{ Brand: brand, Vis: vis, isYou: true }, ...competitors.map(c => ({ Brand: c.Brand, Vis: c.Vis, isYou: false }))].sort((a, b) => b.Vis - a.Vis);
  const max = Math.max(...all.map(a => a.Vis), 1);
  return (
    <div>
      {all.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 18, fontSize: '0.8rem', color: a.isYou ? '#7C3AED' : '#9CA3AF', fontWeight: a.isYou ? 700 : 400 }}>{i + 1}</div>
          <div style={{ width: 140, fontSize: '0.85rem', color: '#374151', fontWeight: a.isYou ? 700 : 400 }}>
            {a.Brand}{a.isYou && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>← You</span>}
          </div>
          <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 50, height: 8, overflow: 'hidden' }}>
            <div style={{ background: a.isYou ? '#7C3AED' : '#D1D5DB', height: 8, borderRadius: 50, width: `${(a.Vis / max) * 100}%`, transition: 'width 0.6s' }} />
          </div>
          <div style={{ width: 32, fontSize: '0.85rem', fontWeight: 700, color: a.isYou ? '#7C3AED' : '#374151', textAlign: 'right' as const }}>{a.Vis}</div>
        </div>
      ))}
    </div>
  );
}

// ── SCATTER PLOT ──────────────────────────────────────────────
function ScatterPlot({ brand, vis, geo, competitors }: { brand: string; vis: number; geo: number; competitors: any[] }) {
  const all = [{ label: brand, x: vis, y: geo, isYou: true }, ...competitors.map(c => ({ label: c.Brand, x: c.Vis, y: c.GEO, isYou: false }))];
  const W = 400, H = 240, pad = 40;
  const xMax = Math.max(...all.map(a => a.x), 100);
  const sx = (v: number) => pad + (v / xMax) * (W - pad * 2);
  const sy = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const avgX = Math.round(all.reduce((s, a) => s + a.x, 0) / all.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#E5E7EB" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#E5E7EB" strokeWidth="1" />
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={pad} y1={sy(v)} x2={W - pad} y2={sy(v)} stroke="#F3F4F6" strokeWidth="1" />
          <text x={pad - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{v}</text>
        </g>
      ))}
      <line x1={sx(avgX)} y1={pad} x2={sx(avgX)} y2={H - pad} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4,4" />
      <text x={sx(avgX) + 4} y={pad + 10} style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>avg {avgX}</text>
      {all.map((a, i) => (
        <g key={i}>
          <circle cx={sx(a.x)} cy={sy(a.y)} r={a.isYou ? 7 : 5} fill={a.isYou ? '#7C3AED' : '#D1D5DB'} />
        </g>
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>Visibility</text>
      <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90, 10, ${H/2})`} style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>GEO</text>
    </svg>
  );
}

// ── CITATION PIE ──────────────────────────────────────────────
function CitationPie({ sources }: { sources: any[] }) {
  if (!sources || sources.length === 0) return null;
  const cx = 110, cy = 110, R = 90;
  const colors = ['#7C3AED','#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#EC4899'];
  let cumAngle = -Math.PI / 2;
  const slices = sources.map((s, i) => {
    const angle = (s.citation_share / 100) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle), y1 = cy + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + R * Math.cos(cumAngle), y2 = cy + R * Math.sin(cumAngle);
    const midA = cumAngle - angle / 2;
    const lx = cx + (R + 20) * Math.cos(midA), ly = cy + (R + 20) * Math.sin(midA);
    const large = angle > Math.PI ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2}Z`, lx, ly, share: s.citation_share, color: colors[i % colors.length] };
  });
  return (
    <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: 220 }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth="1.5" />
          {s.share >= 8 && <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#374151', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{s.share}%</text>}
        </g>
      ))}
    </svg>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
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
      if (data.error) setError(data.error); else { setResult(data); setActiveTab(0); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function runPrompt() {
    if (!promptInput.trim()) return;
    setPromptLoading(true);
    const q = promptInput; setPromptInput('');
    try {
      const res = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: q }) });
      const data = await res.json();
      setPromptHistory(h => [{ q, a: data.response }, ...h]);
    } catch {}
    setPromptLoading(false);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)', padding: '64px 40px 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 50, padding: '8px 24px', fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: 32, background: 'rgba(255,255,255,0.15)' }}>✦ &nbsp;Real Time GEO Scoring</div>
        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>GEO Scorecard</h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 20px' }}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '8px 22px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.12)' }}>⏱ &nbsp;Live data · Updated in real-time · Not cached like competitors</div>
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
              <button key={i} onClick={() => setActiveTab(i)} style={{ background: 'none', border: 'none', borderBottom: activeTab === i ? '2px solid #7C3AED' : '2px solid transparent', color: activeTab === i ? '#7C3AED' : '#6B7280', fontWeight: activeTab === i ? 700 : 500, fontSize: '0.85rem', padding: '12px 20px', cursor: 'pointer', transition: 'all 0.15s' }}>{t}</button>
            ))}
            <button onClick={() => { setResult(null); setUrl(''); }} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, color: '#6B7280', fontSize: '0.78rem', padding: '6px 14px', cursor: 'pointer', alignSelf: 'center' }}>← New Analysis</button>
          </div>

          <div style={{ padding: '32px 40px 60px' }}>

            {/* ── TAB 0: GEO SCORE ── */}
            {activeTab === 0 && (() => {
              const geo = result.overall_geo_score, badge = scoreBadge(geo);
              const vis = result.visibility, cit = result.citation_share, sent = result.sentiment;
              const prom = result.prominence, sov = result.share_of_voice, avgRank = result.avg_rank;
              const issues = [
                cit < 40 ? `Citation (${cit}): rarely top pick` : null,
                prom < 40 ? `Prominence (${prom}): typically mentioned mid-list rather than first` : null,
                sov < 20 ? `Share of Voice (${sov}), competitors are dominating more of the AI conversation` : null,
                sent < 40 ? `Sentiment (${sent}): lacks positive endorsement` : null,
              ].filter(Boolean);
              const summaryText = issues.length > 0
                ? `GEO Score of ${geo} reflects ${vis}% Visibility but is held back by ${issues.join('; ')}.`
                : `GEO Score of ${geo} reflects ${vis}% Visibility. Strong performance across all metrics.`;
              return (
                <div>
                  {/* Top: gauge + summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, marginBottom: 20 }}>
                    <GeoGauge score={geo} brand={result.brand_name} />
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 32px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 6 }}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontSize: '0.84rem' }}>{result.page_url?.slice(0, 60)}{result.page_url?.length > 60 ? '...' : ''}</a>
                      <div style={{ margin: '12px 0 6px', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>Status</div>
                      <span style={{ background: badge.bg, color: badge.color, padding: '5px 16px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
                      <div style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.8, borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 14 }}>{summaryText}</div>
                    </div>
                  </div>
                  {/* Metrics row — 4 in one row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="visibility score" val={vis} color="#7C3AED" />
                    <MetricCard label="sentiment score" val={sent} color="#10B981" />
                    <MetricCard label="citation score" val={cit} color="#F59E0B" />
                    <MetricCard label="avg rank" val={avgRank} color="#3B82F6" />
                  </div>
                  {/* Sankey + Business Impact side by side */}
                  <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                    <SankeyChart result={result} />
                    <BusinessImpact result={result} />
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 1: COMPETITORS (Image 4) ── */}
            {activeTab === 1 && (() => {
              const geo = result.overall_geo_score, vis = result.visibility, cit = result.citation_share;
              const sent = result.sentiment, sov = result.share_of_voice, avgRank = result.avg_rank;
              const top = [
                { Brand: result.brand_name, URL: result.domain, GEO: geo, Vis: vis, Cit: cit, Sen: sent, Sov: sov, Rank: avgRank, isYou: true },
                ...(result.competitors || []).map((c: any) => ({ ...c, isYou: false }))
              ].sort((a, b) => b.GEO - a.GEO);
              const myRank = top.findIndex(c => c.isYou) + 1;
              const leader = top[0];
              const gapToTop = myRank === 1 ? 0 : geo - leader.GEO;
              const next = top[myRank] || null;
              const leadOver = next ? geo - next.GEO : null;

              // Bar chart data
              const barW = 600, barH = 220, barPad = 40, grpW = (barW - barPad * 2) / top.length, barMaxH = barH - barPad * 2;
              const maxV = Math.max(...top.map(c => Math.max(c.GEO, c.Vis, c.Cit)));

              return (
                <div>
                  {/* Summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
                    <div style={{ background: '#F5F3FF', borderRadius: 14, border: '1px solid #DDD6FE', padding: '20px 24px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600, marginBottom: 6 }}>Your Rank</div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#7C3AED' }}>#{myRank}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>out of {top.length} competitors</div>
                    </div>
                    <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FCD34D', padding: '20px 24px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 600, marginBottom: 6 }}>Gap to #1 ({leader.Brand})</div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#92400E' }}>{gapToTop === 0 ? '—' : `${gapToTop} pts`}</div>
                      <div style={{ fontSize: '0.78rem', color: '#92400E' }}>{myRank === 1 ? 'You are the leader' : Math.abs(gapToTop) <= 5 ? 'Close — strong opportunity to overtake' : 'Gap to close'}</div>
                    </div>
                    <div style={{ background: '#ECFDF5', borderRadius: 14, border: '1px solid #6EE7B7', padding: '20px 24px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#065F46', fontWeight: 600, marginBottom: 6 }}>{next ? `Lead over #${myRank + 1} (${next.Brand})` : 'Top Ranked'}</div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#065F46' }}>{leadOver != null ? `+${leadOver} pts` : '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#065F46' }}>{leadOver != null ? (leadOver < 10 ? 'Close — defend this position' : 'Comfortable but not safe') : 'Leading the category'}</div>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24 }}>
                    <svg viewBox={`0 0 ${barW} ${barH + 40}`} style={{ width: '100%', display: 'block' }}>
                      {[0, 25, 50, 75, 100].map(v => (
                        <g key={v}>
                          <line x1={barPad} y1={barH - barPad - (v / 100) * barMaxH} x2={barW - barPad} y2={barH - barPad - (v / 100) * barMaxH} stroke="#F3F4F6" strokeWidth="1" />
                          <text x={barPad - 4} y={barH - barPad - (v / 100) * barMaxH} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{v}</text>
                        </g>
                      ))}
                      {top.map((c, i) => {
                        const bx = barPad + i * grpW + grpW * 0.1;
                        const bw2 = grpW * 0.25;
                        const geoh = (c.GEO / 100) * barMaxH, vish = (c.Vis / 100) * barMaxH, cith = (c.Cit / 100) * barMaxH;
                        const isY = c.isYou;
                        return (
                          <g key={i}>
                            <rect x={bx} y={barH - barPad - geoh} width={bw2} height={geoh} fill={isY ? '#1F2937' : '#E5E7EB'} rx={2} />
                            <rect x={bx + bw2 + 2} y={barH - barPad - vish} width={bw2} height={vish} fill={isY ? '#7C3AED' : '#A5B4FC'} rx={2} />
                            <rect x={bx + bw2 * 2 + 4} y={barH - barPad - cith} width={bw2} height={cith} fill={isY ? '#C4B5FD' : '#DDD6FE'} rx={2} />
                            <text x={bx + bw2 * 1.5} y={barH - barPad + 14} textAnchor="middle" style={{ fontSize: 9, fill: isY ? '#7C3AED' : '#6B7280', fontFamily: 'Inter,sans-serif', fontWeight: isY ? 700 : 400 }}>{c.Brand.split(' ')[0]}</text>
                          </g>
                        );
                      })}
                      <g transform={`translate(${barW / 2 - 80}, ${barH + 20})`}>
                        {[{ color: '#1F2937', label: 'GEO' }, { color: '#7C3AED', label: 'Visibility' }, { color: '#C4B5FD', label: 'Citations' }].map((l, i) => (
                          <g key={i} transform={`translate(${i * 80}, 0)`}>
                            <rect x={0} y={-6} width={12} height={12} fill={l.color} rx={2} />
                            <text x={16} y={0} dominantBaseline="middle" style={{ fontSize: 10, fill: '#374151', fontFamily: 'Inter,sans-serif' }}>{l.label}</text>
                          </g>
                        ))}
                      </g>
                    </svg>
                  </div>

                  {/* Table */}
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>{result.domain} vs Competitors — {result.ind_label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Real-time GEO scores. Highlighted row is you.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA' }}>
                          {['#', 'BRAND / URL', 'GEO SCORE', 'GAP', 'VISIBILITY', 'CITATIONS', 'SENTIMENT', 'SOV', 'AVG. RANK'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {top.map((c: any, i: number) => {
                          const gcol = c.GEO >= 80 ? '#10B981' : c.GEO >= 60 ? '#7C3AED' : '#374151';
                          const gap2 = c.isYou ? null : c.GEO - geo;
                          return (
                            <tr key={i} style={{ background: c.isYou ? '#F5F3FF' : 'white', borderTop: '1px solid #F3F4F6', borderLeft: c.isYou ? '3px solid #7C3AED' : 'none' }}>
                              <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#9CA3AF' }}>{i + 1}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: c.isYou ? 700 : 600, color: '#111827' }}>{c.Brand}</div>
                                  {c.isYou && <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 6, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>You</span>}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.URL}</div>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: '1rem', fontWeight: 800, color: gcol }}>{c.GEO}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.82rem', fontWeight: 600, color: gap2 === null ? '#9CA3AF' : gap2 > 0 ? '#EF4444' : '#10B981' }}>
                                {gap2 === null ? '—' : `${gap2 > 0 ? '-' : '+'}${Math.abs(gap2)} pts`}
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Vis}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Cit}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Sen}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#374151' }}>{c.Sov}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.84rem', fontWeight: 600, color: '#7C3AED' }}>{c.Rank}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 2: VISIBILITY (Image 5) ── */}
            {activeTab === 2 && (() => {
              const vis = result.visibility, avgRank = result.avg_rank;
              const comps = result.competitors || [];
              const allVis = [vis, ...comps.map((c: any) => c.Vis)];
              const avgVis = Math.round(allVis.reduce((a: number, b: number) => a + b, 0) / allVis.length);
              const myVisRank = [vis, ...comps.map((c: any) => c.Vis)].sort((a, b) => b - a).indexOf(vis) + 1;
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#F5F3FF', borderRadius: 12, border: '1px solid #DDD6FE', padding: '20px 18px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#7C3AED', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Your Rank (Visibility)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7C3AED' }}>#{myVisRank}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>out of {allVis.length} institutions</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 18px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Your Score</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>{vis}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>vs industry avg {avgVis}</div>
                    </div>
                    <div style={{ background: '#ECFDF5', borderRadius: 12, border: '1px solid #6EE7B7', padding: '20px 18px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#065F46', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>vs. Industry Average</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#065F46' }}>{vis > avgVis ? '+' : ''}{vis - avgVis} pts</div>
                      <div style={{ fontSize: '0.75rem', color: '#065F46' }}>{vis > avgVis ? 'Above average' : 'Below average'}</div>
                    </div>
                  </div>

                  {/* Horizontal bar chart */}
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 24 }}>
                    <VisibilityBars brand={result.brand_name} vis={vis} competitors={result.competitors || []} />
                  </div>

                  {/* Scatter: GEO vs Visibility */}
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '24px 28px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>GEO Score vs. Visibility — Market Positioning</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Each dot = one institution. Your brand is highlighted in purple.</div>
                    <ScatterPlot brand={result.brand_name} vis={vis} geo={result.overall_geo_score} competitors={result.competitors || []} />
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 3: SENTIMENT (Image 6) ── */}
            {activeTab === 3 && (() => {
              const sent = result.sentiment, prom = result.prominence, avgRank = result.avg_rank, vis = result.visibility;
              const smood = sent >= 70 ? 'Positive — AI speaks favorably' : sent >= 45 ? 'Neutral — room to improve' : 'Needs attention';
              const pmood = prom >= 70 ? 'Named first — strong prominence' : prom >= 45 ? 'Mid-list mentions' : 'Buried in responses';
              // Simulated weekly trend
              const weeks = [sent - 8, sent - 6, sent - 7, sent - 4, sent - 2, sent].map((v, i) => ({ wk: `Wk ${i + 1}`, val: Math.max(0, Math.min(100, v)) }));
              const minW = Math.min(...weeks.map(w => w.val)) - 5, maxW = Math.max(...weeks.map(w => w.val)) + 5;
              const wx = (i: number) => 40 + i * 60, wy = (v: number) => 100 - ((v - minW) / (maxW - minW)) * 80;
              const linePts = weeks.map((w, i) => `${wx(i)},${wy(w.val)}`).join(' ');
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="sentiment score" val={sent} sub={smood} color="#7C3AED" />
                    <MetricCard label="prominence score" val={prom} sub={pmood} color="#7C3AED" />
                    <MetricCard label="average rank" val={avgRank} sub="Average mention position in AI responses" color="#7C3AED" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    {/* Radar */}
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Sentiment Dimensions</div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <RadarChart sent={sent} prom={prom} vis={vis} />
                      </div>
                    </div>
                    {/* Line chart */}
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Sentiment Over Time</div>
                      <svg viewBox="0 0 400 130" style={{ width: '100%', display: 'block' }}>
                        {[minW, Math.round((minW + maxW) / 2), maxW].map(v => (
                          <g key={v}>
                            <line x1={30} y1={wy(v)} x2={370} y2={wy(v)} stroke="#F3F4F6" strokeWidth="1" />
                            <text x={26} y={wy(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{Math.round(v)}</text>
                          </g>
                        ))}
                        <polyline points={linePts} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinejoin="round" />
                        <polyline points={`${linePts} ${wx(5)},110 ${wx(0)},110`} fill="#7C3AED" fillOpacity="0.08" />
                        {weeks.map((w, i) => (
                          <g key={i}>
                            <circle cx={wx(i)} cy={wy(w.val)} r={3} fill="#7C3AED" />
                            <text x={wx(i)} y={118} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{w.wk}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #6EE7B7', padding: 24 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46', marginBottom: 14 }}>✓ Sentiment Strengths</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.84rem', color: '#374151' }}>
                            <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ background: '#FFF1F2', borderRadius: 14, border: '1px solid #FCA5A5', padding: 24 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#991B1B', marginBottom: 14 }}>✗ Areas of Concern</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(result.improvements_list || []).slice(0, 3).map((w: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.84rem', color: '#374151' }}>
                            <span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>✗</span><span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 4: CITATIONS (Image 7 + 8) ── */}
            {activeTab === 4 && (() => {
              const cit = result.citation_share, sov = result.share_of_voice;
              const sources = result.citation_sources || [];
              // Category breakdown
              const catMap: Record<string, number> = {};
              sources.forEach((s: any) => { const cl = classifyDomain(s.domain); catMap[cl.label] = (catMap[cl.label] || 0) + s.citation_share; });
              const catColors: Record<string, string> = { 'Earned Media': '#10B981', 'Owned Media': '#7C3AED', Other: '#6B7280', Social: '#F59E0B', Institution: '#3B82F6' };
              const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Citation Score</div>
                      <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#7C3AED' }}>{cit}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>How authoritatively your brand was cited</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Share of Voice</div>
                      <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#7C3AED' }}>{sov}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Your brand mentions as % of all mentions</div>
                    </div>
                  </div>
                  {sources.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                      {/* Pie chart */}
                      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Citation Share by Source</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><CitationPie sources={sources} /></div>
                      </div>
                      {/* Category bars */}
                      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Citation by Category</div>
                        {catEntries.map(([cat, pct], i) => (
                          <div key={i} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.84rem', color: '#374151' }}>{cat}</span>
                              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: catColors[cat] || '#374151' }}>{Math.round(pct)}%</span>
                            </div>
                            <div style={{ background: '#F3F4F6', borderRadius: 50, height: 6, overflow: 'hidden' }}>
                              <div style={{ background: catColors[cat] || '#7C3AED', height: 6, borderRadius: 50, width: `${Math.round(pct)}%`, transition: 'width 0.6s' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Sources table */}
                  {sources.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Sources AI is Pulling From — {result.brand_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>Domains that most influenced AI knowledge. Citation Share % = each source&apos;s contribution to total AI brand mentions.</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA' }}>
                            {['RANK', 'DOMAIN', 'CATEGORY', 'CITATION SHARE %'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((s: any, i: number) => {
                            const cls = classifyDomain(s.domain);
                            const bw = Math.min(s.citation_share * 3, 100);
                            return (
                              <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#9CA3AF' }}>{s.rank}</td>
                                <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 600, color: '#7C3AED' }}>{s.domain}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ background: cls.bg, color: cls.color, borderRadius: 8, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{cls.label}</span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 50, height: 6, overflow: 'hidden' }}>
                                      <div style={{ background: '#7C3AED', height: 6, borderRadius: 50, width: `${bw}%` }} />
                                    </div>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#7C3AED', width: 36 }}>{s.citation_share}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* AI Citation Network */}
                  <LinkAnalysis result={result} />
                </div>
              );
            })()}

            {/* ── TAB 5: PROMPTS (Image 9) ── */}
            {activeTab === 5 && (() => {
              const rd = result.responses_detail || [];
              const cats = ['All', ...Array.from(new Set(rd.map((r: any) => r.category))) as string[]];
              const filtered = rd.filter((r: any) => filterCat === 'All' || r.category === filterCat).slice(0, 10);
              const catStats: Record<string, { total: number; mentioned: number }> = {};
              rd.forEach((r: any) => { if (!catStats[r.category]) catStats[r.category] = { total: 0, mentioned: 0 }; catStats[r.category].total++; if (r.mentioned) catStats[r.category].mentioned++; });
              const totalMentions = rd.filter((r: any) => r.mentioned).length;
              const appearedFiltered = rd.filter((r: any) => (filterCat === 'All' || r.category === filterCat) && r.mentioned).length;
              const totalFiltered = rd.filter((r: any) => filterCat === 'All' || r.category === filterCat).length;
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <MetricCard label="queries run" val={20} sub="Generic consumer questions, no brand name" color="#7C3AED" />
                    <MetricCard label="appearances" val={`${totalMentions}/20`} sub="Shown queries where brand appeared" color="#7C3AED" />
                    <MetricCard label="appearance rate" val={`${Math.round((totalMentions / 20) * 100)}%`} sub="Of all AI queries triggered brand mention" color="#7C3AED" />
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 12 }}>Appearance Rate by Category</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {Object.entries(catStats).map(([c, v]) => (
                      <div key={c} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginBottom: 8 }}>{c}</div>
                        <div style={{ background: '#F3F4F6', borderRadius: 50, height: 5, marginBottom: 6, overflow: 'hidden' }}>
                          <div style={{ background: '#7C3AED', height: 5, borderRadius: 50, width: `${Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{v.mentioned} of {v.total} queries</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED' }}>{Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Queries Run ({filtered.length} shown)</div>
                      <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Generic consumer questions. Rank = actual position brand was mentioned within each AI response.</div>
                    </div>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem', color: '#374151', background: 'white', outline: 'none' }}>
                      {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA' }}>
                          {['#', 'QUERY', 'RANK'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item: any, i: number) => {
                          const rp = item.position, rd2 = rp > 0 ? `#${rp}` : 'N/A';
                          const rc = rp === 1 ? '#10B981' : rp <= 3 ? '#7C3AED' : item.mentioned ? '#7C3AED' : '#9CA3AF';
                          return (
                            <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#9CA3AF', verticalAlign: 'top' }}>{i + 1}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ background: '#EDE9FE', color: '#5B21B6', borderRadius: 6, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{item.category}</span>
                                  {item.mentioned
                                    ? <span style={{ color: '#10B981', fontSize: '0.78rem', fontWeight: 600 }}>✓ Appeared</span>
                                    : <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>— Not Mentioned</span>}
                                </div>
                                <div style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 500 }}>{item.query}</div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right' as const, fontSize: '1rem', fontWeight: 800, color: rc, verticalAlign: 'top' }}>{rd2}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 6: RECOMMENDATIONS (Image 10 + 11) ── */}
            {activeTab === 6 && (() => {
              const geo = result.overall_geo_score, brand = result.brand_name;
              const comps = result.competitors || [];
              const fin = result.ind_key === 'fin';
              const segments = fin ? [
                { name: 'General Consumers', status: 'Winning', color: '#10B981', bg: '#F0FDF4', border: '#6EE7B7', score: Math.round(geo * 0.9), dominated: 'Chase, Citi' },
                { name: 'Travelers / Rewards', status: 'Winning', color: '#10B981', bg: '#F0FDF4', border: '#6EE7B7', score: Math.round(geo * 1.1), dominated: 'Amex, Chase' },
                { name: 'Affluent / HNW', status: 'Gap', color: '#EF4444', bg: '#FFF1F2', border: '#FCA5A5', score: Math.round(geo * 0.45), dominated: 'Amex Centurion, Chase Sapphire' },
                { name: 'First-Time Users', status: 'Winning', color: '#10B981', bg: '#F0FDF4', border: '#6EE7B7', score: Math.round(geo * 0.95), dominated: 'Discover' },
                { name: 'Cashback Seekers', status: 'Gap', color: '#EF4444', bg: '#FFF1F2', border: '#FCA5A5', score: Math.round(geo * 0.5), dominated: 'Citi, Wells Fargo' },
                { name: 'Small Business', status: 'Gap', color: '#EF4444', bg: '#FFF1F2', border: '#FCA5A5', score: Math.round(geo * 0.35), dominated: 'Amex, Chase Ink' },
              ] : [
                { name: 'General Consumers', status: 'Winning', color: '#10B981', bg: '#F0FDF4', border: '#6EE7B7', score: Math.round(geo * 0.9), dominated: 'Top Competitors' },
                { name: 'Expert Seekers', status: 'Winning', color: '#10B981', bg: '#F0FDF4', border: '#6EE7B7', score: Math.round(geo * 1.0), dominated: 'Industry Leaders' },
                { name: 'Premium Segment', status: 'Gap', color: '#EF4444', bg: '#FFF1F2', border: '#FCA5A5', score: Math.round(geo * 0.5), dominated: 'Competitors' },
              ];
              return (
                <div>
                  {/* Segment Coverage */}
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Segment Coverage Analysis</div>
                  <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Which audience segments is your brand winning vs. losing in AI responses?</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
                    {segments.map((s, i) => (
                      <div key={i} style={{ background: s.bg, borderRadius: 14, border: `1px solid ${s.border}`, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: s.color }}>{s.name}</span>
                          <span style={{ background: s.status === 'Winning' ? '#D1FAE5' : '#FEE2E2', color: s.color, borderRadius: 50, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{s.status}</span>
                        </div>
                        <div style={{ background: s.status === 'Winning' ? '#D1FAE5' : '#FEE2E2', borderRadius: 50, height: 5, marginBottom: 8, overflow: 'hidden' }}>
                          <div style={{ background: s.color, height: 5, borderRadius: 50, width: `${Math.min(s.score, 100)}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: '#6B7280' }}>
                          <span style={{ fontWeight: 600 }}>Score: {s.score}</span>
                          <span>Dominated by: {s.dominated}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* GEO Health Summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.1rem' }}>⚡</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>GEO Health Summary</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Based on how your brand performed across 20 generic AI queries — no brand name was used.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                    <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #6EE7B7', padding: 24 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46', marginBottom: 14 }}>✓ What is Working Well</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.84rem', color: '#374151' }}>
                            <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ background: '#FFF1F2', borderRadius: 14, border: '1px solid #FCA5A5', padding: 24 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#991B1B', marginBottom: 14 }}>✗ What Needs Improvement</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(result.improvements_list || []).slice(0, 5).map((w: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.84rem', color: '#374151' }}>
                            <span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>✗</span><span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Priority Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1.1rem' }}>⚡</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Priority Actions — Implementable</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA' }}>
                          {['PRIORITY', 'SEGMENT', 'TYPE', 'ACTION TO TAKE', 'DELIVERABLE'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(result.actions || []).map((a: any, i: number) => {
                          const dm: Record<string, [string, string, string]> = {
                            High: ['#FEE2E2', '#991B1B', 'Workstream 01 — ARD'],
                            Medium: ['#FEF3C7', '#92400E', 'Workstream 02 — AOP'],
                            Low: ['#DCFCE7', '#166534', 'Workstream 03 — DT1'],
                          };
                          const [bg, tc, ws] = dm[a.priority] || ['#F3F4F6', '#374151', ''];
                          const seg = segments[i % segments.length];
                          return (
                            <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '16px 16px' }}><span style={{ background: bg, color: tc, borderRadius: 50, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700 }}>{a.priority}</span></td>
                              <td style={{ padding: '16px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#7C3AED' }}>{seg?.name}</td>
                              <td style={{ padding: '16px 16px', fontSize: '0.82rem', color: '#6B7280' }}>Content Page</td>
                              <td style={{ padding: '16px 16px', fontSize: '0.84rem', color: '#374151', maxWidth: 320 }}>{a.action}</td>
                              <td style={{ padding: '16px 16px', fontSize: '0.82rem', fontWeight: 600, color: '#7C3AED' }}>{ws}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 7: LIVE PROMPT ── */}
            {activeTab === 7 && (
              <div>
                <div style={{ background: '#7C3AED', borderRadius: 12, padding: '24px 28px', color: 'white', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Live AI Prompt Lab</h3>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Type any prompt and see exactly how GPT-4o responds in real time.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input type="text" value={promptInput} onChange={e => setPromptInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runPrompt()} placeholder="e.g. What is the best travel credit card for high net worth individuals?"
                    style={{ flex: 1, borderRadius: 12, border: '1.5px solid #E5E7EB', padding: '14px 18px', fontSize: '0.95rem', height: 52, background: 'white', outline: 'none' }} />
                  <button onClick={runPrompt} disabled={promptLoading}
                    style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', padding: '0 28px', height: 52, cursor: 'pointer', flexShrink: 0 }}>
                    Run Prompt
                  </button>
                </div>
                {promptLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F5F3FF', borderRadius: 10, padding: '12px 18px', marginBottom: 16, border: '1px solid #DDD6FE' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: '0.85rem', color: '#7C3AED', fontWeight: 500 }}>Running GPT-4o queries...</span>
                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
                  </div>
                )}
                {promptHistory.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0 12px' }}>
                      <div style={{ background: 'white', border: '1px solid #E5E7EB', color: '#374151', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '65%', fontSize: '0.92rem' }}>{item.q}</div>
                    </div>
                    <MarkdownText text={item.a} />
                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '20px 0' }} />
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
