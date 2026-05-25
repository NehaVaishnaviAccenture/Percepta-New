'use client';

import React, { useState } from 'react';

export const bands = [
  { bg: '#E8F5E9', border: '#43A047', color: '#43A047', range: '80-100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#FFFDE7', border: '#FDD835', color: '#F9A825', range: '70-79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FBE9E7', border: '#FF7043', color: '#FF7043', range: '45-69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFEBEE', border: '#F44336', color: '#F44336', range: '0-44', label: 'Poor', desc: 'Major optimization needed' },
];

export const METRIC_TIPS: Record<string,string> = {
  'visibility score': 'Measures how often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'Reflects how authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'Captures the tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'Average position when your brand is mentioned within an AI response. #1 means AI names your brand first most often. #3 means two other brands are typically named before yours.',
  'prominence score': 'Measures how early in AI responses your brand is mentioned. A score of 100 means you are always named first. Lower scores mean competitors are mentioned before you.',
  'share of voice': 'Your brand mentions as a percentage of all brand mentions across AI responses. Higher = your brand dominates the AI conversation in this category.',
};

export const RADAR_TIPS: Record<string,string> = {
  'Cash Back':        'How often AI recommends your brand for cash back and everyday rewards queries.',
  'Travel Benefits':  'How often AI surfaces your brand for travel, miles, lounge and international queries.',
  'Fees & APR':       'How well your brand is positioned on low fees, 0% APR and interest rate queries.',
  'Rewards / Points': 'How often AI mentions your brand for points, rewards optimization and bonus categories.',
  'Credit Building':  'How strongly AI associates your brand with credit building, secured cards and approvals.',
  'Perks & Benefits': 'How often AI highlights your brand for premium perks, purchase protection and card benefits.',
  'Savings Rate':     'How often AI recommends your brand for high-yield savings and APY queries.',
  'No Fees':          'How well your brand is positioned on no-fee, no-minimum banking queries.',
  'ATM Access':       'How often AI highlights your brand for ATM access and fee-free ATM queries.',
  'Mobile & Digital': 'How strongly AI associates your brand with digital banking and mobile app quality.',
  'CD Rates':         'How often AI recommends your brand for CD accounts and fixed-rate savings.',
  'Family Banking':   'How often AI surfaces your brand for kids, teen and family banking queries.',
  'Retirement Plans': 'How often AI recommends your brand for 401k and retirement planning queries.',
  'Investment Funds': 'How well your brand is positioned for mutual funds and portfolio management.',
  'Financial Planning':'How often AI highlights your brand for holistic financial planning queries.',
  'Digital Tools':    'How strongly AI associates your brand with digital retirement and investment tools.',
  'Insurance':        'How often AI surfaces your brand for life insurance and annuity queries.',
  'Employer Plans':   'How often AI recommends your brand for employer-sponsored retirement benefits.',
  'Visibility':       'How often your brand appears across all AI queries in this category.',
  'Sentiment':        'How positively AI describes your brand overall.',
  'Authority':        'How credibly and authoritatively AI references your brand.',
  'Prominence':       'How early in AI responses your brand is mentioned.',
  'Share of Voice':   'Your brand mentions as a share of all brand mentions in AI responses.',
  'Recommendation':   'How often AI actively recommends your brand over alternatives.',
};

export function getRadarTip(label: string): string {
  if (RADAR_TIPS[label]) return RADAR_TIPS[label];
  return `How often your brand appears in AI responses for ${label.toLowerCase()} queries.`;
}

