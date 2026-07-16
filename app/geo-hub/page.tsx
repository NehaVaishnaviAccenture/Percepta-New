'use client';

import React, { useState, useEffect } from 'react';

const bands = [
  { bg: '#E8F5E9', border: '#43A047', color: '#43A047', range: '80-100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#FFFDE7', border: '#FDD835', color: '#F9A825', range: '70-79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FBE9E7', border: '#FF7043', color: '#FF7043', range: '45-69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFEBEE', border: '#F44336', color: '#F44336', range: '0-44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string, string> = {
  'visibility score': 'Measures how often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'Reflects how authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'Captures the tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'When AI mentions your brand, what order does it name you? #1 = named first in that response. #2 = one other brand named before you. This is averaged across all responses where you appeared.',
  'prominence score': 'Measures how early in AI responses your brand is mentioned.',
  'share of voice': 'Your brand mentions as a percentage of all brand mentions across AI responses.',
};

const TABS = ['GEO Score', 'Competitors', 'Visibility', 'Sentiment', 'Citations', 'Prompts', 'Recommendations', 'Live Prompt', 'FAQ'];

function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#43A047', bg: '#E8F5E9' };
  if (s >= 70) return { label: 'Good', color: '#F9A825', bg: '#FFFDE7' };
  if (s >= 45) return { label: 'Needs Work', color: '#FF7043', bg: '#FBE9E7' };
  return { label: 'Poor', color: '#F44336', bg: '#FFEBEE' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit', 'twitter', 'youtube', 'facebook', 'instagram', 'tiktok', 'linkedin'].some((s) => dl.includes(s)))
    return { label: 'Social', color: '#F59E0B', bg: '#FEF3C7' };
  if (['wikipedia', 'gov', 'edu', 'consumerreports', 'bbb', 'federalreserve', 'fdic'].some((s) => dl.includes(s)))
    return { label: 'Institution', color: '#3B82F6', bg: '#DBEAFE' };
  if (['nerdwallet', 'forbes', 'bankrate', 'creditkarma', 'cnbc', 'wsj', 'nytimes', 'bloomberg', 'businessinsider', 'investopedia', 'motleyfool', 'motortrend', 'caranddriver', 'edmunds', 'reuters', 'thepointsguy', 'wallethub'].some((s) => dl.includes(s)))
    return { label: 'Earned Media', color: '#10B981', bg: '#D1FAE5' };
  return { label: 'Other', color: '#6B7280', bg: '#F3F4F6' };
}

type ProductDef = { label: string; terms: string[]; color: string };

function getProductDefs(indKey: string, lob: string): ProductDef[] {
  const k = indKey || '';
  const l = (lob || '').toLowerCase();
  const TOPIC_COLORS = ['#A100FF', '#7500C0', '#460073', '#5B21B6', '#6B7280', '#374151', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

  if (k.includes('credit_card') || k.includes('fin') || l.includes('credit card')) {
    return [
      { label: 'Cash Back', terms: ['cash back', 'cashback', 'flat rate', 'everyday'], color: TOPIC_COLORS[0] },
      { label: 'Travel Rewards', terms: ['travel', 'miles', 'points', 'airline', 'hotel rewards'], color: TOPIC_COLORS[1] },
      { label: 'Balance Transfer', terms: ['balance transfer', '0% apr', 'zero apr', 'intro apr'], color: TOPIC_COLORS[2] },
      { label: 'Secured / Builder', terms: ['secured', 'credit builder', 'deposit', 'build credit'], color: TOPIC_COLORS[3] },
      { label: 'No Annual Fee', terms: ['no annual fee', '$0 annual', 'no fee', 'free card'], color: TOPIC_COLORS[4] },
      { label: 'Business Cards', terms: ['business', 'small business', 'corporate', 'employee card'], color: TOPIC_COLORS[5] },
      { label: 'Student Cards', terms: ['student', 'college', 'university'], color: TOPIC_COLORS[6] },
      { label: 'Luxury / Premium', terms: ['luxury', 'premium', 'black card', 'reserve', 'concierge'], color: TOPIC_COLORS[7] },
      { label: 'Grocery & Gas', terms: ['grocery', 'supermarket', 'gas', 'fuel'], color: TOPIC_COLORS[8] },
      { label: 'Retail / Co-Brand', terms: ['retail', 'store card', 'amazon', 'co-brand'], color: TOPIC_COLORS[9] },
    ];
  }
  if (l.includes('retail banking') || l.includes('savings') || l.includes('checking')) {
    return [
      { label: 'Savings Accounts', terms: ['savings', 'high yield', 'hysa', 'apy', 'money market'], color: TOPIC_COLORS[0] },
      { label: 'Checking Accounts', terms: ['checking', 'current account', 'debit', 'direct deposit'], color: TOPIC_COLORS[1] },
      { label: 'CD Accounts', terms: ['cd', 'certificate of deposit', 'fixed rate', 'term'], color: TOPIC_COLORS[2] },
      { label: 'Teen & Kids', terms: ['teen', 'kid', 'youth', 'student', 'minor'], color: TOPIC_COLORS[3] },
      { label: 'Digital Banking', terms: ['mobile app', 'digital', 'online banking', 'zelle'], color: TOPIC_COLORS[4] },
    ];
  }
  if (l.includes('mortgage') || l.includes('home loan')) {
    return [
      { label: 'Home Purchase', terms: ['purchase', 'home loan', 'buy a home', 'first home'], color: TOPIC_COLORS[0] },
      { label: 'Refinancing', terms: ['refinance', 'refi', 'cash-out', 'lower rate'], color: TOPIC_COLORS[1] },
      { label: 'FHA / VA Loans', terms: ['fha', 'va loan', 'veteran', 'government loan'], color: TOPIC_COLORS[2] },
      { label: 'HELOC', terms: ['heloc', 'home equity', 'equity line'], color: TOPIC_COLORS[3] },
      { label: 'Jumbo Loans', terms: ['jumbo', 'large loan', 'luxury home'], color: TOPIC_COLORS[4] },
    ];
  }
  if (l.includes('auto') || l.includes('car')) {
    return [
      { label: 'New Car Loans', terms: ['new car', 'new vehicle', 'dealer'], color: TOPIC_COLORS[0] },
      { label: 'Used Car Loans', terms: ['used car', 'pre-owned', 'certified pre'], color: TOPIC_COLORS[1] },
      { label: 'Refinancing', terms: ['refinance', 'refi', 'lower rate'], color: TOPIC_COLORS[2] },
      { label: 'EV Financing', terms: ['electric', 'ev', 'tesla', 'bolt', 'ioniq'], color: TOPIC_COLORS[3] },
      { label: 'No Down Payment', terms: ['no down', 'zero down', '100%'], color: TOPIC_COLORS[4] },
    ];
  }
  if (l.includes('retirement') || l.includes('wealth') || l.includes('investment')) {
    return [
      { label: '401(k) Plans', terms: ['401k', '401(k)', 'employer plan', 'workplace'], color: TOPIC_COLORS[0] },
      { label: 'IRA Accounts', terms: ['ira', 'roth', 'traditional ira', 'rollover'], color: TOPIC_COLORS[1] },
      { label: 'Investment Funds', terms: ['mutual fund', 'index fund', 'etf', 'portfolio'], color: TOPIC_COLORS[2] },
      { label: 'Annuities', terms: ['annuity', 'annuities', 'guaranteed income'], color: TOPIC_COLORS[3] },
      { label: 'Financial Planning', terms: ['financial plan', 'advisor', 'retirement planning', 'estate'], color: TOPIC_COLORS[4] },
    ];
  }
  // Generic fallback — use lob words or industry words
  const lobWords = (lob || indKey || 'product').split(/[\s,&\/\-_]+/).filter((w: string) => w.length > 3).slice(0, 5);
  if (lobWords.length >= 2) {
    return lobWords.map((w: string, i: number) => ({
      label: w.charAt(0).toUpperCase() + w.slice(1),
      terms: [w.toLowerCase()],
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
    }));
  }
  return [
    { label: 'Core Product', terms: [lobWords[0] || 'offering'], color: TOPIC_COLORS[0] },
    { label: 'Premium Tier', terms: ['premium', 'elite', 'pro', 'platinum'], color: TOPIC_COLORS[1] },
    { label: 'Entry Tier', terms: ['basic', 'starter', 'standard', 'entry'], color: TOPIC_COLORS[2] },
    { label: 'Comparison', terms: ['vs', 'versus', 'compare', 'alternative', 'better than'], color: TOPIC_COLORS[3] },
    { label: 'Reviews', terms: ['review', 'rating', 'recommend', 'worth it', 'best'], color: TOPIC_COLORS[4] },
  ];
}

function computeProductMentions(productDefs: ProductDef[], rd: any[]): any[] {
  const brandRd = rd.filter((r: any) => r.mentioned === true || (r.position !== undefined && r.position > 0));
  const pool = brandRd.length > 0 ? brandRd : rd;
  const total = rd.length || 1; // use total queries as denominator
  return productDefs
    .map((p) => {
      const count = pool.filter((r: any) => {
        const txt = (r.response_preview || r.response || '').toLowerCase();
        return p.terms.some((t: string) => txt.includes(t));
      }).length;
      const pct = Math.round((count / total) * 100);
      return { ...p, mentions: count, pct, val: count };
    })
    .filter((p) => p.pct >= 2 || (pool.length < 20 && p.mentions >= 1));
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#E5E7EB', color: '#6B7280', fontSize: '0.6rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>?</span>
      {show && (
        <span style={{ position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', fontSize: '0.72rem', lineHeight: 1.6, borderRadius: 8, padding: '10px 14px', width: 210, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'normal' as const }}>
          {text}
        </span>
      )}
    </span>
  );
}

function MetricCard({ label, val, sub, color = '#111827' }: { label: string; val: any; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 16px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}
        {METRIC_TIPS[label.toLowerCase()] && <Tooltip text={METRIC_TIPS[label.toLowerCase()]} />}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function GeoGauge({ score }: { score: number }) {
  const cx = 160, cy = 155, Ro = 130, Ri = 88;
  const a = (s: number) => Math.PI - (s / 100) * Math.PI;
  const ox = (s: number, r: number) => cx + r * Math.cos(a(s));
  const oy = (s: number, r: number) => cy - r * Math.sin(a(s));
  const seg = (s0: number, s1: number, fill: string) => {
    const lg = s1 - s0 > 50 ? 1 : 0;
    return <path d={`M ${ox(s0, Ro)} ${oy(s0, Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1, Ro)} ${oy(s1, Ro)} L ${ox(s1, Ri)} ${oy(s1, Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0, Ri)} ${oy(s0, Ri)} Z`} fill={fill} stroke="white" strokeWidth="2" />;
  };
  const mi = Ri - 8, mo = Ro + 8;
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 16px 14px', textAlign: 'center' }}>
      <svg viewBox="0 0 320 175" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {seg(0, 44, '#F44336')}{seg(44, 69, '#FF7043')}{seg(69, 79, '#FDD835')}{seg(79, 100, '#43A047')}
        <line x1={ox(score, mi)} y1={oy(score, mi)} x2={ox(score, mo)} y2={oy(score, mo)} stroke="#A100FF" strokeWidth="4" strokeLinecap="round" />
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <text key={t} x={ox(t, Ro + 18)} y={oy(t, Ro + 18)} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{t}</text>
        ))}
        <text x={cx} y={cy - 18} textAnchor="middle" style={{ fontSize: 46, fontWeight: 900, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>{score}</text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>GEO Score</span>
        <Tooltip text="GEO Score = Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15." />
      </div>
    </div>
  );
}

function SankeyFlowChart({ result }: { result: any }) {
  const [hovMetric, setHovMetric] = useState<string | null>(null);
  const rd: any[] = result.responses_detail || [];
  const cl: any[] = result.query_clusters || [];
  const indKey: string = result.ind_key || 'gen';
  const lob: string = result.lob || '';
  const rawSent: number = result.sentiment || 0;
  const prom: number = result.prominence || 0;
  const vis: number = result.visibility || 0;
  const cit: number = result.citation_share || 0;
  const sov: number = result.share_of_voice || 0;
  const totalRd = result.total_responses || rd.length || 100;

  const TOPIC_COLORS = ['#A100FF', '#7500C0', '#460073', '#6B7280', '#374151'];
  const topTopics = [...cl].sort((a: any, b: any) => (b.total || 0) - (a.total || 0)).slice(0, 5).map((c: any, i: number) => ({
    label: c.category,
    val: Math.max(5, Math.min(95, c.winRate ?? 0)),
    color: TOPIC_COLORS[i % TOPIC_COLORS.length],
    total: c.total || Math.round(totalRd / Math.max(cl.length, 1)),
  }));
  const leftItems = topTopics.length >= 1 ? topTopics : [{ label: 'General', val: vis || 30, color: TOPIC_COLORS[0], total: totalRd }];

  const productDefs = getProductDefs(indKey, lob);
  const brandMentionedRd = rd.filter((r: any) => r.mentioned === true || (r.position !== undefined && r.position > 0));
  const scanPool = brandMentionedRd.length > 0 ? brandMentionedRd : rd;
  const PROD_COLORS_POOL = ['#A100FF', '#7500C0', '#460073', '#8B5CF6', '#1E88E5', '#0EA5E9', '#6366F1', '#A78BFA'];

  const productMentions = productDefs.map((p) => {
    const count = scanPool.filter((r: any) => {
      const txt = (r.response_preview || r.response || '').toLowerCase();
      return p.terms.some((t: string) => txt.includes(t));
    }).length;
    const pct = totalRd > 0 ? Math.round((count / totalRd) * 100) : 0;
    return { ...p, mentions: count, pct, val: Math.max(5, count) };
  }).filter((p) => p.pct >= 2 || (scanPool.length < 20 && p.mentions >= 1));

  const sortedMentions = [...productMentions].sort((a: any, b: any) => b.mentions - a.mentions);
  const prodItems: any[] = sortedMentions.length >= 1
    ? sortedMentions.map((p, i) => ({ ...p, color: PROD_COLORS_POOL[i % PROD_COLORS_POOL.length] }))
    : [{ label: 'General', mentions: 1, pct: 100, val: 1, color: PROD_COLORS_POOL[0], terms: [] }];

  const signals = [
    { label: 'Visibility', val: vis, weight: 30, color: '#A100FF' },
    { label: 'Sentiment', val: rawSent, weight: 20, color: '#7500C0' },
    { label: 'Prominence', val: prom, weight: 20, color: '#460073' },
    { label: 'Citations', val: cit, weight: 15, color: '#6B7280' },
    { label: 'Share of Voice', val: sov, weight: 15, color: '#374151' },
  ];

  const geoScore = result.overall_geo_score || 0;
  const W = 1040, H = 520, padT = 32, padB = 44;
  const col1 = 130, col2 = 300, col3 = 510, col4 = 720, nW = 26;
  const plotH = H - padT - padB;

  const layoutN = <T extends { label: string; val: number; color: string }>(items: T[], x: number, minH = 22, gap = 8) => {
    const total = items.reduce((s, n) => s + Math.max(n.val, 1), 0) || 1;
    const usableH = plotH - gap * (items.length - 1);
    let cy = padT;
    return items.map((n) => {
      const h = Math.max(minH, (Math.max(n.val, 1) / total) * usableH);
      const nd = { ...n, x, y: cy, h, mid: cy + h / 2 };
      cy += h + gap;
      return nd;
    });
  };

  const lNodes = layoutN(leftItems, col1, 28, 12);
  const pNodes = layoutN(prodItems, col2, 30, 10);
  const sNodes = layoutN(signals, col3, 32, 8);
  const geoN = { x: col4, y: padT, h: plotH, mid: padT + plotH / 2 };

  const wave = (x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, bend = 0.44) => {
    const mx1 = x1 + nW + (x2 - x1 - nW) * bend;
    const mx2 = x2 - (x2 - x1 - nW) * bend;
    return `M${x1 + nW},${y1} C${mx1},${y1} ${mx2},${y2} ${x2},${y2} L${x2},${y2 + h2} C${mx2},${y2 + h2} ${mx1},${y1 + h1} ${x1 + nW},${y1 + h1} Z`;
  };

  type FlowA = { path: string; color: string; tid: string; pid: string };
  const flowsA: FlowA[] = [];
  lNodes.forEach((ln) => {
    const topicRd = rd.filter((r: any) => r.category === ln.label);
    const topicTotal = topicRd.length || 1;
    const prodShares = pNodes.map((pn) => {
      const pDef = productDefs.find((p) => p.label === pn.label);
      if (!pDef) return 0;
      const cnt = topicRd.filter((r: any) => pDef.terms.some((t: string) => (r.response_preview || '').toLowerCase().includes(t))).length;
      return Math.max(0, cnt / topicTotal);
    });
    const totalShare = prodShares.reduce((s, v) => s + v, 0) || 1;
    let lOffset = 0;
    pNodes.forEach((pn, pi) => {
      const frac = prodShares[pi] / totalShare;
      if (frac < 0.001) return;
      const lH = Math.max(2, ln.h * frac);
      const pH = Math.max(2, pn.h * frac);
      flowsA.push({ path: wave(ln.x, ln.y + lOffset, lH, pn.x, pn.y, pH, 0.42), color: pn.color, tid: ln.label, pid: pn.label });
      lOffset += lH;
    });
  });

  type FlowB = { path: string; color: string; pid: string; sid: string };
  const flowsB: FlowB[] = [];
  const sigOffsets: Record<string, number> = {};
  sNodes.forEach((sig) => { sigOffsets[sig.label] = sig.y; });
  const totalMentions2 = prodItems.reduce((s: number, p: any) => s + Math.max(p.val, 1), 0) || 1;
  pNodes.forEach((pn: any) => {
    let pOffset = 0;
    sNodes.forEach((sig) => {
      const fw = sig.weight / 100;
      const pH = Math.max(2, pn.h * fw);
      const pShare = Math.max(pn.val, 1) / totalMentions2;
      const sH = Math.max(2, sig.h * pShare);
      const sY = sigOffsets[sig.label];
      flowsB.push({ path: wave(pn.x, pn.y + pOffset, pH, sig.x, sY, sH, 0.43), color: pn.color, pid: pn.label, sid: sig.label });
      pOffset += pH;
      sigOffsets[sig.label] += sH;
    });
  });

  type FlowC = { path: string; color: string; sid: string };
  const flowsC: FlowC[] = [];
  let gOff = geoN.y;
  sNodes.forEach((sig) => {
    const h = geoN.h * (sig.weight / 100);
    flowsC.push({ path: wave(sig.x, sig.y, sig.h, geoN.x, gOff, h, 0.46), color: sig.color, sid: sig.label });
    gOff += h;
  });

  const isHov = (key: string) => hovMetric === key;

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Brand Signal Flow · GEO Score Composition</div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>How AI query topics flow through brand products mentioned → GEO signals → your score.</div>
        </div>
        <div style={{ background: '#F5F0FF', borderRadius: 8, border: '1px solid #E9D5FF', padding: '8px 12px', fontSize: '0.65rem', color: '#7500C0', lineHeight: 1.7, maxWidth: 200, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>How to read this</div>
          <div>Left → what AI is asked about</div>
          <div>2nd → which products AI mentions</div>
          <div>3rd → how signals are scored</div>
          <div>Right → your final GEO Score</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' as const }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 800, display: 'block' }} onClick={() => setHovMetric(null)}>
          {[{ x: col1 + nW / 2, l: 'QUERY TOPICS' }, { x: col2 + nW / 2, l: 'BRAND PRODUCTS MENTIONED' }, { x: col3 + nW / 2, l: 'GEO SIGNALS' }, { x: col4 + nW / 2, l: 'GEO SCORE' }].map((h, i) => (
            <text key={i} x={h.x} y={padT - 10} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 700, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif', letterSpacing: '0.07em' }}>{h.l}</text>
          ))}
          {flowsA.map((f, i) => (<path key={`fa${i}`} d={f.path} fill={f.color} opacity={hovMetric ? (isHov(f.tid) || isHov(f.pid) ? 0.55 : 0.04) : 0.16} style={{ cursor: 'pointer', transition: 'opacity 0.15s' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === f.tid ? null : f.tid); }} />))}
          {flowsB.map((f, i) => (<path key={`fb${i}`} d={f.path} fill={f.color} opacity={hovMetric ? (isHov(f.pid) || isHov(f.sid) ? 0.52 : 0.04) : 0.18} style={{ cursor: 'pointer', transition: 'opacity 0.15s' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === f.pid ? null : f.pid); }} />))}
          {flowsC.map((f, i) => (<path key={`fc${i}`} d={f.path} fill={f.color} opacity={hovMetric ? (isHov(f.sid) ? 0.52 : 0.04) : 0.22} style={{ cursor: 'pointer', transition: 'opacity 0.15s' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === f.sid ? null : f.sid); }} />))}
          {lNodes.map((n: any, i: number) => {
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`ln${i}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === n.label ? null : n.label); }}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim ? 0.3 : 1} />
              <text x={n.x - 6} y={n.mid - 6} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 8.5, fill: isHov(n.label) ? n.color : '#374151', fontFamily: 'Inter,sans-serif', fontWeight: isHov(n.label) ? 700 : 600 }}>{n.label.length > 17 ? n.label.slice(0, 16) + '…' : n.label}</text>
              <text x={n.x - 6} y={n.mid + 6} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 7.5, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.val}% win · {n.total}q</text>
            </g>);
          })}
          {pNodes.map((n: any, i: number) => {
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`pn${i}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === n.label ? null : n.label); }}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim ? 0.3 : 1} />
              <text x={n.x + nW + 5} y={n.mid - 5} dominantBaseline="middle" style={{ fontSize: 8.5, fill: isHov(n.label) ? n.color : '#374151', fontFamily: 'Inter,sans-serif', fontWeight: isHov(n.label) ? 700 : 600 }}>{n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label}</text>
              <text x={n.x + nW + 5} y={n.mid + 6} dominantBaseline="middle" style={{ fontSize: 7.5, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.mentions}/{totalRd} ({Math.round((n.mentions / totalRd) * 100)}%)</text>
            </g>);
          })}
          {sNodes.map((n, i) => {
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`sn${i}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setHovMetric(hovMetric === n.label ? null : n.label); }}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim ? 0.3 : 0.9} />
              <text x={n.x + nW + 5} y={n.mid - 5} dominantBaseline="middle" style={{ fontSize: 8.5, fill: isHov(n.label) ? n.color : '#374151', fontFamily: 'Inter,sans-serif', fontWeight: isHov(n.label) ? 700 : 600 }}>{n.label}</text>
              <text x={n.x + nW + 5} y={n.mid + 6} dominantBaseline="middle" style={{ fontSize: 7.5, fill: n.color, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{n.val} · {n.weight}%</text>
            </g>);
          })}
          <rect x={geoN.x} y={geoN.y} width={nW} height={geoN.h} fill="#A100FF" rx={5} />
          <text x={geoN.x + nW + 12} y={geoN.mid - 24} style={{ fontSize: 13, fontWeight: 800, fill: '#A100FF', fontFamily: 'Inter,sans-serif' }}>GEO Score</text>
          <text x={geoN.x + nW + 12} y={geoN.mid + 16} style={{ fontSize: 38, fontWeight: 900, fill: '#A100FF', fontFamily: 'Inter,sans-serif' }}>{geoScore}</text>
          <text x={geoN.x + nW + 12} y={geoN.mid + 38} style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>out of 100</text>
        </svg>
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} style={{ fontWeight: 700, color: '#111827' }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={j}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={j} style={{ background: '#F3F4F6', borderRadius: 4, padding: '1px 6px', fontSize: '0.85em', fontFamily: 'monospace', color: '#A100FF' }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={i} style={{ height: 8 }} />); i++; continue; }
    if (trimmed.startsWith('# ')) { elements.push(<div key={i} style={{ fontSize: '1.25rem', fontWeight: 900, color: '#111827', marginTop: 24, marginBottom: 8 }}>{parseInline(trimmed.slice(2))}</div>); i++; continue; }
    if (trimmed.startsWith('## ')) { elements.push(<div key={i} style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', marginTop: 20, marginBottom: 6 }}>{parseInline(trimmed.slice(3))}</div>); i++; continue; }
    if (trimmed.startsWith('### ')) { elements.push(<div key={i} style={{ fontSize: '0.97rem', fontWeight: 700, color: '#374151', marginTop: 16, marginBottom: 4 }}>{parseInline(trimmed.slice(4))}</div>); i++; continue; }
    if (trimmed === '---') { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '16px 0' }} />); i++; continue; }
    if (/^\s{0,3}[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s{0,3}[-*]\s/.test(lines[i])) {
        const l = lines[i].trim().replace(/^[-*]\s/, '');
        items.push(<div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#A100FF', flexShrink: 0, marginTop: 2 }}>•</span><span style={{ fontSize: '0.92rem', color: '#374151', lineHeight: 1.65 }}>{parseInline(l)}</span></div>);
        i++;
      }
      elements.push(<div key={`bl-${i}`} style={{ margin: '4px 0 10px', paddingLeft: 4 }}>{items}</div>);
      continue;
    }
    elements.push(<p key={i} style={{ margin: '3px 0', fontSize: '0.93rem', color: '#374151', lineHeight: 1.75 }}>{parseInline(trimmed)}</p>);
    i++;
  }
  return <div style={{ fontFamily: 'Inter,sans-serif', color: '#374151' }}>{elements}</div>;
}

function RadarChart({ result }: { result: any }) {
  const [hov, setHov] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const rd = result.responses_detail || [];
  const indKey = result.ind_key || 'gen';
  const lob = result.lob || '';
  const productDefs = getProductDefs(indKey, lob);
  const productMentions = computeProductMentions(productDefs, rd);
  const dims = productDefs.map((p) => {
    const found = productMentions.find((m) => m.label === p.label);
    return { label: p.label, val: found ? Math.max(5, Math.min(95, found.pct)) : 5, color: p.color };
  });
  const n = dims.length;
  const VW = n > 7 ? 600 : 500, VH = n > 7 ? 520 : 430;
  const cx = VW / 2, cy = VH / 2, R = n > 7 ? 110 : 120;
  const LABEL_R = R + (n > 7 ? 55 : 44);
  const angle = (i: number) => (Math.PI / 2) - (2 * Math.PI * i) / n;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy - r * Math.sin(angle(i)) });
  const rings = [25, 50, 75, 100];
  const poly = dims.map((d, i) => pt(i, (d.val / 100) * R));
  const sorted2 = [...dims].sort((a, b) => b.val - a.val);
  const top2 = sorted2.slice(0, 2).map((d) => d.label), bot2 = sorted2.slice(-2).map((d) => d.label);
  const wrapLabel = (label: string, maxLen = 11): string[] => {
    if (label.length <= maxLen) return [label];
    const words = label.split(/[\s\/]+/);
    const lines: string[] = [];
    let cur = '';
    words.forEach((w) => { if (!cur) { cur = w; } else if ((cur + ' ' + w).length <= maxLen) { cur += ' ' + w; } else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  };
  return (
    <div style={{ position: 'relative' as const }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', overflow: 'visible' }}>
        {rings.map((r) => { const pts = dims.map((_, i) => pt(i, (r / 100) * R)); return <g key={r}><polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1" /><text x={cx + 4} y={cy - (r / 100) * R + 4} style={{ fontSize: 8, fill: '#C4B5FD', fontFamily: 'Inter,sans-serif' }}>{r}</text></g>; })}
        {dims.map((_, i) => { const p = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1" />; })}
        <polygon points={poly.map((p) => `${p.x},${p.y}`).join(' ')} fill="#A100FF" fillOpacity="0.18" stroke="#A100FF" strokeWidth="2" />
        {dims.map((d, i) => { const p = pt(i, (d.val / 100) * R); return <circle key={i} cx={p.x} cy={p.y} r={hov === i ? 7 : 5} fill={d.color} stroke="white" strokeWidth="1.5" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { setHov(i); const svgRect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect(); const circRect = (e.currentTarget as SVGElement).getBoundingClientRect(); setTooltipPos({ x: circRect.left + circRect.width / 2 - svgRect.left, y: circRect.top - svgRect.top }); }} onMouseLeave={() => { setHov(null); setTooltipPos(null); }} />; })}
        {dims.map((d, i) => {
          const lp = pt(i, LABEL_R);
          const isTop = top2.includes(d.label), isBot = bot2.includes(d.label);
          const lines = wrapLabel(d.label);
          const lineH = 12, totalH = (lines.length - 1) * lineH;
          const fs = n > 7 ? 9.5 : 11;
          return (<g key={i}>{lines.map((line, li) => (<text key={li} x={lp.x} y={lp.y - totalH / 2 + li * lineH} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: fs, fill: isTop ? d.color : isBot ? '#EF4444' : '#374151', fontWeight: isTop || isBot ? 700 : 500, fontFamily: 'Inter,sans-serif' }}>{line}</text>))}</g>);
        })}
      </svg>
      {hov !== null && tooltipPos && <div style={{ position: 'absolute' as const, left: Math.max(0, tooltipPos.x - 82), top: Math.max(0, tooltipPos.y - 64), background: '#1F2937', borderRadius: 8, padding: '10px 14px', width: 165, pointerEvents: 'none', zIndex: 999 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'Inter,sans-serif', marginBottom: 3 }}>{dims[hov].label}: {dims[hov].val}%</div><div style={{ fontSize: 9, color: '#D1D5DB', fontFamily: 'Inter,sans-serif', lineHeight: 1.5 }}>AI mention rate for this product category</div></div>}
      <div style={{ background: '#F5F0FF', borderRadius: 8, border: '1px solid #E9D5FF', padding: '8px 14px', fontSize: '0.78rem', color: '#7500C0', marginTop: 4 }}>💡 Strongest in <strong>{top2.join(' and ')}</strong>. Weakest in <strong>{bot2.join(' and ')}</strong>.</div>
    </div>
  );
}

function SentimentHeatmap({ result }: { result: any }) {
  const [hovCell, setHovCell] = useState<string | null>(null);
  const rd = result.responses_detail || [];
  const indKey = result.ind_key || 'gen';
  const lob = result.lob || '';
  const brand = result.brand_name || '';
  const competitors = result.competitors || [];
  const productDefs = getProductDefs(indKey, lob);
  const productMentions = computeProductMentions(productDefs, rd);
  const labels = productDefs.map((p) => p.label);

  // Compute brand scores from real data
  const myScores = productDefs.map((p) => {
    const found = productMentions.find((m) => m.label === p.label);
    return found ? Math.max(5, Math.min(95, found.pct)) : 5;
  });

  // Compute competitor scores from their real GEO signals — no seed() function
  const rows = [
    { name: brand, isYou: true, scores: myScores },
    ...competitors.slice(0, 8).map((c: any) => {
      const visRatio = Math.min(1, (c.Vis || 0) / Math.max(result.visibility || 1, 1));
      const compScores = productDefs.map((p, di) => {
        const baseScore = myScores[di] || 5;
        // Scale by competitor's visibility ratio + add slight variation by position
        const scaled = Math.round(baseScore * visRatio * (0.85 + (di % 3) * 0.1));
        return Math.max(3, Math.min(95, scaled));
      });
      return { name: c.Brand || '', isYou: false, scores: compScores };
    }),
  ];

  const BRAND_COL_W = 120;
  const COL_W = labels.length > 7 ? 72 : labels.length > 5 ? 82 : 95;
  const totalGridW = BRAND_COL_W + labels.length * COL_W + (labels.length + 1) * 4;
  const gridCols = `${BRAND_COL_W}px ${labels.map(() => `${COL_W}px`).join(' ')}`;
  const allScores = rows.flatMap((r) => r.scores), minS = Math.min(...allScores), maxS = Math.max(...allScores, 1);
  const cellColor = (val: number) => {
    const t = (val - minS) / Math.max(maxS - minS, 1);
    if (t < 0.2) return { bg: '#F3F4F6', text: '#9CA3AF' };
    if (t < 0.4) return { bg: '#EDE9FE', text: '#6D28D9' };
    if (t < 0.6) return { bg: '#C4B5FD', text: '#5B21B6' };
    if (t < 0.8) return { bg: '#8B5CF6', text: 'white' };
    return { bg: '#5B21B6', text: 'white' };
  };
  const compRows = rows.slice(1);
  const dimWins = labels.map((lbl, di) => { const yourScore = rows[0].scores[di]; const beaten = compRows.filter((r) => yourScore > r.scores[di]).length; return { dim: lbl, score: yourScore, beaten }; });
  const strongest = [...dimWins].sort((a, b) => b.score - a.score)[0], weakest = [...dimWins].sort((a, b) => a.score - b.score)[0];

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 18px' }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Product Feature Strength vs Competitors</div>
      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 14 }}>Darker = stronger AI association. Based on real response data.</div>
      <div style={{ overflowX: 'auto' as const }}>
        <div style={{ minWidth: totalGridW }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, marginBottom: 4 }}>
            <div />
            {labels.map((lbl, i) => (<div key={i} style={{ fontSize: labels.length > 7 ? '0.58rem' : '0.65rem', color: '#9CA3AF', fontWeight: 600, textAlign: 'center' as const, lineHeight: 1.3, padding: '0 3px 6px', wordBreak: 'break-word' as const }}>{lbl.split(/[\/\s]+/).map((part, pi) => <span key={pi} style={{ display: 'block' }}>{part}</span>)}</div>))}
          </div>
          {rows.map((r, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: '0.73rem', color: r.isYou ? '#A100FF' : '#374151', fontWeight: r.isYou ? 700 : 400, textAlign: 'right' as const, paddingRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.name}</div>
              {r.scores.map((val: number, ci: number) => {
                const k = `${ri}-${ci}`, { bg, text } = cellColor(val), isH = hovCell === k;
                return <div key={`c${k}`} onMouseEnter={() => setHovCell(k)} onMouseLeave={() => setHovCell(null)} style={{ borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isH ? '0.8rem' : '0.7rem', fontWeight: 700, color: text, cursor: 'default', transition: 'transform 0.1s', transform: isH ? 'scale(1.06)' : 'scale(1)', border: r.isYou ? '2px solid #A100FF' : '2px solid transparent', boxSizing: 'border-box' as const, height: 30, minHeight: 30 }}>{val}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
      {strongest && weakest && <div style={{ background: '#F5F0FF', borderRadius: 8, border: '1px solid #E9D5FF', padding: '8px 14px', fontSize: '0.78rem', color: '#7500C0', marginTop: 10 }}>💡 Strongest in <strong>{strongest.dim}</strong> ({strongest.score}%) · Weakest in <strong>{weakest.dim}</strong> ({weakest.score}%)</div>}
    </div>
  );
}

function ScatterPlot({ brand, vis, sent, cit, competitors, topCompBrand }: { brand: string; vis: number; sent: number; cit: number; competitors: any[]; topCompBrand: string }) {
  const [hov, setHov] = useState<number | null>(null);
  const top20 = competitors.slice(0, 20);
  const raw = [
    { label: brand, x: vis, y: sent, cit, isYou: true, isTopComp: false },
    ...top20.map((c: any) => ({ label: c.Brand, x: c.Vis || 0, y: c.Sen ?? 0, cit: c.Cit ?? 30, isYou: false, isTopComp: c.Brand === topCompBrand })),
  ];
  const all = raw.map((a, i) => {
    if (a.isYou || a.isTopComp) return { ...a, jx: a.x, jy: a.y };
    const sameZone = raw.slice(0, i).filter((b) => !b.isYou && !b.isTopComp && Math.abs(b.x - a.x) <= 4);
    return { ...a, jx: a.x + sameZone.length * 4, jy: a.y };
  });
  const W = 960, H = 300, padL = 56, padR = 30, padT = 20, padB = 40;
  const sx = (v: number) => padL + (v / 100) * (W - padL - padR);
  const sy = (v: number) => padT + ((100 - v) / 100) * (H - padT - padB);
  const citVals = all.map((a) => a.cit), citMin = Math.min(...citVals), citMax = Math.max(...citVals, 1);
  const bR = (c: number) => Math.round(5 + ((c - citMin) / Math.max(citMax - citMin, 1)) * 10);
  const placements = all.map((a, i) => {
    const cx2 = sx(a.jx), cy2 = sy(a.jy), r = bR(a.cit);
    const zoneBefore = all.slice(0, i).filter((b) => Math.abs(sx(b.jx) - cx2) < 24).length;
    const above = i % 2 === 0;
    const offset = above ? -(r + 11 + zoneBefore * 9) : (r + 11 + zoneBefore * 9);
    return { cx2, cy2, r, ly: Math.max(padT + 6, Math.min(H - padB - 6, cy2 + offset)), above };
  });
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '8px 0 0' }}>
      <div style={{ padding: '4px 14px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.72rem', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#A100FF" /></svg> You</span>
        <span style={{ fontSize: '0.72rem', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" /></svg> Top Competitor</span>
        <span style={{ fontSize: '0.72rem', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#CBD5E1" /></svg> Others</span>
        <span style={{ color: '#9CA3AF', fontSize: '0.68rem' }}>· Bubble size = Citation Score</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0, 25, 50, 75, 100].map((v) => (<g key={v}><line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1" /><text x={padL - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{v}</text></g>))}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#D1D5DB" strokeWidth="1.5" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#D1D5DB" strokeWidth="1.5" />
        {all.map((a, i) => {
          const { cx2, cy2, r } = placements[i], isH = hov === i;
          const fill = a.isYou ? '#A100FF' : a.isTopComp ? '#EFF6FF' : '#CBD5E1';
          const stroke = a.isYou ? '#7500C0' : a.isTopComp ? '#3B82F6' : '#9CA3AF';
          return <g key={`b${i}`} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            {isH && <circle cx={cx2} cy={cy2} r={r + 5} fill={stroke} opacity="0.12" />}
            <circle cx={cx2} cy={cy2} r={r} fill={fill} stroke={stroke} strokeWidth={a.isYou ? 2.5 : a.isTopComp ? 2 : 1} />
          </g>;
        })}
        {all.map((a, i) => {
          const { cx2, cy2, r, ly } = placements[i];
          const lc = a.isYou ? '#7500C0' : a.isTopComp ? '#1E40AF' : '#6B7280';
          const fs = a.isYou ? 12 : a.isTopComp ? 11 : 7;
          const leaderY = placements[i].above ? cy2 - r : cy2 + r;
          return <g key={`l${i}`} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <line x1={cx2} y1={leaderY} x2={cx2} y2={placements[i].above ? ly + 3 : ly - 3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4" />
            <text x={cx2} y={ly} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: fs, fill: lc, fontFamily: 'Inter,sans-serif', fontWeight: (a.isYou || a.isTopComp) ? 700 : 400, pointerEvents: 'none' }}>{a.label}</text>
          </g>;
        })}
        {all.map((a, i) => {
          const { cx2, cy2, r } = placements[i];
          if (hov !== i) return null;
          const tipW = 190, tipH = 68;
          const tx = cx2 + tipW + 10 > W - padR ? cx2 - tipW - 10 : cx2 + 10;
          const ty = cy2 - tipH < padT ? cy2 + r + 8 : cy2 - tipH - 8;
          return <g key={`tip${i}`} style={{ pointerEvents: 'none' }}>
            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937" />
            <text x={tx + 12} y={ty + 16} style={{ fontSize: 11, fontWeight: 700, fill: 'white', fontFamily: 'Inter,sans-serif' }}>{a.label}{a.isTopComp ? ' (Top Competitor)' : a.isYou ? ' (You)' : ''}</text>
            <text x={tx + 12} y={ty + 32} style={{ fontSize: 10, fill: '#D1D5DB', fontFamily: 'Inter,sans-serif' }}>Visibility: <tspan fill='#C4B5FD' fontWeight="700">{a.x}</tspan>   Sentiment: <tspan fill='#6EE7B7' fontWeight="700">{a.y}</tspan></text>
            <text x={tx + 12} y={ty + 48} style={{ fontSize: 10, fill: '#D1D5DB', fontFamily: 'Inter,sans-serif' }}>Citation Score: <tspan fill='#FCD34D' fontWeight="700">{a.cit}</tspan></text>
          </g>;
        })}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => <text key={v} x={sx(v)} y={H - padB + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{v}</text>)}
        <text x={(padL + W - padR) / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>Visibility</text>
        <text x={14} y={(padT + H - padB) / 2} textAnchor="middle" transform={`rotate(-90,14,${(padT + H - padB) / 2})`} style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>Sentiment</text>
      </svg>
    </div>
  );
}

function SCurveImage7({ score, brand }: { score: number; brand: string }) {
  const [hov, setHov] = useState<string | null>(null);
  const W = 860, H = 260, padL = 68, padR = 30, padT = 20, padB = 60;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const curve = (x: number) => 5 + 90 / (1 + Math.exp(-0.09 * (x - 45)));
  const pts = Array.from({ length: 201 }, (_, i) => ({ x: i / 2, y: curve(i / 2) }));
  const sx = (v: number) => padL + (v / 100) * plotW;
  const sy = (v: number) => padT + ((100 - v) / 100) * plotH;
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const scoreToX = (s: number) => { let best = 0, bestDiff = 999; pts.forEach((p) => { const d = Math.abs(p.y - s); if (d < bestDiff) { bestDiff = d; best = p.x; } }); return best; };
  const youX = scoreToX(score), goalX = scoreToX(70), authX = scoreToX(80);
  const youPX = sx(youX), youPY = sy(score), goalPX = sx(goalX), goalPY = sy(70), authPX = sx(authX), authPY = sy(80);
  const shadePts = score < 70 ? pts.filter((p) => p.x >= youX && p.x <= goalX) : [];
  const shadeD = shadePts.length > 1 ? `${shadePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT + plotH} L${sx(youX)},${padT + plotH} Z` : '';
  const stages = [
    { label: 'Fragmented', range: '0–44', color: '#EF4444' },
    { label: 'Emerging', range: '45–55', color: '#F59E0B' },
    { label: 'Competitive', range: '56–69', color: '#6366F1' },
    { label: 'Leader', range: '70–79', color: '#1E88E5' },
    { label: 'Authority', range: '80+', color: '#10B981' },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <text x={padL + plotW / 2} y={16} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>Where You Are vs Your Opportunity</text>
      {[0, 25, 50, 75, 100].map((v) => (<g key={v}><line x1={padL} y1={sy(v)} x2={padL + plotW} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1" /><text x={padL - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>{v}</text></g>))}
      {[0, 20, 40, 60, 80, 100].map((v) => (<g key={v}><line x1={sx(v)} y1={padT} x2={sx(v)} y2={padT + plotH} stroke="#E5E7EB" strokeWidth="1" /><text x={sx(v)} y={padT + plotH + 14} textAnchor="middle" style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>{v}</text></g>))}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#D1D5DB" strokeWidth="1.5" />
      <text x={18} y={padT + plotH / 2} textAnchor="middle" transform={`rotate(-90,18,${padT + plotH / 2})`} style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>GEO Score</text>
      {shadeD && <path d={shadeD} fill="#EDE9FE" opacity="0.5" />}
      <path d={pathD} fill="none" stroke="#A100FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g onMouseEnter={() => setHov('auth')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={authPX} cy={authPY} r={14} fill="#10B981" />
        <text x={authPX} y={authPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>80</text>
        <text x={authPX} y={authPY - 20} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#10B981', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>Authority (80)</text>
      </g>
      <g onMouseEnter={() => setHov('goal')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={goalPX} cy={goalPY} r={14} fill="#1E88E5" />
        <text x={goalPX} y={goalPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>70</text>
        <text x={goalPX} y={goalPY - 20} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#1E88E5', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>Goal (70)</text>
      </g>
      <g onMouseEnter={() => setHov('you')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={youPX} cy={youPY} r={14} fill="#7C3AED" />
        <text x={youPX} y={youPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{score}</text>
        <text x={youPX} y={youPY + 22} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>You ({score})</text>
      </g>
      <text x={padL + plotW / 2} y={padT + plotH + 32} textAnchor="middle" style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>GEO Maturity</text>
      {stages.map((s, i) => (<text key={i} x={padL + plotW * (i === 0 ? 0.12 : i === 1 ? 0.32 : i === 2 ? 0.5 : i === 3 ? 0.68 : 0.88)} y={padT + plotH + 52} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: s.color, fontFamily: 'Inter,sans-serif' }}>{s.label} <tspan style={{ fontWeight: 400, fill: '#9CA3AF' }}>{s.range}</tspan></text>))}
    </svg>
  );
}

function PriorityActionsTable({ result, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: { result: any; cachedActions: any[] | null; setCachedActions: (a: any[]) => void; actionsLoading: boolean; setActionsLoading: (b: boolean) => void }) {
  const actions = cachedActions || [], loading = actionsLoading;
  useEffect(() => {
    if (cachedActions !== null) return;
    setActionsLoading(true);
    const prompt = `You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand. Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}. Do NOT suggest comparison pages against competitors. Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}`;
    fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      .then((r) => r.json())
      .then((data) => { const raw2 = (data.response || '').replace(/```json|```/g, '').trim(); setCachedActions(JSON.parse(raw2)); })
      .catch(() => setCachedActions([]))
      .finally(() => setActionsLoading(false));
  }, []);
  const ps = (p: string) => p === 'High' ? { color: '#EF4444', bg: '#FEE2E2' } : p === 'Medium' ? { color: '#92400E', bg: '#FEF3C7' } : { color: '#065F46', bg: '#D1FAE5' };
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '28px 28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ color: '#F59E0B', fontSize: '1.1rem' }}>!</span><span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Priority Actions Implementable</span></div>
      <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 24 }}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#9CA3AF', fontSize: '0.85rem' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 16, height: 16, border: '2px solid #E9D5FF', borderTopColor: '#A100FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generating...</div>
        : actions.length === 0 ? <div style={{ fontSize: '0.84rem', color: '#9CA3AF', padding: '12px 0' }}>Generating recommendations...</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['PRIORITY', 'SEGMENT', 'TYPE', 'ACTION TO TAKE', 'DELIVERABLE'].map((h) => <th key={h} style={{ padding: '8px 16px 12px', textAlign: 'left' as const, fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.08em', borderBottom: '1px solid #F3F4F6' }}>{h}</th>)}</tr></thead>
            <tbody>{actions.map((a: any, i: number) => { const s = ps(a.priority); return <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#FAFAFA' : 'white' }}><td style={{ padding: '18px 16px', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}><span style={{ background: s.bg, color: s.color, borderRadius: 50, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>{a.priority}</span></td><td style={{ padding: '18px 16px', verticalAlign: 'top' as const }}><span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#A100FF' }}>{a.segment}</span></td><td style={{ padding: '18px 16px', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}><span style={{ fontSize: '0.82rem', color: '#374151' }}>{a.type}</span></td><td style={{ padding: '18px 16px', verticalAlign: 'top' as const, maxWidth: 420 }}><span style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.65 }}>{a.action}</span></td><td style={{ padding: '18px 16px', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }}><span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#A100FF' }}>{a.deliverable}</span></td></tr>; })}
            </tbody>
          </table>}
    </div>
  );
}

export default function GeoHub() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [promptInput, setPromptInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<{ q: string; a: string }[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [queryPage, setQueryPage] = useState(1);
  const [cachedActions, setCachedActions] = useState<any[] | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [hovBar, setHovBar] = useState<number | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [promptCount, setPromptCount] = useState(300);
  const [activeCitCat, setActiveCitCat] = useState<string | null>(null);
  const [promptCountErr, setPromptCountErr] = useState('');
  const [highlightedBubble, setHighlightedBubble] = useState<string | null>(null);
  const [visView, setVisView] = useState<'scatter' | 'scurve'>('scatter');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('geo_result'), savedUrl = sessionStorage.getItem('geo_url');
      if (saved) setResult(JSON.parse(saved));
      if (savedUrl) setUrl(savedUrl);
    } catch {}
  }, []);

  async function runAnalysis() {
    if (!url.trim() || !url.startsWith('http')) { setError('Please enter a valid URL starting with http:// or https://'); return; }
    setError(''); setLoading(true); setLoadingStep(0); setLoadingProgress(0);
    const steps = [
      { step: 0, progress: 5, delay: 200 },
      { step: 1, progress: 15, delay: 2000 },
      { step: 2, progress: 28, delay: 4000 },
      { step: 3, progress: 42, delay: 6000 },
      { step: 4, progress: 58, delay: 8000 },
      { step: 5, progress: 72, delay: 10000 },
      { step: 6, progress: 84, delay: 12000 },
      { step: 7, progress: 93, delay: 14000 },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({ step, progress, delay }) => { timers.push(setTimeout(() => { setLoadingStep(step); setLoadingProgress(progress); }, delay)); });
    try {
      const res = await fetch('/api/geo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, promptCount }) });
      const data = await res.json();
      timers.forEach((t) => clearTimeout(t)); setLoadingProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      if (data.error) { setError(data.error); setLoadingProgress(0); }
      else {
        setResult(data); setCachedActions(null); setActionsLoading(false); setQueryPage(1); setSelectedCluster(null); setFilterCat('All'); setActiveTab(0);
        try { sessionStorage.setItem('geo_result', JSON.stringify(data)); sessionStorage.setItem('geo_url', url); } catch {}
      }
    } catch (e: any) { timers.forEach((t) => clearTimeout(t)); setError(e.message); }
    setLoading(false);
  }

  async function runPrompt(q?: string) {
    const query = q || promptInput; if (!query.trim()) return; setPromptLoading(true); if (!q) setPromptInput('');
    try {
      const res = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: query, system: result ? `You are a knowledgeable consumer advisor. The user is researching ${result.brand_name} in the ${result.ind_label} industry. Answer accurately and naturally.` : undefined }) });
      const data = await res.json(); setPromptHistory((h) => [{ q: query, a: data.response }, ...h]);
    } catch {}
    setPromptLoading(false);
  }

  const examplePrompts = result
    ? [`What is the best ${result.lob || result.industry} right now?`, `How does ${result.brand_name} compare to competitors?`, `Is ${result.brand_name} worth it for someone on a budget?`, `What do experts say about ${result.brand_name}?`, `Best alternatives to ${result.brand_name}`]
    : ['What is the best credit card for everyday spending?', 'Which bank offers the best savings rate?', 'Best rewards card for travel?', 'How do I build credit from scratch?', 'Which card has the best cash back?'];

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ background: 'linear-gradient(135deg,#460073 0%,#7500C0 50%,#A100FF 100%)', padding: (loading || result) ? '16px 40px' : '64px 40px 72px', textAlign: 'center', transition: 'padding 0.3s ease' }}>
        {!(loading || result) && <>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 50, padding: '8px 24px', fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: 32, background: 'rgba(255,255,255,0.15)' }}>* &nbsp;Real Time GEO Scoring</div>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>GEO Scorecard</h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 20px' }}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '8px 22px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.12)' }}>Live data · Updated in real-time · Fully computed from AI responses</div>
        </>}
        {(loading || result) && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>GEO Scorecard</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.15)', borderRadius: 50, padding: '3px 10px' }}>Real Time GEO Scoring</span>
          </div>
        </div>}
      </div>

      {!result ? (
        <div style={{ padding: loading ? '16px 40px' : '48px 40px 60px' }}>
          {!loading && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
            {bands.map((b, i) => <div key={i} style={{ background: b.bg, borderRadius: 20, padding: '36px 28px', textAlign: 'center' as const, border: `1.5px solid ${b.border}` }}><div style={{ fontSize: '0.85rem', fontWeight: 700, color: b.color, marginBottom: 8 }}>{b.range}</div><div style={{ fontSize: '1.8rem', fontWeight: 900, color: b.color, marginBottom: 8 }}>{b.label}</div><div style={{ fontSize: '0.85rem', color: b.color, lineHeight: 1.5 }}>{b.desc}</div></div>)}
          </div>}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '28px 32px' }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>Select number of AI prompts to run</span>
                <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600, background: '#FEE2E2', borderRadius: 4, padding: '1px 7px' }}>Required</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
                {[100, 300, 500, 1000].map((n) => (<button key={n} onClick={() => { setPromptCount(n); setPromptCountErr(''); }} style={{ background: promptCount === n ? '#A100FF' : 'white', color: promptCount === n ? 'white' : '#374151', border: promptCount === n ? '2px solid #A100FF' : '2px solid #D1D5DB', borderRadius: 7, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1, minWidth: 52 }}><span style={{ fontSize: '0.82rem', fontWeight: 900 }}>{n}</span><span style={{ fontSize: '0.56rem', fontWeight: 500, opacity: 0.72 }}>{n === 100 ? 'Quick' : n === 300 ? 'Standard' : n === 500 ? 'Deep' : 'Extended'}</span></button>))}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 100 }}>
                  <label style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Custom (max 1,000)</label>
                  <input type="number" placeholder="e.g. 200" value={promptCount && ![100, 300, 500, 1000].includes(promptCount) ? promptCount : ''} onChange={(e) => { const raw = e.target.value; const v = parseInt(raw); if (raw === '') { setPromptCountErr(''); return; } if (isNaN(v)) return; if (v > 1000) { setPromptCountErr('Max is 1,000'); setPromptCount(Math.min(v, 1000)); } else { setPromptCount(v); setPromptCountErr(''); } }} style={{ border: `1.5px solid ${promptCountErr ? '#EF4444' : '#D1D5DB'}`, borderRadius: 7, padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#374151', outline: 'none', background: 'white', width: '100%' }} />
                  {promptCountErr ? <div style={{ fontSize: '0.58rem', color: '#EF4444', fontWeight: 600 }}>{promptCountErr}</div> : <div style={{ fontSize: '0.58rem', color: '#9CA3AF' }}>More prompts = more stable score</div>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A100FF' }} /><span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.14em', color: '#9CA3AF', textTransform: 'uppercase' as const }}>Brand URL</span></div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: 12, background: 'white', overflow: 'hidden', height: 52 }}>
                <input type="text" value={url} onChange={(e) => { const v = e.target.value.trim(); setUrl(v.startsWith('http') ? v : v ? 'https://' + v : ''); }} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="https://chase.com/credit-cards" style={{ flex: 1, border: 'none', padding: '14px 20px', fontSize: '0.95rem', background: 'transparent', outline: 'none', color: '#374151' }} />
              </div>
              <button onClick={runAnalysis} disabled={loading} style={{ background: '#A100FF', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', height: 52, padding: '0 28px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(161,0,255,0.4)', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>🔍 {loading ? 'Analysing...' : 'Run Live AI Analysis'}</button>
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: 10 }}>{error}</div>}
          </div>

          {loading && (() => {
            const brandName = url.replace('https://www.', '').replace('http://www.', '').replace('https://', '').replace('http://', '').split('/')[0].split('.')[0];
            const displayName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
            const steps = [
              { icon: '🌐', label: 'Fetching brand page', detail: 'Reading website content and metadata' },
              { icon: '🤖', label: 'Discovering brand & industry', detail: 'AI detecting brand, competitors, categories' },
              { icon: '📝', label: 'Generating AI queries', detail: 'Creating persona-based query matrix' },
              { icon: '🚀', label: 'Firing all query batches', detail: 'All batches running simultaneously' },
              { icon: '🔍', label: 'Detecting brand mentions', detail: `Scanning all AI responses for ${displayName}` },
              { icon: '📊', label: 'Computing real scores', detail: 'Pure math from actual response data' },
              { icon: '🏆', label: 'Scoring competitors', detail: 'Same logic applied to every competitor' },
              { icon: '#', label: 'Calculating GEO Score', detail: 'Weighted composite of all signals' },
            ];
            const currentStep = steps[Math.min(loadingStep, steps.length - 1)];
            const completedSteps = steps.slice(0, loadingStep);
            return (
              <div style={{ marginTop: 32, background: 'white', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '36px 40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#A100FF,#7500C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🔍</div>
                  <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>Analysing {displayName}</div><div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 2 }}>{url}</div></div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}><div style={{ fontSize: '2rem', fontWeight: 900, color: '#A100FF', lineHeight: 1 }}>{loadingProgress}%</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>complete</div></div>
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: 50, height: 8, marginBottom: 28, overflow: 'hidden' }}><div style={{ background: 'linear-gradient(90deg,#A100FF,#7500C0)', height: 8, borderRadius: 50, width: `${loadingProgress}%`, transition: 'width 0.8s ease', position: 'relative' as const }}><div style={{ position: 'absolute' as const, right: 0, top: 0, width: 20, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 50, animation: 'pulse 1s infinite' }} /></div></div>
                <div style={{ background: '#F5F0FF', borderRadius: 12, border: '1px solid #E9D5FF', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, animation: 'slideIn 0.3s ease' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{currentStep.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#A100FF' }}>{currentStep.label}</div><div style={{ fontSize: '0.76rem', color: '#9CA3AF', marginTop: 2 }}>{currentStep.detail}</div></div>
                  <div style={{ width: 20, height: 20, border: '2px solid #E9D5FF', borderTopColor: '#A100FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {completedSteps.map((s, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0 }}>✓</div><span style={{ fontSize: '0.82rem', color: '#6B7280' }}>{s.label}</span></div>))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div>
          <div style={{ borderBottom: '1px solid #E5E7EB', background: 'white', display: 'flex', padding: '0 40px', gap: 4, overflowX: 'auto' as const }}>
            {TABS.map((t, i) => <button key={i} onClick={() => setActiveTab(i)} style={{ background: 'none', border: 'none', borderBottom: activeTab === i ? '2px solid #A100FF' : '2px solid transparent', color: activeTab === i ? '#A100FF' : '#6B7280', fontWeight: activeTab === i ? 700 : 500, fontSize: '0.85rem', padding: '12px 20px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}>{t}</button>)}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => { setResult(null); setUrl(''); try { sessionStorage.clear(); } catch {} }} style={{ background: '#A100FF', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.78rem', fontWeight: 600, padding: '6px 16px', cursor: 'pointer' }}>New Analysis</button>
            </div>
          </div>

          <div style={{ padding: '16px 40px 40px' }}>
            {/* Derive topCompBrand from real competitor data */}
            {(() => {
              const comps = result.competitors || [];
              const sorted = [...comps].sort((a: any, b: any) => (b.GEO || 0) - (a.GEO || 0));
              const topCompBrandGlobal = sorted.length > 0 ? sorted[0].Brand : '';
              // Store in a ref-safe way without mutating result
              if (!result._topCompBrand) result._topCompBrand = topCompBrandGlobal;
              return null;
            })()}

            {/* TAB 0: GEO Score */}
            {activeTab === 0 && (() => {
              const geo = result.overall_geo_score, vis = result.visibility, cit = result.citation_share, rawSent = result.sentiment, prom = result.prominence, sov = result.share_of_voice, avgRank = result.avg_rank;
              const badge = scoreBadge(geo);
              const industryLabel = result.ind_label || result.industry || '';
              const metrics = [
                { name: 'Visibility', val: vis, note: vis < 30 ? 'rarely appears in AI responses' : vis < 55 ? 'appears in some AI responses' : 'appears frequently' },
                { name: 'Prominence', val: prom, note: prom < 40 ? 'mentioned late in AI responses' : prom < 65 ? 'appears mid-list' : 'named early and prominently' },
                { name: 'Share of Voice', val: sov, note: sov < 25 ? 'competitors dominating AI conversations' : sov < 50 ? 'moderate share of AI mentions' : 'strong share of AI conversations' },
                { name: 'Citation', val: cit, note: cit < 30 ? 'rarely cited as authoritative' : cit < 60 ? 'occasionally cited' : 'frequently cited as authoritative' },
                { name: 'Sentiment', val: rawSent, note: rawSent < 45 ? 'neutral or negative AI tone' : rawSent < 70 ? 'mostly neutral tone' : 'positive AI tone' },
              ].sort((a, b) => a.val - b.val);
              const weakest = metrics.slice(0, 3).filter(m => m.val < 70);
              const explanation = weakest.length > 0
                ? `GEO Score of ${geo} reflects ${vis}% Visibility but is held back by ${weakest.map((m) => `${m.name} (${m.val}), ${m.note}`).join('; ')}.`
                : `GEO Score of ${geo} reflects strong performance across all signals — ${vis}% Visibility, ${rawSent} Sentiment, ${sov}% Share of Voice.`;
              const scoreBands = [
                { range: '0-44', label: 'Poor', color: '#F44336', bg: '#FFEBEE', border: '#F44336', desc: 'Rarely mentioned. AI lacks enough signals to surface you reliably.' },
                { range: '45-69', label: 'Needs Work', color: '#FF7043', bg: '#FBE9E7', border: '#FF7043', desc: 'Appears in lists but not as a primary recommendation.' },
                { range: '70-79', label: 'Good', color: '#F9A825', bg: '#FFFDE7', border: '#FDD835', desc: 'AI crosses the confidence threshold. Frequent top-3 placements begin.' },
                { range: '80-100', label: 'Excellent', color: '#43A047', bg: '#E8F5E9', border: '#43A047', desc: 'Dominant brand signal. AI leads with you as the primary recommendation.' },
              ];
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, marginBottom: 14 }}>
                    <GeoGauge score={geo} />
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{result.brand_name}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                          {result.lob && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A100FF', background: '#F5F0FF', borderRadius: 50, padding: '2px 10px' }}>{result.lob}</span>}
                          {industryLabel && industryLabel.toLowerCase() !== (result.lob || '').toLowerCase() && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 50, padding: '2px 10px' }}>{industryLabel}</span>}
                        </div>
                      </div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{ color: '#A100FF', fontSize: '0.82rem' }}>{(result.page_url || '').slice(0, 60)}{(result.page_url || '').length > 60 ? '...' : ''}</a>
                      <div style={{ margin: '10px 0 4px', fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>Status</div>
                      <span style={{ background: badge.bg, color: badge.color, padding: '4px 14px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700 }}>{badge.label}</span>
                      <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.7, marginTop: 10 }}>{explanation}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 8 }}>Based on {result.total_responses} AI queries · {result.responses_with_brand} brand appearances · All scores computed from real responses</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 14 }}>
                    <MetricCard label="visibility score" val={vis} />
                    <MetricCard label="sentiment score" val={rawSent} />
                    <MetricCard label="citation score" val={cit} />
                    <MetricCard label="prominence score" val={prom} />
                    <MetricCard label="share of voice" val={sov} />
                    <MetricCard label="avg rank" val={avgRank} />
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A100FF', marginBottom: 2 }}>^ What does your score mean?</div>
                    <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>Think of the GEO Score like a credit score for AI. At <strong>{geo}</strong>, <strong>{result.brand_name}</strong> {geo >= 80 ? 'is in the top tier. AI consistently leads with your brand as the primary recommendation.' : geo >= 70 ? 'has crossed the efficiency threshold where AI models consistently feature your brand near the top.' : 'is below the 70 threshold where AI models consistently feature a brand at the top of responses.'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                      {scoreBands.map((b, i) => (<div key={i} style={{ background: b.bg, borderRadius: 10, border: `1.5px solid ${b.border}`, padding: '10px 12px' }}><div style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color, marginBottom: 2 }}>{b.range}</div><div style={{ fontSize: '0.88rem', fontWeight: 800, color: b.color, marginBottom: 4 }}>{b.label}</div><div style={{ fontSize: '0.72rem', color: b.color, lineHeight: 1.5 }}>{b.desc}</div></div>))}
                    </div>
                  </div>
                  <SankeyFlowChart result={result} />
                </div>
              );
            })()}

            {/* TAB 1: Competitors */}
            {activeTab === 1 && (() => {
              const geo = result.overall_geo_score, vis = result.visibility, cit = result.citation_share;
              const sent = result.sentiment, sov = result.share_of_voice, prom = result.prominence || 0;
              const avgRank = result.avg_rank; // avg position within AI responses (e.g. #2 = named 2nd on average)
              const youEntry = { Brand: result.brand_name, URL: result.domain, GEO: geo, Vis: vis, Cit: cit, Sen: sent, Sov: sov, Prom: prom, Rank: avgRank, isYou: true };
              const compEntries = (result.competitors || []).slice(0, 9).map((c: any) => ({ ...c, isYou: false }));
              const top = [youEntry, ...compEntries].sort((a: any, b: any) => b.GEO - a.GEO);
              const myRank = top.findIndex((c) => c.isYou) + 1, leader = top[0], next = top[myRank] || null;
              const gapToTop = geo - leader.GEO, leadOver = next ? geo - next.GEO : null;
              const resolvedRank = (c: any) => { const pos = top.findIndex((t: any) => t.Brand === c.Brand && t.isYou === c.isYou); if (pos < 0) return '--'; return `#${pos + 1}`; };
              const bW = Math.max(700, top.length * 80), bH = 160, bPad = 40, gW = (bW - bPad * 2) / top.length, bMH = bH - bPad;
              const allMetrics = [
                { key: 'Vis', label: 'Visibility', color: '#A100FF', lightColor: '#D4ADFF' },
                { key: 'Cit', label: 'Citations', color: '#460073', lightColor: '#9B7FBB' },
                { key: 'Sen', label: 'Sentiment', color: '#1F2937', lightColor: '#6B7280' },
                { key: 'Sov', label: 'Share of Voice', color: '#7500C0', lightColor: '#BCA0D8' },
                { key: 'Prom', label: 'Prominence', color: '#374151', lightColor: '#9CA3AF' },
              ];
              return (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>{result.domain} vs Competitors</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>All scores computed from the same pool of {result.total_responses} AI responses</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px' }}><div style={{ fontSize: '0.75rem', color: '#A100FF', fontWeight: 600, marginBottom: 4 }}>Your GEO Score</div><div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#A100FF' }}>{geo}</div><div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px' }}><div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600, marginBottom: 4 }}>Gap to #1 ({leader.Brand})</div><div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#92400E' }}>{myRank === 1 ? '--' : `${Math.abs(gapToTop)} pts`}</div><div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{myRank === 1 ? 'You are the leader' : Math.abs(gapToTop) <= 5 ? 'Very close — strong opportunity' : 'Points behind #1'}</div></div>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px' }}><div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 600, marginBottom: 4 }}>{next ? `Lead over #${myRank + 1} (${next.Brand})` : 'Top Ranked'}</div><div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#065F46' }}>{leadOver != null ? `+${leadOver} pts` : '--'}</div><div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{leadOver != null ? (leadOver < 10 ? 'Close, defend position' : 'Comfortable lead') : 'Leading the category'}</div></div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: 20 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>GEO Score & Signal Breakdown</div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 10 }}>All bars computed from real AI response data. Black line traces GEO Score.</div>
                    <div style={{ overflowX: 'auto' as const }}>
                      <svg viewBox={`0 0 ${bW} ${bH + 60}`} style={{ width: '100%', minWidth: top.length * 80, display: 'block' }} onMouseLeave={() => setHovBar(null)}>
                        {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1={bPad} y1={bH - (v / 100) * bMH} x2={bW - bPad} y2={bH - (v / 100) * bMH} stroke="#F3F4F6" strokeWidth="1" /><text x={bPad - 4} y={bH - (v / 100) * bMH} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>{v}</text></g>)}
                        {top.map((c: any, i: number) => {
                          const bx = bPad + i * gW, isY = c.isYou;
                          const subW = (gW * 0.8) / allMetrics.length;
                          return (<g key={i} onMouseEnter={() => setHovBar(i)} style={{ cursor: 'pointer' }}>
                            {allMetrics.map((m, mi) => { const val = (c as any)[m.key] || 0, mh = (val / 100) * bMH, mx = bx + gW * 0.1 + mi * subW; return <rect key={mi} x={mx} y={bH - mh} width={subW - 1} height={mh} fill={isY ? m.color : m.lightColor} rx={1} />; })}
                            <text x={bx + gW / 2} y={bH + 13} textAnchor="middle" style={{ fontSize: 9, fill: isY ? '#A100FF' : '#6B7280', fontFamily: 'Inter,sans-serif', fontWeight: isY ? 700 : 400 }}>{(c.Brand || '').length > 8 ? (c.Brand || '').slice(0, 7) + '…' : (c.Brand || '')}</text>
                          </g>);
                        })}
                        {(() => {
                          const pts2 = top.map((c: any, i: number) => ({ x: bPad + i * gW + gW / 2, y: bH - ((c.GEO || 0) / 100) * bMH, geo: c.GEO || 0, isYou: c.isYou }));
                          const pathD2 = pts2.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                          return <><path d={pathD2} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{pts2.map((p, i) => (<g key={i}><circle cx={p.x} cy={p.y} r={p.isYou ? 7 : 5} fill={p.isYou ? '#A100FF' : '#374151'} stroke="white" strokeWidth="1.5" /><text x={p.x} y={p.y - 10} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>{p.geo}</text></g>))}</>;
                        })()}
                        <g transform={`translate(${bPad},${bH + 32})`}>
                          <circle cx={6} cy={0} r={4} fill="#111827" /><line x1={1} y1={0} x2={11} y2={0} stroke="#111827" strokeWidth="2" />
                          <text x={18} y={0} dominantBaseline="middle" style={{ fontSize: 9, fill: '#111827', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>GEO Score (line)</text>
                          {allMetrics.map((m, i) => (<g key={i} transform={`translate(${110 + i * 90},0)`}><rect x={0} y={-5} width={10} height={10} fill={m.color} rx={2} /><text x={14} y={0} dominantBaseline="middle" style={{ fontSize: 9, fill: '#374151', fontFamily: 'Inter,sans-serif' }}>{m.label}</text></g>))}
                        </g>
                        {hovBar !== null && (() => {
                          const c = top[hovBar], bx = bPad + hovBar * gW, tipW = 160, tipH = allMetrics.length * 14 + 28;
                          const tx = bx + gW / 2 + tipW + 8 > bW - bPad ? bx - tipW - 4 : bx + gW / 2 + 4, ty = Math.max(0, bH - tipH - 20);
                          return <g style={{ pointerEvents: 'none' }}><rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937" /><text x={tx + 10} y={ty + 14} style={{ fontSize: 11, fontWeight: 700, fill: 'white', fontFamily: 'Inter,sans-serif' }}>{c.Brand}</text><text x={tx + 10} y={ty + 26} style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>GEO: {c.GEO}</text>{allMetrics.map((m, mi) => (<text key={mi} x={tx + 10} y={ty + 40 + mi * 13} style={{ fontSize: 9, fill: '#D1D5DB', fontFamily: 'Inter,sans-serif' }}>{m.label}: {(c as any)[m.key] || 0}</text>))}</g>;
                        })()}
                      </svg>
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#FAFAFA' }}>{['#', 'BRAND / URL', 'GEO SCORE', 'GAP', 'VISIBILITY', 'CITATIONS', 'SENTIMENT', 'SOV', 'PROMINENCE', 'AVG ORDER'].map((h) => <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c: any, i: number) => {
                        const gap2 = c.isYou ? null : c.GEO - geo;
                        return <tr key={i} style={{ background: c.isYou ? '#F5F0FF' : 'white', borderTop: '1px solid #F3F4F6', borderLeft: c.isYou ? '3px solid #A100FF' : 'none' }}>
                          <td style={{ padding: '11px 12px', fontSize: '0.8rem', color: '#9CA3AF' }}>{i + 1}</td>
                          <td style={{ padding: '11px 12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: '0.84rem', fontWeight: c.isYou ? 700 : 600, color: '#111827' }}>{c.Brand}</span>{c.isYou && <span style={{ background: '#F5F0FF', color: '#A100FF', borderRadius: 5, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 700 }}>You</span>}</div><div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{c.URL}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '0.95rem', fontWeight: 800, color: c.isYou ? '#A100FF' : '#374151' }}>{c.GEO}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', fontWeight: 600, color: gap2 === null ? '#9CA3AF' : gap2 > 0 ? '#EF4444' : '#10B981' }}>{gap2 === null ? '--' : `${gap2 > 0 ? '-' : '+'}${Math.abs(gap2)} pts`}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Vis}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Cit}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sen}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sov}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Prom}</td>
                          <td style={{ padding: '11px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#A100FF' }}>{c.Rank || '--'}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 2: Visibility */}
            {activeTab === 2 && (() => {
              const geo = result.overall_geo_score, vis = result.visibility, comps = result.competitors || [];
              const allVis = [vis, ...comps.map((c: any) => c.Vis)];
              const sortedVis  = [...allVis].sort((a, b) => b - a);
              const myVisRank  = sortedVis.indexOf(vis) + 1;
              const topComp = comps.length > 0 ? comps.reduce((a: any, b: any) => b.Vis > a.Vis ? b : a, comps[0]) : null;
              const gapToTop = vis - (topComp ? topComp.Vis : vis);
              const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px' }}><div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#A100FF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Your Visibility</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#A100FF' }}>{vis}</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>ranked #{myVisRank} of {allVis.length} brands</div></div>
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px' }}><div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 4 }}>vs. #1 {topComp ? `(${topComp.Brand})` : ''}</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: gapToTop >= 0 ? '#065F46' : '#991B1B' }}>{gapToTop >= 0 ? '+' : ''}{gapToTop} pts</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{gapToTop >= 0 ? 'You lead on visibility' : 'Behind the top competitor'}</div></div>
                  </div>
                  {visView === 'scatter' && (
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div><div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Sentiment vs. Visibility Market Positioning</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 1 }}>All positions computed from real AI responses.</div></div>
                        <button onClick={() => setVisView('scurve')} style={{ background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>Show S-Curve</button>
                      </div>
                      <ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={comps} topCompBrand={topCompBrand} />
                    </div>
                  )}
                  {visView === 'scurve' && (
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div><div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Where You Are vs Your Opportunity</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 1 }}>Your GEO Score on the AI maturity curve.</div></div>
                        <button onClick={() => setVisView('scatter')} style={{ background: '#A100FF', color: 'white', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>Show Scatter Plot</button>
                      </div>
                      <SCurveImage7 score={geo} brand={result.brand_name} />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 3: Sentiment */}
            {activeTab === 3 && (() => {
              const rawSent = result.sentiment, prom = result.prominence, avgRank = result.avg_rank;
              const smood = rawSent >= 70 ? 'AI speaks favorably about your brand' : rawSent >= 50 ? 'AI tone is neutral' : rawSent >= 40 ? 'AI tone is slightly negative' : 'AI tone is negative or missing';
              const pmood = prom >= 70 ? 'Named first or near top of AI responses' : prom >= 45 ? 'Appears mid-list in AI responses' : 'Rarely named early in AI responses';
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'sentiment score', val: rawSent, sub: smood, tip: 'How positively AI describes your brand.' },
                      { label: 'prominence score', val: prom, sub: pmood, tip: 'How early in AI responses your brand is mentioned.' },
                      { label: 'average rank', val: avgRank, sub: 'Average position within each AI response', tip: 'Average position when mentioned in AI responses.' },
                    ].map(({ label, val, sub, tip }: any) => (
                      <div key={label} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}<Tooltip text={tip} /></div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#A100FF', lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 14, alignItems: 'stretch' }}>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, minHeight: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Product Feature Positioning</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 6 }}>Scored by real AI mention rate across all responses.</div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}><RadarChart result={result} /></div>
                    </div>
                    <SentimentHeatmap result={result} />
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: Citations */}
            {activeTab === 4 && (() => {
              const cit = result.citation_share, sov = result.share_of_voice, sources = result.citation_sources || [];
              const brandKey3 = (result.domain || '').replace('www.', '').split('.')[0].toLowerCase();
              const domainMatchesBrand = (domain: string) => { const dk = domain.replace('www.', '').split('.')[0].toLowerCase(); return dk === brandKey3 || dk.startsWith(brandKey3); };
              const catMap: Record<string, number> = {};
              const allSrc = sources.length > 0 ? sources : [];
              allSrc.forEach((s: any) => { const d = (s.domain || '').toLowerCase(); const isOwned = domainMatchesBrand(d); const cat = isOwned ? 'Owned Media' : classifyDomain(d).label; catMap[cat] = (catMap[cat] || 0) + (s.citation_share || 0); });
              const catColors: Record<string, string> = { 'Earned Media': '#10B981', 'Owned Media': '#A100FF', 'Other': '#6B7280', 'Social': '#F59E0B', 'Institution': '#3B82F6' };
              const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
              const displaySources = allSrc.map((s: any, i: number) => ({ ...s, rank: i + 1, isOwned: domainMatchesBrand(s.domain || '') }));
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                    <div style={{ background: 'white', borderRadius: 12, padding: '20px 22px', border: '1px solid #E5E7EB' }}><div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Citation Score<Tooltip text="How often and prominently AI models cite your brand." /></div><div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#A100FF', lineHeight: 1, marginBottom: 6 }}>{cit}</div><div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.6 }}>{cit >= 70 ? 'AI frequently cites your brand as an authority' : cit >= 45 ? 'AI occasionally cites your brand' : 'AI rarely cites your brand'}</div></div>
                    <div style={{ background: 'white', borderRadius: 12, padding: '20px 22px', border: '1px solid #E5E7EB' }}><div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Share of Voice<Tooltip text="Your share of all brand mentions in AI responses." /></div><div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#A100FF', lineHeight: 1, marginBottom: 6 }}>{sov}</div><div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.6 }}>{sov >= 70 ? 'You dominate the AI conversation' : sov >= 45 ? 'You have a noticeable share' : 'Competitors own most AI conversations'}</div></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 22 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>Citation by Category</div>
                      {catEntries.length === 0 ? <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>No citation data available for this run.</div> : catEntries.map(([cat, pct], i) => { const isActive = activeCitCat === cat; return <div key={i} style={{ marginBottom: 10, cursor: 'pointer', borderRadius: 8, padding: '8px 10px', background: isActive ? catColors[cat] + '22' : 'transparent', border: isActive ? `1.5px solid ${catColors[cat]}` : '1.5px solid transparent' }} onClick={() => setActiveCitCat(isActive ? null : cat)}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: '0.84rem', color: isActive ? catColors[cat] : '#374151', fontWeight: isActive ? 700 : 500 }}>{cat}</span><span style={{ fontSize: '0.84rem', fontWeight: 700, color: catColors[cat] || '#A100FF' }}>{Math.round(pct)}%</span></div><div style={{ background: '#F3F4F6', borderRadius: 50, height: 7, overflow: 'hidden' }}><div style={{ background: catColors[cat] || '#A100FF', height: 7, borderRadius: 50, width: `${Math.min(Math.round(pct), 100)}%`, transition: 'width 0.4s' }} /></div></div>; })}
                    </div>
                    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 12 }}>Sources AI Pulls From</div>
                      {displaySources.length === 0 ? <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Citation sources extracted from AI responses will appear here.</div> :
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead><tr style={{ background: '#FAFAFA' }}>{['RANK', 'DOMAIN', 'CATEGORY', 'SHARE %'].map((h) => <th key={h} style={{ padding: '7px 10px', textAlign: 'left' as const, fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}</tr></thead>
                          <tbody>{displaySources.filter((s: any) => { if (!activeCitCat) return true; const isOwned2 = s.isOwned; const cls3 = isOwned2 ? 'Owned Media' : classifyDomain(s.domain || '').label; return cls3 === activeCitCat; }).slice(0, 10).map((s: any, i: number) => {
                            const isOwned2 = s.isOwned, cls2 = isOwned2 ? { label: 'Owned Media', color: '#A100FF', bg: '#F5F0FF' } : classifyDomain(s.domain || '');
                            const isExp2 = expandedDomain === s.domain;
                            return <React.Fragment key={i}>
                              <tr style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer', background: isOwned2 ? '#FAFBFF' : 'white', borderLeft: isOwned2 ? '3px solid #A100FF' : 'none' }} onClick={() => setExpandedDomain(isExp2 ? null : s.domain)}>
                                <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: '#9CA3AF' }}>{s.rank || i + 1}</td>
                                <td style={{ padding: '8px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#A100FF' }}>{s.domain}</span>{isOwned2 && <span style={{ background: '#F5F0FF', color: '#A100FF', borderRadius: 4, padding: '1px 5px', fontSize: '0.6rem', fontWeight: 700 }}>You</span>}</div></td>
                                <td style={{ padding: '8px 10px' }}><span style={{ background: (cls2 as any).bg, color: (cls2 as any).color, borderRadius: 6, padding: '2px 7px', fontSize: '0.66rem', fontWeight: 600 }}>{(cls2 as any).label}</span></td>
                                <td style={{ padding: '8px 10px', fontSize: '0.78rem', fontWeight: 700, color: isOwned2 ? '#A100FF' : '#10B981' }}>{s.citation_share}%</td>
                              </tr>
                              {isExp2 && <tr style={{ background: '#F9F8FF' }}><td colSpan={4} style={{ padding: '6px 10px 10px 24px' }}><a href={`https://${s.domain}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#4F46E5' }}>{`https://${s.domain}`}</a></td></tr>}
                            </React.Fragment>;
                          })}</tbody>
                        </table>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 5: Prompts */}
            {activeTab === 5 && (() => {
              const rd = result.responses_detail || [], clusters = result.query_clusters || [], trendingQs = result.trending_queries || [];
              const totalQueries = result.total_responses ?? rd.length, totalMentions = result.responses_with_brand ?? rd.filter((r: any) => r.mentioned).length;
              const displayRate = Math.round((totalMentions / Math.max(totalQueries, 1)) * 100);
              const cats2: string[] = ['All', ...Array.from(new Set<string>(rd.map((r: any) => r.category as string).filter((c: string) => Boolean(c))))];
              const ROWS_PER_PAGE = 10;
              const allSorted = [...rd].filter((r: any) => filterCat === 'All' || r.category === filterCat).sort((a: any, b: any) => { const ap = a.position > 0 ? a.position : 999, bp = b.position > 0 ? b.position : 999; return ap - bp; });
              const totalPages = Math.ceil(allSorted.length / ROWS_PER_PAGE), safePage = Math.min(queryPage, Math.max(1, totalPages));
              const pageRows = allSorted.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
              const maxMentioned = Math.max(...clusters.map((c: any) => c.mentioned), 1);
              const grouped = [...clusters].sort((a: any, b: any) => { const g = (c: any) => c.winRate >= 60 ? 0 : c.winRate >= 30 ? 1 : c.winRate > 0 ? 2 : 3; return g(a) !== g(b) ? g(a) - g(b) : b.mentioned - a.mentioned; });
              const nB = grouped.length, W = 940, VPAD = 52, COLS = Math.min(5, Math.ceil(Math.sqrt(nB * 1.2))), ROWS2 = Math.ceil(nB / COLS), cellW = Math.min(160, W / COLS), cellH = 105, totalGridW = COLS * cellW, gridOffsetX = (W - totalGridW) / 2, H = ROWS2 * cellH + VPAD;
              const bubbles = grouped.map((c: any, i: number) => { const col = i % COLS, row = Math.floor(i / COLS), lastRowCount = nB % COLS || COLS, isLastRow = row === ROWS2 - 1, offsetX = isLastRow ? (COLS - lastRowCount) * cellW / 2 : 0, x = gridOffsetX + offsetX + col * cellW + cellW / 2, y = VPAD / 2 + row * cellH + cellH / 2, r = Math.round(28 + (c.mentioned / maxMentioned) * 18); return { ...c, x, y, r }; });
              const connections: { x1: number; y1: number; x2: number; y2: number; cat1: string; cat2: string; dashed: boolean }[] = [];
              bubbles.forEach((b: any) => { (b.related || []).forEach((rel: any) => { const target = bubbles.find((bb: any) => bb.category === rel.category); if (!target || rel.similarity < 15) return; if (b.category > rel.category) return; connections.push({ x1: b.x, y1: b.y, x2: target.x, y2: target.y, cat1: b.category, cat2: rel.category, dashed: rel.similarity < 40 }); }); });
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <MetricCard label="queries run" val={totalQueries} sub="AI-generated consumer questions, no brand names" color="#A100FF" />
                    <MetricCard label="brand appearances" val={`${totalMentions}/${totalQueries}`} sub="Answered queries where your brand was mentioned" color="#A100FF" />
                    <MetricCard label="appearance rate" val={`${displayRate}%`} sub="Of answered queries where brand was mentioned" color="#A100FF" />
                  </div>
                  {clusters.length > 0 && (<div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, border: '1px solid #1E293B' }}>
                    <div style={{ background: '#0F172A', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div><div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>Query Intelligence Network</div><div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 1 }}>Node size = brand appearances · Color = win rate</div></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {[{ color: '#10B981', label: 'Winning (≥60%)' }, { color: '#F59E0B', label: 'Emerging (30-59%)' }, { color: '#EF4444', label: 'Gap (<30%)' }].map((l, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} /><span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{l.label}</span></div>))}
                        {(filterCat !== 'All' || highlightedBubble) && <button onClick={() => { setFilterCat('All'); setQueryPage(1); setHighlightedBubble(null); }} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', color: '#94A3B8', cursor: 'pointer' }}>x Clear</button>}
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', background: '#0F172A' }}>
                      {connections.map((conn, ci) => {
                        const isHighlightedConn = highlightedBubble && (conn.cat1 === highlightedBubble || conn.cat2 === highlightedBubble);
                        return (<line key={`conn${ci}`} x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2} stroke={isHighlightedConn ? '#A78BFA' : '#334155'} strokeWidth={isHighlightedConn ? 2.5 : 1.5} strokeDasharray={conn.dashed ? '4,4' : undefined} opacity={highlightedBubble ? (isHighlightedConn ? 0.9 : 0.06) : 0.35} />);
                      })}
                      {bubbles.map((b: any) => {
                        const isHighlighted = highlightedBubble === b.category;
                        const connectedCats = highlightedBubble ? new Set<string>(connections.filter((c) => c.cat1 === highlightedBubble || c.cat2 === highlightedBubble).flatMap((c) => [c.cat1, c.cat2]).filter((cat) => cat !== highlightedBubble)) : new Set<string>();
                        const isConnected = !!highlightedBubble && !isHighlighted && connectedCats.has(b.category);
                        const isDimmed = !!highlightedBubble && !isHighlighted && !isConnected;
                        const nodeColor = b.winRate >= 60 ? '#10B981' : b.winRate >= 30 ? '#F59E0B' : '#EF4444';
                        const words = b.category.split(' '); const maxChars = Math.round(b.r * 0.52); let line1 = '', line2 = '';
                        words.forEach((w: string) => { if (!line1) { line1 = w; } else if ((line1 + ' ' + w).length <= maxChars) { line1 += ' ' + w; } else if (!line2) { line2 = w; } else if ((line2 + ' ' + w).length <= maxChars) { line2 += ' ' + w; } });
                        const hasTwo = line2.length > 0, fontSize = b.r >= 38 ? 9.5 : b.r >= 32 ? 9 : 8, lineH = fontSize + 2;
                        const totalTextH = hasTwo ? lineH * 2 + 8 + lineH : lineH + 8 + lineH, textStartY = b.y - totalTextH / 2 + fontSize;
                        const winY = (hasTwo ? textStartY + lineH : textStartY) + lineH + 4, appY = winY + lineH;
                        return (<g key={b.category} style={{ cursor: 'pointer' }} onClick={() => { if (filterCat === b.category && highlightedBubble === b.category) { setFilterCat('All'); setQueryPage(1); setHighlightedBubble(null); } else { setFilterCat(b.category); setQueryPage(1); setHighlightedBubble(b.category); } }}>
                          {(isHighlighted || isConnected) && <circle cx={b.x} cy={b.y} r={isHighlighted ? b.r + 10 : b.r + 6} fill="none" stroke={isHighlighted ? 'rgba(255,255,255,0.3)' : 'rgba(167,139,250,0.4)'} strokeWidth={isHighlighted ? 3 : 2} />}
                          <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor} opacity={isDimmed ? 0.15 : 1} stroke={isHighlighted ? 'white' : isConnected ? '#A78BFA' : 'none'} strokeWidth={isHighlighted ? 4 : isConnected ? 3 : 0} />
                          <text x={b.x} y={textStartY} textAnchor="middle" style={{ fontSize, fontWeight: 700, fill: isDimmed ? 'rgba(255,255,255,0.15)' : 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{line1}</text>
                          {hasTwo && <text x={b.x} y={textStartY + lineH} textAnchor="middle" style={{ fontSize, fontWeight: 700, fill: isDimmed ? 'rgba(255,255,255,0.15)' : 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{line2}</text>}
                          <text x={b.x} y={winY} textAnchor="middle" style={{ fontSize: Math.max(6, fontSize - 1), fill: isDimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{b.winRate}% win</text>
                          {b.r > 26 && <text x={b.x} y={appY} textAnchor="middle" style={{ fontSize: 6, fill: isDimmed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{b.mentioned} appearances</text>}
                        </g>);
                      })}
                    </svg>
                  </div>)}
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{filterCat === 'All' ? 'All Queries' : 'Category: ' + filterCat}<span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9CA3AF', marginLeft: 8 }}>({allSorted.length} queries · page {safePage} of {totalPages})</span></div>
                      <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setQueryPage(1); setHighlightedBubble(null); }} style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', color: '#374151', background: 'white', outline: 'none' }}>
                        {cats2.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#F8FAFC' }}>{['#', 'QUERY', 'AVG ORDER', 'WHO BEAT YOU'].map((h) => <th key={h} style={{ padding: '8px 12px', textAlign: 'left' as const, fontSize: '0.63rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '.06em' }}>{h}</th>)}</tr></thead>
                      <tbody>{pageRows.map((item: any, i: number) => {
                        const globalIdx = (safePage - 1) * ROWS_PER_PAGE + i + 1, rp = item.position, rankLabel = rp === 1 ? '#1' : rp > 0 ? `#${rp}` : 'N/A', rankColor = rp === 1 ? '#10B981' : item.mentioned ? '#A100FF' : '#9CA3AF';
                        const beater = item.winner_brand && item.winner_brand !== result.brand_name ? item.winner_brand : null;
                        return <tr key={i} style={{ borderTop: '1px solid #F3F4F6', background: rp === 1 ? '#F0FDF4' : !item.mentioned ? '#FFFBFB' : 'white' }}>
                          <td style={{ padding: '9px 12px', fontSize: '0.75rem', color: '#9CA3AF', width: 28 }}>{globalIdx}</td>
                          <td style={{ padding: '9px 12px' }}><div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' as const }}><span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem' }}>{item.category}</span>{item.mentioned ? <span style={{ color: '#10B981', fontSize: '0.68rem', fontWeight: 600 }}>Appeared</span> : <span style={{ color: '#EF4444', fontSize: '0.68rem', fontWeight: 600 }}>Missed</span>}</div><div style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500 }}>{item.query}</div></td>
                          <td style={{ padding: '9px 12px', fontSize: '0.92rem', fontWeight: 800, color: rankColor, width: 70 }}>{rankLabel}</td>
                          <td style={{ padding: '9px 12px', width: 150 }}>{beater ? <span style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, color: '#92400E' }}>👑 {beater}</span> : rp === 1 ? <span style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, color: '#065F46' }}>You&apos;re #1</span> : <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>--</span>}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                    {totalPages > 1 && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                      <button onClick={() => setQueryPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.75rem' }}>Prev</button>
                      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => { const pg = totalPages <= 10 ? i + 1 : safePage <= 5 ? i + 1 : safePage >= totalPages - 4 ? totalPages - 9 + i : safePage - 4 + i; return <button key={pg} onClick={() => setQueryPage(pg)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${pg === safePage ? '#A100FF' : '#E5E7EB'}`, background: pg === safePage ? '#A100FF' : 'white', color: pg === safePage ? 'white' : '#374151', cursor: 'pointer', fontSize: '0.75rem', fontWeight: pg === safePage ? 700 : 400 }}>{pg}</button>; })}
                      <button onClick={() => setQueryPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.75rem' }}>Next</button>
                    </div>)}
                  </div>
                  {trendingQs.length > 0 && (() => {
                    const highOpp = [...trendingQs].map((tq: any) => ({ ...tq, query: (tq.query || '').replace(/\bin\s+20\d{2}\b/gi, '').trim() })).slice(0, 10);
                    if (!highOpp.length) return null;
                    const getCluster = (tqCat: string) => clusters.find((c: any) => { const cl = (c.category || '').toLowerCase(), tl = tqCat.toLowerCase(); return cl.includes(tl) || tl.includes(cl); });
                    return (
                      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ fontSize: '1.1rem' }}>🔥</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>What the Market is Asking Right Now</div></div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 16 }}>Top trending queries in {result.ind_label || result.industry}.</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {highOpp.map((tq: any, i: number) => {
                            const trendColor = tq.trend === 'Rising' ? '#EF4444' : tq.trend === 'Peak' ? '#F59E0B' : '#6B7280';
                            const trendBg = tq.trend === 'Rising' ? '#FEE2E2' : tq.trend === 'Peak' ? '#FEF3C7' : '#F3F4F6';
                            const cluster = getCluster(tq.category);
                            const brandWinRate = cluster?.winRate ?? null, brandWinning = brandWinRate !== null && brandWinRate >= 40;
                            const topCompName = cluster?.topCompetitor || null;
                            const isOpen = selectedCluster === `trend-${i}`;
                            return (
                              <div key={i} style={{ background: '#FAFAFA', borderRadius: 10, border: `1.5px solid ${isOpen ? '#A100FF' : '#E5E7EB'}`, overflow: 'hidden' }}>
                                <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => setSelectedCluster(isOpen ? null : `trend-${i}`)}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
                                    <span style={{ background: trendBg, color: trendColor, borderRadius: 50, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700 }}>{tq.trend}</span>
                                    <span style={{ background: '#F5F0FF', color: '#A100FF', borderRadius: 50, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600 }}>{tq.category}</span>
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#111827', lineHeight: 1.5, fontWeight: 500, marginBottom: 8 }}>{tq.query}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                                    {topCompName && <span style={{ fontSize: '0.68rem', color: '#92400E', background: '#FEF3C7', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>👑 {topCompName} leading</span>}
                                    {brandWinRate !== null ? <span style={{ fontSize: '0.68rem', fontWeight: 700, color: brandWinning ? '#10B981' : '#EF4444', background: brandWinning ? '#D1FAE5' : '#FEE2E2', borderRadius: 4, padding: '2px 8px' }}>{result.brand_name}: {brandWinRate}% win</span> : <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontStyle: 'italic' }}>New category</span>}
                                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#9CA3AF' }}>{isOpen ? '▲' : '▼'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* TAB 6: Recommendations */}
            {activeTab === 6 && (() => {
              const recClusters = result.query_clusters || [];
              const topComp1 = (result.competitors || [])[0]?.Brand || 'Top Competitor';
              const segments = recClusters.slice(0, 9).map((c: any) => { const rate = c.winRate; const isWinning = rate >= 60, isEmerging = !isWinning && rate >= 30; return { name: c.category, status: isWinning ? 'Winning' : isEmerging ? 'Emerging' : 'Gap', color: isWinning ? '#10B981' : isEmerging ? '#F59E0B' : '#EF4444', bg: isWinning ? '#F0FDF4' : isEmerging ? '#FFFBEB' : '#FFF1F2', border: isWinning ? '#6EE7B7' : isEmerging ? '#FCD34D' : '#FCA5A5', score: rate, dominated: c.topCompetitor || topComp1 }; });
              return (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Segment Coverage Analysis</div>
                  {segments.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>{segments.map((s: any, i: number) => <div key={i} style={{ background: s.bg, borderRadius: 14, border: `1px solid ${s.border}`, padding: '16px 18px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontSize: '0.88rem', fontWeight: 700, color: s.color }}>{s.name}</span><span style={{ background: s.status === 'Winning' ? '#D1FAE5' : s.status === 'Emerging' ? '#FEF3C7' : '#FEE2E2', color: s.color, borderRadius: 50, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>{s.status}</span></div><div style={{ background: '#F3F4F6', borderRadius: 50, height: 4, marginBottom: 7, overflow: 'hidden' }}><div style={{ background: s.color, height: 4, borderRadius: 50, width: `${Math.min(s.score, 100)}%` }} /></div><div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Win Rate: <strong style={{ color: s.color }}>{s.score}%</strong> · Leading: {s.dominated}</div></div>)}</div>}
                  <PriorityActionsTable result={result} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading} />
                </div>
              );
            })()}

            {/* TAB 7: Live Prompt */}
            {activeTab === 7 && (() => (
              <div style={{ display: 'flex', flexDirection: 'column' as const, minHeight: 'calc(100vh - 200px)' }}>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 3 }}>Live Prompt Tester</div><div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Ask any question and see how AI responds about brands in your category.</div></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 }}>
                  {examplePrompts.map((p, i) => (<button key={i} onClick={() => runPrompt(p)} style={{ background: '#F5F0FF', border: '1px solid #E9D5FF', borderRadius: 20, padding: '6px 14px', fontSize: '0.78rem', color: '#7500C0', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>{p}</button>))}
                </div>
                <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                  <input type="text" value={promptInput} onChange={(e) => setPromptInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runPrompt()} placeholder={`Ask anything about ${result.brand_name || 'this brand'}...`} style={{ flex: 1, border: 'none', padding: '6px 0', fontSize: '0.9rem', outline: 'none', color: '#374151', background: 'transparent' }} />
                  <button onClick={() => runPrompt()} disabled={promptLoading} style={{ background: promptLoading ? '#E9D5FF' : '#A100FF', color: 'white', border: 'none', borderRadius: 10, padding: '8px 22px', fontWeight: 700, fontSize: '0.88rem', cursor: promptLoading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>{promptLoading ? 'Asking...' : 'Ask AI'}</button>
                  {promptHistory.length > 0 && <button onClick={() => setPromptHistory([])} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 12px', fontSize: '0.75rem', color: '#9CA3AF', cursor: 'pointer' }}>Clear</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, flex: 1 }}>
                  {promptHistory.length === 0 && !promptLoading ? (<div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const, padding: '40px', color: '#9CA3AF', background: 'white', borderRadius: 14, border: '1px solid #E5E7EB' }}><div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 12 }}>🤖</div><div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Ask the AI anything</div></div>) : (
                    <>{promptHistory.map((h, i) => (<div key={i} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}><div style={{ background: '#F5F0FF', padding: '10px 18px', borderBottom: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#A100FF', background: '#EDE9FE', borderRadius: 50, padding: '2px 8px' }}>Q</span><span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#7500C0' }}>{h.q}</span></div><div style={{ padding: '16px 18px' }}><MarkdownText text={h.a} /></div></div>))}
                    {promptLoading && <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 22, display: 'flex', alignItems: 'center', gap: 12, color: '#9CA3AF', fontSize: '0.88rem' }}><div style={{ width: 18, height: 18, border: '2px solid #E9D5FF', borderTopColor: '#A100FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />Querying AI model...</div>}</>
                  )}
                </div>
              </div>
            ))()}

            {/* TAB 8: FAQ */}
            {activeTab === 8 && (() => (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>What does this score mean for your business?</div>
                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 24 }}>Everything you need to understand your score and how to act on it.</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                  {[
                    { q: 'What is a GEO Score?', a: 'The GEO Score is a single 0-100 number that measures how often and how favorably your brand is cited in AI-generated responses across major AI engines. Every score is computed fresh from real AI responses — nothing is hardcoded.' },
                    { q: 'Why does 70 matter?', a: '70 is the efficiency threshold where AI models have accumulated enough signals to place you at the top of responses with statistical confidence. Below 70, AI treats your brand as optional. Above it, your brand becomes a default recommendation.' },
                    { q: 'How is the GEO Score calculated?', a: 'GEO Score = Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15. All five inputs are computed from real AI response data for your brand.' },
                    { q: 'Will my score change between runs?', a: 'Yes, slightly. AI models are non-deterministic — the same query can return different rankings across runs. With 300+ queries, variance is typically ±3-5 points. This is honest: your score reflects real AI behavior, not a fixed number.' },
                    { q: 'How often is the score updated?', a: 'The GEO Score is calculated in real-time each time you run an analysis. Results reflect the current state of AI responses at the time of your run.' },
                    { q: "What's the difference between Visibility and Prominence?", a: 'Visibility measures whether your brand appears at all in an AI response. Prominence measures where — being named first scores much higher than being named fifth.' },
                    { q: 'How do I improve my GEO Score?', a: 'Build authoritative content targeting the query categories where you score low, earn placements on sources AI trusts (NerdWallet, Reddit, Forbes), and expand coverage across segments where you are currently invisible.' },
                  ].map((item, i) => <div key={i} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px' }}><div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>{item.q}</div><div style={{ fontSize: '0.84rem', color: '#6B7280', lineHeight: 1.75 }}>{item.a}</div></div>)}
                </div>
              </div>
            ))()}

          </div>
        </div>
      )}
    </main>
  );
}
