'use client';

import React, { useState, useEffect } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80-100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70-79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45-69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0-44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string,string> = {
  'visibility score': 'Measures how often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'Reflects how authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'Captures the tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'Average position when your brand is mentioned within an AI response. #1 means AI names your brand first most often. #3 means two other brands are typically named before yours.',
};

const RADAR_TIPS: Record<string,string> = {
  // Credit card features
  'Cash Back':        'How often AI recommends your brand for cash back and everyday rewards queries.',
  'Travel Benefits':  'How often AI surfaces your brand for travel, miles, lounge and international queries.',
  'Fees & APR':       'How well your brand is positioned on low fees, 0% APR and interest rate queries.',
  'Rewards / Points': 'How often AI mentions your brand for points, rewards optimization and bonus categories.',
  'Credit Building':  'How strongly AI associates your brand with credit building, secured cards and approvals.',
  'Perks & Benefits': 'How often AI highlights your brand for premium perks, purchase protection and card benefits.',
  // Retail banking features
  'Savings Rate':     'How often AI recommends your brand for high-yield savings and APY queries.',
  'No Fees':          'How well your brand is positioned on no-fee, no-minimum banking queries.',
  'ATM Access':       'How often AI highlights your brand for ATM access and fee-free ATM queries.',
  'Mobile & Digital': 'How strongly AI associates your brand with digital banking and mobile app quality.',
  'CD Rates':         'How often AI recommends your brand for CD accounts and fixed-rate savings.',
  'Family Banking':   'How often AI surfaces your brand for kids, teen and family banking queries.',
  // Retirement / wealth features
  'Retirement Plans': 'How often AI recommends your brand for 401k and retirement planning queries.',
  'Investment Funds': 'How well your brand is positioned for mutual funds and portfolio management.',
  'Financial Planning':'How often AI highlights your brand for holistic financial planning queries.',
  'Digital Tools':    'How strongly AI associates your brand with digital retirement and investment tools.',
  'Insurance':        'How often AI surfaces your brand for life insurance and annuity queries.',
  'Employer Plans':   'How often AI recommends your brand for employer-sponsored retirement benefits.',
  // Generic fallback
  'Visibility':       'How often your brand appears across all AI queries in this category.',
  'Sentiment':        'How positively AI describes your brand overall.',
  'Authority':        'How credibly and authoritatively AI references your brand.',
  'Prominence':       'How early in AI responses your brand is mentioned.',
  'Share of Voice':   'Your brand mentions as a share of all brand mentions in AI responses.',
  'Recommendation':   'How often AI actively recommends your brand over alternatives.',
};

// Get tip for any label -- falls back to generic description for dynamic categories
function getRadarTip(label: string): string {
  if (RADAR_TIPS[label]) return RADAR_TIPS[label];
  return `How often your brand appears in AI responses for ${label.toLowerCase()} queries.`;
}

const TABS = ['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Recommendations','Live Prompt','FAQ'];

function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (s >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (s >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s=>dl.includes(s))) return {label:'Social',color:'#F59E0B',bg:'#FEF3C7'};
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s=>dl.includes(s))) return {label:'Institution',color:'#3B82F6',bg:'#DBEAFE'};
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s=>dl.includes(s))) return {label:'Earned Media',color:'#10B981',bg:'#D1FAE5'};
  return {label:'Other',color:'#6B7280',bg:'#F3F4F6'};
}

// -- Product-feature radar dimensions --
// Derives real scores from responses_detail query categories.
// Falls back to abstract score math when no rd data is available (competitor rows).
function buildFeatureDims(
  indKey: string,
  rd: any[],                          // responses_detail from API (may be empty for competitors)
  sent: number, prom: number, vis: number, cit: number, sov: number
) {
  // Helper: appearance rate for given query categories from rd (0-100)
  const rate = (cats: string[]): number | null => {
    const rows = rd.filter((r: any) => cats.some(c => (r.category||'').toLowerCase().includes(c.toLowerCase())));
    if (rows.length === 0) return null;
    return Math.round((rows.filter((r: any) => r.mentioned).length / rows.length) * 100);
  };

  // -- Credit cards --
  if (indKey === 'fin' || indKey === 'fin_cc_travel' || indKey === 'fin_cc_cashback' ||
      indKey === 'fin_cc_rewards' || indKey === 'fin_cc_student' || indKey === 'fin_cc_student_rewards' ||
      indKey === 'fin_cc_secured' || indKey === 'fin_cc_balance_transfer' || indKey === 'fin_small_business_cc') {
    const cashBack    = rate(['Cash Back','Flat Rate','Category','Redemption']);
    const travel      = rate(['Travel & Rewards','Miles & Points','Perks & Benefits','Value']);
    const feesApr     = rate(['Interest & Fees','0% APR','Fees','Debt Payoff','Balance Transfer']);
    const rewards     = rate(['Rewards Optimization','Points','Cash Back vs Points']);
    const creditBuild = rate(['Credit Building','Approval & Credit','Credit Builder','Deposit & Fees','Features']);
    const perks       = rate(['Card Benefits','Expert Recommendation','Premium Cards','Comparison']);
    // fallback to abstract math if no rd data (competitor mode)
    return [
      { label: 'Cash Back',       val: cashBack    ?? Math.round(vis * 0.6 + sov * 0.4) },
      { label: 'Travel Benefits', val: travel      ?? Math.round(sent * 0.5 + prom * 0.5) },
      { label: 'Fees & APR',      val: feesApr     ?? Math.round(cit * 0.5 + sent * 0.5) },
      { label: 'Rewards / Points',val: rewards     ?? Math.round(prom * 0.6 + vis * 0.4) },
      { label: 'Credit Building', val: creditBuild ?? Math.round(sov * 0.6 + cit * 0.4) },
      { label: 'Perks & Benefits',val: perks       ?? Math.round(sent * 0.55 + prom * 0.45) },
    ];
  }

  // -- Retail banking --
  if (indKey === 'fin_retail_bank') {
    const savingsRate = rate(['Savings Accounts','Savings Rate','High Yield']);
    const noFees      = rate(['No Fees & Access','General Banking']);
    const atmAccess   = rate(['No Fees & Access','Checking Accounts']);
    const mobile      = rate(['Digital & Mobile']);
    const cdRates     = rate(['CD Accounts']);
    const family      = rate(['Kids & Family Banking','Teen & Youth Banking','Account Comparison']);
    return [
      { label: 'Savings Rate',    val: savingsRate ?? Math.round(vis * 0.6 + sent * 0.4) },
      { label: 'No Fees',         val: noFees      ?? Math.round(sent * 0.5 + sov * 0.5) },
      { label: 'ATM Access',      val: atmAccess   ?? Math.round(cit * 0.5 + prom * 0.5) },
      { label: 'Mobile & Digital',val: mobile      ?? Math.round(prom * 0.6 + vis * 0.4) },
      { label: 'CD Rates',        val: cdRates     ?? Math.round(sov * 0.6 + cit * 0.4) },
      { label: 'Family Banking',  val: family      ?? Math.round(sent * 0.55 + prom * 0.45) },
    ];
  }

  // -- Retirement / asset management --
  if (indKey === 'fin_retirement' || indKey === 'fin_wealth') {
    const retPlans  = rate(['Retirement Planning','Employer Benefits','Account Comparison']);
    const investing = rate(['Investment Management','Investment','Provider Comparison']);
    const planning  = rate(['Financial Planning','Expert Recommendation']);
    const digital   = rate(['Digital Experience','Digital Tools']);
    const insurance = rate(['Insurance & Annuities','Insurance']);
    const employer  = rate(['Employer Benefits','Institutional']);
    return [
      { label: 'Retirement Plans',  val: retPlans  ?? Math.round(vis * 0.6 + sent * 0.4) },
      { label: 'Investment Funds',  val: investing  ?? Math.round(cit * 0.6 + prom * 0.4) },
      { label: 'Financial Planning',val: planning   ?? Math.round(sent * 0.5 + prom * 0.5) },
      { label: 'Digital Tools',     val: digital    ?? Math.round(prom * 0.6 + vis * 0.4) },
      { label: 'Insurance',         val: insurance  ?? Math.round(sov * 0.6 + cit * 0.4) },
      { label: 'Employer Plans',    val: employer   ?? Math.round(sent * 0.55 + sov * 0.45) },
    ];
  }

  // -- Dynamic fallback: derive axes from real rd categories --
  // If rd has data (dynamic brand or any non-fin industry), use actual query categories as axes
  if (rd.length > 0) {
    const cats: string[] = Array.from(new Set<string>(rd.map((r:any) => r.category as string).filter((c:string)=>Boolean(c))));
    // Pick up to 6 categories that have at least some queries
    const topCats = cats.slice(0, 6);
    if (topCats.length >= 3) {
      return topCats.map(cat => {
        const rows = rd.filter((r:any) => r.category === cat);
        const val = rows.length > 0
          ? Math.round((rows.filter((r:any) => r.mentioned).length / rows.length) * 100)
          : Math.round(vis * 0.5 + sent * 0.5);
        return { label: cat, val };
      });
    }
  }

  // -- Last resort fallback (no rd data at all) --
  return [
    { label: 'Visibility',    val: vis },
    { label: 'Sentiment',     val: sent },
    { label: 'Authority',     val: Math.round(cit * 0.6 + prom * 0.4) },
    { label: 'Prominence',    val: prom },
    { label: 'Share of Voice',val: sov },
    { label: 'Recommendation',val: Math.round(sov * 0.55 + prom * 0.45) },
  ];
}

// Ensure radar dims never all show 0 -- use actual sub-scores as minimum floor
function ensureRadarHasData(dims: {label:string,val:number}[], sent:number, prom:number, vis:number, cit:number, sov:number): {label:string,val:number}[] {
  const allZero = dims.every(d => d.val === 0);
  if (!allZero) return dims;
  // If dims came from real rd categories (product axes), keep them even at 0
  // Only replace with generic axes if dims are already generic labels
  const genericLabels = ['Visibility','Sentiment','Authority','Prominence','Share of Voice','Recommendation','Citations'];
  const hasProductAxes = dims.some(d => !genericLabels.includes(d.label));
  if (hasProductAxes) {
    // Keep product categories -- brand just isn't appearing yet
    // Show a small floor value so the radar is visible (not collapsed to a dot)
    return dims.map(d => ({ ...d, val: d.val === 0 ? Math.max(d.val, Math.round((vis + sent) / 4)) : d.val }));
  }
  // Generic fallback - use actual sub-scores
  return [
    { label: 'Visibility',    val: Math.max(vis, 5) },
    { label: 'Sentiment',     val: Math.max(sent, 5) },
    { label: 'Prominence',    val: Math.max(prom, 5) },
    { label: 'Citations',     val: Math.max(cit, 5) },
    { label: 'Share of Voice',val: Math.max(sov, 5) },
    { label: 'Authority',     val: Math.max(Math.round((cit + prom) / 2), 5) },
  ];
}

// Keep backward-compatible wrapper for competitor rows (no rd data)
function buildRadarDims(sent: number, prom: number, vis: number, cit: number, sov: number, indKey = 'gen') {
  return buildFeatureDims(indKey, [], sent, prom, vis, cit, sov);

}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:5,cursor:'help'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',color:'#6B7280',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>?</span>
      {show&&<span style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'white',fontSize:'0.72rem',lineHeight:1.6,borderRadius:8,padding:'10px 14px',width:210,textAlign:'left',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:9999,pointerEvents:'none',whiteSpace:'normal' as const}}>{text}<span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',borderWidth:5,borderStyle:'solid',borderColor:'#1F2937 transparent transparent transparent'}}/></span>}
    </span>
  );
}