export const REC_CATEGORIES: Record<string,{label:string;color:string;bg:string}> = {
  'Owned Content Optimization': {label:'Owned Content Optimization', color:'#0F766E', bg:'#F0FDFA'},
  'Content Page':      {label:'Content Page',      color:'#8B5CF6', bg:'#F5F3FF'},
  'FAQ Build':         {label:'FAQ Build',         color:'#10B981', bg:'#ECFDF5'},
  'How-To Guide':      {label:'How-To Guide',      color:'#0EA5E9', bg:'#F0F9FF'},
  'Product Explainer': {label:'Product Explainer', color:'#6366F1', bg:'#EEF2FF'},
  'Best-Of List':      {label:'Best-Of List',      color:'#8B5CF6', bg:'#F5F3FF'},
  'Use Case Page':     {label:'Use Case Page',     color:'#06B6D4', bg:'#ECFEFF'},
  'Content Strategy':  {label:'Content Strategy',  color:'#7C3AED', bg:'#F5F3FF'},
  'PR / Earned Media': {label:'PR / Earned Media', color:'#EC4899', bg:'#FDF2F8'},
  'Citation Push':     {label:'Citation Push',     color:'#F43F5E', bg:'#FFF1F2'},
  'Review Platform':   {label:'Review Platform',   color:'#F59E0B', bg:'#FFFBEB'},
  'Forum Presence':    {label:'Forum Presence',    color:'#D97706', bg:'#FEF3C7'},
  'Wikipedia / Entity':{label:'Wikipedia / Entity',color:'#64748B', bg:'#F1F5F9'},
  'Influencer / Creator':{label:'Influencer / Creator',color:'#A855F7',bg:'#FAF5FF'},
  'Structured Data':   {label:'Structured Data',   color:'#F97316', bg:'#FFF7ED'},
  'Schema Markup':     {label:'Schema Markup',     color:'#EA580C', bg:'#FFF7ED'},
  'Entity Optimization':{label:'Entity Optimization',color:'#0F766E',bg:'#F0FDFA'},
  'Technical SEO':     {label:'Technical SEO',     color:'#14B8A6', bg:'#F0FDFA'},
  'Internal Linking':  {label:'Internal Linking',  color:'#0369A1', bg:'#F0F9FF'},
  'Syndication':       {label:'Syndication',       color:'#7C3AED', bg:'#EDE9FE'},
  'Data Feed':         {label:'Data Feed',         color:'#059669', bg:'#ECFDF5'},
  'API Presence':      {label:'API Presence',      color:'#1D4ED8', bg:'#EFF6FF'},
};

// CHANGE: Good band is now yellow #FDD835 everywhere
export function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#43A047', bg: '#E8F5E9' };
  if (s >= 70) return { label: 'Good', color: '#F9A825', bg: '#FFFDE7' };
  if (s >= 45) return { label: 'Needs Work', color: '#FF7043', bg: '#FBE9E7' };
  return { label: 'Poor', color: '#F44336', bg: '#FFEBEE' };
}

export function geoTier(s:number){
  // Thresholds must match GeoScoreTab tierOf() and PromptsTestedTab winRateToTier()
  // text = on-white color for tier label; fill = fill color for tier swatch
  if(s>=80) return {label:'Authority',  tier:5, text:'#007653', fill:'#00AB7B'};
  if(s>=70) return {label:'Leader',     tier:4, text:'#043BCC', fill:'#2F6DFF'};
  if(s>=56) return {label:'Competitive',tier:3, text:'#996E00', fill:'#F3B10C'};
  if(s>=45) return {label:'Emerging',   tier:2, text:'#B15F00', fill:'#F48500'};
  return           {label:'Fragmented', tier:1, text:'#B7002F', fill:'#E0003B'};
}

export function bandOf(s: number) {
  return bands.find(b => {
    const [lo, hi] = b.range.split('-').map(Number);
    return s >= lo && s <= hi;
  }) || bands[bands.length - 1];
}

export function domainLabel(d: string) {
  return classifyDomain(d);
}

export function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s=>dl.includes(s))) return {label:'Social',color:'#F59E0B',bg:'#FEF3C7'};
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s=>dl.includes(s))) return {label:'Institution',color:'#3B82F6',bg:'#DBEAFE'};
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s=>dl.includes(s))) return {label:'Earned Media',color:'#10B981',bg:'#D1FAE5'};
  return {label:'Other',color:'#6B7280',bg:'#F3F4F6'};
}

