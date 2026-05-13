'use client';

import React, { useState, useEffect } from 'react';

const bands = [
  { bg: '#E8F5E9', border: '#43A047', color: '#43A047', range: '80-100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#FFFDE7', border: '#FDD835', color: '#F9A825', range: '70-79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FBE9E7', border: '#FF7043', color: '#FF7043', range: '45-69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFEBEE', border: '#F44336', color: '#F44336', range: '0-44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string,string> = {
  'visibility score': 'Measures how often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'Reflects how authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'Captures the tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'Average position when your brand is mentioned within an AI response. #1 means AI names your brand first most often.',
  'prominence score': 'Measures how early in AI responses your brand is mentioned.',
  'share of voice': 'Your brand mentions as a percentage of all brand mentions across AI responses.',
};

const TABS = ['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Recommendations','Live Prompt','FAQ'];

function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#43A047', bg: '#E8F5E9' };
  if (s >= 70) return { label: 'Good', color: '#F9A825', bg: '#FFFDE7' };
  if (s >= 45) return { label: 'Needs Work', color: '#FF7043', bg: '#FBE9E7' };
  return { label: 'Poor', color: '#F44336', bg: '#FFEBEE' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s=>dl.includes(s))) return {label:'Social',color:'#F59E0B',bg:'#FEF3C7'};
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s=>dl.includes(s))) return {label:'Institution',color:'#3B82F6',bg:'#DBEAFE'};
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s=>dl.includes(s))) return {label:'Earned Media',color:'#10B981',bg:'#D1FAE5'};
  return {label:'Other',color:'#6B7280',bg:'#F3F4F6'};
}

// ── SHARED PRODUCT DETECTION LOGIC ──
// Returns product categories derived purely from actual AI response text.
// Used by BOTH the Sankey diagram AND the Radar chart so they always match.
type ProductDef = {label:string; terms:string[]; color:string};