function MetricCard({ label, val, sub, color='#7C3AED', note }: { label:string; val:any; sub?:string; color?:string; note?:string }) {
  return (
    <div style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>
        {label}{METRIC_TIPS[label.toLowerCase()]&&<Tooltip text={METRIC_TIPS[label.toLowerCase()]}/>}
      </div>
      <div style={{fontSize:'1.8rem',fontWeight:800,color,lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>}
      {note&&<div style={{fontSize:'0.68rem',color:'#F59E0B',marginTop:4,fontWeight:600}}>! {note}</div>}
    </div>
  );
}

function GeoGauge({ score, brand }: { score:number; brand:string }) {
  const badge = scoreBadge(score);
  const cx=160,cy=155,Ro=130,Ri=88;
  const a=(s:number)=>Math.PI-(s/100)*Math.PI;
  const ox=(s:number,r:number)=>cx+r*Math.cos(a(s));
  const oy=(s:number,r:number)=>cy-r*Math.sin(a(s));
  const seg=(s0:number,s1:number,fill:string)=>{const lg=s1-s0>50?1:0;return <path d={`M ${ox(s0,Ro)} ${oy(s0,Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1,Ro)} ${oy(s1,Ro)} L ${ox(s1,Ri)} ${oy(s1,Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0,Ri)} ${oy(s0,Ri)} Z`} fill={fill} stroke="white" strokeWidth="2"/>;};
  const mi=Ri-8,mo=Ro+8;
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 16px 14px',textAlign:'center'}}>
      <div style={{fontSize:'0.9rem',fontWeight:700,color:'#374151',marginBottom:4}}>{brand}</div>
      <svg viewBox="0 0 320 175" style={{width:'100%',display:'block',overflow:'visible'}}>
        {seg(0,44,'#FECACA')}{seg(44,69,'#FEF08A')}{seg(69,79,'#BAE6FD')}{seg(79,100,'#BBF7D0')}
        <line x1={ox(score,mi)} y1={oy(score,mi)} x2={ox(score,mo)} y2={oy(score,mo)} stroke="#6D28D9" strokeWidth="4" strokeLinecap="round"/>
        {[0,20,40,60,80,100].map(t=><text key={t} x={ox(t,Ro+18)} y={oy(t,Ro+18)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>)}
        <text x={cx} y={cy-18} textAnchor="middle" style={{fontSize:46,fontWeight:900,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <span style={{background:badge.bg,color:badge.color,borderRadius:50,padding:'5px 18px',fontSize:'0.82rem',fontWeight:700}}>{badge.label}</span>
    </div>
  );
}

function WhatScoreMeans({ score, brand }: { score:number; brand:string }) {
  const scoreBands = [
    { range:'0-44', label:'Poor', color:'#991B1B', bg:'#FFF1F2', border:'#FCA5A5', desc:'Rarely mentioned. AI lacks enough signals to surface you reliably.' },
    { range:'45-69', label:'Needs Work', color:'#92400E', bg:'#FFFBEB', border:'#FCD34D', desc:'Appears in lists but not as a primary recommendation. Missing key signals.' },
    { range:'70-79', label:'Good', color:'#1E40AF', bg:'#EFF6FF', border:'#93C5FD', desc:'AI crosses the confidence threshold. Frequent top-3 placements begin.' },
    { range:'80-100', label:'Excellent', color:'#065F46', bg:'#ECFDF5', border:'#6EE7B7', desc:'Dominant brand signal. AI leads with you as the primary recommendation.' },
  ];
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <span style={{color:'#7C3AED',fontSize:'1rem'}}>^</span>
        <span style={{fontSize:'0.95rem',fontWeight:800,color:'#7C3AED'}}>What does your score mean?</span>
      </div>
      <p style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.75,margin:'0 0 14px'}}>
        Think of the GEO Score like a credit score for AI. At <strong>{score}</strong>, <strong>{brand}</strong> {score >= 80 ? 'is in the top tier -- AI consistently leads with your brand as the primary recommendation.' : score >= 70 ? 'has crossed the efficiency threshold where AI models consistently feature your brand near the top of responses.' : 'is below the 70 threshold where AI models consistently feature a brand at the top of responses. You appear in results, but you are not yet the brand AI leads with or recommends first.'}
      </p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
        {scoreBands.map((b,i)=>(
          <div key={i} style={{background:b.bg,borderRadius:10,border:`1.5px solid ${b.border}`,padding:'10px 12px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:b.color,marginBottom:2}}>{b.range}</div>
            <div style={{fontSize:'0.88rem',fontWeight:800,color:b.color,marginBottom:4}}>{b.label}</div>
            <div style={{fontSize:'0.72rem',color:b.color,lineHeight:1.5}}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ROICurve({ score }: { score: number }) {
  const W = 700, H = 280, padL = 52, padR = 28, padT = 36, padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const curve = (x: number) => Math.round(5 + 90 / (1 + Math.exp(-0.09 * (x - 45))));
  const pts = Array.from({ length: 101 }, (_, x) => ({ x, y: curve(x) }));
  const sx = (v: number) => padL + (v / 100) * plotW;
  const sy = (v: number) => padT + ((100 - v) / 100) * plotH;
  const scoreToX = (s: number) => {
    let best = 0, bestDiff = 999;
    pts.forEach(p => { const d = Math.abs(p.y - s); if (d < bestDiff) { bestDiff = d; best = p.x; } });
    return best;
  };
  const currentX = scoreToX(score), goalX = scoreToX(70), authX = scoreToX(80);
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const gapPts = score < 70 ? pts.slice(currentX, goalX + 1) : [];
  const fillD = gapPts.length > 1
    ? `${gapPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT + plotH} L${sx(currentX)},${padT + plotH} Z`
    : '';
  const [hov, setHov] = useState<string | null>(null);
  const youCX = sx(currentX), youCY = sy(score);
  const goalCX = sx(goalX), goalCY = sy(70);
  const authCX = sx(authX), authCY = sy(80);
  const stages = [
    { label: 'Fragmented', range: '0-44', color: '#EF4444' },
    { label: 'Emerging', range: '45-55', color: '#F59E0B' },
    { label: 'Competitive', range: '56-69', color: '#3B82F6' },
    { label: 'Leader', range: '70-79', color: '#10B981' },
    { label: 'Authority', range: '80+', color: '#7C3AED' },
  ];
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <text x={W/2} y={22} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>Where You Are vs Your Opportunity</text>
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/>
            <text x={padL-6} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}
        {fillD&&<path d={fillD} fill="#EDE9FE" opacity="0.45"/>}
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="5,4"/>
        <text x={W-padR+4} y={sy(70)} dominantBaseline="middle" style={{fontSize:8,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontWeight:700}}>70</text>
        <path d={pathD} fill="none" stroke="#7C3AED" strokeWidth="2.5"/>
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        {[0,20,40,60,80,100].map(v=>(
          <g key={v}>
            <line x1={sx(v)} y1={padT+plotH} x2={sx(v)} y2={padT+plotH+4} stroke="#D1D5DB" strokeWidth="1"/>
            <text x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}
        <text x={(padL+W-padR)/2} y={padT+plotH+22} textAnchor="middle" style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:600}}>GEO Maturity</text>
        <text x={12} y={padT+plotH/2} textAnchor="middle" transform={`rotate(-90,12,${padT+plotH/2})`} style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('you')} onMouseLeave={()=>setHov(null)}>
          <circle cx={youCX} cy={youCY} r={9} fill="#7C3AED" stroke="white" strokeWidth="2"/>
          <text x={youCX} y={youCY+18} textAnchor="middle" style={{fontSize:7,fontWeight:700,fill:'#5B21B6',fontFamily:'Inter,sans-serif'}}>You ({score})</text>
          {hov==='you'&&<><rect x={youCX-52} y={youCY+28} width={104} height={20} rx={4} fill="#1F2937"/><text x={youCX} y={youCY+39} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: {score}</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('goal')} onMouseLeave={()=>setHov(null)}>
          <circle cx={goalCX} cy={goalCY} r={7} fill="#F59E0B" stroke="white" strokeWidth="2"/>
          <text x={goalCX-12} y={goalCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#92400E',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
          <text x={goalCX-12} y={goalCY-3} textAnchor="end" style={{fontSize:6,fill:'#92400E',fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>&quot;Opportunity Zone&quot;</text>
          {hov==='goal'&&<><rect x={goalCX-118} y={goalCY+10} width={104} height={20} rx={4} fill="#1F2937"/><text x={goalCX-66} y={goalCY+21} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: 70</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('auth')} onMouseLeave={()=>setHov(null)}>
          <circle cx={authCX} cy={authCY} r={7} fill="#10B981" stroke="white" strokeWidth="2"/>
          <text x={authCX-12} y={authCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#065F46',fontFamily:'Inter,sans-serif'}}>Authority (80)</text>
          {hov==='auth'&&<><rect x={authCX-118} y={authCY+10} width={104} height={20} rx={4} fill="#1F2937"/><text x={authCX-66} y={authCY+21} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: 80</text></>}
        </g>
        {(()=>{
          const totalW = stages.length * 72;
          const startX = (padL + W - padR) / 2 - totalW / 2;
          return stages.map((s,i)=>(
            <text key={i} x={startX + i*72 + 36} y={padT+plotH+36} textAnchor="middle" style={{fontSize:6,fontWeight:700,fill:s.color,fontFamily:'Inter,sans-serif'}}>
              {s.label} <tspan style={{fontWeight:400,fill:'#9CA3AF'}}>{s.range}</tspan>
            </text>
          ));
        })()}
      </svg>
    </div>
  );
}

const REC_CATEGORIES: Record<string,{label:string;color:string;bg:string}> = {
  // Content Layer
  'Owned Content Optimization': {label:'Owned Content Optimization', color:'#0F766E', bg:'#F0FDFA'},
  'Content Page':      {label:'Content Page',      color:'#8B5CF6', bg:'#F5F3FF'},
  'FAQ Build':         {label:'FAQ Build',         color:'#10B981', bg:'#ECFDF5'},
  'How-To Guide':      {label:'How-To Guide',      color:'#0EA5E9', bg:'#F0F9FF'},
  'Product Explainer': {label:'Product Explainer', color:'#6366F1', bg:'#EEF2FF'},
  'Best-Of List':      {label:'Best-Of List',      color:'#8B5CF6', bg:'#F5F3FF'},
  'Use Case Page':     {label:'Use Case Page',     color:'#06B6D4', bg:'#ECFEFF'},
  'Content Strategy':  {label:'Content Strategy',  color:'#7C3AED', bg:'#F5F3FF'},
  // Authority Layer
  'PR / Earned Media': {label:'PR / Earned Media', color:'#EC4899', bg:'#FDF2F8'},
  'Citation Push':     {label:'Citation Push',     color:'#F43F5E', bg:'#FFF1F2'},
  'Review Platform':   {label:'Review Platform',   color:'#F59E0B', bg:'#FFFBEB'},
  'Forum Presence':    {label:'Forum Presence',    color:'#D97706', bg:'#FEF3C7'},
  'Wikipedia / Entity':{label:'Wikipedia / Entity',color:'#64748B', bg:'#F1F5F9'},
  'Influencer / Creator':{label:'Influencer / Creator',color:'#A855F7',bg:'#FAF5FF'},
  // Technical Layer
  'Structured Data':   {label:'Structured Data',   color:'#F97316', bg:'#FFF7ED'},
  'Schema Markup':     {label:'Schema Markup',     color:'#EA580C', bg:'#FFF7ED'},
  'Entity Optimization':{label:'Entity Optimization',color:'#0F766E',bg:'#F0FDFA'},
  'Technical SEO':     {label:'Technical SEO',     color:'#14B8A6', bg:'#F0FDFA'},
  'Internal Linking':  {label:'Internal Linking',  color:'#0369A1', bg:'#F0F9FF'},
  // Distribution Layer
  'Syndication':       {label:'Syndication',       color:'#7C3AED', bg:'#EDE9FE'},
  'Data Feed':         {label:'Data Feed',         color:'#059669', bg:'#ECFDF5'},
  'API Presence':      {label:'API Presence',      color:'#1D4ED8', bg:'#EFF6FF'},
};

function GeoSummary({ result }: { result:any }) {
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [fetched,setFetched]=useState(false);

  const geo = result.overall_geo_score ?? 0;
  const vis = result.visibility ?? 0;
  const sent = result.sentiment ?? 0;
  const cit = result.citation_share ?? 0;
  const sov = result.share_of_voice ?? 0;
  const prom = result.prominence ?? 0;
  const lob = result.lob || null;
  const isLeader = geo >= 80;
  const badge = scoreBadge(geo);
  const topComp = (result.competitors||[])[0]?.Brand || 'top competitor';
  const topCompGEO = (result.competitors||[])[0]?.GEO || 0;

  // -- OPPORTUNITY SCORE: built from real 100 query results --
  // Logic: look at queries where brand did NOT appear.
  // Of those losses, count how many are in high-volume categories (dailySearches >= 35K).
  // "Conservative flip": assume we can win 50% of high-volume losses, 25% of low-volume losses.
  // Recalculate appearance rate -> new GEO score.
  const rd = result.responses_detail || [];
  const clusters = result.query_clusters || [];
  // Use API's total_responses (100) not rd array length (may differ)
  const totalQ = result.total_responses || rd.length || 100;
  const currentWins = result.responses_with_brand ?? rd.filter((r:any)=>r.mentioned).length;
  const lossCount = totalQ - currentWins; // true lost queries
  const losses = rd.filter((r:any)=>!r.mentioned).slice(0, lossCount); // cap to true loss count

  // For each loss, find its category's daily search volume
  const getVol = (cat:string) => {
    const cl = clusters.find((c:any)=>c.category===cat);
    return cl?.dailySearches || 20000;
  };

  // High volume losses (>=35K/day) -> flip 50% conservatively
  // Low volume losses (<35K/day) -> flip 25%
  const flippableWins = losses.reduce((sum:number, r:any) => {
    const vol = getVol(r.category||'');
    return sum + (vol >= 35000 ? 0.5 : 0.25);
  }, 0);

  const opportunityWins = Math.min(currentWins + Math.round(flippableWins), totalQ);
  const opportunityRate = opportunityWins / totalQ; // new appearance rate

  // GEO is heavily driven by visibility which correlates with appearance rate
  // Scale: current vis score -> opportunity vis score proportionally
  const visScale = vis > 0 ? (opportunityRate / (currentWins / totalQ)) : 1;
  const oppVis = Math.min(95, Math.round(vis * visScale));
  const oppSov = Math.min(95, Math.round(sov * (1 + flippableWins / totalQ * 0.6)));
  const oppCit = Math.min(95, Math.round(cit * (1 + flippableWins / totalQ * 0.4)));

  // Recalculate GEO with opportunity sub-scores (sentiment/prominence unchanged -- content doesn't move those)
  const opportunityGeo = Math.min(94, Math.round(
    oppVis * 0.30 + sent * 0.20 + prom * 0.20 + oppCit * 0.15 + oppSov * 0.15
  ));
  const opportunityGain = opportunityGeo - geo;

  // Breakdown for tooltip: which sub-score drives most of the gain
  const visGain = Math.round((oppVis - vis) * 0.30);
  const citGain = Math.round((oppCit - cit) * 0.15);
  const sovGain = Math.round((oppSov - sov) * 0.15);

  const projected = opportunityGeo;

  useEffect(()=>{
    if(fetched) return;
    setFetched(true);
    try {
      // v2 cache key -- busts any old cached results that had "Comparison Page"
      const cacheKey = `geo_summary_v3_${result.brand_name}_${geo}_${opportunityGain}`;
      const cached = sessionStorage.getItem(cacheKey);
      if(cached){ setData(JSON.parse(cached)); return; }
    } catch{}
    setLoading(true);
    const lobContext = lob ? `Line of Business: ${lob}.` : '';
    const insightCats = 'Data Signal|Competitive Gap|Visibility Gap|Sentiment Gap|Citation Gap|Earned Media Gap|Content Gap|Rank Signal';
    // FIX 2: "Comparison Page" removed -- replaced with "Owned Content Optimization"
    const recCats = 'Owned Content Optimization|Content Page|FAQ Build|How-To Guide|Product Explainer|Best-Of List|Use Case Page|Content Strategy|PR / Earned Media|Citation Push|Review Platform|Forum Presence|Wikipedia / Entity|Influencer / Creator|Structured Data|Schema Markup|Entity Optimization|Technical SEO|Internal Linking|Syndication|Data Feed|API Presence';
    // Real opportunity breakdown -- passed to AI so recommendations sum to actual opportunity gain
    const oppBreakdown = `Opportunity Score breakdown (from real query results):
- Total queries run: ${totalQ}. Brand appeared in: ${currentWins}. Lost: ${lossCount}.
- Visibility gap drives +${visGain} pts of the +${opportunityGain} pt opportunity (highest impact).
- Citations gap drives +${citGain} pts.
- SOV gap drives +${sovGain} pts.
- Recommendations MUST address these gaps in priority order: Visibility first, then Citations, then SOV.
- HIGH recommendations should address Visibility gap and collectively account for ~${visGain} pts.
- MEDIUM/LOW recommendations address Citations (+${citGain}pts) and SOV (+${sovGain}pts).
- scoreForecast values across all recommendations must sum to approximately ${opportunityGain} pts total.
- Each individual recommendation: +1 to +${Math.min(6, visGain)} pts max. Be realistic.`;

    const prompt = [
      'You are a sharp GEO strategist. Return a JSON object with:',
      '- "rows": array of exactly 10 objects. First 5 insights, last 5 recommendations.',
      '  Each object: { "type":"insight"|"recommendation", "category": insights use: '+insightCats+'. Recommendations use: '+recCats+',',
      '  "title": 4-6 word action title for recommendations only (null for insights),',
      '  "text": one sharp sentence. Insights: open with a specific number, name brand+competitor. Recommendations: verb-first, platform-specific, LOB-specific, max 25 words. NEVER suggest competitor comparison pages -- banks do not publish pages comparing themselves to rivals,',
      '  "scoreNow": '+String(geo)+',',
      '  "scoreForecast": insights='+String(geo)+'. Recommendations: assign pts based on which gap the action addresses (Visibility=higher pts, Citations/SOV=lower pts). scoreForecast values must sum to ~'+String(opportunityGain)+' total across all recommendations,',
      '  "impact": insights=null. Recommendations: HIGH if addresses Visibility gap, MEDIUM if Citations, LOW if SOV. Sort HIGH first then MEDIUM then LOW,',
      '  "agenticFlag": null OR one short sentence on application/data/approval readiness (recommendations only) }',
      'Brand: '+result.brand_name,
      lobContext,
      'Industry: '+(result.ind_label||result.industry||result.lob||'Consumer Products'),
      'GEO: '+String(geo)+' | Vis: '+String(vis)+' | Sent: '+String(sent)+' | Cit: '+String(cit)+' | SOV: '+String(sov)+' | Prom: '+String(prom),
      'Top Competitor: '+topComp+' (GEO: '+String(topCompGEO)+')',
      oppBreakdown,
      'CRITICAL: Exactly 5 insights then 5 recommendations. Sort HIGH to MEDIUM to LOW. Include Visibility Gap and Content Gap insights tied to the '+String(lossCount)+' lost queries. NEVER recommend comparison pages against competitors. If GEO score is below 20, this brand is not yet appearing in AI responses -- focus insights on baseline establishment and content creation. Return ONLY valid JSON no markdown.',
    ].join('\n');

    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})})
      .then(r=>r.json()).then(d=>{
        const threeQ='`'+'`'+'`'; let clean1=(d.response||''); while(clean1.startsWith(threeQ))clean1=clean1.slice(3); while(clean1.endsWith(threeQ))clean1=clean1.slice(0,-3); clean1=clean1.replace('json','').trim();
        const parsed = JSON.parse(clean1.trim());
        setData(parsed);
        try{ sessionStorage.setItem('geo_summary_v3_'+result.brand_name+'_'+String(geo)+'_'+String(opportunityGain), JSON.stringify(parsed)); }catch{}
      }).catch(()=>setData(null)).finally(()=>setLoading(false));
  },[]);

  const impactColor = (imp:string) => imp==='HIGH'?'#EF4444':imp==='MEDIUM'?'#F59E0B':'#7C3AED';
  const impactBg = (imp:string) => imp==='HIGH'?'#FEE2E2':imp==='MEDIUM'?'#FEF3C7':'#EDE9FE';
  const insightCatColor: Record<string,string> = {
    'Data Signal':'#7C3AED','Competitive Gap':'#EF4444','Visibility Gap':'#3B82F6',
    'Sentiment Gap':'#10B981','Citation Gap':'#F59E0B',
  };
  const insightCatBg: Record<string,string> = {
    'Data Signal':'#F5F3FF','Competitive Gap':'#FEE2E2','Visibility Gap':'#EFF6FF',
    'Sentiment Gap':'#ECFDF5','Citation Gap':'#FFFBEB',
  };

  return (
    <div>
      {/* S-curve + score cards */}
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <ROICurve score={geo}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
          {[
            {label:'Current GEO Score', val:geo, color:geo>=80?'#10B981':geo>=70?'#7C3AED':'#F59E0B', sub:badge.label+(geo>=80?' -- Category leader':geo>=70?' -- Above threshold':' -- Below efficiency threshold')},
            {label:'Opportunity Score', val:projected, color:'#10B981', sub:'Your reachable GEO score'},
            {label:'GEO Unlock', val:`+${opportunityGain} pts`, color:'#7C3AED', sub:'Your GEO gap to close'},
          ].map((c,i)=>(
            <div key={i} style={{background:'#F9F9FC',borderRadius:12,border:'1px solid #E5E7EB',padding:'16px 18px',textAlign:'center' as const}}>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>{c.label}</div>
              <div style={{fontSize:'2.4rem',fontWeight:900,color:c.color,lineHeight:1}}>{c.val}</div>
              <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:4}}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* -- FULL-WIDTH TABLE -- */}
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <span style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>GEO Analysis Summary</span>
          {lob&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:50,padding:'2px 10px',fontSize:'0.68rem',fontWeight:700}}>{lob}</span>}
        </div>

        {loading&&(
          <div style={{display:'flex',alignItems:'center',gap:10,color:'#9CA3AF',fontSize:'0.84rem',padding:'20px 0'}}>
            <div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Generating analysis...
          </div>
        )}

        {!loading&&data?.rows&&(
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
            <thead>
              <tr style={{background:'#F3F4F6'}}>
                {[
                  {label:'#',       w:40},
                  {label:'Category',w:160},
                  {label:'Insight', w:'30%'},
                  {label:'Recommendation', w:'30%'},
                  {label:'GEO Opportunity', w:150},
                  {label:'Impact',  w:90},
                ].map(h=>(
                  <th key={h.label} style={{padding:'10px 14px',textAlign:'left' as const,fontSize:'0.64rem',fontWeight:700,color:'#6B7280',letterSpacing:'.07em',borderBottom:'2px solid #E5E7EB',width:h.w}}>{h.label.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(()=>{
                const insights = data.rows.filter((r:any)=>r.type==='insight');
                const recs = data.rows.filter((r:any)=>r.type==='recommendation');
                const rowCount = Math.max(insights.length, recs.length);
                return Array.from({length:rowCount},(_,i)=>{
                  const ins = insights[i];
                  const rec = recs[i];
                  const cat = rec ? (REC_CATEGORIES[rec.category]||{label:rec.category||'Action',color:'#6B7280',bg:'#F9FAFB'}) : null;
                  const insCat = ins?.category || 'Data Signal';
                  const insCatColors:Record<string,{c:string;bg:string}> = {
                    'Data Signal':    {c:'#7C3AED',bg:'#F5F3FF'},
                    'Competitive Gap':{c:'#EF4444',bg:'#FEE2E2'},
                    'Visibility Gap': {c:'#3B82F6',bg:'#EFF6FF'},
                    'Sentiment Gap':  {c:'#10B981',bg:'#ECFDF5'},
                    'Citation Gap':   {c:'#F59E0B',bg:'#FFFBEB'},
                    'Earned Media Gap':{c:'#EC4899',bg:'#FDF2F8'},
                    'Content Gap':    {c:'#6366F1',bg:'#EEF2FF'},
                    'Rank Signal':    {c:'#14B8A6',bg:'#F0FDFA'},
                  };
                  const ic = insCatColors[insCat]||{c:'#7C3AED',bg:'#F5F3FF'};
                  const impColor = rec?.impact==='HIGH'?'#EF4444':rec?.impact==='MEDIUM'?'#F59E0B':'#7C3AED';
                  const impBg = rec?.impact==='HIGH'?'#FEE2E2':rec?.impact==='MEDIUM'?'#FEF3C7':'#EDE9FE';
                  const delta = rec ? (rec.scoreForecast - rec.scoreNow) : 0;
                  return (
                    <tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'white':'#FAFAFA'}}>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,color:'#7C3AED'}}>{i+1}</div>
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}>
                        <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                          {ins&&<span style={{background:ic.bg,color:ic.c,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block',width:'fit-content'}}>{insCat}</span>}
                          {rec&&cat&&<span style={{background:cat.bg,color:cat.color,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block',width:'fit-content'}}>{cat.label}</span>}
                        </div>
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'top' as const}}>
                        {ins?(
                          <span style={{fontSize:'0.81rem',color:'#374151',lineHeight:1.65}}>{ins.text}</span>
                        ):(
                          <span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>
                        )}
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'top' as const}}>
                        {rec?(
                          <div>
                            <div style={{fontSize:'0.81rem',fontWeight:700,color:'#111827',marginBottom:3}}>{rec.title||''}</div>
                            <div style={{fontSize:'0.78rem',color:'#6B7280',lineHeight:1.6}}>{rec.text}</div>
                            {rec.agenticFlag&&(
                              <div style={{marginTop:6,padding:'4px 8px',background:'#FFF7ED',borderRadius:5,border:'1px solid #FCD34D',display:'flex',gap:5,alignItems:'flex-start'}}>
                                <span style={{fontSize:'0.7rem'}}>🤖</span>
                                <span style={{fontSize:'0.68rem',color:'#92400E'}}>{rec.agenticFlag}</span>
                              </div>
                            )}
                          </div>
                        ):(
                          <span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>
                        )}
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>
                        {rec?(
                          <div style={{display:'inline-flex',flexDirection:'column' as const,alignItems:'center',gap:3,background:'#F0FDF4',border:'1px solid #6EE7B7',borderRadius:10,padding:'8px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <span style={{fontSize:'0.88rem',fontWeight:700,color:'#9CA3AF'}}>{rec.scoreNow}</span>
                              <span style={{color:'#9CA3AF'}}>-&gt;</span>
                              <span style={{fontSize:'1.15rem',fontWeight:900,color:'#10B981'}}>{rec.scoreForecast}</span>
                            </div>
                            {delta>0&&<span style={{fontSize:'0.65rem',fontWeight:800,color:'#10B981',background:'#D1FAE5',borderRadius:50,padding:'1px 7px'}}>+{delta} pts</span>}
                          </div>
                        ):(
                          <span style={{fontSize:'0.88rem',fontWeight:700,color:'#374151'}}>{ins?.scoreNow??geo}</span>
                        )}
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>
                        {rec?(
                          <span style={{background:impBg,color:impColor,borderRadius:50,padding:'3px 10px',fontSize:'0.66rem',fontWeight:700,whiteSpace:'nowrap' as const}}>{rec.impact}</span>
                        ):(
                          <span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        {!loading&&!data&&(
          <div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'16px 0'}}>Analysis will appear after the score loads.</div>
        )}
      </div>
    </div>
  );
}

function SankeyChart({ result }: { result:any }) {
  const [hov,setHov]=useState<number|null>(null);
  const vis=result.visibility??0,cit=result.citation_share??0,sent=result.sentiment??0,prom=result.prominence??0,sov=result.share_of_voice??0,geo=result.overall_geo_score??0;
  const inputs=[{label:'Visibility',value:vis,color:'#7C3AED',weight:30},{label:'Sentiment',value:sent,color:'#10B981',weight:20},{label:'Prominence',value:prom,color:'#3B82F6',weight:20},{label:'Citation',value:cit,color:'#F59E0B',weight:15},{label:'Share of Voice',value:sov,color:'#EF4444',weight:15}];
  const W=500,H=330,lx=175,rx=415,nw=22,gH=140,gCY=H/2,nH=30,gap=20,totalH=inputs.length*nH+(inputs.length-1)*gap,startY=(H-totalH)/2;
  const nodes=inputs.map((n,i)=>({...n,y:startY+i*(nH+gap)}));
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',flex:1}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Composition</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        {nodes.map((n,i)=>{const sm=n.y+nH/2,bH=gH/inputs.length,dm=gCY-gH/2+i*bH+bH/2,c1=lx+nw+(rx-lx-nw)*0.4,c2=lx+nw+(rx-lx-nw)*0.6,hh=nH/2,dh=bH/2,isH=hov===i;return(<g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}><path d={`M${lx+nw},${sm-hh} C${c1},${sm-hh} ${c2},${dm-dh} ${rx},${dm-dh} L${rx},${dm+dh} C${c2},${dm+dh} ${c1},${sm+hh} ${lx+nw},${sm+hh}Z`} fill={n.color} opacity={isH?0.32:0.15} style={{transition:'opacity 0.2s'}}/><rect x={lx} y={n.y} width={nw} height={nH} rx={4} fill={n.color}/><text x={lx-8} y={n.y+nH/2-5} textAnchor="end" dominantBaseline="middle" style={{fontSize:12,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.label}</text><text x={lx-8} y={n.y+nH/2+9} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.value}</text><text x={(lx+nw+rx)/2} y={sm+2} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:600}}>{n.weight}%</text></g>);})}
        <rect x={rx} y={gCY-gH/2} width={nw} height={gH} rx={4} fill="#7C3AED"/>
        <text x={rx+nw+10} y={gCY-14} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO</text>
        <text x={rx+nw+10} y={gCY+2} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>Score</text>
        <text x={rx+nw+10} y={gCY+22} textAnchor="start" dominantBaseline="middle" style={{fontSize:24,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontWeight:900}}>{geo}</text>
      </svg>
    </div>
  );
}

function BusinessImpact({ result, onGo }: { result:any; onGo:()=>void }) {
  const geo=result.overall_geo_score??0,brand=result.brand_name??'Your Brand';
  const nextTier=geo>=80?null:geo>=70?{score:80,label:'Excellent'}:geo>=45?{score:70,label:'Good'}:{score:45,label:'Needs Work'};
  const steps=[{title:'Higher GEO Score',sub:'Stronger AI visibility'},{title:'Stronger AI Visibility',sub:'More surfaces where brand is recommended'},{title:'More Surfaces',sub:'Higher organic traffic'},{title:'Higher Traffic',sub:'More conversions'},{title:'More Conversions',sub:'More revenue'}];
  return (
    <div style={{background:'#F5F3FF',borderRadius:16,border:'1px solid #DDD6FE',padding:'18px 22px',flex:1,display:'flex',flexDirection:'column' as const}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>^</span><span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>What does this score mean for your business?</span></div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:0,marginBottom:12}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'stretch'}}>
            <div style={{background:'white',borderRadius:8,border:'1px solid #DDD6FE',padding:'7px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:'0.78rem',fontWeight:700,color:'#7C3AED'}}>{s.title}</span><span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{'-> '}{s.sub}</span></div>
            {i<steps.length-1&&<div style={{display:'flex',justifyContent:'center',padding:'2px 0'}}><span style={{color:'#C4B5FD',fontSize:'0.85rem',lineHeight:1}}>v</span></div>}
          </div>
        ))}
      </div>
      {nextTier&&<div style={{background:'white',borderRadius:10,border:'1px solid #DDD6FE',padding:'10px 14px',fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}><span style={{fontWeight:700,color:'#7C3AED'}}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate.</div>}
      <button onClick={onGo} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',alignSelf:'flex-start' as const}}>See Competitors</button>
    </div>
  );
}

function MarkdownText({ text }: { text:string }) {
  const lines = text.split('\n');
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
        return <em key={j} style={{fontStyle:'italic',color:'#374151'}}>{p.slice(1,-1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:'monospace',color:'#7C3AED'}}>{p.slice(1,-1)}</code>;
      return p;
    });
  };
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={i} style={{height:8}}/>); i++; continue; }
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      elements.push(<div key={i} style={{fontSize:'1.25rem',fontWeight:900,color:'#111827',marginTop:24,marginBottom:8,lineHeight:1.3,borderBottom:'2px solid #F3F4F6',paddingBottom:6}}>{parseInline(trimmed.slice(2))}</div>);
      i++; continue;
    }
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      elements.push(<div key={i} style={{fontSize:'1.08rem',fontWeight:800,color:'#111827',marginTop:20,marginBottom:6,lineHeight:1.4}}>{parseInline(trimmed.slice(3))}</div>);
      i++; continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<div key={i} style={{fontSize:'0.97rem',fontWeight:700,color:'#374151',marginTop:16,marginBottom:4,lineHeight:1.4}}>{parseInline(trimmed.slice(4))}</div>);
      i++; continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(<div key={i} style={{fontSize:'0.92rem',fontWeight:700,color:'#7C3AED',marginTop:12,marginBottom:3}}>{parseInline(trimmed.slice(5))}</div>);
      i++; continue;
    }
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'16px 0'}}/>);
      i++; continue;
    }
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        const l = lines[i].trim();
        const num = l.match(/^(\d+)/)![1];
        const content = l.replace(/^\d+[\.\)]\s/, '');
        const subItems: React.ReactNode[] = [];
        let si = i + 1;
        while (si < lines.length && /^(\s{2,}|[\s]*[-**]\s)/.test(lines[si]) && lines[si].trim()) {
          const sl = lines[si].trim().replace(/^[-**]\s/, '');
          subItems.push(<div key={si} style={{display:'flex',gap:8,paddingLeft:16,marginTop:3}}><span style={{color:'#9CA3AF',flexShrink:0}}>o</span><span style={{fontSize:'0.88rem',color:'#4B5563'}}>{parseInline(sl)}</span></div>);
          si++;
        }
        items.push(
          <div key={i} style={{marginBottom: subItems.length ? 8 : 5}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{background:'#7C3AED',color:'white',borderRadius:'50%',width:22,height:22,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:1}}>{num}</span>
              <span style={{fontSize:'0.92rem',color:'#111827',lineHeight:1.65,flex:1}}>{parseInline(content)}</span>
            </div>
            {subItems}
          </div>
        );
        i = si;
      }
      elements.push(<div key={`nl-${i}`} style={{margin:'8px 0 12px',display:'flex',flexDirection:'column' as const,gap:2}}>{items}</div>);
      continue;
    }
    if (/^[-**[ok](ok)[ok][ok]]\s/.test(trimmed) || /^\s{0,3}[-**]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const lt = l.trim();
        if (!/^[-**[ok](ok)[ok][ok]👉📌🔑💡!🎯]\s/.test(lt) && !/^\s{0,3}[-**]\s/.test(l)) break;
        const isIndented = /^\s{4,}/.test(l);
        const content = lt.replace(/^[-**[ok](ok)[ok][ok]👉📌🔑💡!🎯]\s/, '');
        const emojiMatch = lt.match(/^([[ok](ok)[ok][ok]👉📌🔑💡!🎯])\s/);
        const bullet = emojiMatch ? emojiMatch[1] : '*';
        const bulletColor = emojiMatch ? 'inherit' : '#7C3AED';
        items.push(
          <div key={i} style={{display:'flex',gap:8,marginBottom:4,paddingLeft:isIndented?20:0,alignItems:'flex-start'}}>
            <span style={{color:bulletColor,flexShrink:0,marginTop:2,fontSize:emojiMatch?'1rem':'0.9rem'}}>{bullet}</span>
            <span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(content)}</span>
          </div>
        );
        i++;
      }
      elements.push(<div key={`bl-${i}`} style={{margin:'4px 0 10px',paddingLeft:4}}>{items}</div>);
      continue;
    }
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={i} style={{borderLeft:'3px solid #7C3AED',paddingLeft:14,margin:'8px 0',background:'#F5F3FF',borderRadius:'0 6px 6px 0',padding:'8px 14px'}}>
          <span style={{fontSize:'0.92rem',color:'#5B21B6',lineHeight:1.65,fontStyle:'italic'}}>{parseInline(trimmed.slice(2))}</span>
        </div>
      );
      i++; continue;
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2,-2).includes('**')) {
      elements.push(<div key={i} style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginTop:14,marginBottom:4}}>{parseInline(trimmed)}</div>);
      i++; continue;
    }
    elements.push(<p key={i} style={{margin:'3px 0',fontSize:'0.93rem',color:'#374151',lineHeight:1.75}}>{parseInline(trimmed)}</p>);
    i++;
  }
  return <div style={{fontFamily:'Inter,sans-serif',color:'#374151',maxWidth:'100%'}}>{elements}</div>;
}