export function buildFeatureDims(
  indKey: string,
  rd: any[],
  sent: number, prom: number, vis: number, cit: number, sov: number
) {
  const rate = (cats: string[]): number | null => {
    const rows = rd.filter((r: any) => cats.some(c => (r.category||'').toLowerCase().includes(c.toLowerCase())));
    if (rows.length === 0) return null;
    return Math.round((rows.filter((r: any) => r.mentioned).length / rows.length) * 100);
  };

  if (indKey === 'fin' || indKey === 'fin_cc_travel' || indKey === 'fin_cc_cashback' ||
      indKey === 'fin_cc_rewards' || indKey === 'fin_cc_student' || indKey === 'fin_cc_student_rewards' ||
      indKey === 'fin_cc_secured' || indKey === 'fin_cc_balance_transfer' || indKey === 'fin_small_business_cc') {
    const cashBack    = rate(['Cash Back','Flat Rate','Category','Redemption']);
    const travel      = rate(['Travel & Rewards','Miles & Points','Perks & Benefits','Value']);
    const feesApr     = rate(['Interest & Fees','0% APR','Fees','Debt Payoff','Balance Transfer']);
    const rewards     = rate(['Rewards Optimization','Points','Cash Back vs Points']);
    const creditBuild = rate(['Credit Building','Approval & Credit','Credit Builder','Deposit & Fees','Features']);
    const perks       = rate(['Card Benefits','Expert Recommendation','Premium Cards','Comparison']);
    return [
      { label: 'Cash Back',       val: cashBack    ?? Math.round(vis * 0.6 + sov * 0.4) },
      { label: 'Travel Benefits', val: travel      ?? Math.round(sent * 0.5 + prom * 0.5) },
      { label: 'Fees & APR',      val: feesApr     ?? Math.round(cit * 0.5 + sent * 0.5) },
      { label: 'Rewards / Points',val: rewards     ?? Math.round(prom * 0.6 + vis * 0.4) },
      { label: 'Credit Building', val: creditBuild ?? Math.round(sov * 0.6 + cit * 0.4) },
      { label: 'Perks & Benefits',val: perks       ?? Math.round(sent * 0.55 + prom * 0.45) },
    ];
  }

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

  if (rd.length > 0) {
    const cats: string[] = Array.from(new Set<string>(rd.map((r:any) => r.category as string).filter((c:string)=>Boolean(c))));
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

  return [
    { label: 'Visibility',    val: vis },
    { label: 'Sentiment',     val: sent },
    { label: 'Authority',     val: Math.round(cit * 0.6 + prom * 0.4) },
    { label: 'Prominence',    val: prom },
    { label: 'Share of Voice',val: sov },
    { label: 'Recommendation',val: Math.round(sov * 0.55 + prom * 0.45) },
  ];
}

export function ensureRadarHasData(dims: {label:string,val:number}[], sent:number, prom:number, vis:number, cit:number, sov:number): {label:string,val:number}[] {
  const allZero = dims.every(d => d.val === 0);
  if (!allZero) return dims;
  const genericLabels = ['Visibility','Sentiment','Authority','Prominence','Share of Voice','Recommendation','Citations'];
  const hasProductAxes = dims.some(d => !genericLabels.includes(d.label));
  if (hasProductAxes) {
    return dims.map(d => ({ ...d, val: d.val === 0 ? Math.max(d.val, Math.round((vis + sent) / 4)) : d.val }));
  }
  return [
    { label: 'Visibility',    val: Math.max(vis, 5) },
    { label: 'Sentiment',     val: Math.max(sent, 5) },
    { label: 'Prominence',    val: Math.max(prom, 5) },
    { label: 'Citations',     val: Math.max(cit, 5) },
    { label: 'Share of Voice',val: Math.max(sov, 5) },
    { label: 'Authority',     val: Math.max(Math.round((cit + prom) / 2), 5) },
  ];
}

export function buildRadarDims(sent: number, prom: number, vis: number, cit: number, sov: number, indKey = 'gen') {
  return buildFeatureDims(indKey, [], sent, prom, vis, cit, sov);
}

export function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:5,cursor:'help'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',color:'#6B7280',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>?</span>
      {show&&<span style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'white',fontSize:'0.72rem',lineHeight:1.6,borderRadius:8,padding:'10px 14px',width:210,textAlign:'left',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:9999,pointerEvents:'none',whiteSpace:'normal' as const}}>{text}<span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',borderWidth:5,borderStyle:'solid',borderColor:'#1F2937 transparent transparent transparent'}}/></span>}
    </span>
  );
}