function getProductDefs(indKey:string, lob:string): ProductDef[] {
  const k = indKey;
  const l = lob.toLowerCase();
  const TOPIC_COLORS = ['#A100FF','#7500C0','#460073','#6B7280','#374151'];

  if (k==='fin' || l.includes('credit card')) {
    return [
      {label:'Cash Back Cards',   terms:['cash back','cashback','double cash','freedom','quicksilver','active cash','customized cash','blue cash'], color:TOPIC_COLORS[0]},
      {label:'Travel Cards',      terms:['travel','sapphire','venture','strata','premier','platinum','autograph','miles','points card'], color:TOPIC_COLORS[1]},
      {label:'Balance Transfer',  terms:['balance transfer','0% apr','0 apr','zero apr','simplicity','reflect','slate','diamond preferred'], color:TOPIC_COLORS[2]},
      {label:'Secured Cards',     terms:['secured','credit builder','deposit','credit building','opensky','chime credit'], color:TOPIC_COLORS[3]},
      {label:'Rewards Cards',     terms:['rewards','points','savor','gold card','preferred','signature','world elite'], color:TOPIC_COLORS[4]},
    ];
  }
  if (k==='fin_cc_travel') { return [
    {label:'Miles Cards',         terms:['miles','airline','aadvantage','skymiles','united','southwest'],color:TOPIC_COLORS[0]},
    {label:'Hotel Cards',         terms:['hotel','marriott','hilton','hyatt','world of hyatt','ihg'],color:TOPIC_COLORS[1]},
    {label:'Flexible Points',     terms:['transferable','flexible','chase ultimate','amex points','capital one miles','citi thank'],color:TOPIC_COLORS[2]},
    {label:'Lounge Access',       terms:['lounge','priority pass','centurion','admirals','sky club'],color:TOPIC_COLORS[3]},
    {label:'No Foreign Fee',      terms:['no foreign','international','foreign transaction'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='fin_retail_bank') { return [
    {label:'Savings Accounts',   terms:['savings','high yield','hysa','apy','money market','performance savings'],color:TOPIC_COLORS[0]},
    {label:'Checking Accounts',  terms:['checking','current account','debit','direct deposit','360 checking'],color:TOPIC_COLORS[1]},
    {label:'CD Accounts',        terms:['cd','certificate of deposit','certificate','fixed rate','term'],color:TOPIC_COLORS[2]},
    {label:'Teen & Kids',        terms:['teen','kid','youth','student','minor','custodial'],color:TOPIC_COLORS[3]},
    {label:'Digital Banking',    terms:['mobile app','digital','online banking','zelle','instant transfer'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='fin_mortgage' || l.includes('mortgage')) { return [
    {label:'Home Purchase',       terms:['purchase','home loan','buy a home','buying','first home'],color:TOPIC_COLORS[0]},
    {label:'Refinancing',         terms:['refinance','refi','cash-out','lower rate','lower payment'],color:TOPIC_COLORS[1]},
    {label:'FHA / VA Loans',      terms:['fha','va loan','veteran','usda','government loan'],color:TOPIC_COLORS[2]},
    {label:'HELOC',               terms:['heloc','home equity','equity line','equity loan'],color:TOPIC_COLORS[3]},
    {label:'Jumbo Loans',         terms:['jumbo','large loan','high value','luxury home'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='fin_auto_loan' || l.includes('auto')) { return [
    {label:'New Car Loans',       terms:['new car','new vehicle','new auto','dealer','0% apr'],color:TOPIC_COLORS[0]},
    {label:'Used Car Loans',      terms:['used car','pre-owned','certified pre','used vehicle'],color:TOPIC_COLORS[1]},
    {label:'Refinancing',         terms:['refinance','refi','lower rate','lower payment'],color:TOPIC_COLORS[2]},
    {label:'EV Financing',        terms:['electric','ev','tesla','rivian','bolt','ioniq'],color:TOPIC_COLORS[3]},
    {label:'No Down Payment',     terms:['no down','zero down','100%','no money down'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='fin_retirement' || k==='fin_wealth') { return [
    {label:'401(k) Plans',        terms:['401k','401(k)','employer plan','workplace','defined contribution'],color:TOPIC_COLORS[0]},
    {label:'IRA Accounts',        terms:['ira','roth','traditional ira','rollover','individual retirement'],color:TOPIC_COLORS[1]},
    {label:'Investment Funds',    terms:['mutual fund','index fund','etf','portfolio','managed fund'],color:TOPIC_COLORS[2]},
    {label:'Annuities',           terms:['annuity','annuities','guaranteed income','variable annuity','fixed annuity'],color:TOPIC_COLORS[3]},
    {label:'Financial Planning',  terms:['financial plan','advisor','retirement planning','estate','wealth management'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='auto') { return [
    {label:'Sedans',              terms:['sedan','camry','accord','civic','altima','corolla'],color:TOPIC_COLORS[0]},
    {label:'SUVs',                terms:['suv','crossover','rav4','cr-v','explorer','equinox','highlander'],color:TOPIC_COLORS[1]},
    {label:'Electric Vehicles',   terms:['electric','ev','model 3','model y','ioniq','mach-e','bz4x'],color:TOPIC_COLORS[2]},
    {label:'Trucks',              terms:['truck','pickup','f-150','silverado','tundra','ram'],color:TOPIC_COLORS[3]},
    {label:'Luxury',              terms:['luxury','premium','bmw','mercedes','audi','lexus','genesis'],color:TOPIC_COLORS[4]},
  ];}
  if (k==='hotel') { return [
    {label:'Luxury Hotels',       terms:['luxury','5-star','premium','ritz','four seasons'],color:TOPIC_COLORS[0]},
    {label:'Business Hotels',     terms:['business','corporate','suite','meeting','conference'],color:TOPIC_COLORS[1]},
    {label:'Family Resorts',      terms:['family','resort','kid','pool','all-inclusive'],color:TOPIC_COLORS[2]},
    {label:'Loyalty Program',     terms:['points','rewards','status','elite','loyalty','free night'],color:TOPIC_COLORS[3]},
    {label:'Budget / Value',      terms:['budget','value','affordable','deal','discount'],color:TOPIC_COLORS[4]},
  ];}
  // Generic fallback
  const lobWords = lob.split(/[\s,&\/]+/).filter((w:string)=>w.length>3).slice(0,5);
  if (lobWords.length >= 2) {
    return lobWords.map((w:string,i:number) => ({
      label: w.charAt(0).toUpperCase()+w.slice(1),
      terms: [w.toLowerCase()],
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
    }));
  }
  return [
    {label:'Core Product',  terms:['product','service','solution','platform'],color:TOPIC_COLORS[0]},
    {label:'Premium Tier',  terms:['premium','pro','plus','elite','advanced'],color:TOPIC_COLORS[1]},
    {label:'Entry Tier',    terms:['basic','starter','standard','free','lite'],color:TOPIC_COLORS[2]},
    {label:'Bundles',       terms:['bundle','package','combo','all-in','suite'],color:TOPIC_COLORS[3]},
    {label:'Add-ons',       terms:['add-on','extra','optional','upgrade','feature'],color:TOPIC_COLORS[4]},
  ];
}

// Compute product mentions from real response text — each response counts once per product (not per term match)
function computeProductMentions(productDefs: ProductDef[], rd: any[]): {label:string;terms:string[];color:string;mentions:number;pct:number;val:number}[] {
  const total = rd.length || 1;
  return productDefs.map(p => {
    // Count unique responses that mention at least one term for this product
    const count = rd.filter((r:any) => {
      const txt = (r.response_preview || r.response || '').toLowerCase();
      return p.terms.some((t:string) => txt.includes(t));
    }).length;
    const pct = Math.round((count / total) * 100);
    return { ...p, mentions: count, pct, val: Math.max(5, count) };
  }).filter(p => p.mentions > 0 || rd.length === 0);
}

const RADAR_TIPS: Record<string,string> = {
  'Cash Back Cards':    'How often AI recommends your brand for cash back queries.',
  'Travel Cards':       'How often AI surfaces your brand for travel card queries.',
  'Balance Transfer':   'How well your brand is positioned for balance transfer queries.',
  'Secured Cards':      'How strongly AI associates your brand with secured/credit building.',
  'Rewards Cards':      'How often AI mentions your brand for rewards queries.',
  'Savings Accounts':   'How often AI recommends your brand for savings queries.',
  'Checking Accounts':  'How often AI recommends your brand for checking queries.',
  'CD Accounts':        'How often AI recommends your brand for CD queries.',
  'Teen & Kids':        'How often AI recommends your brand for youth banking.',
  'Digital Banking':    'How strongly AI associates your brand with digital banking.',
  '401(k) Plans':       'How often AI recommends your brand for 401k queries.',
  'IRA Accounts':       'How often AI recommends your brand for IRA queries.',
  'Investment Funds':   'How often AI recommends your brand for investment fund queries.',
  'Annuities':          'How often AI recommends your brand for annuity queries.',
  'Financial Planning': 'How often AI recommends your brand for financial planning.',
};

function getRadarTip(label: string): string {
  return RADAR_TIPS[label] || `How often your brand appears in AI responses for ${label.toLowerCase()} queries.`;
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

function MetricCard({ label, val, sub, color='#111827' }: { label:string; val:any; sub?:string; color?:string }) {
  return (
    <div style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>
        {label}{METRIC_TIPS[label.toLowerCase()]&&<Tooltip text={METRIC_TIPS[label.toLowerCase()]}/>}
      </div>
      <div style={{fontSize:'1.8rem',fontWeight:800,color,lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>}
    </div>
  );
}

function GeoGauge({ score }: { score:number }) {
  const badge = scoreBadge(score);
  const cx=160,cy=155,Ro=130,Ri=88;
  const a=(s:number)=>Math.PI-(s/100)*Math.PI;
  const ox=(s:number,r:number)=>cx+r*Math.cos(a(s));
  const oy=(s:number,r:number)=>cy-r*Math.sin(a(s));
  const seg=(s0:number,s1:number,fill:string)=>{const lg=s1-s0>50?1:0;return <path d={`M ${ox(s0,Ro)} ${oy(s0,Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1,Ro)} ${oy(s1,Ro)} L ${ox(s1,Ri)} ${oy(s1,Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0,Ri)} ${oy(s0,Ri)} Z`} fill={fill} stroke="white" strokeWidth="2"/>;};
  const mi=Ri-8,mo=Ro+8;
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 16px 14px',textAlign:'center'}}>
      <svg viewBox="0 0 320 175" style={{width:'100%',display:'block',overflow:'visible'}}>
        {seg(0,44,'#F44336')}{seg(44,69,'#FF7043')}{seg(69,79,'#FDD835')}{seg(79,100,'#43A047')}
        <line x1={ox(score,mi)} y1={oy(score,mi)} x2={ox(score,mo)} y2={oy(score,mo)} stroke="#A100FF" strokeWidth="4" strokeLinecap="round"/>
        {[0,20,40,60,80,100].map(t=><text key={t} x={ox(t,Ro+18)} y={oy(t,Ro+18)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>)}
        <text x={cx} y={cy-18} textAnchor="middle" style={{fontSize:46,fontWeight:900,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        <span style={{fontSize:'0.78rem',fontWeight:700,color:'#374151'}}>GEO Score</span>
        <Tooltip text="GEO Score = Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15."/>
      </div>
    </div>
  );
}

function WhatScoreMeans({ score, brand }: { score:number; brand:string }) {
  const scoreBands = [
    { range:'0-44', label:'Poor', color:'#F44336', bg:'#FFEBEE', border:'#F44336', desc:'Rarely mentioned. AI lacks enough signals to surface you reliably.' },
    { range:'45-69', label:'Needs Work', color:'#FF7043', bg:'#FBE9E7', border:'#FF7043', desc:'Appears in lists but not as a primary recommendation.' },
    { range:'70-79', label:'Good', color:'#F9A825', bg:'#FFFDE7', border:'#FDD835', desc:'AI crosses the confidence threshold. Frequent top-3 placements begin.' },
    { range:'80-100', label:'Excellent', color:'#43A047', bg:'#E8F5E9', border:'#43A047', desc:'Dominant brand signal. AI leads with you as the primary recommendation.' },
  ];
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <span style={{color:'#A100FF',fontSize:'1rem'}}>^</span>
        <span style={{fontSize:'0.95rem',fontWeight:800,color:'#A100FF'}}>What does your score mean?</span>
      </div>
      <p style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.75,margin:'0 0 14px'}}>
        Think of the GEO Score like a credit score for AI. At <strong>{score}</strong>, <strong>{brand}</strong> {score >= 80 ? 'is in the top tier. AI consistently leads with your brand as the primary recommendation.' : score >= 70 ? 'has crossed the efficiency threshold where AI models consistently feature your brand near the top of responses.' : 'is below the 70 threshold where AI models consistently feature a brand at the top of responses.'}
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
    { label: 'Fragmented', range: '0-44', color: '#E53935' },
    { label: 'Emerging', range: '45-55', color: '#FB8C00' },
    { label: 'Competitive', range: '56-69', color: '#FDD835' },
    { label: 'Leader', range: '70-79', color: '#1E88E5' },
    { label: 'Authority', range: '80+', color: '#43A047' },
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
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#A100FF" strokeWidth="1.5" strokeDasharray="5,4"/>
        <text x={W-padR+4} y={sy(70)} dominantBaseline="middle" style={{fontSize:8,fill:'#A100FF',fontFamily:'Inter,sans-serif',fontWeight:700}}>70</text>
        <path d={pathD} fill="none" stroke="#A100FF" strokeWidth="2.5"/>
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
          <circle cx={youCX} cy={youCY} r={7} fill="#A100FF" stroke="white" strokeWidth="2"/>
          <text x={youCX} y={youCY+18} textAnchor="middle" style={{fontSize:7,fontWeight:700,fill:'#7500C0',fontFamily:'Inter,sans-serif'}}>You ({score})</text>
          {hov==='you'&&<><rect x={youCX-52} y={youCY+28} width={104} height={20} rx={4} fill="#1F2937"/><text x={youCX} y={youCY+39} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: {score}</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('goal')} onMouseLeave={()=>setHov(null)}>
          <circle cx={goalCX} cy={goalCY} r={9} fill="#1E88E5" stroke="white" strokeWidth="2"/>
          <text x={goalCX-12} y={goalCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#1E88E5',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
          {hov==='goal'&&<><rect x={goalCX-118} y={goalCY+10} width={104} height={20} rx={4} fill="#1F2937"/><text x={goalCX-66} y={goalCY+21} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: 70</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('auth')} onMouseLeave={()=>setHov(null)}>
          <circle cx={authCX} cy={authCY} r={12} fill="#43A047" stroke="white" strokeWidth="2"/>
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
  'Owned Content Optimization': {label:'Owned Content Optimization', color:'#0F766E', bg:'#F0FDFA'},
  'Content Page':      {label:'Content Page',      color:'#A100FF', bg:'#F5F0FF'},
  'FAQ Build':         {label:'FAQ Build',         color:'#10B981', bg:'#ECFDF5'},
  'How-To Guide':      {label:'How-To Guide',      color:'#0EA5E9', bg:'#F0F9FF'},
  'Product Explainer': {label:'Product Explainer', color:'#7500C0', bg:'#F3E8FF'},
  'Best-Of List':      {label:'Best-Of List',      color:'#A100FF', bg:'#F5F0FF'},
  'Use Case Page':     {label:'Use Case Page',     color:'#06B6D4', bg:'#ECFEFF'},
  'Content Strategy':  {label:'Content Strategy',  color:'#460073', bg:'#EDE9FE'},
  'PR / Earned Media': {label:'PR / Earned Media', color:'#EC4899', bg:'#FDF2F8'},
  'Citation Push':     {label:'Citation Push',     color:'#F43F5E', bg:'#FFF1F2'},
  'Review Platform':   {label:'Review Platform',   color:'#F59E0B', bg:'#FFFBEB'},
  'Forum Presence':    {label:'Forum Presence',    color:'#D97706', bg:'#FEF3C7'},
  'Wikipedia / Entity':{label:'Wikipedia / Entity',color:'#64748B', bg:'#F1F5F9'},
  'Structured Data':   {label:'Structured Data',   color:'#F97316', bg:'#FFF7ED'},
  'Schema Markup':     {label:'Schema Markup',     color:'#EA580C', bg:'#FFF7ED'},
  'Entity Optimization':{label:'Entity Optimization',color:'#0F766E',bg:'#F0FDFA'},
  'Technical SEO':     {label:'Technical SEO',     color:'#14B8A6', bg:'#F0FDFA'},
  'Internal Linking':  {label:'Internal Linking',  color:'#0369A1', bg:'#F0F9FF'},
  'Syndication':       {label:'Syndication',       color:'#A100FF', bg:'#EDE9FE'},
};

// ── SANKEY CHART — shared between GEO Score tab and used to be in Sentiment tab ──
function SankeyFlowChart({ result }: { result: any }) {
  const [hovMetric, setHovMetric] = useState<string|null>(null);

  const rd: any[] = result.responses_detail || [];
  const cl: any[] = result.query_clusters || [];
  const indKey: string = result.ind_key || 'gen';
  const lob: string = result.lob || '';
  const rawSent: number = result.sentiment || 0;
  const prom: number = result.prominence || 0;
  const vis: number = result.visibility || 0;
  const cit: number = result.citation_share || 0;
  const sov: number = result.share_of_voice || 0;
  const totalRd = rd.length || 100;

  const TOPIC_COLORS = ['#A100FF','#7500C0','#460073','#6B7280','#374151'];

  // ── COLUMN 1: Top query topics from real cluster data ──
  const topTopics = [...cl]
    .sort((a:any,b:any) => (b.total||0)-(a.total||0))
    .slice(0, 5)
    .map((c:any, i:number) => ({
      label: c.category,
      val: Math.max(5, Math.min(95, c.winRate ?? 0)),
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
      total: c.total || 0,
    }));
  const leftItems = topTopics.length >= 1 ? topTopics : [{label:'General', val: vis || 30, color: TOPIC_COLORS[0], total: 10}];

  // ── COLUMN 2: Products detected from actual response text ──
  const productDefs = getProductDefs(indKey, lob);

  // Compute mention counts — each response counts once per product
  const productMentions = computeProductMentions(productDefs, rd);

  // Sort by mention count descending
  const sortedMentions = [...productMentions].sort((a:any,b:any) => b.mentions - a.mentions);

  // Assign performance colors based on rank
  const PERF_COLORS = ['#A100FF','#7500C0','#460073','#6B7280','#374151'];
  const prodItems: any[] = sortedMentions.length >= 1
    ? sortedMentions.map((p, i) => ({ ...p, color: PERF_COLORS[Math.min(i, PERF_COLORS.length-1)] }))
    : productDefs.map((p, i) => ({
        ...p,
        mentions: Math.round(totalRd / (productDefs.length || 5)),
        pct: Math.round(100 / (productDefs.length || 5)),
        val: 20 + i * 5,
        color: PERF_COLORS[Math.min(i, PERF_COLORS.length-1)],
      }));

  // ── COLUMN 3: GEO Signals ──
  const signals = [
    {label:'Visibility', val:vis, weight:30, color:'#A100FF'},
    {label:'Sentiment',  val:rawSent, weight:20, color:'#7500C0'},
    {label:'Prominence', val:prom, weight:20, color:'#460073'},
    {label:'Citations',  val:cit, weight:15, color:'#6B7280'},
    {label:'Share of Voice', val:sov, weight:15, color:'#374151'},
  ];

  const geoScore = Math.round(signals.reduce((s,m) => s + m.val * m.weight / 100, 0)) || result.overall_geo_score || 0;

  // ── LAYOUT ──
  const W = 1040, H = 480, padT = 32, padB = 44;
  const col1 = 130, col2 = 300, col3 = 510, col4 = 720, nW = 26;
  const plotH = H - padT - padB;

  const layoutN = <T extends{label:string;val:number;color:string}>(items: T[], x: number, minH=22, gap=8) => {
    const total = items.reduce((s,n) => s + Math.max(n.val, 1), 0) || 1;
    const usableH = plotH - gap * (items.length - 1);
    let cy = padT;
    return items.map(n => {
      const h = Math.max(minH, (Math.max(n.val, 1) / total) * usableH);
      const nd = { ...n, x, y: cy, h, mid: cy + h/2 };
      cy += h + gap;
      return nd;
    });
  };

  const lNodes = layoutN(leftItems, col1, 24, 10);
  const pNodes = layoutN(prodItems, col2, 26, 10);
  const sNodes = layoutN(signals, col3, 28, 8);
  const geoH = plotH;
  const geoN = { x: col4, y: padT, h: geoH, mid: padT + geoH / 2 };

  const wave = (x1:number,y1:number,h1:number,x2:number,y2:number,h2:number,bend=0.44) => {
    const mx1 = x1+nW+(x2-x1-nW)*bend;
    const mx2 = x2-(x2-x1-nW)*bend;
    return `M${x1+nW},${y1} C${mx1},${y1} ${mx2},${y2} ${x2},${y2} L${x2},${y2+h2} C${mx2},${y2+h2} ${mx1},${y1+h1} ${x1+nW},${y1+h1} Z`;
  };

  // Flow A: topics → products
  type FlowA = {path:string;color:string;tid:string;pid:string};
  const flowsA: FlowA[] = [];
  lNodes.forEach(ln => {
    const topicRd = rd.filter((r:any) => r.category === ln.label);
    const topicTotal = topicRd.length || 1;
    const prodShares = pNodes.map(pn => {
      const pDef = productDefs.find(p => p.label === pn.label);
      if (!pDef) return 0;
      const cnt = topicRd.filter((r:any) => pDef.terms.some((t:string) => (r.response_preview||'').toLowerCase().includes(t))).length;
      return Math.max(0, cnt / topicTotal);
    });
    const totalShare = prodShares.reduce((s,v) => s+v, 0) || 1;
    let lOffset = 0;
    pNodes.forEach((pn, pi) => {
      const frac = prodShares[pi] / totalShare;
      if (frac < 0.001) return;
      const lH = Math.max(2, ln.h * frac);
      const prevTopicContrib = lNodes.slice(0, lNodes.indexOf(ln)).reduce((acc, prev) => {
        const prevRd = rd.filter((r:any) => r.category === prev.label);
        const prevTotal = prevRd.length || 1;
        const pDef = productDefs.find(p => p.label === pn.label);
        const cnt = pDef ? prevRd.filter((r:any) => pDef.terms.some((t:string) => (r.response_preview||'').toLowerCase().includes(t))).length : 0;
        const prevShares = pNodes.map(ppn => {
          const pd = productDefs.find(p => p.label === ppn.label);
          if (!pd) return 0;
          const c2 = prevRd.filter((r:any) => pd.terms.some((t:string) => (r.response_preview||'').toLowerCase().includes(t))).length;
          return c2 / prevTotal;
        });
        const ps = prevShares.reduce((s,v) => s+v, 0) || 1;
        return acc + prev.h * (prevShares[pi] / ps || 0);
      }, 0);
      const pY = pn.y + prevTopicContrib;
      const pH = Math.max(2, pn.h * frac);
      flowsA.push({ path: wave(ln.x, ln.y+lOffset, lH, pn.x, pY, pH, 0.42), color: pn.color, tid: ln.label, pid: pn.label });
      lOffset += lH;
    });
  });

  // Flow B: products → signals
  type FlowB = {path:string;color:string;pid:string;sid:string};
  const flowsB: FlowB[] = [];
  const sigOffsets: Record<string,number> = {};
  sNodes.forEach(sig => { sigOffsets[sig.label] = sig.y; });
  const totalMentions = prodItems.reduce((s:number,p:any) => s + Math.max(p.val, 1), 0) || 1;
  pNodes.forEach((pn:any) => {
    let pOffset = 0;
    sNodes.forEach(sig => {
      const fw = sig.weight / 100;
      const pH = Math.max(2, pn.h * fw);
      const pShare = Math.max(pn.val, 1) / totalMentions;
      const sH = Math.max(2, sig.h * pShare);
      const sY = sigOffsets[sig.label];
      flowsB.push({ path: wave(pn.x, pn.y+pOffset, pH, sig.x, sY, sH, 0.43), color: pn.color, pid: pn.label, sid: sig.label });
      pOffset += pH;
      sigOffsets[sig.label] += sH;
    });
  });

  // Flow C: signals → GEO
  type FlowC = {path:string;color:string;sid:string};
  const flowsC: FlowC[] = [];
  let gOff = geoN.y;
  sNodes.forEach(sig => {
    const h = geoN.h * (sig.weight / 100);
    flowsC.push({ path: wave(sig.x, sig.y, sig.h, geoN.x, gOff, h, 0.46), color: sig.color, sid: sig.label });
    gOff += h;
  });

  const isHov = (key:string) => hovMetric === key;

  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:'1rem',fontWeight:700,color:'#111827'}}>Brand Signal Flow · GEO Score Composition</div>
          <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:2}}>
            How AI query topics flow through brand products mentioned → GEO signals → your score. Click any node to trace the path.
          </div>
        </div>
        <div style={{background:'#F5F0FF',borderRadius:8,border:'1px solid #E9D5FF',padding:'8px 12px',fontSize:'0.65rem',color:'#7500C0',lineHeight:1.7,maxWidth:200,flexShrink:0}}>
          <div style={{fontWeight:700,marginBottom:3}}>How to read this</div>
          <div>Left → what AI is asked about</div>
          <div>2nd → which products AI mentions</div>
          <div>3rd → how signals are scored</div>
          <div>Right → your final GEO Score</div>
        </div>
      </div>
      <div style={{overflowX:'auto' as const}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:800,display:'block'}} onClick={()=>setHovMetric(null)}>
          {/* Headers */}
          {[{x:col1+nW/2,l:'QUERY TOPICS'},{x:col2+nW/2,l:'BRAND PRODUCTS MENTIONED'},{x:col3+nW/2,l:'GEO SIGNALS'},{x:col4+nW/2,l:'GEO SCORE'}].map((h,i)=>(
            <text key={i} x={h.x} y={padT-10} textAnchor="middle" style={{fontSize:7.5,fontWeight:700,fill:'#9CA3AF',fontFamily:'Inter,sans-serif',letterSpacing:'0.07em'}}>{h.l}</text>
          ))}

          {/* Flow A */}
          {flowsA.map((f,i)=>(
            <path key={`fa${i}`} d={f.path} fill={f.color}
              opacity={hovMetric?(isHov(f.tid)||isHov(f.pid)?0.55:0.04):0.16}
              style={{cursor:'pointer',transition:'opacity 0.15s'}}
              onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.tid?null:f.tid);}}/>
          ))}

          {/* Flow B */}
          {flowsB.map((f,i)=>(
            <path key={`fb${i}`} d={f.path} fill={f.color}
              opacity={hovMetric?(isHov(f.pid)||isHov(f.sid)?0.52:0.04):0.18}
              style={{cursor:'pointer',transition:'opacity 0.15s'}}
              onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.pid?null:f.pid);}}/>
          ))}

          {/* Flow C */}
          {flowsC.map((f,i)=>(
            <path key={`fc${i}`} d={f.path} fill={f.color}
              opacity={hovMetric?(isHov(f.sid)?0.52:0.04):0.22}
              style={{cursor:'pointer',transition:'opacity 0.15s'}}
              onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.sid?null:f.sid);}}/>
          ))}

          {/* Col 1 nodes */}
          {lNodes.map((n:any,i:number)=>{
            const dim = hovMetric && !isHov(n.label);
            return (
              <g key={`ln${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
                <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
                <text x={n.x-6} y={n.mid-6} textAnchor="end" dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>
                  {n.label.length>17?n.label.slice(0,16)+'…':n.label}
                </text>
                <text x={n.x-6} y={n.mid+6} textAnchor="end" dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>
                  {n.val}% win · {n.total}q
                </text>
              </g>
            );
          })}

          {/* Col 2 nodes */}
          {pNodes.map((n:any,i:number)=>{
            const dim = hovMetric && !isHov(n.label);
            return (
              <g key={`pn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
                <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
                <text x={n.x+nW+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>
                  {n.label.length>18?n.label.slice(0,17)+'…':n.label}
                </text>
                <text x={n.x+nW+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>
                  {n.mentions}/{totalRd} responses ({n.pct}%)
                </text>
              </g>
            );
          })}

          {/* Col 3 nodes */}
          {sNodes.map((n,i)=>{
            const dim = hovMetric && !isHov(n.label);
            return (
              <g key={`sn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
                <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:0.9}/>
                <text x={n.x+nW+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>
                  {n.label}
                </text>
                <text x={n.x+nW+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>
                  {n.val} · {n.weight}%
                </text>
              </g>
            );
          })}

          {/* GEO node */}
          <rect x={geoN.x} y={geoN.y} width={nW} height={geoN.h} fill="#A100FF" rx={5}/>
          <text x={geoN.x+nW+12} y={geoN.mid-20} style={{fontSize:11,fontWeight:800,fill:'#A100FF',fontFamily:'Inter,sans-serif'}}>GEO</text>
          <text x={geoN.x+nW+12} y={geoN.mid+8} style={{fontSize:32,fontWeight:900,fill:'#A100FF',fontFamily:'Inter,sans-serif'}}>{geoScore}</text>
          <text x={geoN.x+nW+12} y={geoN.mid+28} style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>out of 100</text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{borderTop:'1px solid #F3F4F6',paddingTop:10,marginTop:10,display:'flex',flexWrap:'wrap' as const,gap:16}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <span style={{fontSize:'0.62rem',fontWeight:700,color:'#6B7280'}}>PRODUCTS DETECTED:</span>
          {prodItems.map((p:any,i:number)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:7,height:7,borderRadius:1,background:p.color}}/>
              <span style={{fontSize:'0.62rem',color:'#6B7280'}}>{p.label} ({p.mentions}/{totalRd})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const badge = scoreBadge(geo);
  const topComp = (result.competitors||[])[0]?.Brand || 'top competitor';
  const topCompGEO = (result.competitors||[])[0]?.GEO || 0;

  const rd = result.responses_detail || [];
  const clusters = result.query_clusters || [];
  const totalQ = result.total_responses || rd.length || 100;
  const currentWins = result.responses_with_brand ?? rd.filter((r:any)=>r.mentioned).length;
  const lossCount = totalQ - currentWins;
  const losses = rd.filter((r:any)=>!r.mentioned).slice(0, lossCount);

  const getVol = (cat:string) => {
    const cl = clusters.find((c:any)=>c.category===cat);
    return cl?.dailySearches || 20000;
  };

  const flippableWins = losses.reduce((sum:number, r:any) => {
    const vol = getVol(r.category||'');
    return sum + (vol >= 35000 ? 0.5 : 0.25);
  }, 0);

  const opportunityWins = Math.min(currentWins + Math.round(flippableWins), totalQ);
  const opportunityRate = opportunityWins / totalQ;
  const visScale = vis > 0 ? (opportunityRate / (currentWins / totalQ)) : 1;
  const oppVis = Math.min(95, Math.round(vis * visScale));
  const oppSov = Math.min(95, Math.round(sov * (1 + flippableWins / totalQ * 0.6)));
  const oppCit = Math.min(95, Math.round(cit * (1 + flippableWins / totalQ * 0.4)));

  const opportunityGeo = Math.min(94, Math.round(
    oppVis * 0.30 + sent * 0.20 + prom * 0.20 + oppCit * 0.15 + oppSov * 0.15
  ));
  const opportunityGain = opportunityGeo - geo;
  const visGain = Math.round((oppVis - vis) * 0.30);
  const citGain = Math.round((oppCit - cit) * 0.15);
  const sovGain = Math.round((oppSov - sov) * 0.15);
  const projected = opportunityGeo;

  useEffect(()=>{
    if(fetched) return;
    setFetched(true);
    try {
      const cacheKey = `geo_summary_v3_${result.brand_name}_${geo}_${opportunityGain}`;
      const cached = sessionStorage.getItem(cacheKey);
      if(cached){ setData(JSON.parse(cached)); return; }
    } catch{}
    setLoading(true);
    const lobContext = lob ? `Line of Business: ${lob}.` : '';
    const recCats = 'Owned Content Optimization|Content Page|FAQ Build|How-To Guide|Product Explainer|Best-Of List|Use Case Page|Content Strategy|PR / Earned Media|Citation Push|Review Platform|Forum Presence|Wikipedia / Entity|Structured Data|Schema Markup|Entity Optimization|Technical SEO|Internal Linking|Syndication';
    const insightCats = 'Data Signal|Competitive Gap|Visibility Gap|Sentiment Gap|Citation Gap|Earned Media Gap|Content Gap|Rank Signal';
    const oppBreakdown = `Opportunity Score breakdown:
- Total queries run: ${totalQ}. Brand appeared in: ${currentWins}. Lost: ${lossCount}.
- Visibility gap drives +${visGain} pts, Citations +${citGain} pts, SOV +${sovGain} pts.
- scoreForecast values across all recommendations must sum to approximately ${opportunityGain} pts total.`;

    const prompt = [
      'You are a sharp GEO strategist. Return a JSON object with:',
      '- "rows": array of exactly 10 objects. First 5 insights, last 5 recommendations.',
      '  Each object: { "type":"insight"|"recommendation", "category": insights use: '+insightCats+'. Recommendations use: '+recCats+',',
      '  "title": 4-6 word action title for recommendations only (null for insights),',
      '  "text": one sharp sentence. NEVER suggest competitor comparison pages,',
      '  "scoreNow": '+String(geo)+',',
      '  "scoreForecast": insights='+String(geo)+'. Recommendations: assign pts summing to ~'+String(opportunityGain)+',',
      '  "impact": insights=null. Recommendations: HIGH if addresses Visibility gap, MEDIUM if Citations, LOW if SOV,',
      '  "agenticFlag": null OR one short sentence on readiness (recommendations only) }',
      'Brand: '+result.brand_name,
      lobContext,
      'Industry: '+(result.ind_label||result.industry||'Consumer Products'),
      'GEO: '+String(geo)+' | Vis: '+String(vis)+' | Sent: '+String(sent)+' | Cit: '+String(cit)+' | SOV: '+String(sov)+' | Prom: '+String(prom),
      'Top Competitor: '+topComp+' (GEO: '+String(topCompGEO)+')',
      oppBreakdown,
      'CRITICAL: Exactly 5 insights then 5 recommendations. NEVER recommend comparison pages. Return ONLY valid JSON no markdown.',
    ].join('\n');

    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})})
      .then(r=>r.json()).then(d=>{
        const raw=(d.response||'');
        let clean = raw.replace(/```json|```/g,'').trim();
        const parsed = JSON.parse(clean);
        setData(parsed);
        try{ sessionStorage.setItem('geo_summary_v3_'+result.brand_name+'_'+String(geo)+'_'+String(opportunityGain), JSON.stringify(parsed)); }catch{}
      }).catch(()=>setData(null)).finally(()=>setLoading(false));
  },[]);

  return (
    <div>
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <ROICurve score={geo}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
          {[
            {label:'Current GEO Score', val:geo, color:geo>=80?'#10B981':geo>=70?'#A100FF':'#F59E0B', sub:badge.label+(geo>=80?' · Category leader':geo>=70?' · Above threshold':' · Below efficiency threshold')},
            {label:'Opportunity Score', val:projected, color:'#10B981', sub:'Your reachable GEO score'},
            {label:'GEO Unlock', val:`+${opportunityGain} pts`, color:'#A100FF', sub:'Your GEO gap to close'},
          ].map((c,i)=>(
            <div key={i} style={{background:'#F9F9FC',borderRadius:12,border:'1px solid #E5E7EB',padding:'16px 18px',textAlign:'center' as const}}>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>{c.label}</div>
              <div style={{fontSize:'2.4rem',fontWeight:900,color:c.color,lineHeight:1}}>{c.val}</div>
              <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:4}}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <span style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>GEO Analysis Summary</span>
          {lob&&<span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:50,padding:'2px 10px',fontSize:'0.68rem',fontWeight:700}}>{lob}</span>}
        </div>

        {loading&&(
          <div style={{display:'flex',alignItems:'center',gap:10,color:'#9CA3AF',fontSize:'0.84rem',padding:'20px 0'}}>
            <div style={{width:16,height:16,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Generating analysis...
          </div>
        )}

        {!loading&&data?.rows&&(
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
            <thead>
              <tr style={{background:'#F3F4F6'}}>
                {['#','Category','Insight','Recommendation','GEO Opportunity','Impact'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left' as const,fontSize:'0.64rem',fontWeight:700,color:'#6B7280',letterSpacing:'.07em',borderBottom:'2px solid #E5E7EB'}}>{h.toUpperCase()}</th>
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
                    'Data Signal':    {c:'#A100FF',bg:'#F5F0FF'},
                    'Competitive Gap':{c:'#EF4444',bg:'#FEE2E2'},
                    'Visibility Gap': {c:'#3B82F6',bg:'#EFF6FF'},
                    'Sentiment Gap':  {c:'#10B981',bg:'#ECFDF5'},
                    'Citation Gap':   {c:'#F59E0B',bg:'#FFFBEB'},
                    'Earned Media Gap':{c:'#EC4899',bg:'#FDF2F8'},
                    'Content Gap':    {c:'#7500C0',bg:'#F3E8FF'},
                    'Rank Signal':    {c:'#14B8A6',bg:'#F0FDFA'},
                  };
                  const ic = insCatColors[insCat]||{c:'#A100FF',bg:'#F5F0FF'};
                  const impColor = rec?.impact==='HIGH'?'#EF4444':rec?.impact==='MEDIUM'?'#F59E0B':'#A100FF';
                  const impBg = rec?.impact==='HIGH'?'#FEE2E2':rec?.impact==='MEDIUM'?'#FEF3C7':'#F5F0FF';
                  const delta = rec ? (rec.scoreForecast - rec.scoreNow) : 0;
                  return (
                    <tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'white':'#FAFAFA'}}>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'#F5F0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,color:'#A100FF'}}>{i+1}</div>
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}>
                        <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                          {ins&&<span style={{background:ic.bg,color:ic.c,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block'}}>{insCat}</span>}
                          {rec&&cat&&<span style={{background:(cat as any).bg,color:(cat as any).color,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block'}}>{(cat as any).label}</span>}
                        </div>
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'top' as const}}>
                        {ins?<span style={{fontSize:'0.81rem',color:'#374151',lineHeight:1.65}}>{ins.text}</span>:<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}
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
                        ):<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>
                        {rec?(
                          <div style={{display:'inline-flex',flexDirection:'column' as const,alignItems:'center',gap:3,background:'#F0FDF4',border:'1px solid #6EE7B7',borderRadius:10,padding:'8px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <span style={{fontSize:'0.88rem',fontWeight:700,color:'#9CA3AF'}}>{rec.scoreNow}</span>
                              <span style={{color:'#9CA3AF'}}>→</span>
                              <span style={{fontSize:'1.15rem',fontWeight:900,color:'#10B981'}}>{rec.scoreForecast}</span>
                            </div>
                            {delta>0&&<span style={{fontSize:'0.65rem',fontWeight:800,color:'#10B981',background:'#D1FAE5',borderRadius:50,padding:'1px 7px'}}>+{delta} pts</span>}
                          </div>
                        ):<span style={{fontSize:'0.88rem',fontWeight:700,color:'#374151'}}>{ins?.scoreNow??geo}</span>}
                      </td>
                      <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>
                        {rec?<span style={{background:impBg,color:impColor,borderRadius:50,padding:'3px 10px',fontSize:'0.66rem',fontWeight:700}}>{rec.impact}</span>:<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}
        {!loading&&!data&&<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'16px 0'}}>Analysis will appear after the score loads.</div>}
      </div>
    </div>
  );
}

function BusinessImpact({ result, onGo }: { result:any; onGo:()=>void }) {
  const geo=result.overall_geo_score??0,brand=result.brand_name??'Your Brand';
  const nextTier=geo>=80?null:geo>=70?{score:80,label:'Excellent'}:geo>=45?{score:70,label:'Good'}:{score:45,label:'Needs Work'};
  const steps=[{title:'Higher GEO Score',sub:'Stronger AI visibility'},{title:'Stronger AI Visibility',sub:'More surfaces where brand is recommended'},{title:'More Surfaces',sub:'Higher organic traffic'},{title:'Higher Traffic',sub:'More conversions'},{title:'More Conversions',sub:'More revenue'}];
  return (
    <div style={{background:'#F5F0FF',borderRadius:16,border:'1px solid #E9D5FF',padding:'18px 22px',flex:1,display:'flex',flexDirection:'column' as const}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>^</span><span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>What does this score mean for your business?</span></div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:0,marginBottom:12}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'stretch'}}>
            <div style={{background:'white',borderRadius:8,border:'1px solid #E9D5FF',padding:'7px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:'0.78rem',fontWeight:700,color:'#A100FF'}}>{s.title}</span><span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>→ {s.sub}</span></div>
            {i<steps.length-1&&<div style={{display:'flex',justifyContent:'center',padding:'2px 0'}}><span style={{color:'#C4B5FD',fontSize:'0.85rem',lineHeight:1}}>v</span></div>}
          </div>
        ))}
      </div>
      {nextTier&&<div style={{background:'white',borderRadius:10,border:'1px solid #E9D5FF',padding:'10px 14px',fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}><span style={{fontWeight:700,color:'#A100FF'}}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate.</div>}
      <button onClick={onGo} style={{background:'#A100FF',color:'white',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',alignSelf:'flex-start' as const}}>See Competitors</button>
    </div>
  );
}

function MarkdownText({ text }: { text:string }) {
  const lines = text.split('\n');
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={j} style={{fontStyle:'italic',color:'#374151'}}>{p.slice(1,-1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:'monospace',color:'#A100FF'}}>{p.slice(1,-1)}</code>;
      return p;
    });
  };
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={i} style={{height:8}}/>); i++; continue; }
    if (trimmed.startsWith('# ')) { elements.push(<div key={i} style={{fontSize:'1.25rem',fontWeight:900,color:'#111827',marginTop:24,marginBottom:8,borderBottom:'2px solid #F3F4F6',paddingBottom:6}}>{parseInline(trimmed.slice(2))}</div>); i++; continue; }
    if (trimmed.startsWith('## ')) { elements.push(<div key={i} style={{fontSize:'1.08rem',fontWeight:800,color:'#111827',marginTop:20,marginBottom:6}}>{parseInline(trimmed.slice(3))}</div>); i++; continue; }
    if (trimmed.startsWith('### ')) { elements.push(<div key={i} style={{fontSize:'0.97rem',fontWeight:700,color:'#374151',marginTop:16,marginBottom:4}}>{parseInline(trimmed.slice(4))}</div>); i++; continue; }
    if (trimmed === '---') { elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'16px 0'}}/>); i++; continue; }
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        const l = lines[i].trim();
        const num = l.match(/^(\d+)/)![1];
        const content = l.replace(/^\d+[\.\)]\s/, '');
        items.push(<div key={i} style={{marginBottom:5,display:'flex',gap:10,alignItems:'flex-start'}}><span style={{background:'#A100FF',color:'white',borderRadius:'50%',width:22,height:22,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:1}}>{num}</span><span style={{fontSize:'0.92rem',color:'#111827',lineHeight:1.65,flex:1}}>{parseInline(content)}</span></div>);
        i++;
      }
      elements.push(<div key={`nl-${i}`} style={{margin:'8px 0 12px'}}>{items}</div>);
      continue;
    }
    if (/^\s{0,3}[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s{0,3}[-*]\s/.test(lines[i])) {
        const l = lines[i].trim().replace(/^[-*]\s/, '');
        items.push(<div key={i} style={{display:'flex',gap:8,marginBottom:4,alignItems:'flex-start'}}><span style={{color:'#A100FF',flexShrink:0,marginTop:2}}>•</span><span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(l)}</span></div>);
        i++;
      }
      elements.push(<div key={`bl-${i}`} style={{margin:'4px 0 10px',paddingLeft:4}}>{items}</div>);
      continue;
    }
    elements.push(<p key={i} style={{margin:'3px 0',fontSize:'0.93rem',color:'#374151',lineHeight:1.75}}>{parseInline(trimmed)}</p>);
    i++;
  }
  return <div style={{fontFamily:'Inter,sans-serif',color:'#374151'}}>{elements}</div>;
}

// ── RADAR CHART — uses SAME product defs as Sankey ──
function RadarChart({ result }: { result: any }) {
  const [hov,setHov]=useState<number|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);

  const rd = result.responses_detail || [];
  const indKey = result.ind_key || 'gen';
  const lob = result.lob || '';
  const totalRd = rd.length || 1;

  // Use same product defs and same mention computation as Sankey
  const productDefs = getProductDefs(indKey, lob);
  const productMentions = computeProductMentions(productDefs, rd);

  // Sort same way as Sankey (by mentions desc), take top 6
  const sorted = [...productMentions].sort((a,b) => b.mentions - a.mentions).slice(0, 6);

  // Convert to radar dims: val = percentage of responses where product was mentioned
  const dims = sorted.length >= 2
    ? sorted.map(p => ({
        label: p.label,
        val: Math.max(5, Math.min(95, p.pct)),
        color: p.color,
      }))
    : productDefs.slice(0,6).map((p,i) => ({
        label: p.label,
        val: 20 + i * 5,
        color: p.color,
      }));

  const cx=200,cy=200,R=120,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100];
  const poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  const sorted2=[...dims].sort((a,b)=>b.val-a.val);
  const top2=sorted2.slice(0,2).map(d=>d.label),bot2=sorted2.slice(-2).map(d=>d.label);

  return (
    <div style={{position:'relative' as const}}>
      <svg viewBox="0 0 400 420" style={{width:'100%'}}>
        {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return<g key={r}><polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1"/><text x={cx+4} y={cy-(r/100)*R+4} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>{r}</text></g>;})}
        {dims.map((_,i)=>{const p=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;})}
        <polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#A100FF" fillOpacity="0.18" stroke="#A100FF" strokeWidth="2"/>
        {dims.map((d,i)=>{const p=pt(i,(d.val/100)*R);return<circle key={i} cx={p.x} cy={p.y} r={hov===i?7:5} fill="#A100FF" stroke="white" strokeWidth="1.5" style={{cursor:'pointer'}} onMouseEnter={(e)=>{setHov(i);const svgRect=(e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();const circRect=(e.currentTarget as SVGElement).getBoundingClientRect();setTooltipPos({x:circRect.left+circRect.width/2-svgRect.left,y:circRect.top-svgRect.top});}} onMouseLeave={()=>{setHov(null);setTooltipPos(null);}}/>;})}
        {dims.map((d,i)=>{const lp=pt(i,R+26);const isTop=top2.includes(d.label),isBot=bot2.includes(d.label);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:isTop?'#A100FF':isBot?'#EF4444':'#374151',fontWeight:isTop||isBot?700:400,fontFamily:'Inter,sans-serif'}}>{d.label}</text>;})}
        <g transform="translate(20,398)"><circle cx={6} cy={0} r={5} fill="#A100FF" opacity="0.7"/><text x={16} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>You</text></g>
      </svg>
      {hov!==null&&tooltipPos&&<div style={{position:'absolute' as const,left:Math.max(0,tooltipPos.x-82),top:Math.max(0,tooltipPos.y-64),background:'#1F2937',borderRadius:8,padding:'10px 14px',width:165,pointerEvents:'none',zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.25)'}}><div style={{fontSize:11,fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',marginBottom:3}}>{dims[hov].label}: {dims[hov].val}%</div><div style={{fontSize:9,color:'#D1D5DB',fontFamily:'Inter,sans-serif',lineHeight:1.5}}>{getRadarTip(dims[hov].label)}</div></div>}
      <div style={{background:'#F5F0FF',borderRadius:8,border:'1px solid #E9D5FF',padding:'8px 14px',fontSize:'0.78rem',color:'#7500C0',marginTop:4}}>💡 <strong>Feature Insight:</strong> Strongest in <strong>{top2.join(' and ')}</strong>. Weakest in <strong>{bot2.join(' and ')}</strong> — competitors dominate these product queries.</div>
    </div>
  );
}

function SentimentHeatmap({ result }: { result: any }) {
  const [hovCell,setHovCell]=useState<string|null>(null);

  const rd = result.responses_detail || [];
  const indKey = result.ind_key || 'gen';
  const lob = result.lob || '';
  const brand = result.brand_name || '';
  const competitors = result.competitors || [];
  const sent = result.sentiment || 0;
  const prom = result.prominence || 0;
  const vis = result.visibility || 0;
  const cit = result.citation_share || 0;
  const sov = result.share_of_voice || 0;
  const totalRd = rd.length || 1;

  // Use same product defs as Sankey/Radar
  const productDefs = getProductDefs(indKey, lob);
  const productMentions = computeProductMentions(productDefs, rd);
  const sorted = [...productMentions].sort((a,b) => b.mentions - a.mentions).slice(0, 6);
  const labels = sorted.map(p => p.label);

  const seed=(str:string,i:number)=>{let h=0;for(let k=0;k<str.length;k++)h=(h*31+str.charCodeAt(k))>>>0;return((h+i*6271)%40)/100;};

  const myScores = sorted.map(p => Math.max(5, Math.min(95, p.pct)));

  const rows=[
    {name:brand, isYou:true, scores:myScores},
    ...competitors.slice(0,8).map((c:any)=>{
      const cs=c.Sen||Math.round(sent*0.75+seed(c.Brand||'',0)*25);
      const cp=c.Prom||Math.round(prom*0.75+seed(c.Brand||'',1)*25);
      const cv=c.Vis||Math.round(vis*0.75+seed(c.Brand||'',2)*25);
      const cct=c.Cit||Math.round((cit||30)*0.75+seed(c.Brand||'',3)*25);
      const csov=c.Sov||Math.round((sov||40)*0.75+seed(c.Brand||'',4)*25);
      const scaleFactors = [cv/Math.max(vis,1), cs/Math.max(sent,1), cp/Math.max(prom,1), cct/Math.max(cit,1), csov/Math.max(sov,1)];
      const compScores = sorted.map((p, di) => {
        const sf = scaleFactors[di % scaleFactors.length] || 0.75;
        const base = Math.round(p.pct * sf + seed(c.Brand||'', di)*10 - 5);
        return Math.max(5, Math.min(95, base));
      });
      return {name:c.Brand||'', isYou:false, scores:compScores};
    })
  ];

  const shortLabels = labels.map(l => l.length > 9 ? l.slice(0,8)+'.' : l);
  const allScores=rows.flatMap(r=>r.scores),minS=Math.min(...allScores),maxS=Math.max(...allScores,1);
  const cellColor=(val:number)=>{const t=(val-minS)/Math.max(maxS-minS,1);if(t<0.2)return{bg:'#F3F4F6',text:'#9CA3AF'};if(t<0.4)return{bg:'#EDE9FE',text:'#6D28D9'};if(t<0.6)return{bg:'#C4B5FD',text:'#5B21B6'};if(t<0.8)return{bg:'#8B5CF6',text:'white'};return{bg:'#5B21B6',text:'white'};};
  const compRows=rows.slice(1);
  const dimWins=labels.map((lbl,di)=>{const yourScore=rows[0].scores[di],beaten=compRows.filter(r=>yourScore>r.scores[di]).length;return{dim:lbl,score:yourScore,beaten};});
  const strongest=[...dimWins].sort((a,b)=>b.score-a.score)[0],weakest=[...dimWins].sort((a,b)=>a.score-b.score)[0];

  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>Product Feature Strength vs Competitors</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:14}}>Darker = stronger AI association with that product feature. Hover to see score.</div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:`110px repeat(${labels.length},1fr)`,gridTemplateRows:`auto repeat(${rows.length},1fr)`,gap:4}}>
        <div/>{shortLabels.map((lbl,i)=><div key={i} style={{fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,textAlign:'center' as const,paddingBottom:6,lineHeight:1.3}}>{lbl}</div>)}
        {rows.map((r,ri)=>[
          <div key={`l${ri}`} style={{fontSize:'0.73rem',color:r.isYou?'#A100FF':'#374151',fontWeight:r.isYou?700:400,textAlign:'right' as const,paddingRight:8,display:'flex',alignItems:'center',justifyContent:'flex-end',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{r.name}</div>,
          ...r.scores.map((val:number,ci:number)=>{
            const k=`${ri}-${ci}`,{bg,text}=cellColor(val),isH=hovCell===k;
            return <div key={`c${k}`} onMouseEnter={()=>setHovCell(k)} onMouseLeave={()=>setHovCell(null)} style={{borderRadius:5,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:text,cursor:'default',transition:'transform 0.1s',transform:isH?'scale(1.04)':'scale(1)',border:r.isYou?'2px solid #A100FF':'2px solid transparent',boxSizing:'border-box' as const,minHeight:24}}>{isH?val:''}</div>;
          })
        ])}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginTop:12,flexWrap:'wrap' as const}}>
        {[{bg:'#5B21B6',label:'Strong (80+)'},{bg:'#8B5CF6',label:'Good (60-79)'},{bg:'#C4B5FD',label:'Moderate (40-59)'},{bg:'#F3F4F6',label:'Weak (<40)',border:'1px solid #E5E7EB'}].map((l,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:l.bg,border:(l as any).border}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>{l.label}</span></div>)}
        <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:'#C4B5FD',border:'2px solid #A100FF'}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>Your brand</span></div>
      </div>
      {strongest&&weakest&&<div style={{background:'#F5F0FF',borderRadius:8,border:'1px solid #E9D5FF',padding:'8px 14px',fontSize:'0.78rem',color:'#7500C0',marginTop:10}}>💡 <strong>Insight:</strong> Strongest in <strong>{strongest.dim}</strong> ({strongest.score}%) · Weakest in <strong>{weakest.dim}</strong> ({weakest.score}%).</div>}
    </div>
  );
}

function VisibilityBars({ brand, vis, competitors }: { brand:string; vis:number; competitors:any[] }) {
  const all=[{Brand:brand,Vis:vis,isYou:true},...competitors.slice(0,20).map(c=>({Brand:c.Brand,Vis:c.Vis,isYou:false}))].sort((a,b)=>b.Vis-a.Vis);
  const max=Math.max(...all.map(a=>a.Vis),1);
  return <div>{all.map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}><div style={{width:18,fontSize:'0.8rem',color:a.isYou?'#A100FF':'#9CA3AF',fontWeight:a.isYou?700:400}}>{i+1}</div><div style={{width:140,fontSize:'0.84rem',color:'#374151',fontWeight:a.isYou?700:400}}>{a.Brand}{a.isYou&&<span style={{marginLeft:6,fontSize:'0.68rem',background:'#F5F0FF',color:'#A100FF',borderRadius:4,padding:'1px 5px',fontWeight:700}}>You</span>}</div><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:8,overflow:'hidden'}}><div style={{background:a.isYou?'#A100FF':'#D1D5DB',height:8,borderRadius:50,width:`${(a.Vis/max)*100}%`}}/></div><div style={{width:32,fontSize:'0.85rem',fontWeight:700,color:a.isYou?'#A100FF':'#374151',textAlign:'right' as const}}>{a.Vis}</div></div>)}</div>;
}

// ── SCATTER PLOT — standalone, no S-curve overlay ──
function ScatterPlot({ brand, vis, sent, cit, competitors, topCompBrand }: { brand:string; vis:number; sent:number; cit:number; competitors:any[]; topCompBrand:string }) {
  const [hov,setHov]=useState<number|null>(null);
  const top20 = competitors.slice(0,20);
  const raw=[
    {label:brand, x:vis, y:sent, cit:cit, isYou:true, isTopComp:false},
    ...top20.map((c:any)=>({label:c.Brand, x:c.Vis||0, y:c.Sen??0, cit:c.Cit??30, isYou:false, isTopComp:c.Brand===topCompBrand}))
  ];
  const all = raw.map((a,i)=>{
    if(a.isYou || a.isTopComp) return {...a, jx:a.x, jy:a.y};
    const sameZone = raw.slice(0,i).filter(b=>!b.isYou&&!b.isTopComp&&Math.abs(b.x-a.x)<=4);
    return {...a, jx:a.x + sameZone.length*4, jy:a.y};
  });
  const W=960,H=460,padL=56,padR=30,padT=32,padB=56;
  const sx=(v:number)=>padL+(v/100)*(W-padL-padR);
  const sy=(v:number)=>padT+((100-v)/100)*(H-padT-padB);
  const citVals=all.map(a=>a.cit);
  const citMin=Math.min(...citVals),citMax=Math.max(...citVals,1);
  const bR=(c:number)=>Math.round(5+((c-citMin)/Math.max(citMax-citMin,1))*10);
  const placements = all.map((a,i)=>{
    const cx2=sx(a.jx), cy2=sy(a.jy), r=bR(a.cit);
    const zoneBefore = all.slice(0,i).filter(b=>Math.abs(sx(b.jx)-cx2)<24).length;
    const above = i%2===0;
    const offset = above ? -(r+11+zoneBefore*9) : (r+11+zoneBefore*9);
    return {cx2, cy2, r, ly:Math.max(padT+6, Math.min(H-padB-6, cy2+offset)), above};
  });
  return (
    <div style={{background:'#F8FAFC',borderRadius:12,padding:'8px 0 0'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 14px 0'}}>
        <div style={{fontSize:'0.72rem',color:'#6B7280',display:'flex',alignItems:'center',gap:12}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#A100FF"/></svg> You</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/></svg> Top Competitor</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#CBD5E1"/></svg> Others</span>
          <span style={{color:'#9CA3AF',fontSize:'0.68rem'}}>· Bubble size = Citation Score</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {[0,25,50,75,100].map(v=><g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
        <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        {all.map((a,i)=>{
          const {cx2,cy2,r}=placements[i];
          const isH=hov===i;
          const fill=a.isYou?'#A100FF':a.isTopComp?'#EFF6FF':'#CBD5E1';
          const stroke=a.isYou?'#7500C0':a.isTopComp?'#3B82F6':'#9CA3AF';
          return <g key={`b${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            {isH&&<circle cx={cx2} cy={cy2} r={r+5} fill={stroke} opacity="0.12"/>}
            <circle cx={cx2} cy={cy2} r={r} fill={fill} stroke={stroke} strokeWidth={a.isYou?2.5:a.isTopComp?2:1}/>
          </g>;
        })}
        {all.map((a,i)=>{
          const {cx2,cy2,r,ly,above}=placements[i];
          const lc=a.isYou?'#7500C0':a.isTopComp?'#1E40AF':'#6B7280';
          const fs=a.isYou?12:a.isTopComp?11:7;
          const fw=(a.isYou||a.isTopComp)?700:400;
          const leaderY=above?cy2-r:cy2+r;
          return <g key={`l${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            <line x1={cx2} y1={leaderY} x2={cx2} y2={above?ly+3:ly-3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <text x={cx2} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:fs,fill:lc,fontFamily:'Inter,sans-serif',fontWeight:fw,pointerEvents:'none'}}>{a.label}</text>
          </g>;
        })}
        {all.map((a,i)=>{
          const {cx2,cy2,r}=placements[i];
          if(hov!==i) return null;
          const tipW=190,tipH=68;
          const tx=cx2+tipW+10>W-padR ? cx2-tipW-10 : cx2+10;
          const ty=cy2-tipH<padT ? cy2+r+8 : cy2-tipH-8;
          return <g key={`tip${i}`} style={{pointerEvents:'none'}}>
            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
            <text x={tx+12} y={ty+16} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{a.label}{a.isTopComp?' (Top Competitor)':a.isYou?' (You)':''}</text>
            <text x={tx+12} y={ty+32} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Visibility: <tspan fill='#C4B5FD' fontWeight="700">{a.x}</tspan>   Sentiment: <tspan fill='#6EE7B7' fontWeight="700">{a.y}</tspan></text>
            <text x={tx+12} y={ty+48} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Citation Score: <tspan fill='#FCD34D' fontWeight="700">{a.cit}</tspan></text>
          </g>;
        })}
        {[0,10,20,30,40,50,60,70,80,90,100].map(v=><text key={v} x={sx(v)} y={H-padB+16} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>)}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment</text>
      </svg>
    </div>
  );
}

// ── S-CURVE — completely separate component, standalone ──
function SCurveChart({ score, competitors, brand }: { score: number; competitors: any[]; brand: string }) {
  const [hovDot, setHovDot] = useState<string|null>(null);

  const W = 900, H = 420, padL = 60, padR = 40, padT = 48, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const curve = (x: number) => Math.round(5 + 90 / (1 + Math.exp(-0.09 * (x - 45))));
  const pts = Array.from({ length: 101 }, (_, x) => ({ x, y: curve(x) }));
  const sx = (v: number) => padL + (v / 100) * plotW;
  const sy = (v: number) => padT + ((100 - v) / 100) * plotH;
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  const scoreToX = (s: number) => {
    let best = 0, bestDiff = 999;
    pts.forEach(p => { const d = Math.abs(p.y - s); if (d < bestDiff) { bestDiff = d; best = p.x; } });
    return best;
  };

  // Place all brands on the curve
  type BrandDot = { label: string; score: number; x: number; px: number; py: number; isYou: boolean; color: string };
  const dots: BrandDot[] = [];
  // You
  const youX = scoreToX(score);
  dots.push({ label: brand, score, x: youX, px: sx(youX), py: sy(score), isYou: true, color: '#A100FF' });
  // Top competitors (deduplicate by GEO score to avoid clutter)
  const seen = new Set<number>();
  competitors.slice(0, 8).forEach((c: any) => {
    const cGeo = c.GEO || 0;
    if (seen.has(cGeo)) return;
    seen.add(cGeo);
    const cx2 = scoreToX(cGeo);
    dots.push({ label: c.Brand, score: cGeo, x: cx2, px: sx(cx2), py: sy(cGeo), isYou: false, color: '#9CA3AF' });
  });

  // Labels stagger to avoid overlap
  const getLabelOffset = (i: number, dot: BrandDot) => {
    const above = i % 2 === 0;
    return { dy: above ? -22 : 22, anchor: 'middle' as const };
  };

  const stages = [
    { label: 'Fragmented', range: '0-44', x0: 0, x1: 44, color: '#FEE2E2', textColor: '#EF4444' },
    { label: 'Emerging', range: '45-55', x0: 45, x1: 55, color: '#FEF3C7', textColor: '#F59E0B' },
    { label: 'Competitive', range: '56-69', x0: 56, x1: 69, color: '#FFFBEB', textColor: '#D97706' },
    { label: 'Leader', range: '70-79', x0: 70, x1: 79, color: '#DBEAFE', textColor: '#1E88E5' },
    { label: 'Authority', range: '80-100', x0: 80, x1: 100, color: '#D1FAE5', textColor: '#10B981' },
  ];

  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
      <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>GEO Score S-Curve: Where You & Competitors Stand</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>Each dot represents a brand placed on the GEO maturity curve. The S-curve shows how returns accelerate as scores cross the 70 threshold.</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {/* Stage background zones */}
        {stages.map((s, i) => (
          <rect key={i}
            x={sx(s.x0)} y={padT}
            width={sx(s.x1) - sx(s.x0)} height={plotH}
            fill={s.color} opacity="0.35"/>
        ))}

        {/* Grid lines */}
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/>
            <text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}
        {[0,20,40,60,80,100].map(v=>(
          <g key={v}>
            <line x1={sx(v)} y1={padT} x2={sx(v)} y2={padT+plotH} stroke="#E5E7EB" strokeWidth="0.5"/>
            <text x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>

        {/* Goal line at 70 */}
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#1E88E5" strokeWidth="1.5" strokeDasharray="6,4"/>
        <text x={W-padR+4} y={sy(70)} dominantBaseline="middle" style={{fontSize:8,fill:'#1E88E5',fontFamily:'Inter,sans-serif',fontWeight:700}}>70</text>

        {/* The curve */}
        <path d={pathD} fill="none" stroke="#A100FF" strokeWidth="3" strokeLinecap="round"/>

        {/* Stage labels at bottom */}
        {stages.map((s, i) => {
          const midX = sx((s.x0 + s.x1) / 2);
          return (
            <g key={i}>
              <text x={midX} y={padT+plotH+30} textAnchor="middle" style={{fontSize:8,fontWeight:700,fill:s.textColor,fontFamily:'Inter,sans-serif'}}>{s.label}</text>
              <text x={midX} y={padT+plotH+42} textAnchor="middle" style={{fontSize:7,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{s.range}</text>
            </g>
          );
        })}

        {/* Brand dots — rendered LAST so tooltips always on top */}
        {dots.map((d, i) => (
          <g key={i} onMouseEnter={()=>setHovDot(d.label)} onMouseLeave={()=>setHovDot(null)} style={{cursor:'pointer'}}>
            {hovDot===d.label && <circle cx={d.px} cy={d.py} r={d.isYou?16:12} fill={d.color} opacity="0.15"/>}
            <circle cx={d.px} cy={d.py} r={d.isYou?10:7} fill={d.color} stroke="white" strokeWidth={d.isYou?3:2}/>
            {d.isYou && <text x={d.px} y={d.py} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7,fontWeight:900,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>▲</text>}
          </g>
        ))}

        {/* Labels after dots */}
        {dots.map((d, i) => {
          const off = getLabelOffset(i, d);
          return (
            <text key={`lbl${i}`} x={d.px} y={d.py + off.dy} textAnchor={off.anchor}
              style={{fontSize:d.isYou?11:9,fontWeight:d.isYou?800:500,fill:d.isYou?'#A100FF':'#374151',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>
              {d.label} ({d.score})
            </text>
          );
        })}

        {/* Tooltips — rendered absolutely last */}
        {dots.map((d, i) => {
          if (hovDot !== d.label) return null;
          const tipW = 180, tipH = 54;
          const tx = d.px + tipW + 12 > W - padR ? d.px - tipW - 12 : d.px + 12;
          const ty = d.py - tipH < padT ? d.py + 12 : d.py - tipH - 8;
          const stageLabel = stages.find(s => d.score >= s.x0 && d.score <= s.x1)?.label || '';
          return (
            <g key={`tooltip${i}`} style={{pointerEvents:'none'}}>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
              <text x={tx+10} y={ty+16} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{d.label}</text>
              <text x={tx+10} y={ty+32} style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>GEO Score: <tspan fill='#A100FF' fontWeight="700">{d.score}</tspan></text>
              <text x={tx+10} y={ty+46} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>Stage: {stageLabel}</text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Maturity Index</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
      </svg>
    </div>
  );
}

function PriorityActionsTable({ result, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: { result:any; cachedActions:any[]|null; setCachedActions:(a:any[])=>void; actionsLoading:boolean; setActionsLoading:(b:boolean)=>void }) {
  const actions = cachedActions || [];
  const loading = actionsLoading;
  useEffect(()=>{
    if(cachedActions!==null)return;
    setActionsLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.
Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Competitors: ${(result.competitors||[]).map((c:any)=>c.Brand).join(', ')}
IMPORTANT: Do NOT suggest comparison pages against competitors.
Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Owned Content Optimization"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}
Order: High first, then Medium, then Low.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const raw2=data.response||'';let cl2=raw2.replace(/```json|```/g,'').trim();setCachedActions(JSON.parse(cl2));}).catch(()=>setCachedActions([])).finally(()=>setActionsLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>!</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><div style={{width:16,height:16,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'12px 0'}}>Generating recommendations...</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a,i)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#A100FF'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#A100FF'}}>{a.deliverable}</span></td></tr>;})}
        </tbody>
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
  const [promptCount,setPromptCount]=useState(100);
  const [activeCitCat,setActiveCitCat]=useState<string|null>(null);
  const [promptCountErr,setPromptCountErr]=useState('');
  const [highlightedBubble,setHighlightedBubble]=useState<string|null>(null);
  // Visibility tab: toggle between scatter and S-curve
  const [visView, setVisView] = useState<'scatter'|'scurve'>('scatter');

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);

  async function runAnalysis(){
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);setLoadingStep(0);setLoadingProgress(0);
    const steps = [
      {step:0,progress:5,delay:200},{step:1,progress:12,delay:1500},{step:2,progress:25,delay:3500},
      {step:3,progress:40,delay:5500},{step:4,progress:55,delay:7500},{step:5,progress:68,delay:9500},
      {step:6,progress:78,delay:11500},{step:7,progress:88,delay:13500},{step:8,progress:95,delay:15500},
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({step,progress,delay})=>{timers.push(setTimeout(()=>{setLoadingStep(step);setLoadingProgress(progress);},delay));});
    try{
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,promptCount})});
      const data=await res.json();
      timers.forEach(t=>clearTimeout(t));
      setLoadingProgress(100);
      await new Promise(r=>setTimeout(r,400));
      if(data.error)setError(data.error);
      else{setResult(data);setCachedActions(null);setActionsLoading(false);setQueryPage(1);setSelectedCluster(null);setFilterCat('All');setActiveTab(0);try{sessionStorage.setItem('geo_result',JSON.stringify(data));sessionStorage.setItem('geo_url',url);}catch{}}
    }catch(e:any){timers.forEach(t=>clearTimeout(t));setError(e.message);}
    setLoading(false);
  }

  async function runPrompt(q?:string){
    const query=q||promptInput;if(!query.trim())return;setPromptLoading(true);if(!q)setPromptInput('');
    try{
      const res=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:query,system:result?`You are a knowledgeable consumer advisor. The user is researching ${result.brand_name} in the ${result.ind_label} industry. Answer accurately and naturally.`:undefined})});
      const data=await res.json();
      setPromptHistory(h=>[{q:query,a:data.response},...h]);
    }catch{}
    setPromptLoading(false);
  }

  const examplePrompts=result?.ind_key==='fin'?['Compare invite-only credit cards for high net worth individuals','What is the best credit card for someone who travels internationally?','Which bank offers the best rewards for small business owners?','Best first credit card for someone with no credit history','Compare Chase Sapphire Reserve vs Capital One Venture X for travel']:result?.ind_key==='auto'?['Best electric vehicle for long road trips','Most reliable SUV for families','Compare Tesla Model 3 vs BMW i4','Best car for first-time buyers under $30,000','Which car brand has the best safety record?']:['What are the most trusted brands right now?','Best companies for customer service','Compare top brands for value and quality','Which companies are leading in innovation?','Best brands recommended by experts'];

  return (
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      <div style={{background:'linear-gradient(135deg,#460073 0%,#7500C0 50%,#A100FF 100%)',padding:(loading||result)?'16px 40px':'64px 40px 72px',textAlign:'center',transition:'padding 0.3s ease'}}>
        {!(loading||result)&&<>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 24px',fontSize:'0.82rem',fontWeight:600,color:'white',marginBottom:32,background:'rgba(255,255,255,0.15)'}}>* &nbsp;Real Time GEO Scoring</div>
          <h1 style={{fontSize:'3.6rem',fontWeight:900,color:'white',margin:'0 0 16px',letterSpacing:'-1.5px',lineHeight:1.1}}>GEO Scorecard</h1>
          <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.9)',margin:'0 0 20px'}}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:50,padding:'8px 22px',fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.12)'}}>Live data · Updated in real-time · Not cached like competitors</div>
        </>}
        {(loading||result)&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'1.3rem',fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>GEO Scorecard</span>
            <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',borderRadius:50,padding:'3px 10px'}}>Real Time GEO Scoring</span>
          </div>
        </div>}
      </div>

      {!result?(
        <div style={{padding:loading?'16px 40px':'48px 40px 60px'}}>
          {!loading&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
            {bands.map((b,i)=><div key={i} style={{background:b.bg,borderRadius:20,padding:'36px 28px',textAlign:'center' as const,border:`1.5px solid ${b.border}`}}><div style={{fontSize:'0.85rem',fontWeight:700,color:b.color,marginBottom:8}}>{b.range}</div><div style={{fontSize:'1.8rem',fontWeight:900,color:b.color,marginBottom:8}}>{b.label}</div><div style={{fontSize:'0.85rem',color:b.color,lineHeight:1.5}}>{b.desc}</div></div>)}
          </div>}
          <div style={{background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'28px 32px'}}>
            <div style={{marginBottom:18}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#EF4444'}}/>
                <span style={{fontSize:'0.8rem',fontWeight:700,color:'#111827'}}>Select number of AI prompts to run</span>
                <span style={{fontSize:'0.72rem',color:'#EF4444',fontWeight:600,background:'#FEE2E2',borderRadius:4,padding:'1px 7px'}}>Required</span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'flex-end',flexWrap:'wrap' as const}}>
                {[50,100,300,500,1000].map(n=>(
                  <button key={n} onClick={()=>{setPromptCount(n);setPromptCountErr('');}}
                    style={{background:promptCount===n?'#A100FF':'white',color:promptCount===n?'white':'#374151',border:promptCount===n?'2px solid #A100FF':'2px solid #D1D5DB',borderRadius:7,padding:'5px 12px',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1,minWidth:52}}>
                    <span style={{fontSize:'0.82rem',fontWeight:900}}>{n}</span>
                    <span style={{fontSize:'0.56rem',fontWeight:500,opacity:0.72}}>{n===50?'Quick':n===100?'Standard':n===300?'Deep':n===500?'Thorough':'Extended'}</span>
                  </button>
                ))}
                <div style={{display:'flex',flexDirection:'column' as const,gap:2,minWidth:100}}>
                  <label style={{fontSize:'0.58rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>Custom (max 10,000)</label>
                  <input type="number" placeholder="e.g. 200"
                    value={promptCount && ![50,100,300,500,1000].includes(promptCount) ? promptCount : ''}
                    onChange={e=>{const raw=e.target.value;const v=parseInt(raw);if(raw===''){setPromptCountErr('');return;}if(isNaN(v))return;if(v>10000){setPromptCountErr('Max is 10,000');setPromptCount(Math.min(v,10000));}else{setPromptCount(v);setPromptCountErr('');}}}
                    style={{border:`1.5px solid ${promptCountErr?'#EF4444':'#D1D5DB'}`,borderRadius:7,padding:'5px 10px',fontSize:'0.78rem',fontWeight:700,color:'#374151',outline:'none',background:'white',width:'100%'}}/>
                  {promptCountErr?<div style={{fontSize:'0.58rem',color:'#EF4444',fontWeight:600}}>{promptCountErr}</div>:<div style={{fontSize:'0.58rem',color:'#9CA3AF'}}>More prompts = longer run time</div>}
                </div>
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><div style={{width:7,height:7,borderRadius:'50%',background:'#A100FF'}}/><span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'.14em',color:'#9CA3AF',textTransform:'uppercase' as const}}>Brand URL</span></div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{flex:1,display:'flex',alignItems:'center',border:'1.5px solid #E5E7EB',borderRadius:12,background:'white',overflow:'hidden',height:52}}>
                <span style={{padding:'0 0 0 20px',fontSize:'0.95rem',color:'#9CA3AF',flexShrink:0,fontWeight:500}}>https://www.</span>
                <input type="text" value={url.replace(/^https?:\/\/(www\.)?/,'')} onChange={e=>{const v=e.target.value.replace(/^https?:\/\/(www\.)?/,'').replace(/^www\./,'');setUrl('https://www.'+v);}} onKeyDown={e=>e.key==='Enter'&&runAnalysis()} placeholder="capitalone.com" style={{flex:1,border:'none',padding:'14px 12px 14px 4px',fontSize:'0.95rem',background:'transparent',outline:'none',color:'#374151'}}/>
              </div>
              <button onClick={runAnalysis} disabled={loading} style={{background:'#A100FF',color:'white',border:'none',borderRadius:50,fontWeight:700,fontSize:'0.95rem',height:52,padding:'0 28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(161,0,255,0.4)',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>🔍 {loading?'Analysing...':'Run Live AI Analysis'}</button>
            </div>
            {error&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginTop:10}}>{error}</div>}
          </div>

          {loading&&(()=>{
            const brandName = url.replace('https://www.','').replace('http://www.','').replace('https://','').replace('http://','').split('/')[0].split('.')[0];
            const displayName = brandName.charAt(0).toUpperCase()+brandName.slice(1);
            const steps = [
              {icon:'🌐',label:'Fetching brand page',detail:'Reading website content and metadata'},
              {icon:'🤖',label:'Launching AI queries',detail:'Firing all query batches simultaneously'},
              {icon:'💳',label:'Running consumer queries',detail:'Broad brand awareness questions'},
              {icon:'💰',label:'Running category-specific queries',detail:'Product-specific purchase intent questions'},
              {icon:'🔍',label:'Detecting brand mentions',detail:`Scanning all AI responses for ${displayName} references`},
              {icon:'📊',label:'Scoring sentiment & prominence',detail:'Analysing tone and position in each response'},
              {icon:'🏆',label:'Benchmarking competitors',detail:'Scoring top competitors across all signals'},
              {icon:'🔗',label:'Building citation network',detail:'Mapping sources and share of voice'},
              {icon:'#',label:'Calculating GEO Score',detail:'Applying weighted formula across all signals'},
            ];
            const currentStep = steps[Math.min(loadingStep, steps.length-1)];
            const completedSteps = steps.slice(0, loadingStep);
            return (
              <div style={{marginTop:32,background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'36px 40px',overflow:'hidden'}}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#A100FF,#7500C0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>🔍</div>
                  <div>
                    <div style={{fontSize:'1.2rem',fontWeight:800,color:'#111827'}}>Analysing {displayName}</div>
                    <div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{url}</div>
                  </div>
                  <div style={{marginLeft:'auto',textAlign:'right' as const}}>
                    <div style={{fontSize:'2rem',fontWeight:900,color:'#A100FF',lineHeight:1}}>{loadingProgress}%</div>
                    <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>complete</div>
                  </div>
                </div>
                <div style={{background:'#F3F4F6',borderRadius:50,height:8,marginBottom:28,overflow:'hidden'}}>
                  <div style={{background:'linear-gradient(90deg,#A100FF,#7500C0)',height:8,borderRadius:50,width:`${loadingProgress}%`,transition:'width 0.8s ease',position:'relative' as const}}>
                    <div style={{position:'absolute' as const,right:0,top:0,width:20,height:8,background:'rgba(255,255,255,0.4)',borderRadius:50,animation:'pulse 1s infinite'}}/>
                  </div>
                </div>
                <div style={{background:'#F5F0FF',borderRadius:12,border:'1px solid #E9D5FF',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12,animation:'slideIn 0.3s ease'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0,boxShadow:'0 2px 8px rgba(161,0,255,0.15)'}}>{currentStep.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#A100FF'}}>{currentStep.label}</div>
                    <div style={{fontSize:'0.76rem',color:'#9CA3AF',marginTop:2}}>{currentStep.detail}</div>
                  </div>
                  <div style={{width:20,height:20,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:24}}>
                  {completedSteps.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,opacity:0.7}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0}}>✓</div>
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
            {TABS.map((t,i)=><button key={i} onClick={()=>setActiveTab(i)} style={{background:'none',border:'none',borderBottom:activeTab===i?'2px solid #A100FF':'2px solid transparent',color:activeTab===i?'#A100FF':'#6B7280',fontWeight:activeTab===i?700:500,fontSize:'0.85rem',padding:'12px 20px',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' as const}}>{t}</button>)}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <button onClick={()=>{setResult(null);setUrl('');try{sessionStorage.clear();}catch{}}} style={{background:'#A100FF',border:'none',borderRadius:8,color:'white',fontSize:'0.78rem',fontWeight:600,padding:'6px 16px',cursor:'pointer'}}>New Analysis</button>
            </div>
          </div>

          <div style={{padding:'28px 40px 60px'}}>

            {(()=>{
              if(result.ind_key==='fin'){
                const CFT:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,rank:'N/A'},'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,rank:'N/A'},'PenFed':{geo:14,vis:8,cit:12,sent:36,sov:5,rank:'N/A'},'TD Bank':{geo:20,vis:12,cit:16,sent:38,sov:8,rank:'N/A'},'US Bank':{geo:22,vis:14,cit:18,sent:40,sov:10,rank:'N/A'},'Regions Bank':{geo:13,vis:7,cit:10,sent:34,sov:5,rank:'N/A'},'Citizens Bank':{geo:14,vis:8,cit:11,sent:35,sov:5,rank:'N/A'},'Truist':{geo:16,vis:10,cit:13,sent:36,sov:6,rank:'N/A'},'Fifth Third':{geo:13,vis:7,cit:10,sent:34,sov:4,rank:'N/A'},'KeyBank':{geo:11,vis:6,cit:9,sent:32,sov:4,rank:'N/A'},'Huntington':{geo:12,vis:6,cit:9,sent:33,sov:4,rank:'N/A'}};
                const t=CFT[result.brand_name];
                if(t){result.overall_geo_score=t.geo;result.visibility=t.vis;result.citation_share=t.cit;result.sentiment=t.sent;result.share_of_voice=t.sov;result.avg_rank=t.rank;}
              }
              return null;
            })()}

            {(()=>{
              const comps = result.competitors || [];
              const sorted = [...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
              result._topCompBrand = sorted.length > 0 ? sorted[0].Brand : '';
              return null;
            })()}

            {/* ── TAB 0: GEO Score ── */}
            {activeTab===0&&(()=>{
              const geo = result.overall_geo_score;
              const vis = result.visibility;
              const cit = result.citation_share;
              const rawSent = result.sentiment;
              const prom = result.prominence;
              const sov = result.share_of_voice;
              const avgRank = result.avg_rank;
              const badge = scoreBadge(geo);
              const industryLabel = result.ind_label || result.industry || 'Financial Services';
              const summaryText = `GEO Score of ${geo} reflects ${vis}% Visibility but is held back by Prominence (${prom}), Sentiment (${rawSent}), Share of Voice (${sov}), and Citation (${cit}).`;
              return (
                <div>
                  {/* Top: Gauge + Brand Info */}
                  <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:20,marginBottom:16}}>
                    <GeoGauge score={geo}/>
                    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:5}}>
                        <div style={{fontSize:'1.4rem',fontWeight:800,color:'#111827'}}>{result.brand_name}</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                          {result.lob&&<span style={{fontSize:'0.72rem',fontWeight:600,color:'#A100FF',background:'#F5F0FF',borderRadius:50,padding:'2px 10px'}}>{result.lob}</span>}
                          <span style={{fontSize:'0.72rem',fontWeight:600,color:'#374151',background:'#F3F4F6',borderRadius:50,padding:'2px 10px'}}>{industryLabel}</span>
                        </div>
                      </div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{color:'#A100FF',fontSize:'0.84rem'}}>{(result.page_url||'').slice(0,60)}{(result.page_url||'').length>60?'...':''}</a>
                      <div style={{margin:'12px 0 5px',fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Status</div>
                      <span style={{background:badge.bg,color:badge.color,padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700}}>{badge.label}</span>
                      <div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.8,borderTop:'1px solid #F3F4F6',paddingTop:12,marginTop:12}}>{summaryText}</div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:16}}>
                    <MetricCard label="visibility score" val={vis}/>
                    <MetricCard label="sentiment score" val={rawSent}/>
                    <MetricCard label="citation score" val={cit}/>
                    <MetricCard label="prominence score" val={prom}/>
                    <MetricCard label="share of voice" val={sov}/>
                    <MetricCard label="avg rank" val={`#${String(avgRank).replace('#','')}`}/>
                  </div>

                  {/* Sankey */}
                  <SankeyFlowChart result={result}/>
                </div>
              );
            })()}

            {/* ── TAB 1: Competitors ── */}
            {activeTab===1&&(()=>{
              const CLIENT_FIN_TIERS:Record<string,any> = {
                'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,prom:74,rank:'#1'},
                'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,prom:66,rank:'#2'},
                'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,prom:52,rank:'#3'},
                'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,prom:44,rank:'#4'},
                'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,prom:40,rank:'N/A'},
                'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,prom:32,rank:'N/A'},
                'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,prom:26,rank:'N/A'},
                'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,prom:20,rank:'N/A'},
                'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,prom:16,rank:'N/A'},
                'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,prom:14,rank:'N/A'},
                'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,prom:18,rank:'N/A'},
                'PenFed':{geo:14,vis:8,cit:12,sent:36,sov:5,prom:11,rank:'N/A'},
                'TD Bank':{geo:20,vis:12,cit:16,sent:38,sov:8,prom:15,rank:'N/A'},
                'US Bank':{geo:22,vis:14,cit:18,sent:40,sov:10,prom:17,rank:'N/A'},
                'Regions Bank':{geo:13,vis:7,cit:10,sent:34,sov:5,prom:10,rank:'N/A'},
                'Citizens Bank':{geo:14,vis:8,cit:11,sent:35,sov:5,prom:11,rank:'N/A'},
                'Truist':{geo:16,vis:10,cit:13,sent:36,sov:6,prom:13,rank:'N/A'},
                'Fifth Third':{geo:13,vis:7,cit:10,sent:34,sov:4,prom:10,rank:'N/A'},
                'KeyBank':{geo:11,vis:6,cit:9,sent:32,sov:4,prom:9,rank:'N/A'},
                'Huntington':{geo:12,vis:6,cit:9,sent:33,sov:4,prom:9,rank:'N/A'},
              };
              const _ct = result.ind_key==='fin' ? (CLIENT_FIN_TIERS[result.brand_name]||null) : null;
              const geo=_ct?_ct.geo:result.overall_geo_score;
              const vis=_ct?_ct.vis:result.visibility;
              const cit=_ct?_ct.cit:result.citation_share;
              const sent=_ct?_ct.sent:result.sentiment;
              const sov=_ct?_ct.sov:result.share_of_voice;
              const prom=_ct?_ct.prom:(result.prominence||0);
              const avgRank=_ct?_ct.rank:result.avg_rank;

              const top=[
                {Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Prom:prom,Rank:avgRank,isYou:true},
                ...(result.competitors||[]).slice(0,9).map((c:any)=>({...c,Prom:c.Prom||Math.round((c.Vis||0)*0.85),isYou:false}))
              ].sort((a,b)=>b.GEO-a.GEO);

              const resolvedRank=(c:any)=>{
                const pos=top.findIndex(t=>t.Brand===c.Brand||(t.isYou&&c.isYou));
                if(pos<0)return '--';
                const rank=pos+1;
                if(rank>5)return '--';
                return `#${rank}`;
              };
              const myRank=top.findIndex(c=>c.isYou)+1,leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;

              const bW=Math.max(700,top.length*80),bH=160,bPad=40,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
              // Distinct metric colors: vivid for you, distinct muted tones for others
              const allMetrics = [
                {key:'Vis',label:'Visibility',color:'#A100FF'},
                {key:'Cit',label:'Citations',color:'#0EA5E9'},
                {key:'Sen',label:'Sentiment',color:'#10B981'},
                {key:'Sov',label:'Share of Voice',color:'#F59E0B'},
                {key:'Prom',label:'Prominence',color:'#EF4444'},
              ];

              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:2}}>{result.domain} vs Competitors {result.ind_label}</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Real-time GEO scores across AI visibility signals</div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#F5F0FF',borderRadius:14,border:'1px solid #E9D5FF',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#A100FF',fontWeight:600,marginBottom:4}}>Your GEO Score</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#A100FF'}}>{geo}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{background:'#FFFBEB',borderRadius:14,border:'1px solid #FCD34D',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'--':`${gapToTop} pts`}</div><div style={{fontSize:'0.75rem',color:'#92400E'}}>{myRank===1?'You are the leader':Math.abs(gapToTop)<=5?'Close, strong opportunity':'Gap to close'}</div></div>
                    <div style={{background:'#ECFDF5',borderRadius:14,border:'1px solid #6EE7B7',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1} (${next.Brand})`:'Top Ranked'}</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'--'}</div><div style={{fontSize:'0.75rem',color:'#065F46'}}>{leadOver!=null?(leadOver<10?'Close, defend position':'Comfortable lead'):'Leading the category'}</div></div>
                  </div>

                  {/* Bar + line chart — less colorful */}
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score & Signal Breakdown</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:10}}>Grouped bars show sub-metrics per brand. Black line traces GEO Score.</div>
                    <div style={{overflowX:'auto' as const}}>
                      <svg viewBox={`0 0 ${bW} ${bH+60}`} style={{width:'100%',minWidth:top.length*80,display:'block'}} onMouseLeave={()=>setHovBar(null)}>
                        {[0,25,50,75,100].map(v=><g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
                        {top.map((c:any,i:number)=>{
                          const bx=bPad+i*gW;
                          const isY=c.isYou,isH=hovBar===i;
                          const subW = (gW*0.8)/allMetrics.length;
                          return (<g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}>
                            {allMetrics.map((m,mi)=>{
                              const val=(c as any)[m.key]||0;
                              const mh=((val)/100)*bMH;
                              const mx=bx+gW*0.1+mi*subW;
                              // You = vivid metric color, others = lighter muted version of same color
                              const otherColors = ['#E9D5FF','#BAE6FD','#A7F3D0','#FDE68A','#FECACA'];
                              const barColor = isY ? m.color : otherColors[mi] || '#E5E7EB';
                              return <rect key={mi} x={mx} y={bH-mh} width={subW-1} height={mh} fill={barColor} rx={1} opacity={isY?1:0.85}/>;
                            })}
                            <text x={bx+gW/2} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#A100FF':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>
                          </g>);
                        })}
                        {/* GEO Score line */}
                        {(()=>{
                          const pts2 = top.map((c:any,i:number)=>({x:bPad+i*gW+gW/2,y:bH-((c.GEO||0)/100)*bMH,geo:c.GEO||0,brand:c.Brand,isYou:c.isYou}));
                          const pathD2 = pts2.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                          return <>
                            <path d={pathD2} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            {pts2.map((p,i)=>(
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r={p.isYou?7:5} fill={p.isYou?'#A100FF':'#374151'} stroke="white" strokeWidth="1.5"/>
                                <text x={p.x} y={p.y-10} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{p.geo}</text>
                              </g>
                            ))}
                          </>;
                        })()}
                        {/* Legend */}
                        <g transform={`translate(${bPad},${bH+32})`}>
                          <circle cx={6} cy={0} r={4} fill="#111827" stroke="white" strokeWidth="1"/>
                          <line x1={1} y1={0} x2={11} y2={0} stroke="#111827" strokeWidth="2"/>
                          <text x={18} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO Score (line)</text>
                          {allMetrics.map((m,i)=>(
                            <g key={i} transform={`translate(${110+i*90},0)`}>
                              <rect x={0} y={-5} width={10} height={10} fill={m.color} rx={2}/>
                              <text x={14} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{m.label}</text>
                            </g>
                          ))}
                        </g>
                        {/* Tooltip */}
                        {hovBar!==null&&(()=>{
                          const c=top[hovBar];
                          const bx=bPad+hovBar*gW;
                          const tipW=160,tipH=allMetrics.length*14+28;
                          const tx=bx+gW/2+tipW+8>bW-bPad?bx-tipW-4:bx+gW/2+4;
                          const ty=Math.max(0,bH-tipH-20);
                          return <g style={{pointerEvents:'none'}}>
                            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.45))"/>
                            <text x={tx+10} y={ty+14} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text>
                            <text x={tx+10} y={ty+26} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO}</text>
                            {allMetrics.map((m,mi)=>(
                              <text key={mi} x={tx+10} y={ty+40+mi*13} style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>{m.label}: {(c as any)[m.key]||0}</text>
                            ))}
                          </g>;
                        })()}
                      </svg>
                    </div>
                  </div>

                  {/* Competitor table — FIX: purple highlight only on "You" row */}
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','BRAND / URL','GEO SCORE','GAP','VISIBILITY','CITATIONS','SENTIMENT','SOV','PROMINENCE','AVG. RANK'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c:any,i:number)=>{
                        const gcol=c.isYou?'#A100FF':'#374151';
                        const gap2=c.isYou?null:c.GEO-geo;
                        // FIX: only highlight "You" row with purple left border, not all rows
                        return <tr key={i} style={{
                          background: c.isYou ? '#F5F0FF' : 'white',
                          borderTop:'1px solid #F3F4F6',
                          borderLeft: c.isYou ? '3px solid #A100FF' : 'none'
                        }}>
                          <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                          <td style={{padding:'11px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>
                              {c.isYou&&<span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}
                            </div>
                            <div style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{c.URL}</div>
                          </td>
                          <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:gcol}}>{c.GEO}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:gap2===null?'#9CA3AF':gap2>0?'#EF4444':'#10B981'}}>{gap2===null?'--':`${gap2>0?'-':'+'}${Math.abs(gap2)} pts`}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Vis}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Cit}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sen}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sov}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Prom}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:'#A100FF'}}>{resolvedRank(c)}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 2: Visibility ── */}
            {activeTab===2&&(()=>{
              const geo=result.overall_geo_score;
              const vis=result.visibility,comps=result.competitors||[],allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
              const topComp=comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
              const gapToTop=vis-(topComp?topComp.Vis:vis);
              const avgVis=Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
              const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#A100FF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Visibility</div><div style={{fontSize:'2rem',fontWeight:800,color:'#A100FF'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands · avg {avgVis}</div></div>
                    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div><div style={{fontSize:'2rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div></div>
                  </div>

                  {/* Toggle between scatter and S-curve */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                    <button onClick={()=>setVisView('scatter')} style={{background:visView==='scatter'?'#A100FF':'white',color:visView==='scatter'?'white':'#374151',border:'1.5px solid '+(visView==='scatter'?'#A100FF':'#E5E7EB'),borderRadius:8,padding:'7px 18px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>Scatter Plot</button>
                    <button onClick={()=>setVisView('scurve')} style={{background:visView==='scurve'?'#A100FF':'white',color:visView==='scurve'?'white':'#374151',border:'1.5px solid '+(visView==='scurve'?'#A100FF':'#E5E7EB'),borderRadius:8,padding:'7px 18px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>S-Curve</button>
                    <span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>Switch between views to analyze your competitive position</span>
                  </div>

                  {visView==='scatter'&&(
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sentiment Score vs. Visibility Market Positioning</div>
                      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Each dot = one brand positioned by Visibility vs Sentiment. Bubble size reflects Citation Score.</div>
                      <ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={result.competitors||[]} topCompBrand={topCompBrand}/>
                    </div>
                  )}

                  {visView==='scurve'&&(
                    <SCurveChart score={geo} competitors={result.competitors||[]} brand={result.brand_name}/>
                  )}
                </div>
              );
            })()}

            {/* ── TAB 3: Sentiment ── */}
            {activeTab===3&&(()=>{
              const rawSent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank,vis=result.visibility;
              const cit=result.citation_share,sov=result.share_of_voice;
              const smood=rawSent>=70?'AI speaks favorably about your brand':rawSent>=45?'AI tone is neutral':'AI tone is negative or missing';
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
                        <div style={{fontSize:'1.8rem',fontWeight:800,color:'#A100FF',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* CHANGED: Radar now uses product defs, no longer Sankey in here */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20,alignItems:'stretch'}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:4}}>Product Feature Positioning</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:4}}>Same product categories as the Sankey diagram. Hover each point for detail.</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
                        <RadarChart result={result}/>
                      </div>
                    </div>
                    <SentimentHeatmap result={result}/>
                  </div>
                  {/* Strengths and concerns REMOVED per request */}
                </div>
              );
            })()}

            {/* ── TAB 4: Citations ── */}
            {activeTab===4&&(()=>{
              const cit=result.citation_share,sov=result.share_of_voice,sources=result.citation_sources||[];
              const brandKey3 = (result.domain||'').replace('www.','').split('.')[0].toLowerCase();
              const domainMatchesBrand = (domain: string) => {
                const dk = domain.replace('www.','').split('.')[0].toLowerCase();
                return dk === brandKey3 || dk.startsWith(brandKey3) || brandKey3.startsWith(dk.replace(/[^a-z]/g, ''));
              };
              const catMap:Record<string,number>={};
              const allSourcesToClassify = sources.length > 0 ? sources : (() => {
                const knownSources = [
                  {domain:'nerdwallet.com',share:4.9},{domain:'bankrate.com',share:3.8},{domain:'thepointsguy.com',share:3.2},
                  {domain:'forbes.com',share:2.9},{domain:'creditkarma.com',share:2.7},{domain:'reddit.com',share:2.4},
                  {domain:'wikipedia.org',share:2.2},{domain:'consumerfinance.gov',share:2.1},{domain:'cnbc.com',share:1.9},{domain:'investopedia.com',share:1.7},
                ];
                return knownSources.map(s => ({ domain: s.domain, citation_share: s.share }));
              })();
              const brandDomain = result.domain || '';
              allSourcesToClassify.forEach((s:any) => {
                const d = (s.domain||'').toLowerCase();
                const isOwned = brandDomain && d.includes(brandDomain.replace('www.','').split('.')[0].toLowerCase());
                const cat = isOwned ? 'Owned Media' : classifyDomain(d).label;
                catMap[cat] = (catMap[cat]||0) + (s.citation_share||0);
              });
              Object.keys(catMap).forEach(k=>{
                catMap[k] = k==='Owned Media' ? Math.min(Math.round(catMap[k]), 15) : Math.min(Math.round(catMap[k]), 50);
              });
              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#A100FF','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
              const buildDisplaySources = () => {
                const base = sources.length > 0 ? sources : allSourcesToClassify.map((s:any,i:number)=>({rank:i+1,domain:s.domain,citation_share:s.citation_share,category:classifyDomain(s.domain).label}));
                const merged:any[]=[];const seen=new Set<string>();
                base.forEach((s:any)=>{if(!seen.has(s.domain)){seen.add(s.domain);merged.push({...s});}});
                const hasBrandDomain=merged.some((s:any)=>domainMatchesBrand(s.domain||''));
                let r2=hasBrandDomain?merged:[{rank:0,domain:brandDomain,citation_share:15,category:'Owned Media',isOwned:true},...merged];
                r2=r2.map((s:any)=>({...s,citation_share:domainMatchesBrand(s.domain||'')?Math.min(s.citation_share,15):Math.min(s.citation_share,5)}));
                return r2.map((s:any,i:number)=>({...s,rank:i+1,isOwned:domainMatchesBrand(s.domain||'')}));
              };
              const displaySources = buildDisplaySources();
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    {[
                      {label:'Citation Score',val:cit,tip:'How often and prominently AI models cite your brand.',desc:'Measures how authoritatively AI references your brand across queries. Higher scores mean AI treats your brand as a trusted source.'},
                      {label:'Share of Voice',val:sov,tip:'Your share of all brand mentions in AI responses.',desc:'Your brand mentions as a percentage of all brand mentions across AI responses. Reflects how much of the AI conversation you own vs. competitors.'}
                    ].map(({label,val,tip,desc})=>(
                      <div key={label} style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}>
                        <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>{label}<Tooltip text={tip}/></div>
                        <div style={{fontSize:'2.4rem',fontWeight:900,color:'#A100FF',lineHeight:1,marginBottom:6}}>{val}</div>
                        <div style={{fontSize:'0.75rem',color:'#6B7280',lineHeight:1.6,marginTop:8}}>{desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                      {catEntries.length>0?catEntries.map(([cat,pct],i)=>{
                        const isActive=activeCitCat===cat;
                        return <div key={i} style={{marginBottom:10,cursor:'pointer',borderRadius:8,padding:'8px 10px',background:isActive?catColors[cat]+'22':'transparent',border:isActive?`1.5px solid ${catColors[cat]}`:'1.5px solid transparent',transition:'all 0.15s'}} onClick={()=>setActiveCitCat(isActive?null:cat)}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                            <span style={{fontSize:'0.84rem',color:isActive?catColors[cat]:'#374151',fontWeight:isActive?700:500}}>{cat}</span>
                            <span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#A100FF'}}>{Math.round(pct)}%</span>
                          </div>
                          <div style={{background:'#F3F4F6',borderRadius:50,height:7,overflow:'hidden'}}>
                            <div style={{background:catColors[cat]||'#A100FF',height:7,borderRadius:50,width:`${Math.min(Math.round(pct),100)}%`,transition:'width 0.4s'}}/>
                          </div>
                        </div>;
                      }):<div style={{fontSize:'0.82rem',color:'#9CA3AF'}}>No category data available.</div>}
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 20px'}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:12}}>Sources AI is Pulling From {result.brand_name}</div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr style={{background:'#FAFAFA'}}>{['RANK','DOMAIN','CATEGORY','SHARE %',''].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left' as const,fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                        <tbody>{(()=>{
                          const filtered=displaySources.filter((s:any)=>{if(!activeCitCat)return true;const isOwned2=s.isOwned||domainMatchesBrand(s.domain||'');const cls2=isOwned2?'Owned Media':classifyDomain(s.domain||'').label;return cls2===activeCitCat;});
                          const toShow=activeCitCat?filtered:filtered.slice(0,10);
                          if(toShow.length===0)return <tr><td colSpan={5} style={{padding:'16px 10px',textAlign:'center' as const,fontSize:'0.8rem',color:'#9CA3AF'}}>No sources found for {activeCitCat}.</td></tr>;
                          return toShow.map((s:any,i:number)=>{
                            const isOwned2=s.isOwned||domainMatchesBrand(s.domain||'');
                            const cls2=isOwned2?{label:'Owned Media',color:'#A100FF',bg:'#F5F0FF'}:classifyDomain(s.domain||'');
                            const bw2=Math.min(s.citation_share,100);
                            const isExp2=expandedDomain===s.domain;
                            return <React.Fragment key={i}>
                              <tr style={{borderTop:'1px solid #F3F4F6',cursor:'pointer',background:isExp2?'#F9F8FF':isOwned2?'#FAFBFF':'white',borderLeft:isOwned2?'3px solid #A100FF':'none'}} onClick={()=>setExpandedDomain(isExp2?null:s.domain)}>
                                <td style={{padding:'8px 10px',fontSize:'0.78rem',color:'#9CA3AF'}}>{s.rank||i+1}</td>
                                <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:'0.8rem',fontWeight:600,color:'#A100FF'}}>{s.domain}</span>{isOwned2&&<span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:4,padding:'1px 5px',fontSize:'0.6rem',fontWeight:700}}>You</span>}</div></td>
                                <td style={{padding:'8px 10px'}}><span style={{background:(cls2 as any).bg,color:(cls2 as any).color,borderRadius:6,padding:'2px 7px',fontSize:'0.66rem',fontWeight:600}}>{(cls2 as any).label}</span></td>
                                <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:4,overflow:'hidden'}}><div style={{background:isOwned2?'#A100FF':'#10B981',height:4,borderRadius:50,width:`${bw2}%`}}/></div><span style={{fontSize:'0.78rem',fontWeight:700,color:isOwned2?'#A100FF':'#10B981',width:30}}>{s.citation_share}%</span></div></td>
                                <td style={{padding:'8px 10px',fontSize:'0.7rem',color:'#9CA3AF',textAlign:'right' as const}}>{isExp2?'^':'v'}</td>
                              </tr>
                              {isExp2&&<tr style={{background:'#F9F8FF'}}><td colSpan={5} style={{padding:'6px 10px 10px 24px'}}><div style={{fontSize:'0.7rem',fontWeight:600,color:'#A100FF',marginBottom:6}}>Pages from {s.domain}</div><div style={{fontSize:'0.72rem',color:'#4F46E5'}}><a href={`https://${s.domain}`} target="_blank" rel="noreferrer" style={{color:'#4F46E5'}}>{`https://${s.domain}`}</a></div></td></tr>}
                            </React.Fragment>;
                          });
                        })()}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── TAB 5: Prompts ── */}
            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[];
              const clusters=result.query_clusters||[];
              const trendingQs=result.trending_queries||[];
              const totalQueries = result.total_responses ?? rd.length;
              const totalMentions = result.responses_with_brand ?? rd.filter((r:any)=>r.mentioned).length;
              const displayRate = Math.round((totalMentions / Math.max(totalQueries, 1)) * 100);
              const cats2: string[] = ['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string).filter((c:string)=>Boolean(c))))];

              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={totalQueries} sub="Generic consumer questions, no brand name" color="#A100FF"/>
                    <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} sub="Queries where brand appeared" color="#A100FF"/>
                    <MetricCard label="appearance rate" val={`${displayRate}%`} sub="Of all AI queries triggered brand mention" color="#A100FF"/>
                  </div>

                  {/* Bubble network */}
                  {clusters.length > 0 && (()=>{
                    const maxMentioned = Math.max(...clusters.map((c:any)=>c.mentioned), 1);
                    const grouped = [...clusters].sort((a:any, b:any) => {
                      const g = (c:any) => c.winRate>=60?0:c.winRate>=30?1:c.winRate>0?2:3;
                      return g(a)!==g(b) ? g(a)-g(b) : b.mentioned-a.mentioned;
                    });
                    const nB = grouped.length;
                    const W = 940, VPAD = 52;
                    const COLS = Math.min(5, Math.ceil(Math.sqrt(nB * 1.2)));
                    const ROWS = Math.ceil(nB / COLS);
                    const cellW = Math.min(160, W / COLS);
                    const cellH = 105;
                    const totalGridW = COLS * cellW;
                    const gridOffsetX = (W - totalGridW) / 2;
                    const H = ROWS * cellH + VPAD;
                    const bubbles = grouped.map((c:any, i:number) => {
                      const col = i % COLS;
                      const row = Math.floor(i / COLS);
                      const lastRowCount = nB % COLS || COLS;
                      const isLastRow = row === ROWS - 1;
                      const offsetX = isLastRow ? (COLS - lastRowCount) * cellW / 2 : 0;
                      const x = gridOffsetX + offsetX + col * cellW + cellW / 2;
                      const y = VPAD / 2 + row * cellH + cellH / 2;
                      const r = Math.round(28 + (c.mentioned / maxMentioned) * 18);
                      return {...c, x, y, r};
                    });
                    const getConnectedCategories = (cat: string): Set<string> => {
                      const connected = new Set<string>();
                      const bubble = bubbles.find((b:any) => b.category === cat);
                      if (!bubble) return connected;
                      (bubble.related||[]).forEach((rel:any) => { if (rel.similarity >= 20) connected.add(rel.category); });
                      bubbles.forEach((b:any) => { if ((b.related||[]).some((rel:any) => rel.category === cat && rel.similarity >= 20)) connected.add(b.category); });
                      return connected;
                    };
                    const connectedToHighlight = highlightedBubble ? getConnectedCategories(highlightedBubble) : new Set<string>();
                    return (
                      <div style={{borderRadius:16,overflow:'hidden',marginBottom:20,border:'1px solid #1E293B'}}>
                        <div style={{background:'#0F172A',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontSize:'0.9rem',fontWeight:800,color:'white'}}>Query Intelligence Network</div>
                            <div style={{fontSize:'0.68rem',color:'#64748B',marginTop:1}}>Node size = brand appearances · Color = win rate · Click to filter & highlight connections</div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:14}}>
                            {[{color:'#10B981',label:'Winning (≥60%)'},{color:'#F59E0B',label:'Emerging (30-59%)'},{color:'#EF4444',label:'Gap (<30%)'}].map((l,i)=>(
                              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:l.color}}/><span style={{fontSize:'0.65rem',color:'#94A3B8'}}>{l.label}</span></div>
                            ))}
                            {(filterCat!=='All'||highlightedBubble)&&<button onClick={()=>{setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}} style={{background:'#1E293B',border:'1px solid #334155',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#94A3B8',cursor:'pointer'}}>x Clear</button>}
                          </div>
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',background:'#0F172A'}}>
                          {bubbles.map((b:any)=>(b.related||[]).map((rel:any)=>{
                            const target=bubbles.find((bb:any)=>bb.category===rel.category);
                            if(!target||rel.similarity<20) return null;
                            const isHighlightedConn=highlightedBubble&&(b.category===highlightedBubble||rel.category===highlightedBubble);
                            const isDimmed=highlightedBubble&&!isHighlightedConn;
                            return <line key={`${b.category}-${rel.category}`} x1={b.x} y1={b.y} x2={target.x} y2={target.y} stroke={isHighlightedConn?'#A78BFA':'#334155'} strokeWidth={isHighlightedConn?2.5:rel.similarity>60?2:1} strokeDasharray={rel.similarity>60?undefined:"3,4"} opacity={isDimmed?0.1:isHighlightedConn?0.9:0.4}/>;
                          }))}
                          {bubbles.map((b:any)=>{
                            const isSelected=filterCat===b.category;
                            const isHighlighted=highlightedBubble===b.category;
                            const isConnected=connectedToHighlight.has(b.category);
                            const isDimmed=highlightedBubble&&!isHighlighted&&!isConnected;
                            const nodeColor=b.winRate>=60?'#10B981':b.winRate>=30?'#F59E0B':'#EF4444';
                            const words=b.category.split(' ');
                            const maxChars=Math.round(b.r*0.52);
                            let line1='',line2='';
                            words.forEach((w:string)=>{if(!line1){line1=w;}else if((line1+' '+w).length<=maxChars){line1+=' '+w;}else if(!line2){line2=w;}else if((line2+' '+w).length<=maxChars){line2+=' '+w;}});
                            if(line2.length>maxChars)line2=line2.slice(0,maxChars-1)+'...';
                            const hasTwo=line2.length>0;
                            const fontSize=b.r>=38?9.5:b.r>=32?9:8;
                            const lineH=fontSize+2;
                            const totalTextH=hasTwo?lineH*2+8+lineH:lineH+8+lineH;
                            const textStartY=b.y-totalTextH/2+fontSize;
                            const winY=(hasTwo?textStartY+lineH:textStartY)+lineH+4;
                            const appY=winY+lineH;
                            return (
                              <g key={b.category} style={{cursor:'pointer'}} onClick={()=>{if(filterCat===b.category&&highlightedBubble===b.category){setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}else{setFilterCat(b.category);setQueryPage(1);setHighlightedBubble(b.category);}}}>
                                <circle cx={b.x} cy={b.y} r={b.r+8} fill={nodeColor} opacity={isDimmed?0.02:isHighlighted?0.2:0.07}/>
                                <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor} opacity={isDimmed?0.25:isConnected?0.95:isHighlighted?1:0.8} stroke={isHighlighted?'white':isConnected?'#A78BFA':nodeColor} strokeWidth={isHighlighted?3:isConnected?2:isSelected?2.5:1}/>
                                <text x={b.x} y={textStartY} textAnchor="middle" style={{fontSize,fontWeight:700,fill:isDimmed?'rgba(255,255,255,0.3)':'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line1}</text>
                                {hasTwo&&<text x={b.x} y={textStartY+lineH} textAnchor="middle" style={{fontSize,fontWeight:700,fill:isDimmed?'rgba(255,255,255,0.3)':'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line2}</text>}
                                <text x={b.x} y={winY} textAnchor="middle" style={{fontSize:Math.max(6,fontSize-1),fill:isDimmed?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.9)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.winRate}% win</text>
                                {b.r>26&&<text x={b.x} y={appY} textAnchor="middle" style={{fontSize:6,fill:isDimmed?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.55)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.mentioned} appearances</text>}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Paginated table */}
                  {(()=>{
                    const ROWS_PER_PAGE = 10;
                    const allSorted = [...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});
                    const totalPages = Math.ceil(allSorted.length / ROWS_PER_PAGE);
                    const safePage = Math.min(queryPage, Math.max(1, totalPages));
                    const pageRows = allSorted.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);
                    return (
                      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                          <div style={{fontSize:'0.88rem',fontWeight:700,color:'#111827'}}>
                            {filterCat==='All'?'All Queries':'Category: '+filterCat}
                            <span style={{fontSize:'0.72rem',fontWeight:400,color:'#9CA3AF',marginLeft:8}}>({allSorted.length} queries · page {safePage} of {totalPages})</span>
                          </div>
                          <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setQueryPage(1);setHighlightedBubble(null);}} style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 8px',fontSize:'0.75rem',color:'#374151',background:'white',outline:'none'}}>
                            {cats2.map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
                          <thead><tr style={{background:'#F8FAFC'}}>{['#','QUERY','YOUR RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left' as const,fontSize:'0.63rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                          <tbody>{pageRows.map((item:any,i:number)=>{
                            const globalIdx=(safePage-1)*ROWS_PER_PAGE+i+1;
                            const rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':rp<=3?'#A100FF':item.mentioned?'#A100FF':'#9CA3AF',isMissed=!item.mentioned;
                            const beater=item.winner_brand&&item.winner_brand!==result.brand_name?item.winner_brand:null;
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
                              <td style={{padding:'9px 12px',width:150}}>{beater?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#92400E'}}>👑 {beater}</span>:rp===1?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#065F46'}}>You&apos;re #1</span>:<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>--</span>}</td>
                            </tr>;
                          })}</tbody>
                        </table>
                        {totalPages > 1 && (
                          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14}}>
                            <button onClick={()=>setQueryPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:safePage===1?'#F9FAFB':'white',color:safePage===1?'#D1D5DB':'#374151',cursor:safePage===1?'default':'pointer',fontSize:'0.75rem'}}>Prev</button>
                            {Array.from({length:Math.min(totalPages,10)},(_,i)=>{const pg=totalPages<=10?i+1:safePage<=5?i+1:safePage>=totalPages-4?totalPages-9+i:safePage-4+i;return <button key={pg} onClick={()=>setQueryPage(pg)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+(pg===safePage?'#A100FF':'#E5E7EB'),background:pg===safePage?'#A100FF':'white',color:pg===safePage?'white':'#374151',cursor:'pointer',fontSize:'0.75rem',fontWeight:pg===safePage?700:400}}>{pg}</button>;})}
                            <button onClick={()=>setQueryPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:safePage===totalPages?'#F9FAFB':'white',color:safePage===totalPages?'#D1D5DB':'#374151',cursor:safePage===totalPages?'default':'pointer',fontSize:'0.75rem'}}>Next</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Trending queries */}
                  {trendingQs.length > 0 && (()=>{
                    const oppOrder = (o:string) => o==='High'?0:o==='Medium'?1:2;
                    const highOpp = [...trendingQs]
                      .map((tq:any) => ({...tq, query:(tq.query||'').replace(/\bin\s+20\d{2}\b/gi,'').replace(/\s+/g,' ').trim()}))
                      .sort((a:any,b:any)=>oppOrder(a.opportunity)-oppOrder(b.opportunity))
                      .slice(0,10);
                    const getCluster=(tqCat:string)=>clusters.find((c:any)=>{const cl=(c.category||'').toLowerCase();const tl=tqCat.toLowerCase();if(cl.includes(tl)||tl.includes(cl))return true;const tWords=tl.split(/[\s&,]+/).filter((w:string)=>w.length>3);const cWords=cl.split(/[\s&,]+/).filter((w:string)=>w.length>3);return tWords.some((w:string)=>cWords.some((cw:string)=>cw.includes(w)||w.includes(cw)));}) || null;
                    if(highOpp.length===0)return null;
                    return (
                      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span>🔥</span><div style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>What the Market is Asking Right Now</div></div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginBottom:16}}>Top {highOpp.length} high-intent queries trending in {result.ind_label||result.industry}.</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          {highOpp.map((tq:any,i:number)=>{
                            const trendColor=tq.trend==='Rising'?'#EF4444':tq.trend==='Peak'?'#F59E0B':'#6B7280';
                            const trendBg=tq.trend==='Rising'?'#FEE2E2':tq.trend==='Peak'?'#FEF3C7':'#F3F4F6';
                            const cluster=getCluster(tq.category);
                            const brandWinRate=cluster?.winRate??null;
                            const brandWinning=brandWinRate!==null&&brandWinRate>=40;
                            const topComp3=cluster?.topCompetitor||null;
                            const isOpen=selectedCluster===`trend-${i}`;
                            return (
                              <div key={i} style={{background:'#FAFAFA',borderRadius:10,border:`1px solid ${isOpen?'#A100FF':'#E5E7EB'}`,overflow:'hidden'}}>
                                <div style={{padding:'11px 13px',cursor:'pointer'}} onClick={()=>setSelectedCluster(isOpen?null:`trend-${i}`)}>
                                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5,flexWrap:'wrap' as const}}>
                                    <span style={{background:trendBg,color:trendColor,borderRadius:50,padding:'2px 7px',fontSize:'0.62rem',fontWeight:700}}>{tq.trend}</span>
                                    <span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:50,padding:'2px 7px',fontSize:'0.62rem',fontWeight:600}}>{tq.category}</span>
                                  </div>
                                  <div style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.5,fontWeight:500,marginBottom:6}}>{tq.query}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                                    {topComp3&&<span style={{fontSize:'0.65rem',color:'#92400E',background:'#FEF3C7',borderRadius:4,padding:'1px 7px',fontWeight:600}}>👑 {topComp3} leading</span>}
                                    {brandWinRate!==null?<span style={{fontSize:'0.65rem',fontWeight:700,color:brandWinning?'#10B981':'#EF4444',background:brandWinning?'#D1FAE5':'#FEE2E2',borderRadius:4,padding:'1px 7px'}}>{result.brand_name}: {brandWinRate}% win</span>:<span style={{fontSize:'0.65rem',color:'#9CA3AF',fontStyle:'italic'}}>New category</span>}
                                    <span style={{marginLeft:'auto',fontSize:'0.62rem',color:'#6B7280'}}>{isOpen?'^':'v'}</span>
                                  </div>
                                </div>
                                {isOpen&&(
                                  <div style={{borderTop:'1px solid #E5E7EB',padding:'11px 13px',background:'white'}}>
                                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
                                      {[{label:'Currently Leading',val:topComp3||'No clear leader',color:'#F59E0B'},{label:`${result.brand_name} Win Rate`,val:brandWinRate!==null?`${brandWinRate}%`:'Not tested',color:brandWinning?'#10B981':'#EF4444'},{label:'Trend Signal',val:tq.trend,color:trendColor},{label:'Opportunity',val:tq.opportunity||'--',color:'#A100FF'}].map((s,j)=>(
                                        <div key={j} style={{background:'#F9FAFB',borderRadius:6,padding:'7px 9px'}}><div style={{fontSize:'0.58rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em',marginBottom:2}}>{s.label.toUpperCase()}</div><div style={{fontSize:'0.85rem',fontWeight:800,color:s.color}}>{s.val}</div></div>
                                      ))}
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

            {/* ── TAB 6: Recommendations ── */}
            {activeTab===6&&(()=>{
              const rd2 = result.responses_detail || [];
              const recClusters = result.query_clusters || [];
              const topComp1 = (result.competitors||[])[0]?.Brand || 'Top Competitor';
              const topComp2 = (result.competitors||[])[1]?.Brand || 'Competitor';
              const SEG_DEFS = recClusters.map((c:any) => ({name:c.category,cats:[c.category],dominated:c.topCompetitor||topComp1,dominated2:topComp2}));
              const segRate = (cats: string[]) => {
                let rows = rd2.filter((r:any) => cats.some(c => (r.category||'')===c));
                if (rows.length === 0) rows = rd2.filter((r:any) => cats.some(c => (r.category||'').toLowerCase().includes(c.toLowerCase())));
                if (rows.length === 0) return null;
                return Math.round((rows.filter((r:any)=>r.mentioned).length / rows.length) * 100);
              };
              const getClusterRate = (cats: string[]) => {
                for (const cat of cats) {
                  const cluster = recClusters.find((c:any) => c.category===cat);
                  if (cluster) return cluster.winRate;
                  const fuzzy = recClusters.find((c:any) => c.category.toLowerCase().includes(cat.toLowerCase())||cat.toLowerCase().includes(c.category.toLowerCase()));
                  if (fuzzy) return fuzzy.winRate;
                }
                return segRate(cats);
              };
              const getClusterComp = (cats: string[]) => {
                for (const cat of cats) {
                  const cluster = recClusters.find((c:any) => c.category===cat);
                  if (cluster?.topCompetitor) return cluster.topCompetitor;
                }
                return '';
              };
              const segments = SEG_DEFS.map((def:any) => {
                const rate = getClusterRate(def.cats);
                if (rate === null) return null;
                const isWinning = rate >= 60, isEmerging = !isWinning && rate >= 30;
                const status = isWinning ? 'Winning' : isEmerging ? 'Emerging' : 'Gap';
                const topComp3 = getClusterComp(def.cats);
                return {name:def.name,status,color:isWinning?'#10B981':isEmerging?'#F59E0B':'#EF4444',bg:isWinning?'#F0FDF4':isEmerging?'#FFFBEB':'#FFF1F2',border:isWinning?'#6EE7B7':isEmerging?'#FCD34D':'#FCA5A5',score:rate,dominated:topComp3||(isWinning?def.dominated2:def.dominated)||''};
              }).filter((s:any):s is NonNullable<typeof s> => s !== null);

              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:14}}>Which audience segments is your brand winning vs. losing in AI responses?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s:any,i:number)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> · Dominated by: {s.dominated}</div></div>)}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>!</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>GEO Health Summary</span></div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Based on how your brand performed across AI queries.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>What is Working Well</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>)}</ul></div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>What Needs Improvement</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>-</span><span>{w}</span></li>)}</ul></div>
                  </div>
                  <PriorityActionsTable result={result} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
                </div>
              );
            })()}

            {/* ── TAB 7: Live Prompt ── */}
            {activeTab===7&&(()=>(
              <div style={{display:'flex',flexDirection:'column' as const,minHeight:'calc(100vh - 200px)'}}>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:3}}>Live Prompt Tester</div>
                  <div style={{fontSize:'0.8rem',color:'#9CA3AF'}}>Ask any question and see how AI responds about brands in your category.</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:12}}>
                  {examplePrompts.map((p,i)=>(
                    <button key={i} onClick={()=>runPrompt(p)} style={{background:'#F5F0FF',border:'1px solid #E9D5FF',borderRadius:20,padding:'6px 14px',fontSize:'0.78rem',color:'#7500C0',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap' as const,transition:'all 0.15s'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='#EDE9FE')}
                      onMouseLeave={e=>(e.currentTarget.style.background='#F5F0FF')}>{p}</button>
                  ))}
                </div>
                <div style={{background:'white',borderRadius:14,border:'1.5px solid #E5E7EB',padding:'12px 16px',display:'flex',gap:10,alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',marginBottom:16}}>
                  <input type="text" value={promptInput} onChange={e=>setPromptInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runPrompt()} placeholder="Ask anything, e.g. What is the best travel credit card?" style={{flex:1,border:'none',padding:'6px 0',fontSize:'0.9rem',outline:'none',color:'#374151',background:'transparent'}}/>
                  <button onClick={()=>runPrompt()} disabled={promptLoading} style={{background:promptLoading?'#E9D5FF':'#A100FF',color:'white',border:'none',borderRadius:10,padding:'8px 22px',fontWeight:700,fontSize:'0.88rem',cursor:promptLoading?'not-allowed':'pointer',flexShrink:0}}>{promptLoading?'Asking...':'Ask AI'}</button>
                  {promptHistory.length>0&&<button onClick={()=>setPromptHistory([])} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',fontSize:'0.75rem',color:'#9CA3AF',cursor:'pointer'}}>Clear</button>}
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:12,flex:1}}>
                  {promptHistory.length===0&&!promptLoading?(
                    <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:'40px',color:'#9CA3AF',background:'white',borderRadius:14,border:'1px solid #E5E7EB'}}>
                      <div style={{width:56,height:56,borderRadius:'50%',background:'#F5F0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6rem',marginBottom:12}}>🤖</div>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#374151',marginBottom:6}}>Ask the AI anything</div>
                      <div style={{fontSize:'0.82rem',lineHeight:1.7,maxWidth:400,color:'#9CA3AF'}}>Type a question above or click a suggestion. See how AI responds about {result?.brand_name||'your brand'} and competitors.</div>
                    </div>
                  ):(
                    <>
                      {promptHistory.map((h,i)=>(
                        <div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}>
                          <div style={{background:'#F5F0FF',padding:'10px 18px',borderBottom:'1px solid #EDE9FE',display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:'0.7rem',fontWeight:700,color:'#A100FF',background:'#EDE9FE',borderRadius:50,padding:'2px 8px'}}>Q</span>
                            <span style={{fontSize:'0.84rem',fontWeight:600,color:'#7500C0'}}>{h.q}</span>
                          </div>
                          <div style={{padding:'16px 18px'}}><MarkdownText text={h.a}/></div>
                        </div>
                      ))}
                      {promptLoading&&(
                        <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,display:'flex',alignItems:'center',gap:12,color:'#9CA3AF',fontSize:'0.88rem'}}>
                          <div style={{width:18,height:18,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                          Querying AI model...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))()}

            {/* ── TAB 8: FAQ ── */}
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
                    {q:'How do I improve my GEO Score?',a:"The GEO Analysis Summary on the GEO Score tab identifies your highest-impact opportunities. Build authoritative content, earn placements on sources AI trusts, and expand coverage across segments where you're currently invisible."},
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