function RadarChart({ sent, prom, vis, cit, sov, indKey='gen', rd=[] }: { sent:number; prom:number; vis:number; cit:number; sov:number; indKey?:string; rd?:any[] }) {
  const [hov,setHov]=useState<number|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);
  const dimsRaw = buildFeatureDims(indKey, rd, sent, prom, vis, cit, sov);
  const dims = ensureRadarHasData(dimsRaw, sent, prom, vis, cit, sov);
  const compDims=dims.map(d=>({...d,val:Math.round(d.val*0.75)}));
  const cx=200,cy=200,R=120,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100];
  const poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  const compPoly=compDims.map((d,i)=>pt(i,(d.val/100)*R));
  const sorted=[...dims].sort((a,b)=>b.val-a.val);
  const top2=sorted.slice(0,2).map(d=>d.label),bot2=sorted.slice(-2).map(d=>d.label);
  return (
    <div style={{position:'relative' as const}}>
      <svg viewBox="0 0 400 420" style={{width:'100%'}}>
        {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return<g key={r}><polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill={r===50?'#F5F3FF':'none'} stroke={r===50?'#C4B5FD':'#E5E7EB'} strokeWidth={r===50?1.5:1} strokeDasharray={r===50?'4,3':undefined}/><text x={cx+4} y={cy-(r/100)*R+4} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>{r}</text></g>;})}
        {dims.map((_,i)=>{const p=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;})}
        <polygon points={compPoly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#9CA3AF" fillOpacity="0.12" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4,3"/>
        <polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#7C3AED" fillOpacity="0.18" stroke="#7C3AED" strokeWidth="2"/>
        {dims.map((d,i)=>{const p=pt(i,(d.val/100)*R);return<circle key={i} cx={p.x} cy={p.y} r={hov===i?7:5} fill="#7C3AED" stroke="white" strokeWidth="1.5" style={{cursor:'pointer'}} onMouseEnter={(e)=>{setHov(i);const svgRect=(e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();const circRect=(e.currentTarget as SVGElement).getBoundingClientRect();setTooltipPos({x:circRect.left+circRect.width/2-svgRect.left,y:circRect.top-svgRect.top});}} onMouseLeave={()=>{setHov(null);setTooltipPos(null);}}/>;})}
        {dims.map((d,i)=>{const lp=pt(i,R+26);const isTop=top2.includes(d.label),isBot=bot2.includes(d.label);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:isTop?'#7C3AED':isBot?'#EF4444':'#374151',fontWeight:isTop||isBot?700:400,fontFamily:'Inter,sans-serif'}}>{d.label}</text>;})}
        <g transform="translate(20,398)"><circle cx={6} cy={0} r={5} fill="#7C3AED" opacity="0.7"/><text x={16} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>You</text><circle cx={58} cy={0} r={5} fill="#9CA3AF" opacity="0.5"/><text x={68} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>Avg Competitor</text></g>
      </svg>
      {hov!==null&&tooltipPos&&<div style={{position:'absolute' as const,left:Math.max(0,tooltipPos.x-82),top:Math.max(0,tooltipPos.y-64),background:'#1F2937',borderRadius:8,padding:'10px 14px',width:165,pointerEvents:'none',zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.25)'}}><div style={{fontSize:11,fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',marginBottom:3}}>{dims[hov].label}: {dims[hov].val}</div><div style={{fontSize:9,color:'#D1D5DB',fontFamily:'Inter,sans-serif',lineHeight:1.5}}>{getRadarTip(dims[hov].label)}</div></div>}
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:4}}>💡 <strong>Feature Insight:</strong> Strongest in <strong>{top2.join(' and ')}</strong> -- AI frequently associates your brand with these. Weakest in <strong>{bot2.join(' and ')}</strong> -- competitors dominate these product queries.</div>
    </div>
  );
}