export function MetricCard({ label, val, sub, color='#111827', note }: { label:string; val:any; sub?:string; color?:string; note?:string }) {
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

// CHANGE: Removed brand name from gauge (score number and label only); GEO score number color → black
export function GeoGauge({ score }: { score:number }) {
  const badge = scoreBadge(score);
  const cx=160,cy=155,Ro=130,Ri=88;
  const a=(s:number)=>Math.PI-(s/100)*Math.PI;
  const ox=(s:number,r:number)=>cx+r*Math.cos(a(s));
  const oy=(s:number,r:number)=>cy-r*Math.sin(a(s));
  // CHANGE: Good band uses yellow #FDD835
  const seg=(s0:number,s1:number,fill:string)=>{const lg=s1-s0>50?1:0;return <path d={`M ${ox(s0,Ro)} ${oy(s0,Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1,Ro)} ${oy(s1,Ro)} L ${ox(s1,Ri)} ${oy(s1,Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0,Ri)} ${oy(s0,Ri)} Z`} fill={fill} stroke="white" strokeWidth="2"/>;};
  const mi=Ri-8,mo=Ro+8;
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 16px 14px',textAlign:'center'}}>
      <svg viewBox="0 0 320 175" style={{width:'100%',display:'block',overflow:'visible'}}>
        {/* CHANGE: Good band (70-79) = #FDD835 yellow */}
        {seg(0,44,'#F44336')}{seg(44,69,'#FF7043')}{seg(69,79,'#FDD835')}{seg(79,100,'#43A047')}
        <line x1={ox(score,mi)} y1={oy(score,mi)} x2={ox(score,mo)} y2={oy(score,mo)} stroke="#6D28D9" strokeWidth="4" strokeLinecap="round"/>
        {[0,20,40,60,80,100].map(t=><text key={t} x={ox(t,Ro+18)} y={oy(t,Ro+18)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>)}
        {/* CHANGE: Score number is now black (#111827) not purple */}
        <text x={cx} y={cy-18} textAnchor="middle" style={{fontSize:46,fontWeight:900,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        <span style={{fontSize:'0.78rem',fontWeight:700,color:'#374151'}}>GEO Score</span>
        <Tooltip text="GEO Score = Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15. Scale: 0-44 Poor, 45-69 Needs Work, 70-79 Good, 80-100 Excellent."/>
      </div>
    </div>
  );
}

export function MarkdownText({ text }: { text:string }) {
  const lines = text.split('\n');
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
        return <em key={j} style={{fontStyle:'italic',color:'#374151'}}>{p.slice(1,-1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:"'DM Mono','JetBrains Mono',monospace",color:'#7C3AED'}}>{p.slice(1,-1)}</code>;
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
        items.push(
          <div key={i} style={{marginBottom:5}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{background:'#7C3AED',color:'white',borderRadius:'50%',width:22,height:22,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:1}}>{num}</span>
              <span style={{fontSize:'0.92rem',color:'#111827',lineHeight:1.65,flex:1}}>{parseInline(content)}</span>
            </div>
          </div>
        );
        i++;
      }
      elements.push(<div key={`nl-${i}`} style={{margin:'8px 0 12px',display:'flex',flexDirection:'column' as const,gap:2}}>{items}</div>);
      continue;
    }
    if (/^\s{0,3}[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s{0,3}[-*]\s/.test(lines[i])) {
        const l = lines[i].trim();
        const content = l.replace(/^[-*]\s/, '');
        items.push(
          <div key={i} style={{display:'flex',gap:8,marginBottom:4,alignItems:'flex-start'}}>
            <span style={{color:'#7C3AED',flexShrink:0,marginTop:2}}>*</span>
            <span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(content)}</span>
          </div>
        );
        i++;
      }
      elements.push(<div key={`bl-${i}`} style={{margin:'4px 0 10px',paddingLeft:4}}>{items}</div>);
      continue;
    }
    elements.push(<p key={i} style={{margin:'3px 0',fontSize:'0.93rem',color:'#374151',lineHeight:1.75}}>{parseInline(trimmed)}</p>);
    i++;
  }
  return <div style={{fontFamily:'Inter,sans-serif',color:'#374151',maxWidth:'100%'}}>{elements}</div>;
}