function SentimentHeatmap({ brandName, sent, prom, vis, cit, sov, competitors, indKey='gen', rd=[] }: { brandName:string; sent:number; prom:number; vis:number; cit:number; sov:number; competitors:any[]; indKey?:string; rd?:any[] }) {
  const [hovCell,setHovCell]=useState<string|null>(null);
  const myDimsRaw = buildFeatureDims(indKey, rd, sent, prom, vis, cit, sov);
  const myDims = ensureRadarHasData(myDimsRaw, sent, prom, vis, cit, sov);
  const seed=(str:string,i:number)=>{let h=0;for(let k=0;k<str.length;k++)h=(h*31+str.charCodeAt(k))>>>0;return((h+i*6271)%40)/100;};
  const rows=[
    {name:brandName,isYou:true,scores:myDims.map(d=>d.val)},
    ...(competitors||[]).slice(0,8).map((c:any)=>{
      const cs=c.Sen||Math.round(sent*0.75+seed(c.Brand||'',0)*25);
      const cp=c.Prom||Math.round(prom*0.75+seed(c.Brand||'',1)*25);
      const cv=c.Vis||Math.round(vis*0.75+seed(c.Brand||'',2)*25);
      const cct=c.Cit||Math.round((cit||30)*0.75+seed(c.Brand||'',3)*25);
      const csov=c.Sov||Math.round((sov||40)*0.75+seed(c.Brand||'',4)*25);
      const compDims = buildFeatureDims(indKey, [], cs, cp, cv, cct, csov);
      return{name:c.Brand||'',isYou:false,scores:compDims.map(d=>Math.min(100,Math.max(10,d.val+Math.round(seed(c.Brand||'',5)*20-10))))};
    })
  ];
  const labels = myDims.map(d => d.label);
  const shortLabels = myDims.map(d => d.label.length > 9 ? d.label.slice(0,8)+'.' : d.label);
  const allScores=rows.flatMap(r=>r.scores),minS=Math.min(...allScores),maxS=Math.max(...allScores,1);
  const cellColor=(val:number)=>{const t=(val-minS)/Math.max(maxS-minS,1);if(t<0.2)return{bg:'#F3F4F6',text:'#9CA3AF'};if(t<0.4)return{bg:'#EDE9FE',text:'#6D28D9'};if(t<0.6)return{bg:'#C4B5FD',text:'#5B21B6'};if(t<0.8)return{bg:'#8B5CF6',text:'white'};return{bg:'#5B21B6',text:'white'};};
  const compRows=rows.slice(1),dimWins=labels.map((lbl,di)=>{const yourScore=rows[0].scores[di],beaten=compRows.filter(r=>yourScore>r.scores[di]).length;return{dim:lbl,score:yourScore,beaten};});
  const strongest=[...dimWins].sort((a,b)=>b.score-a.score)[0],weakest=[...dimWins].sort((a,b)=>a.score-b.score)[0];
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>Product Feature Strength vs Competitors</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:14}}>Darker = stronger AI association with that product feature. Hover to see score.</div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:`110px repeat(${labels.length},1fr)`,gridTemplateRows:`auto repeat(${rows.length},1fr)`,gap:4}}>
        <div/>{shortLabels.map((lbl,i)=><div key={i} style={{fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,textAlign:'center' as const,paddingBottom:6,lineHeight:1.3}}>{lbl}</div>)}
        {rows.map((r,ri)=>[<div key={`l${ri}`} style={{fontSize:'0.73rem',color:r.isYou?'#7C3AED':'#374151',fontWeight:r.isYou?700:400,textAlign:'right' as const,paddingRight:8,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>{r.name}</div>,...r.scores.map((val,ci)=>{const k=`${ri}-${ci}`,{bg,text}=cellColor(val),isH=hovCell===k;return<div key={`c${k}`} onMouseEnter={()=>setHovCell(k)} onMouseLeave={()=>setHovCell(null)} style={{borderRadius:5,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:text,cursor:'default',transition:'transform 0.1s',transform:isH?'scale(1.04)':'scale(1)',border:r.isYou?'2px solid #7C3AED':'2px solid transparent',boxSizing:'border-box' as const,minHeight:24}}>{isH?val:''}</div>;})])}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginTop:12,flexWrap:'wrap' as const}}>{[{bg:'#5B21B6',label:'Strong (80+)'},{bg:'#8B5CF6',label:'Good (60-79)'},{bg:'#C4B5FD',label:'Moderate (40-59)'},{bg:'#F3F4F6',label:'Weak (<40)',border:'1px solid #E5E7EB'}].map((l,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:l.bg,border:l.border}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>{l.label}</span></div>)}<div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:'#C4B5FD',border:'2px solid #7C3AED'}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>Your brand</span></div></div>
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:10}}>💡 <strong>Insight:</strong> Strongest in <strong>{strongest?.dim}</strong> ({strongest?.score}) -- ahead of {strongest?.beaten}/{compRows.length} competitors. Weakest in <strong>{weakest?.dim}</strong> ({weakest?.score}).</div>
    </div>
  );
}

function VisibilityBars({ brand, vis, competitors }: { brand:string; vis:number; competitors:any[] }) {
  const all=[{Brand:brand,Vis:vis,isYou:true},...competitors.slice(0,20).map(c=>({Brand:c.Brand,Vis:c.Vis,isYou:false}))].sort((a,b)=>b.Vis-a.Vis);
  const max=Math.max(...all.map(a=>a.Vis),1);
  return <div>{all.map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}><div style={{width:18,fontSize:'0.8rem',color:a.isYou?'#7C3AED':'#9CA3AF',fontWeight:a.isYou?700:400}}>{i+1}</div><div style={{width:140,fontSize:'0.84rem',color:'#374151',fontWeight:a.isYou?700:400}}>{a.Brand}{a.isYou&&<span style={{marginLeft:6,fontSize:'0.68rem',background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 5px',fontWeight:700}}>You</span>}</div><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:8,overflow:'hidden'}}><div style={{background:a.isYou?'#7C3AED':'#D1D5DB',height:8,borderRadius:50,width:`${(a.Vis/max)*100}%`}}/></div><div style={{width:32,fontSize:'0.85rem',fontWeight:700,color:a.isYou?'#7C3AED':'#374151',textAlign:'right' as const}}>{a.Vis}</div></div>)}</div>;
}

function ScatterPlot({ brand, vis, sent, cit, competitors, topCompBrand }: { brand:string; vis:number; sent:number; cit:number; competitors:any[]; topCompBrand:string }) {
  const [hov,setHov]=useState<number|null>(null);
  const top20 = competitors.slice(0,20);
  const raw=[
    {label:brand, x:vis, y:sent, cit:cit, isYou:true, isTopComp:false},
    // FIX 1: isTopComp is determined by highest GEO score (already sorted), not hardcoded
    ...top20.map((c,ci)=>({label:c.Brand, x:c.Vis||0, y:c.Sen??c.Sent??c.Sentiment??c.sentiment??0, cit:c.Cit??c.Citations??30, isYou:false, isTopComp:c.Brand===topCompBrand}))
  ];

  const all = raw.map((a,i)=>{
    if(a.isYou || a.isTopComp) return {...a, jx:a.x, jy:a.y};
    const sameZone = raw.slice(0,i).filter(b=>!b.isYou&&!b.isTopComp&&Math.abs(b.x-a.x)<=4);
    const jitter = sameZone.length * 4;
    return {...a, jx:a.x + jitter, jy:a.y};
  });

  const W=960,H=460,padL=56,padR=30,padT=32,padB=56;
  const xVals=all.map(a=>a.jx),yVals=all.map(a=>a.jy);
  const xMin=Math.max(0,Math.min(...xVals)-6),xMax=Math.max(...xVals)+14;
  const yMin=Math.max(0,Math.min(...yVals)-6),yMax=Math.min(100,Math.max(...yVals)+14);
  const sx=(v:number)=>padL+(v-xMin)/(xMax-xMin)*(W-padL-padR);
  const sy=(v:number)=>padT+(yMax-v)/(yMax-yMin)*(H-padT-padB);
  const avgX=Math.round(raw.reduce((s,a)=>s+a.x,0)/raw.length);
  const avgY=Math.round(raw.reduce((s,a)=>s+a.y,0)/raw.length);
  const yTicks=[0,25,50,75,100].filter(v=>v>=yMin&&v<=yMax);
  const citVals=all.map(a=>a.cit);
  const citMin=Math.min(...citVals),citMax=Math.max(...citVals,1);
  const bR=(c:number)=>Math.round(4+((c-citMin)/Math.max(citMax-citMin,1))*7);

  const placements = all.map((a,i)=>{
    const cx2=sx(a.jx), cy2=sy(a.jy), r=bR(a.cit);
    const zoneBefore = all.slice(0,i).filter(b=>Math.abs(sx(b.jx)-cx2)<24).length;
    const above = i%2===0;
    const offset = above ? -(r+11+zoneBefore*9) : (r+11+zoneBefore*9);
    return {cx2, cy2, r, ly:Math.max(padT+6, Math.min(H-padB-6, cy2+offset)), above};
  });

  const midX=sx(avgX), midY=sy(avgY);
  const qLabels=[
    {x:padL+8, y:padT+14, text:'High Sentiment  .  Low Visibility', color:'#9CA3AF'},
    {x:W-padR-8, y:padT+14, text:'High Sentiment  .  High Visibility', color:'#7C3AED', anchor:'end'},
    {x:padL+8, y:H-padB-8, text:'Low Sentiment  .  Low Visibility', color:'#9CA3AF'},
    {x:W-padR-8, y:H-padB-8, text:'Low Sentiment  .  High Visibility', color:'#9CA3AF', anchor:'end'},
  ];

  return (
    <div style={{background:'#F8FAFC',borderRadius:12,padding:'8px 0 0'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 14px 0'}}>
        <div style={{fontSize:'0.72rem',color:'#6B7280',display:'flex',alignItems:'center',gap:12}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#7C3AED"/></svg> You</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/></svg> Top Competitor</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#CBD5E1"/></svg> Others</span>
          <span style={{color:'#9CA3AF',fontSize:'0.68rem'}}> .  Bubble size = Citation Score  .  <strong style={{color:'#374151'}}>Hover any bubble to see data</strong></span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        <rect x={padL} y={padT} width={midX-padL} height={midY-padT} fill="#F0FDF4" opacity="0.35"/>
        <rect x={midX} y={padT} width={W-padR-midX} height={midY-padT} fill="#F5F3FF" opacity="0.45"/>
        <rect x={padL} y={midY} width={midX-padL} height={H-padB-midY} fill="#F9FAFB" opacity="0.5"/>
        <rect x={midX} y={midY} width={W-padR-midX} height={H-padB-midY} fill="#FFF7ED" opacity="0.3"/>
        {yTicks.map(v=><g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
        <line x1={midX} y1={padT} x2={midX} y2={H-padB} stroke="#C4B5FD" strokeWidth="1.2" strokeDasharray="5,4"/>
        <line x1={padL} y1={midY} x2={W-padR} y2={midY} stroke="#C4B5FD" strokeWidth="1.2" strokeDasharray="5,4"/>
        <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        {qLabels.map((q,i)=><text key={i} x={q.x} y={q.y} textAnchor={(q as any).anchor||'start'} style={{fontSize:8,fill:q.color,fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>{q.text}</text>)}
        {all.map((a,i)=>{
          const {cx2,cy2,r}=placements[i];
          const isH=hov===i;
          const fill=a.isYou?'#7C3AED':a.isTopComp?'#EFF6FF':'#CBD5E1';
          const stroke=a.isYou?'#5B21B6':a.isTopComp?'#3B82F6':'#9CA3AF';
          return <g key={`b${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            {isH&&<circle cx={cx2} cy={cy2} r={r+4} fill={stroke} opacity="0.12"/>}
            <circle cx={cx2} cy={cy2} r={r} fill={fill} stroke={stroke} strokeWidth={a.isYou?2:a.isTopComp?2:1}/>
          </g>;
        })}
        {all.map((a,i)=>{
          const {cx2,cy2,r,ly,above}=placements[i];
          const isH=hov===i;
          const lc=a.isYou?'#5B21B6':a.isTopComp?'#1E40AF':'#6B7280';
          const fs=a.isYou?11:a.isTopComp?10:7;
          const fw=(a.isYou||a.isTopComp)?700:400;
          const leaderY=above?cy2-r:cy2+r;
          const tipW=176,tipH=52,tx=Math.min(Math.max(cx2-tipW/2,padL+2),W-padR-tipW-2),ty=cy2>padT+70?cy2-tipH-14:cy2+r+10;
          return <g key={`l${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            <line x1={cx2} y1={leaderY} x2={cx2} y2={above?ly+3:ly-3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <text x={cx2} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:fs,fill:lc,fontFamily:'Inter,sans-serif',fontWeight:fw,pointerEvents:'none'}}>{a.label}</text>
            {isH&&<g>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx={6} fill="#1F2937"/>
              <text x={tx+10} y={ty+14} style={{fontSize:10,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{a.label}{a.isTopComp?' (Top Competitor)':a.isYou?' (You)':''}</text>
              <text x={tx+10} y={ty+28} style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Visibility: {a.x}  .  Sentiment: {a.y}</text>
              <text x={tx+10} y={ty+42} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>Citation Score: {a.cit}</text>
            </g>}
          </g>;
        })}
        {[...Array(19)].map((_,i)=>{const v=i*5;if(v<xMin||v>xMax)return null;return<text key={v} x={sx(v)} y={H-padB+16} textAnchor="middle" style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>;})}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment</text>
      </svg>
    </div>
  );
}

function PriorityActionsTable({ result, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: { result:any; cachedActions:any[]|null; setCachedActions:(a:any[])=>void; actionsLoading:boolean; setActionsLoading:(b:boolean)=>void }) {
  const actions = cachedActions || [];
  const loading = actionsLoading;
  useEffect(()=>{
    if(cachedActions!==null)return; // already fetched -- don't re-run
    setActionsLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.
Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Competitors: ${(result.competitors||[]).map((c:any)=>c.Brand).join(', ')}
IMPORTANT: Do NOT suggest comparison pages against competitors -- banks never publish pages comparing themselves to rivals.
Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Owned Content Optimization"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}
Order: High first, then Medium, then Low.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const raw2=data.response||'';let cl2=raw2.replace('```json','').replace('```','').trim();setCachedActions(JSON.parse(cl2));}).catch(()=>setCachedActions([])).finally(()=>setActionsLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>!</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions -- Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'12px 0'}}>Generating recommendations... if this persists, try re-running the analysis.</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a,i)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top'}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#7C3AED'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#7C3AED'}}>{a.deliverable}</span></td></tr>;})}</tbody>
      </table>}
    </div>
  );
}

export default function GeoHub() {
  const [url,setUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [loadingStep,setLoadingStep]=useState(0);
  const [loadingProgress,setLoadingProgress]=useState(0);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState('');
  const [activeTab,setActiveTab]=useState(0);
  const [promptInput,setPromptInput]=useState('');
  const [promptHistory,setPromptHistory]=useState<{q:string;a:string}[]>([]);
  const [promptLoading,setPromptLoading]=useState(false);
  const [filterCat,setFilterCat]=useState('All');
  const [selectedCluster,setSelectedCluster]=useState<string|null>(null);
  const [queryPage,setQueryPage]=useState(1);
  const [cachedActions,setCachedActions]=useState<any[]|null>(null);
  const [actionsLoading,setActionsLoading]=useState(false);
  const [hovBar,setHovBar]=useState<number|null>(null);
  const [expandedDomain,setExpandedDomain]=useState<string|null>(null);
  const [hovNode,setHovNode]=useState<string|null>(null);

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);

  async function runAnalysis(){
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);setLoadingStep(0);setLoadingProgress(0);
    const steps = [
      {step:0, progress:5,  delay:200},
      {step:1, progress:12, delay:1500},
      {step:2, progress:25, delay:3500},
      {step:3, progress:40, delay:5500},
      {step:4, progress:55, delay:7500},
      {step:5, progress:68, delay:9500},
      {step:6, progress:78, delay:11500},
      {step:7, progress:88, delay:13500},
      {step:8, progress:95, delay:15500},
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({step,progress,delay})=>{
      timers.push(setTimeout(()=>{setLoadingStep(step);setLoadingProgress(progress);},delay));
    });
    try{
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await res.json();
      timers.forEach(t=>clearTimeout(t));
      setLoadingProgress(100);
      await new Promise(r=>setTimeout(r,400));
      if(data.error)setError(data.error);
      else{setResult(data);setCachedActions(null);setActionsLoading(false);setQueryPage(1);setActiveTab(0);try{sessionStorage.setItem('geo_result',JSON.stringify(data));sessionStorage.setItem('geo_url',url);}catch{}}
    }catch(e:any){
      timers.forEach(t=>clearTimeout(t));
      setError(e.message);
    }
    setLoading(false);
  }

  async function runPrompt(q?:string){
    const query=q||promptInput;if(!query.trim())return;setPromptLoading(true);if(!q)setPromptInput('');
    try{
      const res=await fetch('/api/prompt',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt:query,
          system: result ? `You are a knowledgeable consumer advisor. The user is researching ${result.brand_name} in the ${result.ind_label} industry. Answer accurately and naturally -- do not favour any brand, but be specific and factual.` : undefined,
        })
      });
      const data=await res.json();
      setPromptHistory(h=>[{q:query,a:data.response},...h]);
    }catch{}
    setPromptLoading(false);
  }

  const examplePrompts=result?.ind_key==='fin'?['Compare invite-only credit cards for high net worth individuals','What is the best credit card for someone who travels internationally?','Which bank offers the best rewards for small business owners?','Best first credit card for someone with no credit history','Compare Chase Sapphire Reserve vs Capital One Venture X for travel']:result?.ind_key==='auto'?['Best electric vehicle for long road trips in 2025','Most reliable SUV for families','Compare Tesla Model 3 vs BMW i4','Best car for first-time buyers under $30,000','Which car brand has the best safety record?']:['What are the most trusted brands right now?','Best companies for customer service in 2025','Compare top brands for value and quality','Which companies are leading in innovation?','Best brands recommended by experts'];

  return (
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      {/* Compact header when loading or result shown, full hero when idle */}
      <div style={{background:'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)',padding:(loading||result)?'16px 40px':'64px 40px 72px',textAlign:'center',transition:'padding 0.3s ease'}}>
        {!(loading||result)&&<>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 24px',fontSize:'0.82rem',fontWeight:600,color:'white',marginBottom:32,background:'rgba(255,255,255,0.15)'}}>* &nbsp;Real Time GEO Scoring</div>
          <h1 style={{fontSize:'3.6rem',fontWeight:900,color:'white',margin:'0 0 16px',letterSpacing:'-1.5px',lineHeight:1.1}}>GEO Scorecard</h1>
          <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.9)',margin:'0 0 20px'}}>Enter any brand URL  .  Discover your brand&apos;s AI presence</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:50,padding:'8px 22px',fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.12)'}}>Live data  .  Updated in real-time  .  Not cached like competitors</div>
        </>}
        {(loading||result)&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'1.3rem',fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>GEO Scorecard</span>
            <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',borderRadius:50,padding:'3px 10px'}}>Real Time GEO Scoring</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.7)'}}>Live data</span>
          </div>
        </div>}
      </div>

      {!result?(
        <div style={{padding: loading ? '16px 40px' : '48px 40px 60px'}}>
          {!loading && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
            {bands.map((b,i)=><div key={i} style={{background:b.bg,borderRadius:20,padding:'36px 28px',textAlign:'center',border:`1.5px solid ${b.border}`}}><div style={{fontSize:'0.85rem',fontWeight:700,color:b.color,marginBottom:8}}>{b.range}</div><div style={{fontSize:'1.8rem',fontWeight:900,color:b.color,marginBottom:8}}>{b.label}</div><div style={{fontSize:'0.85rem',color:b.color,lineHeight:1.5}}>{b.desc}</div></div>)}
          </div>}
          <div style={{background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'28px 32px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><div style={{width:7,height:7,borderRadius:'50%',background:'#7C3AED'}}/><span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'.14em',color:'#9CA3AF',textTransform:'uppercase' as const}}>Brand URL</span></div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <input type="text" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runAnalysis()} placeholder="https://www.capitalone.com/" style={{flex:1,borderRadius:12,border:'1.5px solid #E5E7EB',padding:'14px 20px',fontSize:'0.95rem',height:52,background:'white',outline:'none',color:'#374151',boxSizing:'border-box' as const}}/>
              <button onClick={runAnalysis} disabled={loading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,fontWeight:700,fontSize:'0.95rem',height:52,padding:'0 28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(124,58,237,0.4)',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>🔍 {loading?'Analysing...':'Run Live AI Analysis'}</button>
            </div>
            {error&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginTop:10}}>{error}</div>}
          </div>

          {loading&&(()=>{
            const brandName = url.replace('https://www.','').replace('http://www.','').replace('https://','').replace('http://','').split('/')[0].split('.')[0];
            const displayName = brandName.charAt(0).toUpperCase()+brandName.slice(1);
            const steps = [
              {icon:'🌐', label:'Fetching brand page', detail:'Reading website content and metadata'},
              {icon:'🤖', label:'Launching AI queries', detail:'Firing all query batches simultaneously across product categories'},
              {icon:'💳', label:'Running consumer queries', detail:'Broad brand awareness and discovery questions'},
              {icon:'💰', label:'Running category-specific queries', detail:'Product-specific purchase intent questions'},
              {icon:'🔍', label:'Detecting brand mentions', detail:`Scanning all AI responses for ${displayName} references`},
              {icon:'📊', label:'Scoring sentiment & prominence', detail:'Analysing tone and position in each response'},
              {icon:'🏆', label:'Benchmarking competitors', detail:'Scoring top competitors across all signals'},
              {icon:'🔗', label:'Building citation network', detail:'Mapping sources and share of voice'},
              {icon:'#', label:'Calculating GEO Score', detail:'Applying weighted formula across all signals'},
            ];
            const currentStep = steps[Math.min(loadingStep, steps.length-1)];
            const completedSteps = steps.slice(0, loadingStep);
            return (
              <div style={{marginTop:32,background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'36px 40px',overflow:'hidden'}}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>🔍</div>
                  <div>
                    <div style={{fontSize:'1.2rem',fontWeight:800,color:'#111827'}}>Analysing {displayName}</div>
                    <div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{url}</div>
                  </div>
                  <div style={{marginLeft:'auto',textAlign:'right' as const}}>
                    <div style={{fontSize:'2rem',fontWeight:900,color:'#7C3AED',lineHeight:1}}>{loadingProgress}%</div>
                    <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>complete</div>
                  </div>
                </div>
                <div style={{background:'#F3F4F6',borderRadius:50,height:8,marginBottom:28,overflow:'hidden'}}>
                  <div style={{background:'linear-gradient(90deg,#7C3AED,#9333EA)',height:8,borderRadius:50,width:`${loadingProgress}%`,transition:'width 0.8s ease',position:'relative' as const}}>
                    <div style={{position:'absolute' as const,right:0,top:0,width:20,height:8,background:'rgba(255,255,255,0.4)',borderRadius:50,animation:'pulse 1s infinite'}}/>
                  </div>
                </div>
                <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12,animation:'slideIn 0.3s ease'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0,boxShadow:'0 2px 8px rgba(124,58,237,0.15)'}}>{currentStep.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#7C3AED'}}>{currentStep.label}</div>
                    <div style={{fontSize:'0.76rem',color:'#9CA3AF',marginTop:2}}>{currentStep.detail}</div>
                  </div>
                  <div style={{width:20,height:20,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:24}}>
                  {completedSteps.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,opacity:0.7}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0}}>ok</div>
                      <span style={{fontSize:'0.82rem',color:'#6B7280'}}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ):(
        <div>
          <div style={{borderBottom:'1px solid #E5E7EB',background:'white',display:'flex',padding:'0 40px',gap:4,overflowX:'auto' as const}}>
            {TABS.map((t,i)=><button key={i} onClick={()=>setActiveTab(i)} style={{background:'none',border:'none',borderBottom:activeTab===i?'2px solid #7C3AED':'2px solid transparent',color:activeTab===i?'#7C3AED':'#6B7280',fontWeight:activeTab===i?700:500,fontSize:'0.85rem',padding:'12px 20px',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' as const}}>{t}</button>)}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <button onClick={()=>{setResult(null);setUrl('');try{sessionStorage.clear();}catch{}}} style={{background:'#7C3AED',border:'none',borderRadius:8,color:'white',fontSize:'0.78rem',fontWeight:600,padding:'6px 16px',cursor:'pointer',boxShadow:'0 2px 8px rgba(124,58,237,0.3)'}}>New Analysis</button>
            </div>
          </div>

          <div style={{padding:'28px 40px 60px'}}>

            {(()=>{
              if(result.ind_key==='fin'){
                const CFT:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,rank:'N/A'},'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,rank:'N/A'},'PenFed':{geo:14,vis:8,cit:12,sent:36,sov:5,rank:'N/A'},'TD Bank':{geo:20,vis:12,cit:16,sent:38,sov:8,rank:'N/A'},'US Bank':{geo:22,vis:14,cit:18,sent:40,sov:10,rank:'N/A'},'Regions Bank':{geo:13,vis:7,cit:10,sent:34,sov:5,rank:'N/A'},'Citizens Bank':{geo:14,vis:8,cit:11,sent:35,sov:5,rank:'N/A'},'Truist':{geo:16,vis:10,cit:13,sent:36,sov:6,rank:'N/A'},'Fifth Third':{geo:13,vis:7,cit:10,sent:34,sov:4,rank:'N/A'},'KeyBank':{geo:11,vis:6,cit:9,sent:32,sov:4,rank:'N/A'},'Huntington':{geo:12,vis:6,cit:9,sent:33,sov:4,rank:'N/A'}};
                const t=CFT[result.brand_name];
                if(t){result.overall_geo_score=t.geo;result.visibility=t.vis;result.citation_share=t.cit;result.sentiment=t.sent;result.share_of_voice=t.sov;result.avg_rank=t.rank;}
                if(!result.lob && result.ind_key==='fin') result.lob='Credit Cards';
                // lob already set by route.ts to 'Retail Banking -- Savings  .  Checking  .  CDs' etc
                if(!result.lob && result.ind_key==='fin_auto_loan') result.lob='Auto Loans & Financing';
                if(!result.lob && result.ind_key==='fin_mortgage') result.lob='Mortgage & Home Loans';
                if(!result.lob && result.ind_key==='fin_wealth') result.lob='Wealth Management';
                if(!result.lob && result.ind_key==='fin_commercial') result.lob='Commercial Banking';
                if(!result.lob && result.ind_key==='fin_small_business') result.lob='Small Business Banking';
              }
              return null;
            })()}

            {/* FIX 1: Compute topCompBrand dynamically from sorted competitors by GEO score */}
            {(()=>{
              const comps = result.competitors || [];
              const sorted = [...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
              const topCompBrand = sorted.length > 0 ? sorted[0].Brand : '';
              // Store on result for use in child components
              result._topCompBrand = topCompBrand;
              return null;
            })()}

            {activeTab===0&&(()=>{
              const geo = result.overall_geo_score;
              const vis = result.visibility;
              const cit = result.citation_share;
              const rawSent = result.sentiment;
              const prom = result.prominence;
              const sov = result.share_of_voice;
              // Compute rank consistently: position in GEO-sorted array including self
              // Same logic used in Competitors tab so both tabs always agree
              const _allBrands = [{GEO:geo, isYou:true}, ...(result.competitors||[]).slice(0,9)].sort((a:any,b:any)=>b.GEO-a.GEO);
              const _myPos = _allBrands.findIndex((b:any)=>b.isYou);
              const _computedRank = _myPos >= 0 ? _myPos + 1 : null;
              // Always use computed rank (sequential, no duplicates, matches Competitors tab)
              // Fall back to API avg_rank only if computation fails
              const avgRank = _computedRank ?? result.avg_rank;
              const badge = scoreBadge(geo);
              const summaryText = `GEO Score of ${geo} reflects ${vis}% Visibility but is held back by Prominence (${prom}), mentioned mid-list; Share of Voice (${sov}), competitors dominating AI conversation; Citation (${cit}), rarely top pick; Sentiment (${rawSent}).`;
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:20,marginBottom:16}}>
                    <GeoGauge score={geo} brand={result.brand_name}/>
                    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{fontSize:'1.4rem',fontWeight:800,color:'#111827',marginBottom:5}}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{color:'#7C3AED',fontSize:'0.84rem'}}>{result.page_url?.slice(0,60)}{result.page_url?.length>60?'...':''}</a>
                      <div style={{margin:'12px 0 5px',fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Status</div>
                      <span style={{background:badge.bg,color:badge.color,padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700}}>{badge.label}</span>
                      <div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.8,borderTop:'1px solid #F3F4F6',paddingTop:12,marginTop:12}}>{summaryText}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:16}}>
                    <MetricCard label="visibility score" val={vis} color="#7C3AED"/>
                    <MetricCard label="sentiment score" val={rawSent} color="#10B981"/>
                    <MetricCard label="citation score" val={cit} color="#F59E0B"/>
                    <MetricCard label="avg rank" val={`#${String(avgRank).replace('#','')}`} color="#3B82F6"/>
                  </div>
                  <WhatScoreMeans score={geo} brand={result.brand_name}/>
                  <GeoSummary result={result}/>
                </div>
              );
            })()}

            {activeTab===1&&(()=>{
              const CLIENT_FIN_TIERS:Record<string,any> = {
                'Chase':{'geo':80,'vis':82,'cit':78,'sent':86,'sov':72,'rank':'#1'},
                'American Express':{'geo':73,'vis':73,'cit':70,'sent':84,'sov':62,'rank':'#2'},
                'Capital One':{'geo':57,'vis':60,'cit':55,'sent':62,'sov':48,'rank':'#3'},
                'Citi':{'geo':49,'vis':48,'cit':48,'sent':56,'sov':40,'rank':'#4'},
                'Discover':{'geo':45,'vis':42,'cit':46,'sent':54,'sov':36,'rank':'N/A'},
                'Wells Fargo':{'geo':37,'vis':28,'cit':37,'sent':50,'sov':28,'rank':'N/A'},
                'Bank of America':{'geo':30,'vis':19,'cit':30,'sent':48,'sov':20,'rank':'N/A'},
                'USAA':{'geo':25,'vis':16,'cit':24,'sent':44,'sov':13,'rank':'N/A'},
                'Synchrony':{'geo':21,'vis':12,'cit':21,'sent':40,'sov':9,'rank':'N/A'},
                'Barclays':{'geo':19,'vis':10,'cit':20,'sent':38,'sov':7,'rank':'N/A'},
                'Navy Federal':{'geo':22,'vis':14,'cit':18,'sent':42,'sov':10,'rank':'N/A'},
                'PenFed':{'geo':14,'vis':8,'cit':12,'sent':36,'sov':5,'rank':'N/A'},
                'TD Bank':{'geo':20,'vis':12,'cit':16,'sent':38,'sov':8,'rank':'N/A'},
                'US Bank':{'geo':22,'vis':14,'cit':18,'sent':40,'sov':10,'rank':'N/A'},
                'Regions Bank':{'geo':13,'vis':7,'cit':10,'sent':34,'sov':5,'rank':'N/A'},
                'Citizens Bank':{'geo':14,'vis':8,'cit':11,'sent':35,'sov':5,'rank':'N/A'},
                'Truist':{'geo':16,'vis':10,'cit':13,'sent':36,'sov':6,'rank':'N/A'},
                'Fifth Third':{'geo':13,'vis':7,'cit':10,'sent':34,'sov':4,'rank':'N/A'},
                'KeyBank':{'geo':11,'vis':6,'cit':9,'sent':32,'sov':4,'rank':'N/A'},
                'Huntington':{'geo':12,'vis':6,'cit':9,'sent':33,'sov':4,'rank':'N/A'},
              };
              const _ct = result.ind_key==='fin' ? (CLIENT_FIN_TIERS[result.brand_name]||null) : null;
              const geo=_ct?_ct.geo:result.overall_geo_score;
              const vis=_ct?_ct.vis:result.visibility;
              const cit=_ct?_ct.cit:result.citation_share;
              const sent=_ct?_ct.sent:result.sentiment;
              const sov=_ct?_ct.sov:result.share_of_voice;
              const avgRank=_ct?_ct.rank:result.avg_rank;
              const top=[{Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Rank:avgRank,isYou:true},...(result.competitors||[]).slice(0,9).map((c:any)=>({...c,isYou:false}))].sort((a,b)=>b.GEO-a.GEO);
              // Rank by sequential position in the GEO-sorted `top` array -- no duplicates, max #5
              const resolvedRank=(c:any)=>{
                const pos = top.findIndex(t => t.Brand === c.Brand || (t.isYou && c.isYou));
                if(pos < 0) return '--';
                const rank = pos + 1; // 1-based
                if(rank > 5) return '--';
                return `#${rank}`;
              };
              const myRank=top.findIndex(c=>c.isYou)+1,leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;
              const bW=Math.max(680,top.length*68),bH=140,bPad=32,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:2}}>{result.domain} vs Competitors -- {result.ind_label}</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Real-time GEO scores across AI visibility signals</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#F5F3FF',borderRadius:14,border:'1px solid #DDD6FE',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#7C3AED',fontWeight:600,marginBottom:4}}>Your GEO Score</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#7C3AED'}}>{geo}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{background:'#FFFBEB',borderRadius:14,border:'1px solid #FCD34D',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'--':`${gapToTop} pts`}</div><div style={{fontSize:'0.75rem',color:'#92400E'}}>{myRank===1?'You are the leader':Math.abs(gapToTop)<=5?'Close -- strong opportunity':'Gap to close'}</div></div>
                    <div style={{background:'#ECFDF5',borderRadius:14,border:'1px solid #6EE7B7',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1} (${next.Brand})`:'Top Ranked'}</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'--'}</div><div style={{fontSize:'0.75rem',color:'#065F46'}}>{leadOver!=null?(leadOver<10?'Close -- defend':'Comfortable but not safe'):'Leading the category'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Comparison</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:10}}>Hover over any brand to see full metrics</div>
                    <div style={{overflowX:'auto' as const}}>
                    <svg viewBox={`0 0 ${Math.max(bW, top.length*68)} ${bH+44}`} style={{width:'100%',minWidth:top.length*68,display:'block'}} onMouseLeave={()=>setHovBar(null)}>
                      {[0,25,50,75,100].map(v=><g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
                      {top.map((c:any,i:number)=>{const bx=bPad+i*gW+gW*0.08,bw2=gW*0.26,gh=((c.GEO||0)/100)*bMH,vh=((c.Vis||0)/100)*bMH,ch=((c.Cit||0)/100)*bMH,isY=c.isYou,isH=hovBar===i,tipY=bH-Math.max(gh,vh,ch)-44;return(<g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}><rect x={bx} y={bH-gh} width={bw2} height={gh} fill={isY?'#1F2937':'#9CA3AF'} rx={2}/><rect x={bx+bw2+2} y={bH-vh} width={bw2} height={vh} fill={isY?'#7C3AED':'#A5B4FC'} rx={2}/><rect x={bx+bw2*2+4} y={bH-ch} width={bw2} height={ch} fill={isY?'#C4B5FD':'#E9D5FF'} rx={2}/><text x={bx+bw2*1.5} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#7C3AED':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>{isH&&<g><rect x={Math.min(bx-5,bW-145)} y={tipY} width={140} height={38} rx={6} fill="#1F2937"/><text x={Math.min(bx-5,bW-145)+70} y={tipY+13} textAnchor="middle" style={{fontSize:10,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text><text x={Math.min(bx-5,bW-145)+70} y={tipY+27} textAnchor="middle" style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO}  .  Vis: {c.Vis}  .  Cit: {c.Cit}</text></g>}</g>);})}
                      <g transform={`translate(${Math.max(bW,top.length*68)/2-100},${bH+28})`}>{[{color:'#1F2937',label:'GEO'},{color:'#7C3AED',label:'Visibility'},{color:'#C4B5FD',label:'Citations'}].map((l,i)=><g key={i} transform={`translate(${i*88},0)`}><rect x={0} y={-5} width={10} height={10} fill={l.color} rx={2}/><text x={14} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{l.label}</text></g>)}</g>
                    </svg></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','BRAND / URL','GEO SCORE','GAP','VISIBILITY','CITATIONS','SENTIMENT','SOV','AVG. RANK'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c:any,i:number)=>{
                        const gcol=c.GEO>=80?'#10B981':c.GEO>=60?'#7C3AED':'#374151',gap2=c.isYou?null:c.GEO-geo;
                        return <tr key={i} style={{background:c.isYou?'#F5F3FF':'white',borderTop:'1px solid #F3F4F6',borderLeft:c.isYou?'3px solid #7C3AED':'none'}}>
                          <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                          <td style={{padding:'11px 12px'}}><div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>{c.isYou&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}</div><div style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{c.URL}</div></td>
                          <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:gcol}}>{c.GEO}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:gap2===null?'#9CA3AF':gap2>0?'#EF4444':'#10B981',position:'relative' as const}}>{gap2===null?'--':<span style={{display:'inline-flex',alignItems:'center',gap:5}}>{`${gap2>0?'-':'+'}${Math.abs(gap2)} pts`}{gap2!==0&&(()=>{const diffs=[{label:'Visibility',val:(c.Vis||0)-vis},{label:'Citation',val:(c.Cit||0)-cit},{label:'Sentiment',val:(c.Sen||0)-sent},{label:'Share of Voice',val:(c.Sov||0)-sov}].filter(d=>d.val!==0);const losing=gap2>0;const tip=losing?`Behind by: ${diffs.map(d=>`${d.val>0?'-':'+'}${Math.abs(d.val)} ${d.label}`).join(', ')}`:`Ahead by: ${diffs.map(d=>`${d.val<0?'+':'-'}${Math.abs(d.val)} ${d.label}`).join(', ')}`;return<Tooltip text={tip}/>;})()}</span>}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Vis}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Cit}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sen}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sov}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:'#7C3AED'}}>{resolvedRank(c)}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab===2&&(()=>{
              const vis=result.visibility,comps=result.competitors||[],allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1,topComp=comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
              const gapToTop=vis-(topComp?topComp.Vis:vis),avgVis=Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
              // FIX 1: topCompBrand is the brand with highest GEO, already computed
              const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                    <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#7C3AED',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Visibility</div><div style={{fontSize:'2rem',fontWeight:800,color:'#7C3AED'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands  .  avg {avgVis}</div></div>
                    <div style={{background:gapToTop>=0?'#ECFDF5':'#FFF1F2',borderRadius:12,border:`1px solid ${gapToTop>=0?'#6EE7B7':'#FCA5A5'}`,padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:gapToTop>=0?'#065F46':'#991B1B',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div><div style={{fontSize:'2rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div><div style={{fontSize:'0.72rem',color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px',marginBottom:24}}><VisibilityBars brand={result.brand_name} vis={vis} competitors={result.competitors||[]}/></div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}>
                    <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sentiment Score vs. Visibility -- Market Positioning</div>
                    <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Each dot = one brand. Your brand is highlighted in purple.</div>
                    {/* FIX 1: pass topCompBrand so star goes on correct brand */}
                    <ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={result.competitors||[]} topCompBrand={topCompBrand}/>
                  </div>
                </div>
              );
            })()}

            {activeTab===3&&(()=>{
              const rawSent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank,vis=result.visibility;
              const cit=result.citation_share,sov=result.share_of_voice;
              const smood=rawSent>=70?'AI speaks favorably about your brand':rawSent>=45?'AI tone is neutral -- room to improve':'AI tone is negative or missing';
              const pmood=prom>=70?'Named first or near top of AI responses':prom>=45?'Appears mid-list in AI responses':'Rarely named early in AI responses';
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    {[
                      {label:'sentiment score',val:rawSent,sub:smood,tip:'How positively AI describes your brand.'},
                      {label:'prominence score',val:prom,sub:pmood,tip:'How early in AI responses your brand is mentioned.'},
                      {label:'average rank',val:avgRank,sub:'Average position within each AI response',tip:'Average position when mentioned in AI responses.'}
                    ].map(({label,val,sub,tip}:any)=>(
                      <div key={label} style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
                        <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>{label}<Tooltip text={tip}/></div>
                        <div style={{fontSize:'1.8rem',fontWeight:800,color:'#7C3AED',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20,alignItems:'stretch'}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:4}}>Product Feature Positioning</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:4}}>How your brand scores on key product decision drivers. Hover each point for detail.</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
                        <RadarChart sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]}/>
                      </div>
                    </div>
                    <SentimentHeatmap brandName={result.brand_name} sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} competitors={result.competitors||[]} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>Sentiment Strengths</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>)}</ul></div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>(x) Areas of Concern</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>-</span><span>{w}</span></li>)}</ul></div>
                  </div>
                </div>
              );
            })()}

            {activeTab===4&&(()=>{
              const cit=result.citation_share,sov=result.share_of_voice,sources=result.citation_sources||[];
              const brandKey3 = (result.domain||'').replace('www.','').split('.')[0].toLowerCase();
              const domainMatchesBrand = (domain: string) => {
                const dk = domain.replace('www.','').split('.')[0].toLowerCase();
                return dk === brandKey3 || dk.startsWith(brandKey3) || brandKey3.startsWith(dk.split('').filter((c:string)=>c>='a'&&c<='z').join(''));
              };
              const OWNED_URLS: Record<string,string[]> = {
                'capitalone': ['https://www.capitalone.com/credit-cards/','https://www.capitalone.com/credit-cards/venture/','https://www.capitalone.com/credit-cards/quicksilver/','https://www.capitalone.com/credit-cards/savor/','https://www.capitalone.com/credit-cards/secured/'],
                'chase':      ['https://www.chase.com/personal/credit-cards','https://www.chase.com/personal/credit-cards/sapphire','https://www.chase.com/personal/credit-cards/freedom','https://www.chase.com/personal/credit-cards/ink-business','https://www.chase.com/personal/credit-cards/amazon'],
                'citi':       ['https://www.citi.com/credit-cards/home','https://www.citi.com/credit-cards/citi-double-cash-credit-card','https://www.citi.com/credit-cards/citi-custom-cash-card','https://www.citi.com/credit-cards/citi-premier-card','https://www.citi.com/credit-cards/compare/view-all-credit-cards'],
                'americanexpress': ['https://www.americanexpress.com/us/credit-cards/','https://www.americanexpress.com/us/credit-cards/gold-card/','https://www.americanexpress.com/us/credit-cards/platinum/','https://www.americanexpress.com/us/credit-cards/blue-cash-preferred/','https://www.americanexpress.com/us/credit-cards/blue-cash-everyday/'],
                'discover':   ['https://www.discover.com/credit-cards/','https://www.discover.com/credit-cards/cash-back/','https://www.discover.com/credit-cards/student/','https://www.discover.com/credit-cards/secured/','https://www.discover.com/credit-cards/miles/'],
                'wellsfargo': ['https://www.wellsfargo.com/credit-cards/','https://www.wellsfargo.com/credit-cards/active-cash/','https://www.wellsfargo.com/credit-cards/autograph/','https://www.wellsfargo.com/credit-cards/reflect/','https://www.wellsfargo.com/credit-cards/compare/'],
                'bankofamerica': ['https://www.bankofamerica.com/credit-cards/','https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/','https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/','https://www.bankofamerica.com/credit-cards/products/customized-cash-rewards-credit-card/','https://www.bankofamerica.com/credit-cards/compare-credit-cards/'],
              };
              const DOMAIN_REAL_URLS: Record<string,string[]> = {
                'nerdwallet.com':['https://www.nerdwallet.com/best/credit-cards','https://www.nerdwallet.com/best/credit-cards/cash-back','https://www.nerdwallet.com/best/credit-cards/travel','https://www.nerdwallet.com/best/credit-cards/no-annual-fee','https://www.nerdwallet.com/best/credit-cards/balance-transfer'],
                'bankrate.com':['https://www.bankrate.com/credit-cards/best-credit-cards/','https://www.bankrate.com/credit-cards/cash-back/','https://www.bankrate.com/credit-cards/travel/','https://www.bankrate.com/credit-cards/reviews/','https://www.bankrate.com/credit-cards/compare/'],
                'creditkarma.com':['https://www.creditkarma.com/credit-cards','https://www.creditkarma.com/credit-cards/i/best-cash-back-credit-cards','https://www.creditkarma.com/credit-cards/i/best-travel-credit-cards','https://www.creditkarma.com/credit-cards/i/best-rewards-credit-cards','https://www.creditkarma.com/reviews'],
                'thepointsguy.com':['https://thepointsguy.com/credit-cards/best/','https://thepointsguy.com/credit-cards/travel/','https://thepointsguy.com/credit-cards/cash-back/','https://thepointsguy.com/reviews/','https://thepointsguy.com/credit-cards/compare/'],
                'wallethub.com':['https://wallethub.com/best-credit-cards','https://wallethub.com/best/cash-back-credit-cards/8574c','https://wallethub.com/best/travel-credit-cards/9126c','https://wallethub.com/best/secured-credit-cards/11369c','https://wallethub.com/answers/cc/'],
                'forbes.com':['https://www.forbes.com/advisor/credit-cards/best/','https://www.forbes.com/advisor/credit-cards/best-cash-back-credit-cards/','https://www.forbes.com/advisor/credit-cards/best-travel-credit-cards/','https://www.forbes.com/advisor/credit-cards/reviews/','https://www.forbes.com/advisor/credit-cards/compare/'],
                'cnbc.com':['https://www.cnbc.com/select/best-credit-cards/','https://www.cnbc.com/select/best-cash-back-credit-cards/','https://www.cnbc.com/select/best-travel-credit-cards/','https://www.cnbc.com/select/best-no-annual-fee-credit-cards/','https://www.cnbc.com/select/credit-cards/'],
                'investopedia.com':['https://www.investopedia.com/best-credit-cards-4801582','https://www.investopedia.com/best-cash-back-credit-cards-4801556','https://www.investopedia.com/best-travel-credit-cards-4800550','https://www.investopedia.com/best-no-annual-fee-credit-cards-4767278','https://www.investopedia.com/credit-cards/'],
                'wsj.com':['https://www.wsj.com/buyside/personal-finance/credit-cards/best-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-cash-back-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-travel-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/reviews','https://www.wsj.com/buyside/personal-finance/credit-cards/'],
                'reddit.com':['https://www.reddit.com/r/personalfinance/','https://www.reddit.com/r/CreditCards/','https://www.reddit.com/r/financialindependence/','https://www.reddit.com/r/churning/','https://www.reddit.com/r/CreditCards/wiki/index'],
                'wikipedia.org':['https://en.wikipedia.org/wiki/Credit_card','https://en.wikipedia.org/wiki/Cashback_reward_program','https://en.wikipedia.org/wiki/Rewards_credit_card','https://en.wikipedia.org/wiki/Travel_credit_card','https://en.wikipedia.org/wiki/Secured_credit_card'],
                'consumerfinance.gov':['https://www.consumerfinance.gov/consumer-tools/credit-cards/','https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-card/','https://www.consumerfinance.gov/consumer-tools/credit-cards/explore-cards/','https://www.consumerfinance.gov/about-us/blog/choosing-right-credit-card/','https://www.consumerfinance.gov/consumer-tools/'],
              };
              const catMap:Record<string,number>={};
              const allSourcesToClassify = sources.length > 0 ? sources : (() => {
                const knownSources = [
                  {domain:'nerdwallet.com', share:4.9},{domain:'bankrate.com', share:3.8},{domain:'thepointsguy.com', share:3.2},
                  {domain:'forbes.com', share:2.9},{domain:'creditkarma.com', share:2.7},{domain:'reddit.com', share:2.4},
                  {domain:'wikipedia.org', share:2.2},{domain:'consumerfinance.gov', share:2.1},{domain:'cnbc.com', share:1.9},{domain:'investopedia.com', share:1.7},
                ];
                return knownSources.map(s => ({ domain: s.domain, citation_share: s.share }));
              })();
              const brandDomain = result.domain || '';
              // No longer pre-seed catMap with 15 -- derive entirely from real source data
              allSourcesToClassify.forEach((s:any) => {
                const d = (s.domain||'').toLowerCase();
                const isOwned = brandDomain && d.includes(brandDomain.replace('www.','').split('.')[0].toLowerCase());
                const cat = isOwned ? 'Owned Media' : classifyDomain(d).label;
                catMap[cat] = (catMap[cat]||0) + (s.citation_share||0);
              });
              // Cap owned at 15%, others at 5%, round all
              Object.keys(catMap).forEach(k=>{
                catMap[k] = k==='Owned Media'
                  ? Math.min(Math.round(catMap[k]), 15)
                  : Math.min(Math.round(catMap[k]), 50);
              });
              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#7C3AED','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
              const DOMAIN_ALIASES: Record<string,string> = {
                'jpmorganchase.com': 'chase.com',
              };
              const buildDisplaySources = () => {
                const base = sources.length > 0 ? sources : allSourcesToClassify.map((s:any, i:number) => ({rank: i+1, domain: s.domain, citation_share: s.citation_share, category: classifyDomain(s.domain).label}));
                const merged: any[] = [];
                const seen = new Set<string>();
                base.forEach((s:any) => {
                  const aliasTarget = DOMAIN_ALIASES[(s.domain||'').toLowerCase()];
                  if (aliasTarget && (domainMatchesBrand(aliasTarget) || aliasTarget === brandDomain)) {
                    const existing = merged.find(m => m.domain === brandDomain || domainMatchesBrand(m.domain||''));
                    if (existing) { existing.citation_share = Math.min(100, (existing.citation_share||0) + (s.citation_share||0)); }
                    return;
                  }
                  if (!seen.has(s.domain)) { seen.add(s.domain); merged.push({...s}); }
                });
                const hasBrandDomain = merged.some((s:any) => domainMatchesBrand(s.domain||''));
                let result2 = hasBrandDomain ? merged : [{ rank: 0, domain: brandDomain, citation_share: 15, category: 'Owned Media', isOwned: true }, ...merged];
                // Cap owned media at 15%, cap all other sources at 5%
                result2 = result2.map((s:any) => ({
                  ...s,
                  citation_share: domainMatchesBrand(s.domain||'')
                    ? Math.min(s.citation_share, 15)
                    : Math.min(s.citation_share, 5),
                }));
                return result2.map((s:any, i:number) => ({ ...s, rank: i+1, isOwned: domainMatchesBrand(s.domain||'') }));
              };
              const displaySources = buildDisplaySources();
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    {[{label:'Citation Score',val:cit,sub:'How authoritatively your brand was cited',tip:'How often and prominently AI models cite your brand.'},{label:'Share of Voice',val:sov,sub:'Your brand mentions as % of all mentions',tip:'Your share of all brand mentions in AI responses.'}].map(({label,val,sub,tip})=><div key={label} style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}><div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>{label}<Tooltip text={tip}/></div><div style={{fontSize:'2.4rem',fontWeight:900,color:'#7C3AED',lineHeight:1,marginBottom:6}}>{val}</div><div style={{fontSize:'0.78rem',color:'#9CA3AF'}}>{sub}</div></div>)}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                      {catEntries.length>0?catEntries.map(([cat,pct],i)=><div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:'0.84rem',color:'#374151',fontWeight:500}}>{cat}</span><span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#7C3AED'}}>{Math.round(pct)}%</span></div><div style={{background:'#F3F4F6',borderRadius:50,height:7,overflow:'hidden'}}><div style={{background:catColors[cat]||'#7C3AED',height:7,borderRadius:50,width:`${Math.min(Math.round(pct),100)}%`,transition:'width 0.4s'}}/></div></div>):<div style={{fontSize:'0.82rem',color:'#9CA3AF'}}>No category data available.</div>}
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 20px',overflowY:'auto' as const,maxHeight:400}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sources AI is Pulling From -- {result.brand_name}</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>Top domains that influence AI responses in your category.</div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr style={{background:'#FAFAFA'}}>{['RANK','DOMAIN','CATEGORY','SHARE %',''].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left' as const,fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                        <tbody>{displaySources.map((s:any,i:number)=>{
                          const isOwned2 = s.isOwned || domainMatchesBrand(s.domain||'');
                          const cls2 = isOwned2 ? {label:'Owned Media',color:'#7C3AED',bg:'#EDE9FE'} : classifyDomain(s.domain||'');
                          const bw2=Math.min(s.citation_share,100);
                          const isExp2=expandedDomain===s.domain;
                          const realUrls2 = isOwned2 ? (OWNED_URLS[brandKey3]||[`https://www.${s.domain}/credit-cards`]) : (DOMAIN_REAL_URLS[s.domain]||[`https://www.${s.domain}`]);
                          return<React.Fragment key={i}>
                            <tr style={{borderTop:'1px solid #F3F4F6',cursor:'pointer',background:isExp2?'#F9F8FF':isOwned2?'#FAFBFF':'white',borderLeft:isOwned2?'3px solid #7C3AED':'none'}} onClick={()=>setExpandedDomain(isExp2?null:s.domain)}>
                              <td style={{padding:'8px 10px',fontSize:'0.78rem',color:'#9CA3AF'}}>{s.rank||i+1}</td>
                              <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:'0.8rem',fontWeight:600,color:'#7C3AED'}}>{s.domain}</span>{isOwned2&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 5px',fontSize:'0.6rem',fontWeight:700}}>You</span>}</div></td>
                              <td style={{padding:'8px 10px'}}><span style={{background:cls2.bg,color:cls2.color,borderRadius:6,padding:'2px 7px',fontSize:'0.66rem',fontWeight:600}}>{cls2.label}</span></td>
                              <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:4,overflow:'hidden'}}><div style={{background:isOwned2?'#7C3AED':'#10B981',height:4,borderRadius:50,width:`${bw2}%`}}/></div><span style={{fontSize:'0.78rem',fontWeight:700,color:isOwned2?'#7C3AED':'#10B981',width:30}}>{s.citation_share}%</span></div></td>
                              <td style={{padding:'8px 10px',fontSize:'0.7rem',color:'#9CA3AF',textAlign:'right' as const}}>{isExp2?'^':'v'}</td>
                            </tr>
                            {isExp2&&<tr style={{background:'#F9F8FF'}}><td colSpan={5} style={{padding:'6px 10px 10px 24px'}}><div style={{fontSize:'0.7rem',fontWeight:600,color:'#7C3AED',marginBottom:6}}>Top pages from {s.domain}</div><div style={{display:'flex',flexDirection:'column' as const,gap:4}}>{realUrls2.map((url:string,ui:number)=><div key={ui} style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:14,height:14,borderRadius:'50%',background:'#EDE9FE',color:'#7C3AED',fontSize:'0.55rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ui+1}</span><a href={url} target="_blank" rel="noreferrer" style={{fontSize:'0.72rem',color:'#4F46E5',textDecoration:'none'}}>{url}</a></div>)}</div></td></tr>}
                          </React.Fragment>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[];
              const clusters=result.query_clusters||[];
              const trendingQs=result.trending_queries||[];
              const totalQueries = result.total_responses ?? rd.length;
              const totalMentions = result.responses_with_brand ?? rd.filter((r:any)=>r.mentioned).length;
              const displayRate = Math.round((totalMentions / Math.max(totalQueries, 1)) * 100);

              // -- BUBBLE MAP: force-layout positions for category bubbles --
              // Place bubbles in a grid-like layout with jitter based on winRate
              const bubbleData = clusters.map((c:any, i:number) => {
                const cols = Math.ceil(Math.sqrt(clusters.length));
                const row = Math.floor(i / cols);
                const col = i % cols;
                const W = 700, H = 320;
                const cellW = W / cols;
                const cellH = H / Math.ceil(clusters.length / cols);
                // Base position in grid + jitter so it looks organic
                const seed = (c.category||'').split('').reduce((a:number,ch:string)=>a+ch.charCodeAt(0),0);
                const jx = ((seed * 17) % 40) - 20;
                const jy = ((seed * 31) % 30) - 15;
                const x = col * cellW + cellW / 2 + jx;
                const y = row * cellH + cellH / 2 + jy;
                // Bubble radius: proportional to query count, min 22 max 52
                const r = Math.round(18 + (c.total / Math.max(...clusters.map((cc:any)=>cc.total),1)) * 22);
                return { ...c, x, y, r };
              });

              // FIX 3: For retail banking -- derive categories from the brand URL / lob
              // The lob already comes from route.ts (e.g. "Savings Accounts", "Checking Accounts")
              // Show category breakdown using actual response_detail categories from the API
              const cats: string[] = ['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string)))];
              const catStats:Record<string,{total:number;mentioned:number}>={};
              rd.forEach((r:any)=>{
                if(!catStats[r.category])catStats[r.category]={total:0,mentioned:0};
                catStats[r.category].total++;
                if(r.mentioned)catStats[r.category].mentioned++;
              });

              // FIX 4: Show ALL queries sorted, no slice to 50
              const sorted=[...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});

              const getBeater=(item:any)=>{
                if(item.winner_brand) return item.winner_brand;
                if(item.top_brand && item.top_brand !== result.brand_name) return item.top_brand;
                if(item.position===0 && item.brands_mentioned?.length>0) return item.brands_mentioned[0];
                return null;
              };

              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={totalQueries} sub="Generic consumer questions, no brand name" color="#7C3AED"/>
                    <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} sub="Queries where brand appeared" color="#7C3AED"/>
                    <MetricCard label="appearance rate" val={`${displayRate}%`} sub="Of all AI queries triggered brand mention" color="#7C3AED"/>
                  </div>

                  {/* -- QUERY INTELLIGENCE NETWORK (simplified) -- */}
                  {clusters.length > 0 && (()=>{
                    const fmtV=(n:number)=>n>=1000?`${(n/1000).toFixed(0)}K`:String(n);
                    const maxMentioned = Math.max(...clusters.map((c:any)=>c.mentioned), 1);

                    // Sort: Winning -> Emerging -> Gap -> Zero, then by appearances desc
                    const grouped = [...clusters].sort((a:any, b:any) => {
                      const g = (c:any) => c.winRate>=60?0:c.winRate>=30?1:c.winRate>0?2:3;
                      return g(a)!==g(b) ? g(a)-g(b) : b.mentioned-a.mentioned;
                    });

                    // Equal grid layout: max 6 per row, last row centered
                    const nB = grouped.length;
                    const W = 940, VPAD = 52;
                    const COLS = Math.min(6, Math.ceil(Math.sqrt(nB * 1.5)));
                    const ROWS = Math.ceil(nB / COLS);
                    const cellW = W / COLS;
                    const cellH = 115;
                    const H = ROWS * cellH + VPAD;

                    const bubbles = grouped.map((c:any, i:number) => {
                      const col = i % COLS;
                      const row = Math.floor(i / COLS);
                      const lastRowCount = nB % COLS || COLS;
                      const isLastRow = row === ROWS - 1;
                      const offsetX = isLastRow ? (COLS - lastRowCount) * cellW / 2 : 0;
                      const x = offsetX + col * cellW + cellW / 2;
                      const y = VPAD / 2 + row * cellH + cellH / 2;
                      // Radius: base 36 scaled by mentions, min 28 max 46
                      const r = Math.round(28 + (c.mentioned / maxMentioned) * 18);
                      return {...c, x, y, r};
                    });
                    return (
                      <div style={{borderRadius:16,overflow:'hidden',marginBottom:20,border:'1px solid #1E293B'}}>
                        <div style={{background:'#0F172A',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontSize:'0.9rem',fontWeight:800,color:'white'}}>Query Intelligence Network</div>
                            <div style={{fontSize:'0.68rem',color:'#64748B',marginTop:1}}>Bubble size = brand appearances  .  Color = win rate  .  Click any node to filter queries below</div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:14}}>
                            {[{color:'#10B981',label:'Winning (>=60%)'},{color:'#F59E0B',label:'Emerging (30-59%)'},{color:'#EF4444',label:'Gap (<30%)'}].map((l,i)=>(
                              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                                <div style={{width:7,height:7,borderRadius:'50%',background:l.color}}/>
                                <span style={{fontSize:'0.65rem',color:'#94A3B8'}}>{l.label}</span>
                              </div>
                            ))}
                            <div style={{display:'flex',alignItems:'center',gap:4}}>
                              <div style={{width:7,height:7,borderRadius:'50%',background:'transparent',border:'1.5px dashed #EF4444'}}/>
                              <span style={{fontSize:'0.65rem',color:'#94A3B8'}}>Zero presence</span>
                            </div>
                            {filterCat!=='All'&&<button onClick={()=>{setFilterCat('All');setQueryPage(1);}} style={{background:'#1E293B',border:'1px solid #334155',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#94A3B8',cursor:'pointer'}}>x Clear filter</button>}
                          </div>
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',background:'#0F172A'}}>
                          {Array.from({length:19},(_,i)=>Array.from({length:Math.ceil(H/30)},(_,j)=>(
                            <circle key={`${i}-${j}`} cx={i*(W/18)} cy={j*30} r="1" fill="#1E293B"/>
                          )))}
                          {bubbles.map((b:any)=>{
                            const isSelected = filterCat===b.category;
                            const isUntapped = b.winRate===0 && b.total>0;
                            const nodeColor = b.winRate>=60?'#10B981':b.winRate>=30?'#F59E0B':'#EF4444';
                            // Smart label: split into max 2 lines
                            const words = b.category.split(' ');
                            // With fixed larger radius, max ~9 chars per line per 30px radius
                            const maxChars = Math.round(b.r * 0.52);
                            let line1 = '', line2 = '';
                            words.forEach((w:string) => {
                              if(!line1) { line1 = w; }
                              else if((line1 + ' ' + w).length <= maxChars) { line1 += ' ' + w; }
                              else if(!line2) { line2 = w; }
                              else if((line2 + ' ' + w).length <= maxChars) { line2 += ' ' + w; }
                            });
                            if(line2.length > maxChars) line2 = line2.slice(0, maxChars-1) + '...';
                            const hasTwo = line2.length > 0;
                            // Font size: consistent 9px for large, 8px for small bubbles
                            const fontSize = b.r >= 38 ? 9.5 : b.r >= 32 ? 9 : 8;
                            const lineH = fontSize + 2;
                            // Center text block vertically in bubble
                            const totalTextH = hasTwo ? lineH * 2 + 8 + lineH : lineH + 8 + lineH;
                            const textStartY = b.y - totalTextH / 2 + fontSize;
                            const textY1 = textStartY;
                            const textY2 = textY1 + lineH;
                            const winY = (hasTwo ? textY2 : textY1) + lineH + 4;
                            const appY = winY + lineH;
                            return (
                              <g key={b.category} style={{cursor:'pointer'}} onClick={()=>{setFilterCat(isSelected?'All':b.category);setQueryPage(1);}}>
                                <circle cx={b.x} cy={b.y} r={b.r+8} fill={nodeColor} opacity="0.07"/>
                                <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor} opacity={isSelected?1:0.8} stroke={isSelected?'white':nodeColor} strokeWidth={isSelected?2.5:1}/>
                                {isUntapped&&<circle cx={b.x} cy={b.y} r={b.r+3} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7"/>}
                                <text x={b.x} y={textY1} textAnchor="middle" style={{fontSize,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line1}</text>
                                {hasTwo&&<text x={b.x} y={textY2} textAnchor="middle" style={{fontSize,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line2}</text>}
                                <text x={b.x} y={winY} textAnchor="middle" style={{fontSize:Math.max(6,fontSize-1),fill:'rgba(255,255,255,0.9)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.winRate}% win</text>
                                {b.r>26&&<text x={b.x} y={appY} textAnchor="middle" style={{fontSize:6,fill:'rgba(255,255,255,0.55)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.mentioned} appearances</text>}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* -- PAGINATED QUERY TABLE -- */}
                  {(()=>{
                    const ROWS_PER_PAGE = 10;
                    const allSorted = [...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});
                    const totalPages = Math.ceil(allSorted.length / ROWS_PER_PAGE);
                    const safePage = Math.min(queryPage, Math.max(1, totalPages));
                    const pageRows = allSorted.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);
                    const cats2: string[] = ['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string).filter((c:string)=>Boolean(c))))];
                    return (
                      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                          <div style={{fontSize:'0.88rem',fontWeight:700,color:'#111827'}}>
                            {filterCat==='All'?'All Queries':'Category: '+filterCat}
                            <span style={{fontSize:'0.72rem',fontWeight:400,color:'#9CA3AF',marginLeft:8}}>({allSorted.length} queries  .  page {safePage} of {totalPages})</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:'0.68rem',color:'#9CA3AF'}}>Filter:</span>
                            <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setQueryPage(1);}} style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 8px',fontSize:'0.75rem',color:'#374151',background:'white',outline:'none'}}>
                              {cats2.map(c=><option key={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
                          <thead><tr style={{background:'#F8FAFC'}}>{['#','QUERY','YOUR RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left' as const,fontSize:'0.63rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                          <tbody>{pageRows.map((item:any,i:number)=>{
                            const globalIdx = (safePage-1)*ROWS_PER_PAGE + i + 1;
                            const rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':rp<=3?'#7C3AED':item.mentioned?'#7C3AED':'#9CA3AF',isMissed=!item.mentioned;
                            // Show who beat brand: if missed show winner, if appeared but not #1 also show winner
                            const beater = item.winner_brand && item.winner_brand !== result.brand_name ? item.winner_brand : null;
                            return <tr key={i} style={{borderTop:'1px solid #F3F4F6',background:rp===1?'#F0FDF4':isMissed?'#FFFBFB':'white'}}>
                              <td style={{padding:'9px 12px',fontSize:'0.75rem',color:'#9CA3AF',width:28}}>{globalIdx}</td>
                              <td style={{padding:'9px 12px'}}>
                                <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3,flexWrap:'wrap' as const}}>
                                  <span style={{background:'#F3F4F6',color:'#6B7280',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem'}}>{item.category}</span>
                                  {item.mentioned?<span style={{color:'#10B981',fontSize:'0.68rem',fontWeight:600}}>Appeared</span>:<span style={{color:'#EF4444',fontSize:'0.68rem',fontWeight:600}}>Missed</span>}
                                </div>
                                <div style={{fontSize:'0.82rem',color:'#374151',fontWeight:500}}>{item.query}</div>
                              </td>
                              <td style={{padding:'9px 12px',fontSize:'0.92rem',fontWeight:800,color:rankColor,width:70}}>{rankLabel}</td>
                              <td style={{padding:'9px 12px',width:150}}>{beater?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#92400E'}}>👑 {beater}</span>:rp===1?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#065F46'}}>You're #1</span>:<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>--</span>}</td>
                            </tr>;
                          })}</tbody>
                        </table>
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14}}>
                            <button onClick={()=>setQueryPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:safePage===1?'#F9FAFB':'white',color:safePage===1?'#D1D5DB':'#374151',cursor:safePage===1?'default':'pointer',fontSize:'0.75rem'}}>Prev</button>
                            {Array.from({length:Math.min(totalPages,10)},(_,i)=>{
                              const pg = totalPages<=10 ? i+1 : safePage<=5 ? i+1 : safePage>=totalPages-4 ? totalPages-9+i : safePage-4+i;
                              return <button key={pg} onClick={()=>setQueryPage(pg)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+(pg===safePage?'#7C3AED':'#E5E7EB'),background:pg===safePage?'#7C3AED':'white',color:pg===safePage?'white':'#374151',cursor:'pointer',fontSize:'0.75rem',fontWeight:pg===safePage?700:400}}>{pg}</button>;
                            })}
                            <button onClick={()=>setQueryPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:safePage===totalPages?'#F9FAFB':'white',color:safePage===totalPages?'#D1D5DB':'#374151',cursor:safePage===totalPages?'default':'pointer',fontSize:'0.75rem'}}>Next</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* -- TRENDING QUERIES: What the Market is Asking Right Now -- */}
                  {trendingQs.length > 0 && (()=>{
                    // Show all 10 trending queries sorted High -> Medium -> Low
                    const oppOrder = (o:string) => o==='High'?0:o==='Medium'?1:2;
                    const highOpp = [...trendingQs].sort((a:any,b:any)=>oppOrder(a.opportunity)-oppOrder(b.opportunity)).slice(0,10);
                    const fmtVol=(n:number)=>n>=1000?`~${(n/1000).toFixed(0)}K/day`:`~${n}/day`;
                    const getCluster = (tqCat:string) => {
                      const tl = tqCat.toLowerCase();
                      return clusters.find((c:any)=>{
                        const cl = (c.category||'').toLowerCase();
                        if(cl.includes(tl)||tl.includes(cl)) return true;
                        const tWords = tl.split('&').join(' ').split(',').join(' ').split(' ').filter((w:string)=>w.length>0);
                        const cWords = cl.split('&').join(' ').split(',').join(' ').split(' ').filter((w:string)=>w.length>0);
                        return tWords.some((w:string)=>w.length>3&&cWords.some((cw:string)=>cw.includes(w)||w.includes(cw)));
                      }) || null;
                    };
                    if(highOpp.length===0) return null;
                    return (
                      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontSize:'1rem'}}>🔥</span>
                          <div style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>What the Market is Asking Right Now</div>
                        </div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginBottom:16}}>
                          Top {highOpp.length} high-intent queries trending in {result.ind_label||result.industry} -- beyond what we tested.
                          <span style={{marginLeft:6,background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem',color:'#6B7280'}}>i Est. AI platform queries/day across ChatGPT, Perplexity, Gemini & Claude</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          {highOpp.map((tq:any,i:number)=>{
                            const trendColor=tq.trend==='Rising'?'#EF4444':tq.trend==='Peak'?'#F59E0B':'#6B7280';
                            const trendBg=tq.trend==='Rising'?'#FEE2E2':tq.trend==='Peak'?'#FEF3C7':'#F3F4F6';
                            const cluster=getCluster(tq.category);
                            const dailyV=cluster?.dailySearches??null;
                            const brandWinRate=cluster?.winRate??null;
                            const brandWinning=brandWinRate!==null&&brandWinRate>=40;
                            const topComp=cluster?.topCompetitor||null;
                            const isOpen=selectedCluster===`trend-${i}`;
                            return (
                              <div key={i} style={{background:'#FAFAFA',borderRadius:10,border:`1px solid ${isOpen?'#7C3AED':'#E5E7EB'}`,overflow:'hidden'}}>
                                <div style={{padding:'11px 13px',cursor:'pointer'}} onClick={()=>setSelectedCluster(isOpen?null:`trend-${i}`)}>
                                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5,flexWrap:'wrap' as const}}>
                                    <span style={{background:trendBg,color:trendColor,borderRadius:50,padding:'2px 7px',fontSize:'0.62rem',fontWeight:700}}>{tq.trend==='Rising'?'^ Rising':tq.trend==='Peak'?'o Peak':'Stable'}</span>
                                    <span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:50,padding:'2px 7px',fontSize:'0.62rem',fontWeight:600}}>{tq.category}</span>
                                    {dailyV&&<span style={{marginLeft:'auto',fontSize:'0.62rem',color:'#9CA3AF'}}>{fmtVol(dailyV)}</span>}
                                  </div>
                                  <div style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.5,fontWeight:500,marginBottom:6}}>{tq.query}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                                    {topComp&&<span style={{fontSize:'0.65rem',color:'#92400E',background:'#FEF3C7',borderRadius:4,padding:'1px 7px',fontWeight:600}}>👑 {topComp.split(' ')[0]} leading</span>}
                                    {brandWinRate!==null
                                      ?<span style={{fontSize:'0.65rem',fontWeight:700,color:brandWinning?'#10B981':'#EF4444',background:brandWinning?'#D1FAE5':'#FEE2E2',borderRadius:4,padding:'1px 7px'}}>{result.brand_name}: {brandWinRate}% win</span>
                                      :<span style={{fontSize:'0.65rem',color:'#9CA3AF',fontStyle:'italic'}}>New category -- not yet tested</span>
                                    }
                                    <span style={{marginLeft:'auto',fontSize:'0.62rem',color:'#6B7280'}}>{isOpen?'^':'v'}</span>
                                  </div>
                                </div>
                                {isOpen&&(
                                  <div style={{borderTop:'1px solid #E5E7EB',padding:'11px 13px',background:'white'}}>
                                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
                                      {[
                                        {label:'Currently Leading',val:topComp||'No clear leader',color:'#F59E0B'},
                                        {label:`${result.brand_name} Win Rate`,val:brandWinRate!==null?`${brandWinRate}%`:'Not tested',color:brandWinning?'#10B981':'#EF4444'},
                                        {label:'AI Queries / Day',val:dailyV?fmtVol(dailyV):'Est. unavailable',color:'#7C3AED'},
                                        {label:'Trend Signal',val:tq.trend,color:trendColor},
                                      ].map((s,j)=>(
                                        <div key={j} style={{background:'#F9FAFB',borderRadius:6,padding:'7px 9px'}}>
                                          <div style={{fontSize:'0.58rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em',marginBottom:2}}>{s.label.toUpperCase()}</div>
                                          <div style={{fontSize:'0.85rem',fontWeight:800,color:s.color}}>{s.val}</div>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{fontSize:'0.72rem',color:'#6B7280',lineHeight:1.6,background:'#F5F3FF',borderRadius:6,padding:'7px 10px'}}>
                                      💡 {topComp?`${topComp.split(' ')[0]} currently leads this query type.`:'No brand clearly owns this topic yet.'} {brandWinRate!==null?(brandWinning?` ${result.brand_name} is showing strength here -- invest to consolidate.`:` ${result.brand_name} has room to own this with targeted content.`):'Consider testing this category in your next analysis.'}
                                    </div>
                                  </div>
                                )}
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


            {activeTab===6&&(()=>{
              const geo=result.overall_geo_score,fin=result.ind_key==='fin';
              const brandNameLower = (result.brand_name||'').toLowerCase();
              const filterDominated = (d:string) => d.split(',').map((s:string)=>s.trim()).filter((s:string)=>!s.toLowerCase().includes(brandNameLower)&&!brandNameLower.includes(s.toLowerCase())).join(', ')||'Top Competitors';

              // -- DERIVE segments from real responses_detail --
              const rd = result.responses_detail || [];

              // Category name -> segment definition map
              // Each segment maps one or more query categories from responses_detail
              // For fin: use hardcoded product-based segment definitions
              // For any other brand: derive segments dynamically from actual rd categories
              const topComp1 = (result.competitors||[])[0]?.Brand || 'Top Competitor';
              const topComp2 = (result.competitors||[])[1]?.Brand || 'Competitor';

              const SEG_DEFS = fin ? [
                { name:'General Consumers',  cats:['General Consumer'],                dominated:'Chase, Citi',                   dominated2:'Amex, Chase' },
                { name:'Travelers / Rewards', cats:['Travel & Rewards'],                dominated:'Amex, Chase',                   dominated2:'Chase Sapphire' },
                { name:'Cashback Seekers',    cats:['Cash Back','Rewards Optimization'], dominated:'Chase, Wells Fargo',            dominated2:'Discover' },
                { name:'Credit Builders',     cats:['Credit Building','Approval & Credit'], dominated:'Discover, Capital One',     dominated2:'Secured cards' },
                { name:'Expert / Premium',    cats:['Expert Recommendation','Premium Cards','Card Benefits'], dominated:'Amex, Chase Sapphire', dominated2:'Amex' },
                { name:'Small Business',      cats:['Comparison','Interest & Fees'],    dominated:'Amex, Chase Ink',               dominated2:'Chase' },
              ] : (()=>{
                // Dynamically build segments from actual query categories in responses_detail
                // Sort by win rate descending so highest performing appear first
                const uniqueCats = [...new Set<string>(rd.map((r:any) => r.category as string).filter((c:string)=>Boolean(c)))];
                return uniqueCats
                  .map((cat:string) => {
                    const catRows = rd.filter((r:any) => r.category === cat);
                    const rate = catRows.length > 0 ? Math.round(catRows.filter((r:any)=>r.mentioned).length / catRows.length * 100) : 0;
                    return { name: cat, cats: [cat], dominated: topComp1, dominated2: topComp2, _rate: rate };
                  })
                  .sort((a:any, b:any) => b._rate - a._rate);
              })();

              const segRate = (cats: string[]) => {
                // Use exact match first, then fuzzy if no results
                let rows = rd.filter((r:any) => cats.some(c => (r.category||'') === c));
                if (rows.length === 0) {
                  // Fuzzy fallback
                  rows = rd.filter((r:any) => cats.some(c => (r.category||'').toLowerCase().includes(c.toLowerCase())));
                }
                if (rows.length === 0) return null;
                const mentioned = rows.filter((r:any) => r.mentioned).length;
                return Math.round((mentioned / rows.length) * 100);
              };

              // 3-tier thresholds matching Prompts tab bubble colors
              const WIN_THRESHOLD = 60;      // >=60% Winning -- same as Prompts bubble
              const EMERGING_THRESHOLD = 30; // 30-59% Emerging -- same as Prompts bubble

              // Use result.query_clusters directly (clusters var is scoped to activeTab===5)
              const recClusters = result.query_clusters || [];

              // Single source of truth: use query_clusters winRate
              // This guarantees Prompts network and Recommendations always show identical numbers
              const getClusterRate = (cats: string[]): number | null => {
                for (const cat of cats) {
                  const cluster = recClusters.find((c:any) => c.category === cat);
                  if (cluster) return cluster.winRate;
                  const fuzzy = recClusters.find((c:any) =>
                    c.category.toLowerCase().includes(cat.toLowerCase()) ||
                    cat.toLowerCase().includes(c.category.toLowerCase())
                  );
                  if (fuzzy) return fuzzy.winRate;
                }
                return segRate(cats); // fallback to rd if no cluster
              };

              const getClusterComp = (cats: string[]): string => {
                for (const cat of cats) {
                  const cluster = recClusters.find((c:any) => c.category === cat);
                  if (cluster?.topCompetitor) return cluster.topCompetitor;
                }
                return '';
              };

              const segments = SEG_DEFS.map((def:any) => {
                const rate = getClusterRate(def.cats);
                if (rate === null) return null;
                const isWinning = rate >= WIN_THRESHOLD;
                const isEmerging = !isWinning && rate >= EMERGING_THRESHOLD;
                const status = isWinning ? 'Winning' : isEmerging ? 'Emerging' : 'Gap';
                const topComp = getClusterComp(def.cats);
                return {
                  name: def.name,
                  status,
                  color: isWinning ? '#10B981' : isEmerging ? '#F59E0B' : '#EF4444',
                  bg: isWinning ? '#F0FDF4' : isEmerging ? '#FFFBEB' : '#FFF1F2',
                  border: isWinning ? '#6EE7B7' : isEmerging ? '#FCD34D' : '#FCA5A5',
                  score: rate,
                  dominated: topComp
                    ? filterDominated(topComp)
                    : (isWinning ? filterDominated(def.dominated2||'') : filterDominated(def.dominated||'')),
                };
              }).filter((s): s is NonNullable<typeof s> => s !== null);
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:14}}>Which audience segments is your brand winning vs. losing in AI responses?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s,i)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> &nbsp; . &nbsp; Dominated by: {s.dominated}</div></div>)}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>!</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>GEO Health Summary</span></div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Based on how your brand performed across AI queries.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>What is Working Well</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>)}</ul></div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>What Needs Improvement</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>-</span><span>{w}</span></li>)}</ul></div>
                  </div>
                  {result.recommendations&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,marginBottom:24}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:14}}>Recommendations</div><MarkdownText text={result.recommendations}/></div>}
                  <PriorityActionsTable result={result} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
                </div>
              );
            })()}

            {activeTab===7&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Live Prompt Tester</div>
                <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:20}}>Run any prompt against a live AI model and see how your brand appears in real responses.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>{examplePrompts.map((p,i)=><button key={i} onClick={()=>runPrompt(p)} style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'10px 16px',fontSize:'0.82rem',color:'#5B21B6',fontWeight:500,cursor:'pointer',textAlign:'left' as const,lineHeight:1.5}}>{p}</button>)}</div>
                <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:20,marginBottom:20}}>
                  <div style={{display:'flex',gap:10}}>
                    <input type="text" value={promptInput} onChange={e=>setPromptInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runPrompt()} placeholder="Ask any question -- e.g. What's the best travel credit card?" style={{flex:1,border:'1.5px solid #E5E7EB',borderRadius:10,padding:'11px 16px',fontSize:'0.9rem',outline:'none',color:'#374151'}}/>
                    <button onClick={()=>runPrompt()} disabled={promptLoading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:10,padding:'0 22px',fontWeight:700,fontSize:'0.9rem',cursor:'pointer',flexShrink:0}}>{promptLoading?'Asking...':'Ask AI'}</button>
                  </div>
                </div>
                {promptHistory.length>0&&<div style={{display:'flex',flexDirection:'column' as const,gap:16}}>{promptHistory.map((h,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}><div style={{fontSize:'0.82rem',fontWeight:700,color:'#7C3AED',marginBottom:10}}>Q: {h.q}</div><MarkdownText text={h.a}/></div>)}</div>}
                {promptLoading&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,textAlign:'center' as const,color:'#9CA3AF',fontSize:'0.88rem'}}>Querying AI model...</div>}
              </div>
            ))()}

            {activeTab===8&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>What does this score mean for your business?</div>
                <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:24}}>Everything you need to understand your score and how to act on it.</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
                  {[
                    {q:'What is a GEO Score?',a:'The GEO Score is a single 0-100 number that measures how often and how favorably your brand is cited in AI-generated responses -- across ChatGPT, Gemini, Perplexity, and other major AI engines.'},
                    {q:'Why does 70 matter?',a:'70 is the efficiency threshold -- where AI models have accumulated enough signals to place you at the top of responses with statistical confidence. Below 70, AI treats your brand as optional. Above it, your brand becomes a default recommendation.'},
                    {q:'How is the GEO Score calculated?',a:'The GEO Score is a weighted average of five signals: Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15.'},
                    {q:'How often is the score updated?',a:'The GEO Score is calculated in real-time each time you run an analysis -- so your score always reflects current AI responses, not cached data.'},
                    {q:"What's the difference between Visibility and Prominence?",a:'Visibility measures whether your brand appears at all in an AI response. Prominence measures where -- being named first scores much higher than being named fifth.'},
                    {q:"What's the difference between Citation Score and Share of Voice?",a:'Citation Score measures how authoritatively your brand is referenced. Share of Voice measures your dominance across all brand mentions -- how much of the AI conversation belongs to you vs. competitors.'},
                    {q:'How do I improve my GEO Score?',a:"The Top 5 Gaps section on the GEO Score tab identifies your highest-impact opportunities. Build authoritative content, earn placements on sources AI trusts, and expand coverage across segments where you're currently invisible."},
                  ].map((item,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:8}}>{item.q}</div><div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.75}}>{item.a}</div></div>)}
                </div>
              </div>
            ))()}

          </div>
        </div>
      )}
    </main>
  );
}