export function RadarChart({ sent, prom, vis, cit, sov, indKey='gen', rd=[] }: { sent:number; prom:number; vis:number; cit:number; sov:number; indKey?:string; rd?:any[] }) {
  const [hov,setHov]=useState<number|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);
  const dimsRaw = buildFeatureDims(indKey, rd, sent, prom, vis, cit, sov);
  const dims = ensureRadarHasData(dimsRaw, sent, prom, vis, cit, sov);
  const cx=200,cy=200,R=120,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100];
  const poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  const sorted=[...dims].sort((a,b)=>b.val-a.val);
  const top2=sorted.slice(0,2).map(d=>d.label),bot2=sorted.slice(-2).map(d=>d.label);
  return (
    <div style={{position:'relative' as const}}>
      <svg viewBox="0 0 400 420" style={{width:'100%'}}>
        {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return<g key={r}><polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1"/><text x={cx+4} y={cy-(r/100)*R+4} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>{r}</text></g>;})}
        {dims.map((_,i)=>{const p=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;})}
        <polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#7C3AED" fillOpacity="0.18" stroke="#7C3AED" strokeWidth="2"/>
        {dims.map((d,i)=>{const p=pt(i,(d.val/100)*R);return<circle key={i} cx={p.x} cy={p.y} r={hov===i?7:5} fill="#7C3AED" stroke="white" strokeWidth="1" style={{cursor:'pointer'}} onMouseEnter={(e)=>{setHov(i);const svgRect=(e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();const circRect=(e.currentTarget as SVGElement).getBoundingClientRect();setTooltipPos({x:circRect.left+circRect.width/2-svgRect.left,y:circRect.top-svgRect.top});}} onMouseLeave={()=>{setHov(null);setTooltipPos(null);}}/>;})}
        {dims.map((d,i)=>{const lp=pt(i,R+26);const isTop=top2.includes(d.label),isBot=bot2.includes(d.label);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:isTop?'#7C3AED':isBot?'#EF4444':'#374151',fontWeight:isTop||isBot?700:400,fontFamily:'Inter,sans-serif'}}>{d.label}</text>;})}
        <g transform="translate(20,398)"><circle cx={6} cy={0} r={5} fill="#7C3AED" opacity="0.7"/><text x={16} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>You</text></g>
      </svg>
      {hov!==null&&tooltipPos&&<div style={{position:'absolute' as const,left:Math.max(0,tooltipPos.x-82),top:Math.max(0,tooltipPos.y-64),background:'#1F2937',borderRadius:8,padding:'10px 14px',width:165,pointerEvents:'none',zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.25)'}}><div style={{fontSize:11,fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',marginBottom:3}}>{dims[hov].label}: {dims[hov].val}</div><div style={{fontSize:9,color:'#D1D5DB',fontFamily:'Inter,sans-serif',lineHeight:1.5}}>{getRadarTip(dims[hov].label)}</div></div>}
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:4}}>💡 <strong>Feature Insight:</strong> Strongest in <strong>{top2.join(' and ')}</strong> · AI frequently associates your brand with these. Weakest in <strong>{bot2.join(' and ')}</strong> · competitors dominate these product queries.</div>
    </div>
  );
}

export function SentimentHeatmap({ brandName, sent, prom, vis, cit, sov, competitors, indKey='gen', rd=[] }: { brandName:string; sent:number; prom:number; vis:number; cit:number; sov:number; competitors:any[]; indKey?:string; rd?:any[] }) {
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
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:10}}>💡 <strong>Insight:</strong> Strongest in <strong>{strongest?.dim}</strong> ({strongest?.score}) · ahead of {strongest?.beaten}/{compRows.length} competitors. Weakest in <strong>{weakest?.dim}</strong> ({weakest?.score}).</div>
    </div>
  );
}
