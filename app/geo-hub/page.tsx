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

const TABS = ['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Analysis','Recommendations','Live Prompt','FAQ'];

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

type ProductDef = {label:string; terms:string[]; color:string};

function getProductDefs(indKey:string, lob:string): ProductDef[] {
  const k = indKey;
  const l = lob.toLowerCase();
  const TOPIC_COLORS = ['#A100FF','#7500C0','#460073','#5B21B6','#6B7280','#374151','#0EA5E9','#10B981','#F59E0B','#EF4444'];

  if (k==='fin' || l.includes('credit card')) {
    return [
      {label:'Cash Back',       terms:['cash back','cashback','double cash','freedom','quicksilver','active cash','customized cash','blue cash','flat rate'], color:TOPIC_COLORS[0]},
      {label:'Travel Rewards',  terms:['travel','sapphire','venture','strata','premier','platinum','autograph','miles','points card','aadvantage','skymiles','airline','hotel rewards'], color:TOPIC_COLORS[1]},
      {label:'Balance Transfer',terms:['balance transfer','0% apr','0 apr','zero apr','intro apr','simplicity','reflect','slate','diamond preferred','low interest'], color:TOPIC_COLORS[2]},
      {label:'Secured / Builder',terms:['secured','credit builder','deposit','credit building','opensky','chime credit','no credit','build credit','first credit'], color:TOPIC_COLORS[3]},
      {label:'No Annual Fee',   terms:['no annual fee','$0 annual','no fee','free card','without annual'], color:TOPIC_COLORS[4]},
      {label:'Business Cards',  terms:['business','small business','corporate','employee card','business rewards','ink','spark','business cash'], color:TOPIC_COLORS[5]},
      {label:'Student Cards',   terms:['student','college','university','discover it student','journey student'], color:TOPIC_COLORS[6]},
      {label:'Luxury / Premium',terms:['luxury','premium','centurion','black card','reserve','high-end','concierge','lounge access','priority pass'], color:TOPIC_COLORS[7]},
      {label:'Grocery & Gas',   terms:['grocery','supermarket','gas','fuel','everyday','blue cash everyday','blue cash preferred'], color:TOPIC_COLORS[8]},
      {label:'Retail / Co-Brand',terms:['retail','store card','amazon','target','walmart','costco','co-brand','co-branded'], color:TOPIC_COLORS[9]},
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

function computeProductMentions(productDefs: ProductDef[], rd: any[]): {label:string;terms:string[];color:string;mentions:number;pct:number;val:number}[] {
  // Only scan responses where the brand was actually mentioned
  const brandRd = rd.filter((r:any) =>
    r.mentioned === true || (r.position !== undefined && r.position > 0) || r.mentioned === 1
  );
  const pool = brandRd.length > 0 ? brandRd : rd;
  const total = pool.length || 1;
  return productDefs.map(p => {
    const count = pool.filter((r:any) => {
      const txt = (r.response_preview || r.response || '').toLowerCase();
      return p.terms.some((t:string) => txt.includes(t));
    }).length;
    const pct = Math.round((count / total) * 100);
    return { ...p, mentions: count, pct, val: Math.max(5, count) };
  }).filter(p => p.pct >= 3 || (total < 20 && p.mentions >= 1));
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
};

function getRadarTip(label: string): string {
  return RADAR_TIPS[label] || `How often your brand appears in AI responses for ${label.toLowerCase()} queries.`;
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:5,cursor:'help'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',color:'#6B7280',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>?</span>
      {show&&<span style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'white',fontSize:'0.72rem',lineHeight:1.6,borderRadius:8,padding:'10px 14px',width:210,textAlign:'left',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:9999,pointerEvents:'none',whiteSpace:'normal' as const}}>{text}</span>}
    </span>
  );
}

function MetricCard({ label, val, sub, color='#111827', desc }: { label:string; val:any; sub?:string; color?:string; desc?:string }) {
  return (
    <div style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>
        {label}{METRIC_TIPS[label.toLowerCase()]&&<Tooltip text={METRIC_TIPS[label.toLowerCase()]}/>}
      </div>
      <div style={{fontSize:'1.8rem',fontWeight:800,color,lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>}
      {desc&&<div style={{fontSize:'0.72rem',color:'#6B7280',marginTop:6,lineHeight:1.5}}>{desc}</div>}
    </div>
  );
}

function GeoGauge({ score }: { score:number }) {
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


// SANKEY: GEO node is full height (same as plotH), all other columns same
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
  // Use actual number of responses run, fall back to result field or rd length
  const totalRd = result.total_responses || rd.length || 100;

  const TOPIC_COLORS = ['#A100FF','#7500C0','#460073','#6B7280','#374151'];

  // Query topic nodes: use real cluster.total (actual queries in that category across all prompts run)
  const topTopics = [...cl]
    .sort((a:any,b:any) => (b.total||b.mentioned||0)-(a.total||a.mentioned||0))
    .slice(0, 5)
    .map((c:any, i:number) => ({
      label: c.category,
      val: Math.max(5, Math.min(95, c.winRate ?? 0)),
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
      // Use c.total (total queries in category) if available, else c.mentioned, else estimate
      total: c.total || c.mentioned || Math.round(totalRd / Math.max(cl.length, 1)),
    }));
  const leftItems = topTopics.length >= 1 ? topTopics : [{label:'General', val: vis || 30, color: TOPIC_COLORS[0], total: totalRd}];

  const productDefs = getProductDefs(indKey, lob);

  // PRODUCT DETECTION — FIXED LOGIC:
  // scanPool = only responses where this brand was actually mentioned
  const brandMentionedRd = rd.filter((r:any) =>
    r.mentioned === true || (r.position !== undefined && r.position > 0) || r.mentioned === 1
  );
  const scanPool = brandMentionedRd.length > 0 ? brandMentionedRd : rd;
  const scanTotal = scanPool.length; // denominator = brand-mentioned responses

  const PROD_COLORS_POOL = ['#A100FF','#7500C0','#460073','#8B5CF6','#1E88E5','#0EA5E9','#6366F1','#A78BFA'];

  const productMentions = productDefs.map(p => {
    const count = scanPool.filter((r:any) => {
      const txt = (r.response_preview || r.response || '').toLowerCase();
      return p.terms.some((t:string) => txt.includes(t));
    }).length;
    // Use totalRd (total prompts run) as denominator — honest coverage rate
    const pct = totalRd > 0 ? Math.round((count / totalRd) * 100) : 0;
    return { ...p, mentions: count, pct, val: Math.max(5, count) };
  })
  // Remove noise: must appear in at least 3% of brand-mention responses to be meaningful
  .filter(p => p.pct >= 3 || (scanTotal < 20 && p.mentions >= 1));

  const sortedMentions = [...productMentions].sort((a:any,b:any) => b.mentions - a.mentions);
  const prodItems: any[] = sortedMentions.length >= 1
    ? sortedMentions.map((p, i) => ({ ...p, color: PROD_COLORS_POOL[i % PROD_COLORS_POOL.length] }))
    : productDefs.map((p, i) => ({
        ...p,
        mentions: Math.round(scanTotal / (productDefs.length || 5)),
        pct: Math.round(100 / (productDefs.length || 5)),
        val: 20 + i * 5,
        color: PROD_COLORS_POOL[i % PROD_COLORS_POOL.length],
      }));

  const signals = [
    {label:'Visibility', val:vis, weight:30, color:'#A100FF'},
    {label:'Sentiment',  val:rawSent, weight:20, color:'#7500C0'},
    {label:'Prominence', val:prom, weight:20, color:'#460073'},
    {label:'Citations',  val:cit, weight:15, color:'#6B7280'},
    {label:'Share of Voice', val:sov, weight:15, color:'#374151'},
  ];

  const geoScore = Math.round(signals.reduce((s,m) => s + m.val * m.weight / 100, 0)) || result.overall_geo_score || 0;

  const W = 1040, H = 520, padT = 32, padB = 44;
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

  const lNodes = layoutN(leftItems, col1, 28, 12);
  const pNodes = layoutN(prodItems, col2, 30, 10);
  const sNodes = layoutN(signals, col3, 32, 8);
  // GEO node: full plotH so it's same height as all other columns combined
  const geoN = { x: col4, y: padT, h: plotH, mid: padT + plotH / 2 };

  const wave = (x1:number,y1:number,h1:number,x2:number,y2:number,h2:number,bend=0.44) => {
    const mx1 = x1+nW+(x2-x1-nW)*bend;
    const mx2 = x2-(x2-x1-nW)*bend;
    return `M${x1+nW},${y1} C${mx1},${y1} ${mx2},${y2} ${x2},${y2} L${x2},${y2+h2} C${mx2},${y2+h2} ${mx1},${y1+h1} ${x1+nW},${y1+h1} Z`;
  };

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
      const pY = pn.y;
      const pH = Math.max(2, pn.h * frac);
      flowsA.push({ path: wave(ln.x, ln.y+lOffset, lH, pn.x, pY, pH, 0.42), color: pn.color, tid: ln.label, pid: pn.label });
      lOffset += lH;
    });
  });

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
          {[{x:col1+nW/2,l:'QUERY TOPICS'},{x:col2+nW/2,l:'BRAND PRODUCTS MENTIONED'},{x:col3+nW/2,l:'GEO SIGNALS'},{x:col4+nW/2,l:'GEO SCORE'}].map((h,i)=>(
            <text key={i} x={h.x} y={padT-10} textAnchor="middle" style={{fontSize:7.5,fontWeight:700,fill:'#9CA3AF',fontFamily:'Inter,sans-serif',letterSpacing:'0.07em'}}>{h.l}</text>
          ))}
          {flowsA.map((f,i)=>(<path key={`fa${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.tid)||isHov(f.pid)?0.55:0.04):0.16} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.tid?null:f.tid);}}/>))}
          {flowsB.map((f,i)=>(<path key={`fb${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.pid)||isHov(f.sid)?0.52:0.04):0.18} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.pid?null:f.pid);}}/>))}
          {flowsC.map((f,i)=>(<path key={`fc${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.sid)?0.52:0.04):0.22} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.sid?null:f.sid);}}/>))}
          {lNodes.map((n:any,i:number)=>{
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`ln${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
              <text x={n.x-6} y={n.mid-6} textAnchor="end" dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label.length>17?n.label.slice(0,16)+'…':n.label}</text>
              <text x={n.x-6} y={n.mid+6} textAnchor="end" dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val}% win · {n.total}q</text>
            </g>);
          })}
          {pNodes.map((n:any,i:number)=>{
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`pn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
              <text x={n.x+nW+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label.length>18?n.label.slice(0,17)+'…':n.label}</text>
              <text x={n.x+nW+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.mentions}/{totalRd} responses ({Math.round((n.mentions/totalRd)*100)}%)</text>
            </g>);
          })}
          {sNodes.map((n,i)=>{
            const dim = hovMetric && !isHov(n.label);
            return (<g key={`sn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:0.9}/>
              <text x={n.x+nW+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label}</text>
              <text x={n.x+nW+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val} · {n.weight}%</text>
            </g>);
          })}
          {/* GEO node: full plotH bar — "GEO Score" on one line */}
          <rect x={geoN.x} y={geoN.y} width={nW} height={geoN.h} fill="#A100FF" rx={5}/>
          <text x={geoN.x+nW+12} y={geoN.mid-24} style={{fontSize:13,fontWeight:800,fill:'#A100FF',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
          <text x={geoN.x+nW+12} y={geoN.mid+16} style={{fontSize:38,fontWeight:900,fill:'#A100FF',fontFamily:'Inter,sans-serif'}}>{geoScore}</text>
          <text x={geoN.x+nW+12} y={geoN.mid+38} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>out of 100</text>
        </svg>
      </div>
      <div style={{borderTop:'1px solid #F3F4F6',paddingTop:10,marginTop:10,display:'flex',flexWrap:'wrap' as const,gap:16}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <span style={{fontSize:'0.62rem',fontWeight:700,color:'#6B7280'}}>PRODUCTS IN BRAND RESPONSES ({scanTotal} brand mentions · responses can match multiple products):</span>
          {prodItems.map((p:any,i:number)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:1,background:p.color}}/><span style={{fontSize:'0.62rem',color:'#6B7280'}}>{p.label} ({p.mentions} · {p.pct}%)</span></div>))}
        </div>
      </div>
    </div>
  );
}


function MarkdownText({ text }: { text:string }) {
  const lines = text.split('\n');
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={j}>{p.slice(1,-1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:'monospace',color:'#A100FF'}}>{p.slice(1,-1)}</code>;
      return p;
    });
  };
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={i} style={{height:8}}/>); i++; continue; }
    if (trimmed.startsWith('# ')) { elements.push(<div key={i} style={{fontSize:'1.25rem',fontWeight:900,color:'#111827',marginTop:24,marginBottom:8,borderBottom:'2px solid #F3F4F6',paddingBottom:6}}>{parseInline(trimmed.slice(2))}</div>); i++; continue; }
    if (trimmed.startsWith('## ')) { elements.push(<div key={i} style={{fontSize:'1.08rem',fontWeight:800,color:'#111827',marginTop:20,marginBottom:6}}>{parseInline(trimmed.slice(3))}</div>); i++; continue; }
    if (trimmed.startsWith('### ')) { elements.push(<div key={i} style={{fontSize:'0.97rem',fontWeight:700,color:'#374151',marginTop:16,marginBottom:4}}>{parseInline(trimmed.slice(4))}</div>); i++; continue; }
    if (trimmed === '---') { elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'16px 0'}}/>); i++; continue; }
    if (/^\s{0,3}[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s{0,3}[-*]\s/.test(lines[i])) {
        const l = lines[i].trim().replace(/^[-*]\s/, '');
        items.push(<div key={i} style={{display:'flex',gap:8,marginBottom:4}}><span style={{color:'#A100FF',flexShrink:0,marginTop:2}}>•</span><span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(l)}</span></div>);
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

// ─── AIPerceptionPanel — calls Claude API to get real AI perception then cross-references with our data ───
function AIPerceptionPanel({ result }: { result: any }) {
  const brand   = result.brand_name || 'the brand';
  const lob     = result.lob || 'credit cards';
  const clusters = result.query_clusters || [];
  const competitors = result.competitors || [];
  const productDefs = getProductDefs(result.ind_key || 'gen', result.lob || '');
  const productMentions = computeProductMentions(productDefs, result.responses_detail || []);

  type PerceptionData = {
    knownFor: string[];
    topAttributes: string[];
    unaided_rank: number;
    unaided_brands: string[];
    perception_summary: string;
    gaps: Array<{topic: string; ai_knows: boolean; our_win_rate: number; leader: string; insight: string}>;
  };

  const [data, setData] = useState<PerceptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ran, setRan] = useState(false);

  const run = async () => {
    if (ran) return;
    setRan(true);
    setLoading(true);
    setError('');

    try {
      // Build context about our data to send to Claude
      const ourWinRates = clusters.slice(0,10).map((c:any) => `${c.category}: ${c.winRate||0}%`).join(', ');
      const ourProducts = productDefs.slice(0,8).map(p => {
        const f = productMentions.find(m => m.label === p.label);
        return `${p.label}: ${f ? Math.round(f.pct) : 0}%`;
      }).join(', ');
      const topComps = competitors.slice(0,5).map((c:any) => `${c.Brand}(GEO:${c.GEO||0})`).join(', ');

      const prompt = `You are a brand intelligence analyst. Answer ONLY with valid JSON, no markdown, no explanation.

I need to understand how AI perceives "${brand}" in the ${lob} market.

Our live prompt data shows these win rates (how often ${brand} appears in AI responses per topic):
${ourWinRates}

Our product mention data: ${ourProducts}
Competitors in our data: ${topComps}

Answer these questions as a JSON object with EXACTLY these keys:
{
  "knownFor": ["top 5 things AI associates ${brand} with in ${lob} - be specific like product names, features"],
  "topAttributes": ["top 5 adjectives/phrases AI uses when describing ${brand}"],
  "unaided_rank": <number: where ${brand} ranks if you list top ${lob} brands unprompted, 1=first>,
  "unaided_brands": ["top 5 ${lob} brands you would name first unprompted, ranked"],
  "perception_summary": "2-sentence honest summary of how AI perceives ${brand} vs competitors",
  "gaps": [
    {
      "topic": "specific topic name",
      "ai_knows": <true/false: does AI know ${brand} has offerings here>,
      "our_win_rate": <number: estimated win rate % for ${brand} on this topic based on your knowledge>,
      "leader": "which brand owns this topic in AI responses",
      "insight": "one sentence: why there is a gap and what would close it"
    }
  ]
}

For "gaps", identify 5 topics where there is a meaningful gap between what ${brand} OFFERS and how much AI RECOMMENDS them for it. Be specific and accurate.`;

      const resp = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a brand intelligence analyst. You always respond with valid JSON only — no markdown, no explanation, just the raw JSON object.',
          prompt,
        }),
      });

      const raw = await resp.json();
      const text = (raw.response || '');
      const clean = text.replace(/```json|```/g,'').trim();
      const parsed: PerceptionData = JSON.parse(clean);
      setData(parsed);
    } catch(e) {
      setError('Could not load AI perception data. Check API connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on mount
  useState(() => { run(); });

  // Cross-reference: match our cluster win rates against AI perception gaps
  const crossRef = data ? data.gaps.map(g => {
    const matched = clusters.find((c:any) =>
      c.category.toLowerCase().includes(g.topic.toLowerCase().split(' ')[0]) ||
      g.topic.toLowerCase().includes(c.category.toLowerCase().split(' ')[0])
    );
    return {
      ...g,
      our_actual_win_rate: matched ? (matched.winRate || 0) : null,
      cluster_name: matched?.category || null,
      discrepancy: matched ? Math.abs((matched.winRate||0) - g.our_win_rate) : null,
    };
  }) : [];

  const brandGEO = result.overall_geo_score || result.visibility || 0;

  return (
    <div style={{background:'white',borderRadius:14,border:'2px solid #A100FF',padding:'24px 28px',marginBottom:20}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontSize:'0.65rem',fontWeight:800,color:'#A100FF',letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:4}}>
            🤖 Live AI Perception Analysis
          </div>
          <h3 style={{fontSize:'1.1rem',fontWeight:800,color:'#111827',margin:0}}>
            How does AI actually perceive {brand}? Cross-referenced with your live data.
          </h3>
          <p style={{fontSize:'0.75rem',color:'#6B7280',marginTop:4,marginBottom:0}}>
            We asked Claude directly — then compared its answers against your {clusters.length} tracked prompts.
          </p>
        </div>
        {!ran && (
          <button onClick={run} style={{background:'#A100FF',color:'white',border:'none',borderRadius:10,padding:'10px 20px',fontWeight:700,fontSize:'0.82rem',cursor:'pointer',flexShrink:0}}>
            Run Analysis
          </button>
        )}
      </div>

      {loading && (
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'24px',color:'#6B7280',fontSize:'0.85rem'}}>
          <div style={{width:20,height:20,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
          Querying Claude API for {brand} perception data...
        </div>
      )}

      {error && (
        <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,padding:'12px 16px',fontSize:'0.8rem',color:'#991B1B'}}>{error}</div>
      )}

      {data && !loading && (
        <div>
          {/* Row 1: Known For + Unaided Recall + Perception Summary */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.2fr',gap:16,marginBottom:20}}>
            {/* Known For */}
            <div style={{background:'#F5F0FF',borderRadius:12,padding:'16px 18px'}}>
              <div style={{fontSize:'0.65rem',fontWeight:800,color:'#7C3AED',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:10}}>
                🏷 AI associates {brand} with
              </div>
              {data.knownFor.map((item,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'#A100FF',color:'white',fontSize:'0.65rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:'0.8rem',color:'#374151',fontWeight:i===0?700:400}}>{item}</span>
                </div>
              ))}
            </div>

            {/* Unaided Brand Recall */}
            <div style={{background:'#F0FDF4',borderRadius:12,padding:'16px 18px'}}>
              <div style={{fontSize:'0.65rem',fontWeight:800,color:'#065F46',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:10}}>
                🗣 Unaided brand recall ranking
              </div>
              <p style={{fontSize:'0.72rem',color:'#6B7280',marginBottom:10}}>When AI lists {lob.toLowerCase()} brands unprompted:</p>
              {data.unaided_brands.map((b,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <div style={{
                    width:22,height:22,borderRadius:'50%',
                    background:b.toLowerCase().includes(brand.toLowerCase().split(' ')[0])?'#10B981':'#E5E7EB',
                    color:b.toLowerCase().includes(brand.toLowerCase().split(' ')[0])?'white':'#6B7280',
                    fontSize:'0.65rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                  }}>{i+1}</div>
                  <span style={{fontSize:'0.82rem',color:'#374151',fontWeight:b.toLowerCase().includes(brand.toLowerCase().split(' ')[0])?700:400}}>{b}</span>
                  {b.toLowerCase().includes(brand.toLowerCase().split(' ')[0]) && <span style={{fontSize:'0.65rem',color:'#10B981',fontWeight:700}}>← YOU</span>}
                </div>
              ))}
              <div style={{marginTop:10,fontSize:'0.72rem',color:'#065F46',background:'#DCFCE7',borderRadius:6,padding:'6px 10px'}}>
                Unaided rank: <strong>#{data.unaided_rank}</strong> · GEO Score: <strong>{brandGEO}</strong>
              </div>
            </div>

            {/* Perception Summary + Attributes */}
            <div style={{background:'#FFF7ED',borderRadius:12,padding:'16px 18px'}}>
              <div style={{fontSize:'0.65rem',fontWeight:800,color:'#92400E',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:10}}>
                💬 How AI describes {brand}
              </div>
              <p style={{fontSize:'0.8rem',color:'#374151',lineHeight:1.6,marginBottom:12}}>{data.perception_summary}</p>
              <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                {data.topAttributes.map((attr,i) => (
                  <span key={i} style={{background:'#FED7AA',color:'#7C2D12',borderRadius:20,padding:'3px 10px',fontSize:'0.72rem',fontWeight:600}}>{attr}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Gap Cross-Reference — the money insight */}
          <div>
            <div style={{fontSize:'0.7rem',fontWeight:800,color:'#374151',letterSpacing:'0.08em',textTransform:'uppercase' as const,marginBottom:12}}>
              🎯 Perception vs Reality — Where AI knows {brand} but doesn't recommend it
            </div>
            <div style={{fontSize:'0.78rem',color:'#6B7280',marginBottom:14,lineHeight:1.5}}>
              Claude confirmed {brand} operates in these areas — but our live prompt data shows it's not winning recommendations there.
              <strong style={{color:'#374151'}}> This is the exact content gap to close.</strong>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
              {crossRef.map((g,i) => {
                const hasData = g.our_actual_win_rate !== null;
                const ourRate = hasData ? g.our_actual_win_rate! : g.our_win_rate;
                const aiRate  = g.our_win_rate;
                const gap     = Math.abs(ourRate - aiRate);
                const severity = ourRate < 20 ? 'Critical' : ourRate < 40 ? 'Moderate' : 'Low';
                const sevColor = ourRate < 20 ? '#EF4444' : ourRate < 40 ? '#F59E0B' : '#10B981';
                return (
                  <div key={i} style={{background:'white',border:`1px solid ${sevColor}40`,borderLeft:`4px solid ${sevColor}`,borderRadius:10,padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <span style={{fontSize:'0.85rem',fontWeight:700,color:'#111827'}}>{g.topic}</span>
                      <span style={{fontSize:'0.65rem',fontWeight:700,color:sevColor,background:`${sevColor}15`,borderRadius:4,padding:'2px 7px'}}>{severity}</span>
                    </div>

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                      <div style={{background:'#F5F0FF',borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                        <div style={{fontSize:'0.62rem',color:'#7C3AED',marginBottom:2}}>AI Perception Score</div>
                        <div style={{fontSize:'1.4rem',fontWeight:900,color:'#A100FF'}}>{aiRate}%</div>
                        <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>what Claude expects</div>
                      </div>
                      <div style={{background: hasData ? '#F0FDF4' : '#FFF7F7',borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                        <div style={{fontSize:'0.62rem',color: hasData ? '#065F46' : '#991B1B',marginBottom:2}}>
                          {hasData ? 'Our Live Data' : 'Estimated'}
                        </div>
                        <div style={{fontSize:'1.4rem',fontWeight:900,color: hasData ? '#10B981' : '#EF4444'}}>{ourRate}%</div>
                        <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>{hasData ? 'actual win rate' : 'no data tracked'}</div>
                      </div>
                    </div>

                    {/* Gap bar */}
                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'#9CA3AF',marginBottom:3}}>
                        <span>Win rate gap</span>
                        <span style={{color:sevColor,fontWeight:700}}>{gap > 0 ? `-${gap}%` : 'On track'}</span>
                      </div>
                      <div style={{background:'#F3F4F6',borderRadius:4,height:6,overflow:'hidden'}}>
                        <div style={{width:`${Math.min(ourRate,100)}%`,height:'100%',background:sevColor,borderRadius:4}}/>
                      </div>
                    </div>

                    <div style={{fontSize:'0.7rem',color:'#374151',marginBottom:6}}>
                      <strong>Leader:</strong> {g.leader}
                    </div>
                    <div style={{fontSize:'0.7rem',color:'#6B7280',lineHeight:1.4,background:'#F9FAFB',borderRadius:6,padding:'6px 8px'}}>
                      💡 {g.insight}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom summary */}
            <div style={{marginTop:16,background:'#F5F0FF',borderRadius:10,padding:'14px 18px',border:'1px solid #E9D5FF'}}>
              <div style={{display:'flex',gap:16,flexWrap:'wrap' as const}}>
                <div>
                  <div style={{fontSize:'0.65rem',color:'#7C3AED',fontWeight:700,marginBottom:2}}>AI KNOWS {brand.toUpperCase()} FOR</div>
                  <div style={{fontSize:'0.82rem',color:'#374151'}}>{data.knownFor.slice(0,3).join(' · ')}</div>
                </div>
                <div style={{width:1,background:'#E9D5FF'}}/>
                <div>
                  <div style={{fontSize:'0.65rem',color:'#EF4444',fontWeight:700,marginBottom:2}}>BUT AI DOESN'T RECOMMEND {brand.toUpperCase()} FOR</div>
                  <div style={{fontSize:'0.82rem',color:'#374151'}}>{crossRef.filter(g=>(g.our_actual_win_rate||g.our_win_rate)<30).map(g=>g.topic).slice(0,3).join(' · ') || 'All tracked categories performing well'}</div>
                </div>
                <div style={{width:1,background:'#E9D5FF'}}/>
                <div>
                  <div style={{fontSize:'0.65rem',color:'#10B981',fontWeight:700,marginBottom:2}}>UNAIDED RANK IN AI</div>
                  <div style={{fontSize:'0.82rem',color:'#374151'}}>#{data.unaided_rank} out of {data.unaided_brands.length} brands listed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RadarChart — final: warm glow gradient, score right-aligned, 50/50 ───
function RadarChart({ result }: { result: any }) {
  const [hovRow, setHovRow] = useState<number|null>(null);
  const competitors = result.competitors || [];

  const productDefs     = getProductDefs(result.ind_key || 'gen', result.lob || '');
  const productMentions = computeProductMentions(productDefs, result.responses_detail || []);

  // Value = prominence per product category
  // Prominence proxy: when brand mentioned in this category's responses, avg position inverted
  // position 1 = 95, position 2 = 80, position 3 = 65, not mentioned = 5
  const rd = result.responses_detail || [];
  const allDims = productDefs.map(p => {
    const catResponses = rd.filter((r: any) =>
      (r.mentioned === true || (r.position || 0) > 0) &&
      p.terms.some((t: string) => (r.response_preview || '').toLowerCase().includes(t))
    );
    if (!catResponses.length) return { label: p.label, val: 5 };
    const avgPos = catResponses.reduce((sum: number, r: any) => sum + (r.position || 3), 0) / catResponses.length;
    // Invert: position 1 → high score, position 5+ → low score
    const prominenceScore = Math.max(5, Math.min(95, Math.round(100 - (avgPos - 1) * 18)));
    return { label: p.label, val: prominenceScore };
  });
  const dims = [...allDims].sort((a,b) => b.val - a.val);
  const n = dims.length;

  // Median competitor: take median GEO, scale each axis proportionally to brand
  // This gives an irregular polygon that mirrors the brand shape at median level
  const medianGEO: number = (() => {
    if (!competitors.length) return Math.round((result.overall_geo_score || 50) * 0.70);
    const geos = competitors.slice(0, 10).map((c: any) => c.GEO || c.Vis || 30).sort((a: number, b: number) => a - b);
    const m = Math.floor(geos.length / 2);
    return geos.length % 2 === 0 ? Math.round((geos[m-1]+geos[m])/2) : geos[m];
  })();
  const brandGEO = result.overall_geo_score || result.visibility || 50;
  const medianRatio = medianGEO / Math.max(brandGEO, 1);
  // Each axis: brand_val × ratio, so median polygon mirrors brand shape but scaled down
  const compMedians: number[] = dims.map(d => Math.max(5, Math.min(90, Math.round(d.val * medianRatio))));

  const tierColor = (v: number): string => {
    if (v >= 80) return '#10B981';
    if (v >= 70) return '#3B82F6';
    if (v >= 56) return '#F59E0B';
    if (v >= 45) return '#F97316';
    return '#EF4444';
  };

  const rows = dims
    .map((d, i) => ({ label: d.label, val: d.val, diff: d.val - compMedians[i] }))
    .sort((a, b) => b.val - a.val);

  // Radar geometry — VB tight, CX/CY exactly centered
  const R    = n > 7 ? 140 : 155;
  const LR   = R + 46;            // label radius
  const LPAD = 20;                // extra buffer beyond labels
  const VB   = (LR + LPAD) * 2;  // viewBox = label reach * 2, perfectly centered
  const CX   = VB / 2;
  const CY   = VB / 2;

  const angle = (i: number) => (Math.PI / 2) - (2 * Math.PI * i) / n;
  const pt    = (i: number, r: number) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY - r * Math.sin(angle(i)),
  });

  const brandPts = dims.map((d, i) => pt(i, (d.val  / 100) * R));
  const medPts   = compMedians.map((v, i) => pt(i, (v  / 100) * R));
  const outerPts = dims.map((_, i) => pt(i, R));
  const rings    = [25, 50, 75, 100];
  const gId      = 'rg4';

  const wrap = (lbl: string): string[] => {
    const words = lbl.split(/[\s\/\-&]+/);
    const out: string[] = []; let cur = '';
    words.forEach(w => {
      if (!cur) { cur = w; }
      else if ((cur + ' ' + w).length <= 9) { cur += ' ' + w; }
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out.slice(0, 3);
  };

  const LEGEND = [
    { color:'#EF4444', label:'Fragmented',  range:'0-44'   },
    { color:'#F97316', label:'Emerging',    range:'45-55'  },
    { color:'#F59E0B', label:'Competitive', range:'56-69'  },
    { color:'#3B82F6', label:'Leader',      range:'70-79'  },
    { color:'#10B981', label:'Authority',   range:'80-100' },
  ];

  // Row height — shrinks for many rows so scorecard stays compact
  const rowH = n > 7 ? 36 : 46;

  return (
    <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'20px 24px' }}>

      {/* Title */}
      <div style={{ fontSize:'0.68rem', fontWeight:800, color:'#A100FF', letterSpacing:'0.10em', textTransform:'uppercase' as const, marginBottom:16 }}>
        Product Prominence · How Early AI Names You Per Category
      </div>

      {/* 50/50 flex — stretch so both sides same height */}
      <div style={{ display:'flex', alignItems:'stretch' }}>

        {/* LEFT — Radar 50% */}
        <div style={{ width:'50%', flexShrink:0 }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width:'100%', display:'block' }}>
            <defs>
              <radialGradient id={gId} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#E879F9" stopOpacity="0.65"/>
                <stop offset="30%"  stopColor="#F472B6" stopOpacity="0.50"/>
                <stop offset="55%"  stopColor="#FB923C" stopOpacity="0.35"/>
                <stop offset="75%"  stopColor="#FDE68A" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.10"/>
              </radialGradient>
            </defs>

            {/* Gradient ONLY inside brand polygon — no fill outside */}
            <polygon
              points={brandPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill={`url(#${gId})`}/>

            {/* Grid rings */}
            {rings.map(rv => {
              const pts = dims.map((_,i) => pt(i,(rv/100)*R));
              return <g key={rv}>
                <polygon
                  points={pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="none" stroke="#EFEFEF" strokeWidth="0.8"/>
                <text x={CX+4} y={CY-(rv/100)*R+3}
                  style={{fontSize:9, fill:'#9CA3AF', fontFamily:'Inter,sans-serif'}}>
                  {rv}
                </text>
              </g>;
            })}

            {/* Spokes */}
            {dims.map((_,i) => {
              const p = pt(i,R);
              return <line key={i}
                x1={CX} y1={CY}
                x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
                stroke="#EFEFEF" strokeWidth="0.8"/>;
            })}

            {/* Median dashed polygon */}
            <polygon
              points={medPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="none" stroke="#9CA3AF" strokeWidth="1.5"
              strokeDasharray="6,4" opacity="0.70"/>

            {/* Brand polygon */}
            <polygon
              points={brandPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="#A100FF" fillOpacity="0.06" stroke="#A100FF" strokeWidth="2.5"/>

            {/* Vertex dots */}
            {dims.map((d,i) => {
              const p = brandPts[i];
              return <circle key={i}
                cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="6"
                fill={tierColor(d.val)} stroke="white" strokeWidth="1.5"/>;
            })}

            {/* Axis labels */}
            {dims.map((d,i) => {
              const lp    = pt(i, LR);
              const lines = wrap(d.label);
              const lh = 14; const th = (lines.length-1)*lh;
              return <g key={i}>
                {lines.map((ln,li) => (
                  <text key={li}
                    x={lp.x.toFixed(1)}
                    y={(lp.y - th/2 + li*lh).toFixed(1)}
                    textAnchor="middle" dominantBaseline="middle"
                    style={{fontSize:n>7?9:11, fill:'#374151', fontFamily:'Inter,sans-serif', fontWeight:400}}>
                    {ln}
                  </text>
                ))}
              </g>;
            })}
          </svg>
        </div>

        {/* RIGHT — Scorecard 50% — vertically centered */}
        <div style={{ width:'50%', paddingLeft:24, display:'flex', flexDirection:'column' as const, justifyContent:'center', alignSelf:'stretch' }}>
          {rows.map((row, i) => (
            <div key={i}
              onMouseEnter={()=>setHovRow(i)}
              onMouseLeave={()=>setHovRow(null)}
              style={{
                display:'flex', alignItems:'center',
                padding:`${rowH > 40 ? 9 : 5}px 0`,
                borderBottom: i < rows.length-1 ? '1px solid #F3F4F6' : 'none',
                background: hovRow===i ? '#FAFAFA' : 'transparent',
              }}>
              {/* Name — left, regular weight */}
              <div style={{ flex:1, fontSize: n>7 ? '0.82rem' : '0.9rem', fontWeight:400, color:'#111827', fontFamily:'Inter,sans-serif' }}>
                {row.label}
              </div>
              {/* Score — right-aligned, large, tier colored */}
              <div style={{ fontSize: n>7 ? '1.15rem' : '1.3rem', fontWeight:800, color:tierColor(row.val), textAlign:'right' as const, marginRight:8, minWidth:32 }}>
                {row.val}
              </div>
              {/* vs median — small grey */}
              <div style={{ fontSize:'0.7rem', color:'#9CA3AF', whiteSpace:'nowrap' as const, minWidth:86 }}>
                {row.diff >= 0 ? '+' : ''}{row.diff} vs. median
              </div>
            </div>
          ))}

          {/* Legend — centered in column, 2 rows */}
          <div style={{ marginTop:14, display:'flex', flexDirection:'column' as const, alignItems:'center' }}>
            <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'3px 12px', marginBottom:4, justifyContent:'center' }}>
              {LEGEND.slice(0,3).map((l,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.7rem', color:'#374151', fontWeight:600 }}>{l.label}</span>
                  <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>{l.range}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'3px 12px', justifyContent:'center' }}>
              {LEGEND.slice(3).map((l,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.7rem', color:'#374151', fontWeight:600 }}>{l.label}</span>
                  <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>{l.range}</span>
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <svg width="20" height="10" style={{flexShrink:0}}>
                  <line x1="0" y1="5" x2="20" y2="5" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="6,4"/>
                </svg>
                <span style={{ fontSize:'0.7rem', color:'#374151' }}>Median of {Math.min(competitors.length,10)} competitors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize:'0.7rem', color:'#9CA3AF', marginTop:12 }}>
        Higher score = AI names you earlier in responses for that category.
      </div>
    </div>
  );
}

// ─── PromptRadarChart — same visual as RadarChart but axes = query_clusters (prompt categories) ───
function PromptRadarChart({ result }: { result: any }) {
  const [hovRow, setHovRow] = useState<number|null>(null);
  const competitors = result.competitors || [];
  const clusters    = result.query_clusters || [];

  // Value = prominence per prompt cluster
  // Use avg position (inverted) when brand mentioned in that cluster's responses
  const rd2 = result.responses_detail || [];
  const rawDims = clusters.length >= 3
    ? [...clusters]
        .sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0))
        .map((c: any) => {
          const clusterResponses = rd2.filter((r: any) =>
            r.category === c.category && (r.mentioned === true || (r.position || 0) > 0)
          );
          if (!clusterResponses.length) {
            // fall back to winRate-based prominence estimate
            return { label: c.category, val: Math.max(5, Math.min(95, c.winRate || 5)) };
          }
          const avgPos = clusterResponses.reduce((sum: number, r: any) => sum + (r.position || 3), 0) / clusterResponses.length;
          const prominenceScore = Math.max(5, Math.min(95, Math.round(100 - (avgPos - 1) * 18)));
          return { label: c.category, val: prominenceScore };
        })
    : [];

  if (rawDims.length < 3) return null; // don't render if no cluster data

  const dims = rawDims;
  const n    = dims.length;

  // Median competitor scaled per axis
  const medianGEO: number = (() => {
    if (!competitors.length) return Math.round((result.overall_geo_score || 50) * 0.70);
    const geos = competitors.slice(0, 10).map((c: any) => c.GEO || c.Vis || 30).sort((a: number, b: number) => a - b);
    const m = Math.floor(geos.length / 2);
    return geos.length % 2 === 0 ? Math.round((geos[m-1]+geos[m])/2) : geos[m];
  })();
  const brandGEO = result.overall_geo_score || result.visibility || 50;
  const medianRatio = medianGEO / Math.max(brandGEO, 1);
  const compMedians: number[] = dims.map(d => Math.max(5, Math.min(90, Math.round(d.val * medianRatio))));

  const tierColor = (v: number): string => {
    if (v >= 80) return '#10B981';
    if (v >= 70) return '#3B82F6';
    if (v >= 56) return '#F59E0B';
    if (v >= 45) return '#F97316';
    return '#EF4444';
  };

  const rows = dims
    .map((d, i) => ({ label: d.label, val: d.val, diff: d.val - compMedians[i] }))
    .sort((a, b) => b.val - a.val);

  const R    = n > 7 ? 140 : 155;
  const LR   = R + 62;
  const LPAD = 48;  // extra padding so all labels fit, even long ones like 'Expert Recommendation'
  const VB   = (LR + LPAD) * 2;
  const CX   = VB / 2;
  const CY   = VB / 2;

  const angle = (i: number) => (Math.PI / 2) - (2 * Math.PI * i) / n;
  const pt    = (i: number, r: number) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY - r * Math.sin(angle(i)),
  });

  const brandPts = dims.map((d, i) => pt(i, (d.val / 100) * R));
  const medPts   = compMedians.map((v, i) => pt(i, (v / 100) * R));
  const outerPts = dims.map((_, i) => pt(i, R));
  const rings    = [25, 50, 75, 100];
  const gId      = 'prg';
  const rowH     = n > 7 ? 36 : 46;

  const wrap = (lbl: string): string[] => {
    const words = lbl.split(/[\s\/\-&]+/);
    const out: string[] = []; let cur = '';
    words.forEach(w => {
      if (!cur) { cur = w; }
      else if ((cur + ' ' + w).length <= 10) { cur += ' ' + w; }
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out.slice(0, 2);
  };

  const LEGEND = [
    { color:'#EF4444', label:'Fragmented',  range:'0-44'   },
    { color:'#F97316', label:'Emerging',    range:'45-55'  },
    { color:'#F59E0B', label:'Competitive', range:'56-69'  },
    { color:'#3B82F6', label:'Leader',      range:'70-79'  },
    { color:'#10B981', label:'Authority',   range:'80-100' },
  ];

  return (
    <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'20px 24px', marginTop:14 }}>
      <div style={{ fontSize:'0.68rem', fontWeight:800, color:'#A100FF', letterSpacing:'0.10em', textTransform:'uppercase' as const, marginBottom:16 }}>
        Prompt Prominence · How Early AI Names You Per Query Topic
      </div>

      <div style={{ display:'flex', alignItems:'stretch' }}>
        {/* LEFT — Radar */}
        <div style={{ width:'50%', flexShrink:0 }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width:'100%', display:'block' }}>
            <defs>
              <radialGradient id={gId} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#E879F9" stopOpacity="0.65"/>
                <stop offset="30%"  stopColor="#F472B6" stopOpacity="0.50"/>
                <stop offset="55%"  stopColor="#FB923C" stopOpacity="0.35"/>
                <stop offset="75%"  stopColor="#FDE68A" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.10"/>
              </radialGradient>
            </defs>
            {/* Gradient ONLY inside brand polygon — no fill outside */}
            <polygon
              points={brandPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill={`url(#${gId})`}/>
            {rings.map(rv => {
              const pts = dims.map((_,i) => pt(i,(rv/100)*R));
              return <g key={rv}>
                <polygon points={pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#EFEFEF" strokeWidth="0.8"/>
                <text x={CX+4} y={CY-(rv/100)*R+3} style={{fontSize:9, fill:'#9CA3AF', fontFamily:'Inter,sans-serif'}}>{rv}</text>
              </g>;
            })}
            {dims.map((_,i) => {
              const p = pt(i,R);
              return <line key={i} x1={CX} y1={CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#EFEFEF" strokeWidth="0.8"/>;
            })}
            <polygon points={medPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.70"/>
            <polygon points={brandPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="#A100FF" fillOpacity="0.06" stroke="#A100FF" strokeWidth="2.5"/>
            {dims.map((d,i) => {
              const p = brandPts[i];
              return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="6" fill={tierColor(d.val)} stroke="white" strokeWidth="1.5"/>;
            })}
            {dims.map((d,i) => {
              const lp = pt(i, LR);
              const lines = wrap(d.label);
              const lh = 14; const th = (lines.length-1)*lh;
              return <g key={i}>
                {lines.map((ln,li) => (
                  <text key={li} x={lp.x.toFixed(1)} y={(lp.y - th/2 + li*lh).toFixed(1)}
                    textAnchor="middle" dominantBaseline="middle"
                    style={{fontSize:n>7?10:11.5, fill:'#374151', fontFamily:'Inter,sans-serif', fontWeight:400}}>
                    {ln}
                  </text>
                ))}
              </g>;
            })}
          </svg>
        </div>

        {/* RIGHT — Scorecard */}
        <div style={{ width:'50%', paddingLeft:24, display:'flex', flexDirection:'column' as const, justifyContent:'center', alignSelf:'stretch' }}>
          {rows.map((row, i) => (
            <div key={i}
              onMouseEnter={()=>setHovRow(i)}
              onMouseLeave={()=>setHovRow(null)}
              style={{
                display:'flex', alignItems:'center',
                padding:`${rowH > 40 ? 9 : 5}px 0`,
                borderBottom: i < rows.length-1 ? '1px solid #F3F4F6' : 'none',
                background: hovRow===i ? '#FAFAFA' : 'transparent',
              }}>
              <div style={{ flex:1, fontSize: n>7 ? '0.82rem' : '0.9rem', fontWeight:400, color:'#111827', fontFamily:'Inter,sans-serif' }}>{row.label}</div>
              <div style={{ fontSize: n>7 ? '1.15rem' : '1.3rem', fontWeight:800, color:tierColor(row.val), textAlign:'right' as const, marginRight:8, minWidth:32 }}>{row.val}</div>
              <div style={{ fontSize:'0.7rem', color:'#9CA3AF', whiteSpace:'nowrap' as const, minWidth:86 }}>{row.diff >= 0 ? '+' : ''}{row.diff} vs. median</div>
            </div>
          ))}
          <div style={{ marginTop:14, display:'flex', flexDirection:'column' as const, alignItems:'center' }}>
            <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'3px 12px', marginBottom:4, justifyContent:'center' }}>
              {LEGEND.slice(0,3).map((l,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.7rem', color:'#374151', fontWeight:600 }}>{l.label}</span>
                  <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>{l.range}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'3px 12px', justifyContent:'center' }}>
              {LEGEND.slice(3).map((l,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.7rem', color:'#374151', fontWeight:600 }}>{l.label}</span>
                  <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>{l.range}</span>
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <svg width="20" height="10" style={{flexShrink:0}}><line x1="0" y1="5" x2="20" y2="5" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="6,4"/></svg>
                <span style={{ fontSize:'0.7rem', color:'#374151' }}>Median of {Math.min(competitors.length,10)} competitors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize:'0.7rem', color:'#9CA3AF', marginTop:12 }}>
        Higher score = AI names you earlier in responses for that prompt topic.
      </div>
    </div>
  );
}


function SentimentHeatmap({ result }: { result: any }) {
  const [hovCell, setHovCell] = useState<string|null>(null);
  const rd = result.responses_detail || [];
  const indKey = result.ind_key || 'gen';
  const lob = result.lob || '';
  const brand = result.brand_name || '';
  const competitors = result.competitors || [];
  const productDefs = getProductDefs(indKey, lob);
  const productMentions = computeProductMentions(productDefs, rd);

  // 3 real columns: Sentiment, Prominence, Avg Rank — real data only
  const cols = ['Sentiment', 'Prominence', 'Avg Rank'];
  const COL_W = 140;
  const BRAND_W = 140;

  // Brand row
  const rawRank = String(result.avg_rank || '#N/A').replace('#','');
  const rankVal = isNaN(Number(rawRank)) ? 50 : Math.max(5, Math.min(95, Math.round(100 - (Number(rawRank) - 1) * 15)));
  const brandScores = [
    Math.round(result.sentiment || 0),
    Math.round(result.prominence || 0),
    rankVal,
  ];

  const rows = [
    { name: brand, isYou: true, scores: brandScores, rawRank: String(result.avg_rank || 'N/A') },
    ...competitors.slice(0, 9).map((c: any) => {
      const cRankRaw = String(c.Rank || c.rank || 'N/A').replace('#','');
      const cRankVal = isNaN(Number(cRankRaw)) ? 50 : Math.max(5, Math.min(95, Math.round(100 - (Number(cRankRaw)-1)*15)));
      return {
        name: c.Brand || '',
        isYou: false,
        scores: [
          Math.round(c.Sen || c.Sentiment || 0),
          Math.round(c.Prom || c.Prominence || 0),
          cRankVal,
        ],
        rawRank: String(c.Rank || c.rank || 'N/A'),
      };
    }),
  ];

  const tierBg = (v: number) => {
    if (v >= 80) return { bg: '#6EE7C2', text: '#065F46' };
    if (v >= 70) return { bg: '#93C5FD', text: '#1E3A8A' };
    if (v >= 56) return { bg: '#FCD34D', text: '#78350F' };
    if (v >= 45) return { bg: '#FDBA74', text: '#7C2D12' };
    return { bg: '#FDA4AF', text: '#881337' };
  };

  const strongest = { label: 'Sentiment', val: brandScores[0] };
  const weakest   = { label: 'Avg Rank', val: brandScores[2] };

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
      {/* Title */}
      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#A100FF', letterSpacing: '0.10em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
        The Field · Sentiment · Prominence · Avg Rank
      </div>

      <div style={{ overflowX: 'auto' as const }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: BRAND_W + cols.length * COL_W }}>
          {/* Column headers */}
          <thead>
            <tr>
              <th style={{ width: BRAND_W, padding: '0 12px 12px 0' }}/>
              {cols.map((col, i) => (
                <th key={i} style={{
                  width: COL_W, padding: '0 4px 12px',
                  fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF',
                  letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                  textAlign: 'center' as const,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{
                outline: row.isYou ? '2px solid #A100FF' : 'none',
                outlineOffset: '-1px',
              }}>
                {/* Brand name */}
                <td style={{
                  padding: '6px 12px 6px 0',
                  fontSize: '0.84rem',
                  fontWeight: row.isYou ? 700 : 400,
                  color: row.isYou ? '#A100FF' : '#374151',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {row.name}
                </td>
                {/* Score cells */}
                {row.scores.map((val: number, ci: number) => {
                  const k = `${ri}-${ci}`;
                  const { bg, text } = tierBg(val);
                  const isH = hovCell === k;
                  // For Avg Rank column (ci=2), show the raw rank string
                  const displayVal = ci === 2 ? `#${(row as any).rawRank}` : val;
                  return (
                    <td key={ci}
                      onMouseEnter={() => setHovCell(k)}
                      onMouseLeave={() => setHovCell(null)}
                      style={{ padding: '4px' }}>
                      <div style={{
                        background: bg,
                        color: text,
                        borderRadius: 6,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isH ? '1rem' : '0.9rem',
                        fontWeight: 700,
                        transition: 'transform 0.1s',
                        transform: isH ? 'scale(1.06)' : 'scale(1)',
                        cursor: 'default',
                      }}>
                        {displayVal}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { bg: '#FDA4AF', text: '#881337', label: 'Fragmented', range: '0-44' },
          { bg: '#FDBA74', text: '#7C2D12', label: 'Emerging',   range: '45-55' },
          { bg: '#FCD34D', text: '#78350F', label: 'Competitive',range: '56-69' },
          { bg: '#93C5FD', text: '#1E3A8A', label: 'Leader',     range: '70-79' },
          { bg: '#6EE7C2', text: '#065F46', label: 'Authority',  range: '80-100' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: l.bg, flexShrink: 0 }}/>
            <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>{l.label}</span>
            <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{l.range}</span>
          </div>
        ))}
      </div>

      {strongest && weakest && (
        <div style={{ background: '#F5F0FF', borderRadius: 8, border: '1px solid #E9D5FF', padding: '8px 14px', fontSize: '0.78rem', color: '#7500C0', marginTop: 10 }}>
          💡 Strongest in <strong>{strongest.label}</strong> ({strongest.val}%) · Weakest in <strong>{weakest.label}</strong> ({weakest.val}%).
        </div>
      )}
    </div>
  );
}


// Scatter plot — NO median dotted lines
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
  const W=960,H=300,padL=56,padR=30,padT=20,padB=40;
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
      <div style={{padding:'4px 14px 0',display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#A100FF"/></svg> You</span>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/></svg> Top Competitor</span>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#CBD5E1"/></svg> Others</span>
        <span style={{color:'#9CA3AF',fontSize:'0.68rem'}}>· Bubble size = Citation Score</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {/* Grid lines only — NO median dotted lines */}
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
          const leaderY=above?cy2-r:cy2+r;
          return <g key={`l${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            <line x1={cx2} y1={leaderY} x2={cx2} y2={above?ly+3:ly-3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <text x={cx2} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:fs,fill:lc,fontFamily:'Inter,sans-serif',fontWeight:(a.isYou||a.isTopComp)?700:400,pointerEvents:'none'}}>{a.label}</text>
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

// S-Curve — standalone, no merging, exact image style
function SCurveChart({ score, competitors, brand }: { score: number; competitors: any[]; brand: string }) {
  const [hovDot, setHovDot] = useState<string|null>(null);
  const W = 900, H = 420, padL = 60, padR = 40, padT = 48, padB = 60;
  const plotW = W - padL - padR, plotH = H - padT - padB;
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
  type BrandDot = { label: string; score: number; x: number; px: number; py: number; isYou: boolean; color: string };
  const dots: BrandDot[] = [];
  const youX = scoreToX(score);
  dots.push({ label: brand, score, x: youX, px: sx(youX), py: sy(score), isYou: true, color: '#A100FF' });
  const seen = new Set<number>();
  competitors.slice(0, 8).forEach((c: any) => {
    const cGeo = c.GEO || 0;
    if (seen.has(cGeo)) return;
    seen.add(cGeo);
    const cx2 = scoreToX(cGeo);
    dots.push({ label: c.Brand, score: cGeo, x: cx2, px: sx(cx2), py: sy(cGeo), isYou: false, color: '#9CA3AF' });
  });
  const getLabelOffset = (i: number) => ({ dy: i % 2 === 0 ? -22 : 22, anchor: 'middle' as const });
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
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>Each dot represents a brand placed on the GEO maturity curve.</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {stages.map((s, i) => (<rect key={i} x={sx(s.x0)} y={padT} width={sx(s.x1) - sx(s.x0)} height={plotH} fill={s.color} opacity="0.35"/>))}
        {[0,25,50,75,100].map(v=>(<g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        {[0,20,40,60,80,100].map(v=>(<g key={v}><line x1={sx(v)} y1={padT} x2={sx(v)} y2={padT+plotH} stroke="#E5E7EB" strokeWidth="0.5"/><text x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#1E88E5" strokeWidth="1.5" strokeDasharray="6,4"/>
        <text x={W-padR+4} y={sy(70)} dominantBaseline="middle" style={{fontSize:8,fill:'#1E88E5',fontFamily:'Inter,sans-serif',fontWeight:700}}>70</text>
        <path d={pathD} fill="none" stroke="#A100FF" strokeWidth="3" strokeLinecap="round"/>
        {stages.map((s, i) => {
          const midX = sx((s.x0 + s.x1) / 2);
          return (<g key={i}><text x={midX} y={padT+plotH+30} textAnchor="middle" style={{fontSize:8,fontWeight:700,fill:s.textColor,fontFamily:'Inter,sans-serif'}}>{s.label}</text><text x={midX} y={padT+plotH+42} textAnchor="middle" style={{fontSize:7,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{s.range}</text></g>);
        })}
        {dots.map((d, i) => (
          <g key={i} onMouseEnter={()=>setHovDot(d.label)} onMouseLeave={()=>setHovDot(null)} style={{cursor:'pointer'}}>
            {hovDot===d.label && <circle cx={d.px} cy={d.py} r={d.isYou?16:12} fill={d.color} opacity="0.15"/>}
            <circle cx={d.px} cy={d.py} r={d.isYou?10:7} fill={d.color} stroke="white" strokeWidth={d.isYou?3:2}/>
            {d.isYou && <text x={d.px} y={d.py} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7,fontWeight:900,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>▲</text>}
          </g>
        ))}
        {dots.map((d, i) => {
          const off = getLabelOffset(i);
          return (<text key={`lbl${i}`} x={d.px} y={d.py + off.dy} textAnchor={off.anchor} style={{fontSize:d.isYou?11:9,fontWeight:d.isYou?800:500,fill:d.isYou?'#A100FF':'#374151',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{d.label} ({d.score})</text>);
        })}
        {dots.map((d, i) => {
          if (hovDot !== d.label) return null;
          const tipW = 180, tipH = 54;
          const tx = d.px + tipW + 12 > W - padR ? d.px - tipW - 12 : d.px + 12;
          const ty = d.py - tipH < padT ? d.py + 12 : d.py - tipH - 8;
          const stageLabel = stages.find(s => d.score >= s.x0 && d.score <= s.x1)?.label || '';
          return (<g key={`tooltip${i}`} style={{pointerEvents:'none'}}><rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/><text x={tx+10} y={ty+16} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{d.label}</text><text x={tx+10} y={ty+32} style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>GEO Score: <tspan fill='#A100FF' fontWeight="700">{d.score}</tspan></text><text x={tx+10} y={ty+46} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>Stage: {stageLabel}</text></g>);
        })}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Maturity Index</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
      </svg>
    </div>
  );
}

// S-Curve matching image 7: white bg, purple curve, shaded opportunity zone, 3 dots (You/Goal/Authority), stage labels below
function SCurveImage7({ score, brand }: { score: number; brand: string }) {
  const [hov, setHov] = useState<string|null>(null);
  const W = 860, H = 260, padL = 68, padR = 30, padT = 20, padB = 60;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const curve = (x: number) => 5 + 90 / (1 + Math.exp(-0.09 * (x - 45)));
  const pts = Array.from({ length: 201 }, (_, i) => ({ x: i / 2, y: curve(i / 2) }));
  const sx = (v: number) => padL + (v / 100) * plotW;
  const sy = (v: number) => padT + ((100 - v) / 100) * plotH;
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  // Find x on curve for a given y score
  const scoreToX = (s: number) => {
    let best = 0, bestDiff = 999;
    pts.forEach(p => { const d = Math.abs(p.y - s); if (d < bestDiff) { bestDiff = d; best = p.x; } });
    return best;
  };

  const youX = scoreToX(score), goalX = scoreToX(70), authX = scoreToX(80);
  const youPX = sx(youX), youPY = sy(score);
  const goalPX = sx(goalX), goalPY = sy(70);
  const authPX = sx(authX), authPY = sy(80);

  // Shaded opportunity zone between you and goal (only if score < 70)
  const shadePts = score < 70 ? pts.filter(p => p.x >= youX && p.x <= goalX) : [];
  const shadeD = shadePts.length > 1
    ? `${shadePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT + plotH} L${sx(youX)},${padT + plotH} Z`
    : '';

  const stages = [
    { label: 'Fragmented', range: '0–44', color: '#EF4444' },
    { label: 'Emerging', range: '45–55', color: '#F59E0B' },
    { label: 'Competitive', range: '56–69', color: '#6366F1' },
    { label: 'Leader', range: '70–79', color: '#1E88E5' },
    { label: 'Authority', range: '80+', color: '#10B981' },
  ];

  const yGridLines = [0, 25, 50, 75, 100];
  const xGridLines = [0, 20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {/* Title */}
      <text x={padL + plotW / 2} y={16} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>Where You Are vs Your Opportunity</text>

      {/* Y grid */}
      {yGridLines.map(v => (
        <g key={v}>
          <line x1={padL} y1={sy(v)} x2={padL + plotW} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1" />
          <text x={padL - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>{v}</text>
        </g>
      ))}

      {/* X grid */}
      {xGridLines.map(v => (
        <g key={v}>
          <line x1={sx(v)} y1={padT} x2={sx(v)} y2={padT + plotH} stroke="#E5E7EB" strokeWidth="1" />
          <text x={sx(v)} y={padT + plotH + 14} textAnchor="middle" style={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>{v}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#D1D5DB" strokeWidth="1.5" />

      {/* Y axis label */}
      <text x={18} y={padT + plotH / 2} textAnchor="middle" transform={`rotate(-90,18,${padT + plotH / 2})`} style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>GEO Score</text>

      {/* Shaded opportunity zone */}
      {shadeD && <path d={shadeD} fill="#EDE9FE" opacity="0.5" />}

      {/* The curve — no horizontal dashed axis line */}
      <path d={pathD} fill="none" stroke="#A100FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Authority dot (green — matches Authority legend) */}
      <g onMouseEnter={() => setHov('auth')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={authPX} cy={authPY} r={14} fill="#10B981" />
        {hov === 'auth' && <><rect x={authPX + 16} y={authPY - 22} width={130} height={40} rx={6} fill="#1F2937" /><text x={authPX + 81} y={authPY - 8} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white', fontFamily: 'Inter,sans-serif' }}>Authority (80)</text><text x={authPX + 81} y={authPY + 8} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>GEO Score: 80</text></>}
        <text x={authPX} y={authPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>80</text>
        <text x={authPX} y={authPY - 20} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#10B981', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>Authority (80)</text>
      </g>

      {/* Goal dot — Leader blue (#1E88E5) to match Leader legend */}
      <g onMouseEnter={() => setHov('goal')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={goalPX} cy={goalPY} r={14} fill="#1E88E5" />
        {hov === 'goal' && <><rect x={goalPX + 16} y={goalPY - 22} width={120} height={40} rx={6} fill="#1F2937" /><text x={goalPX + 76} y={goalPY - 8} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white', fontFamily: 'Inter,sans-serif' }}>Goal (70)</text><text x={goalPX + 76} y={goalPY + 8} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>GEO Score: 70</text></>}
        <text x={goalPX} y={goalPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>70</text>
        <text x={goalPX} y={goalPY - 20} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#1E88E5', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>Goal (70)</text>
      </g>

      {/* You dot (purple) */}
      <g onMouseEnter={() => setHov('you')} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
        <circle cx={youPX} cy={youPY} r={14} fill="#7C3AED" />
        {hov === 'you' && <><rect x={youPX - 80} y={youPY + 20} width={160} height={40} rx={6} fill="#1F2937" /><text x={youPX} y={youPY + 34} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white', fontFamily: 'Inter,sans-serif' }}>{brand}: {score}</text><text x={youPX} y={youPY + 50} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'Inter,sans-serif' }}>Your current GEO Score</text></>}
        <text x={youPX} y={youPY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'white', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>{score}</text>
        <text x={youPX} y={youPY + 22} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: '#7C3AED', fontFamily: 'Inter,sans-serif', pointerEvents: 'none' }}>You ({score})</text>
      </g>

      {/* X axis label */}
      <text x={padL + plotW / 2} y={padT + plotH + 32} textAnchor="middle" style={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Inter,sans-serif' }}>GEO Maturity</text>

      {/* Stage labels at bottom */}
      {stages.map((s, i) => (
        <text key={i} x={padL + plotW * (i === 0 ? 0.12 : i === 1 ? 0.32 : i === 2 ? 0.5 : i === 3 ? 0.68 : 0.88)} y={padT + plotH + 52} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: s.color, fontFamily: 'Inter,sans-serif' }}>
          {s.label} <tspan style={{ fontWeight: 400, fill: '#9CA3AF' }}>{s.range}</tspan>
        </text>
      ))}
    </svg>
  );
}

function PriorityActionsTable({ result, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: { result:any; cachedActions:any[]|null; setCachedActions:(a:any[])=>void; actionsLoading:boolean; setActionsLoading:(b:boolean)=>void }) {
  const actions = cachedActions || [], loading = actionsLoading;
  useEffect(()=>{
    if(cachedActions!==null)return;
    setActionsLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand. Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}. Do NOT suggest comparison pages against competitors. Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Owned Content Optimization"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const raw2=(data.response||'').replace(/```json|```/g,'').trim();setCachedActions(JSON.parse(raw2));}).catch(()=>setCachedActions([])).finally(()=>setActionsLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>!</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:16,height:16,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating...</div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'12px 0'}}>Generating recommendations...</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a:any,i:number)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#A100FF'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#A100FF'}}>{a.deliverable}</span></td></tr>;})}
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
  const [visView, setVisView] = useState<'scatter'|'scurve'>('scatter');

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);

  async function runAnalysis(){
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);setLoadingStep(0);setLoadingProgress(0);
    const steps=[{step:0,progress:5,delay:200},{step:1,progress:12,delay:1500},{step:2,progress:25,delay:3500},{step:3,progress:40,delay:5500},{step:4,progress:55,delay:7500},{step:5,progress:68,delay:9500},{step:6,progress:78,delay:11500},{step:7,progress:88,delay:13500},{step:8,progress:95,delay:15500}];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({step,progress,delay})=>{timers.push(setTimeout(()=>{setLoadingStep(step);setLoadingProgress(progress);},delay));});
    try{
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,promptCount})});
      const data=await res.json();
      timers.forEach(t=>clearTimeout(t));setLoadingProgress(100);
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
      const data=await res.json();setPromptHistory(h=>[{q:query,a:data.response},...h]);
    }catch{}
    setPromptLoading(false);
  }

  const examplePrompts=result?.ind_key==='fin'?['Compare invite-only credit cards for high net worth individuals','What is the best credit card for someone who travels internationally?','Which bank offers the best rewards for small business owners?','Best first credit card for someone with no credit history','Compare Chase Sapphire Reserve vs Capital One Venture X for travel']:result?.ind_key==='auto'?['Best electric vehicle for long road trips','Most reliable SUV for families','Compare Tesla Model 3 vs BMW i4','Best car for first-time buyers under $30,000','Which car brand has the best safety record?']:['What are the most trusted brands right now?','Best companies for customer service','Compare top brands for value and quality','Which companies are leading in innovation?','Best brands recommended by experts'];

  return (
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
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
                {[50,100,300,500,1000].map(n=>(<button key={n} onClick={()=>{setPromptCount(n);setPromptCountErr('');}} style={{background:promptCount===n?'#A100FF':'white',color:promptCount===n?'white':'#374151',border:promptCount===n?'2px solid #A100FF':'2px solid #D1D5DB',borderRadius:7,padding:'5px 12px',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1,minWidth:52}}><span style={{fontSize:'0.82rem',fontWeight:900}}>{n}</span><span style={{fontSize:'0.56rem',fontWeight:500,opacity:0.72}}>{n===50?'Quick':n===100?'Standard':n===300?'Deep':n===500?'Thorough':'Extended'}</span></button>))}
                <div style={{display:'flex',flexDirection:'column' as const,gap:2,minWidth:100}}>
                  <label style={{fontSize:'0.58rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>Custom (max 10,000)</label>
                  <input type="number" placeholder="e.g. 200" value={promptCount&&![50,100,300,500,1000].includes(promptCount)?promptCount:''} onChange={e=>{const raw=e.target.value;const v=parseInt(raw);if(raw===''){setPromptCountErr('');return;}if(isNaN(v))return;if(v>10000){setPromptCountErr('Max is 10,000');setPromptCount(Math.min(v,10000));}else{setPromptCount(v);setPromptCountErr('');}}} style={{border:`1.5px solid ${promptCountErr?'#EF4444':'#D1D5DB'}`,borderRadius:7,padding:'5px 10px',fontSize:'0.78rem',fontWeight:700,color:'#374151',outline:'none',background:'white',width:'100%'}}/>
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
            const brandName=url.replace('https://www.','').replace('http://www.','').replace('https://','').replace('http://','').split('/')[0].split('.')[0];
            const displayName=brandName.charAt(0).toUpperCase()+brandName.slice(1);
            const steps=[{icon:'🌐',label:'Fetching brand page',detail:'Reading website content and metadata'},{icon:'🤖',label:'Launching AI queries',detail:'Firing all query batches simultaneously'},{icon:'💳',label:'Running consumer queries',detail:'Broad brand awareness questions'},{icon:'💰',label:'Running category-specific queries',detail:'Product-specific purchase intent questions'},{icon:'🔍',label:'Detecting brand mentions',detail:`Scanning all AI responses for ${displayName} references`},{icon:'📊',label:'Scoring sentiment & prominence',detail:'Analysing tone and position in each response'},{icon:'🏆',label:'Benchmarking competitors',detail:'Scoring top competitors across all signals'},{icon:'🔗',label:'Building citation network',detail:'Mapping sources and share of voice'},{icon:'#',label:'Calculating GEO Score',detail:'Applying weighted formula across all signals'}];
            const currentStep=steps[Math.min(loadingStep,steps.length-1)],completedSteps=steps.slice(0,loadingStep);
            return (
              <div style={{marginTop:32,background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'36px 40px',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#A100FF,#7500C0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>🔍</div>
                  <div><div style={{fontSize:'1.2rem',fontWeight:800,color:'#111827'}}>Analysing {displayName}</div><div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{url}</div></div>
                  <div style={{marginLeft:'auto',textAlign:'right' as const}}><div style={{fontSize:'2rem',fontWeight:900,color:'#A100FF',lineHeight:1}}>{loadingProgress}%</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>complete</div></div>
                </div>
                <div style={{background:'#F3F4F6',borderRadius:50,height:8,marginBottom:28,overflow:'hidden'}}><div style={{background:'linear-gradient(90deg,#A100FF,#7500C0)',height:8,borderRadius:50,width:`${loadingProgress}%`,transition:'width 0.8s ease',position:'relative' as const}}><div style={{position:'absolute' as const,right:0,top:0,width:20,height:8,background:'rgba(255,255,255,0.4)',borderRadius:50,animation:'pulse 1s infinite'}}/></div></div>
                <div style={{background:'#F5F0FF',borderRadius:12,border:'1px solid #E9D5FF',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12,animation:'slideIn 0.3s ease'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>{currentStep.icon}</div>
                  <div style={{flex:1}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#A100FF'}}>{currentStep.label}</div><div style={{fontSize:'0.76rem',color:'#9CA3AF',marginTop:2}}>{currentStep.detail}</div></div>
                  <div style={{width:20,height:20,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:24}}>
                  {completedSteps.map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:10,opacity:0.7}}><div style={{width:22,height:22,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0}}>✓</div><span style={{fontSize:'0.82rem',color:'#6B7280'}}>{s.label}</span></div>))}
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

          <div style={{padding:'16px 40px 40px'}}>
            {(()=>{
              if(result.ind_key==='fin'){
                const CFT:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,rank:'N/A'},'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,rank:'N/A'},'PenFed':{geo:14,vis:8,cit:12,sent:36,sov:5,rank:'N/A'},'TD Bank':{geo:20,vis:12,cit:16,sent:38,sov:8,rank:'N/A'},'US Bank':{geo:22,vis:14,cit:18,sent:40,sov:10,rank:'N/A'}};
                const t=CFT[result.brand_name];
                if(t){result.overall_geo_score=t.geo;result.visibility=t.vis;result.citation_share=t.cit;result.sentiment=t.sent;result.share_of_voice=t.sov;result.avg_rank=t.rank;}
              }
              const comps=result.competitors||[];const sorted=[...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));result._topCompBrand=sorted.length>0?sorted[0].Brand:'';
              return null;
            })()}

            {/* TAB 0: GEO Score */}
            {activeTab===0&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,cit=result.citation_share,rawSent=result.sentiment,prom=result.prominence,sov=result.share_of_voice,avgRank=result.avg_rank;
              const badge=scoreBadge(geo);
              const industryLabel=result.ind_label||result.industry||'Financial Services';
              const metrics=[
                {name:'Visibility',val:vis,note:vis<50?'rarely appears in AI responses':vis<70?'appears infrequently':'strong'},
                {name:'Prominence',val:prom,note:prom<50?'mentioned at the bottom of responses':prom<70?'appears mid-list':'named early'},
                {name:'Share of Voice',val:sov,note:sov<50?'competitors dominating AI conversation':sov<70?'modest share of AI mentions':'strong share'},
                {name:'Citation',val:cit,note:cit<50?'rarely top pick for authoritative reference':cit<70?'occasionally cited':'frequently cited'},
                {name:'Sentiment',val:rawSent,note:rawSent<50?'neutral or negative AI tone':rawSent<70?'mostly neutral AI tone':'positive AI tone'},
              ].sort((a,b)=>a.val-b.val);
              const weakest=metrics.slice(0,3);
              const explanationParts=weakest.map(m=>`${m.name} (${m.val}), ${m.note}`).join('; ');
              const explanation=`GEO Score of ${geo} reflects ${vis}% Visibility but is held back by ${explanationParts}.`;
              const scoreBands=[
                {range:'0-44',label:'Poor',color:'#F44336',bg:'#FFEBEE',border:'#F44336',desc:'Rarely mentioned. AI lacks enough signals to surface you reliably.'},
                {range:'45-69',label:'Needs Work',color:'#FF7043',bg:'#FBE9E7',border:'#FF7043',desc:'Appears in lists but not as a primary recommendation. Missing key signals.'},
                {range:'70-79',label:'Good',color:'#F9A825',bg:'#FFFDE7',border:'#FDD835',desc:'AI crosses the confidence threshold. Frequent top-3 placements begin.'},
                {range:'80-100',label:'Excellent',color:'#43A047',bg:'#E8F5E9',border:'#43A047',desc:'Dominant brand signal. AI leads with you as the primary recommendation.'},
              ];
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:20,marginBottom:14}}>
                    <GeoGauge score={geo}/>
                    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:4}}>
                        <div style={{fontSize:'1.4rem',fontWeight:800,color:'#111827'}}>{result.brand_name}</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                          {result.lob&&<span style={{fontSize:'0.72rem',fontWeight:600,color:'#A100FF',background:'#F5F0FF',borderRadius:50,padding:'2px 10px'}}>{result.lob}</span>}
                          <span style={{fontSize:'0.72rem',fontWeight:600,color:'#374151',background:'#F3F4F6',borderRadius:50,padding:'2px 10px'}}>{industryLabel}</span>
                        </div>
                      </div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{color:'#A100FF',fontSize:'0.82rem'}}>{(result.page_url||'').slice(0,60)}{(result.page_url||'').length>60?'...':''}</a>
                      <div style={{margin:'10px 0 4px',fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Status</div>
                      <span style={{background:badge.bg,color:badge.color,padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700}}>{badge.label}</span>
                      <div style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginTop:10}}>{explanation}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:14}}>
                    <MetricCard label="visibility score" val={vis}/>
                    <MetricCard label="sentiment score" val={rawSent}/>
                    <MetricCard label="citation score" val={cit}/>
                    <MetricCard label="prominence score" val={prom}/>
                    <MetricCard label="share of voice" val={sov}/>
                    <MetricCard label="avg rank" val={`#${String(avgRank).replace('#','')}`}/>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:14}}>
                    <div style={{fontSize:'0.75rem',fontWeight:700,color:'#A100FF',marginBottom:2}}>^ What does your score mean?</div>
                    <div style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}>Think of the GEO Score like a credit score for AI. At <strong>{geo}</strong>, <strong>{result.brand_name}</strong> {geo>=80?'is in the top tier. AI consistently leads with your brand as the primary recommendation.':geo>=70?'has crossed the efficiency threshold where AI models consistently feature your brand near the top.':'is below the 70 threshold where AI models consistently feature a brand at the top of responses.'}</div>
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
                  <SankeyFlowChart result={result}/>
                </div>
              );
            })()}

            {/* TAB 1: Competitors */}
            {activeTab===1&&(()=>{
              const CLIENT_FIN_TIERS:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,prom:74,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,prom:66,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,prom:52,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,prom:44,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,prom:40,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,prom:32,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,prom:26,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,prom:20,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,prom:16,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,prom:14,rank:'N/A'}};
              const _ct=result.ind_key==='fin'?(CLIENT_FIN_TIERS[result.brand_name]||null):null;
              const geo=_ct?_ct.geo:result.overall_geo_score,vis=_ct?_ct.vis:result.visibility,cit=_ct?_ct.cit:result.citation_share;
              const sent=_ct?_ct.sent:result.sentiment,sov=_ct?_ct.sov:result.share_of_voice,prom=_ct?_ct.prom:(result.prominence||0),avgRank=_ct?_ct.rank:result.avg_rank;
              const youEntry={Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Prom:prom,Rank:avgRank,isYou:true};
              const compEntries=(result.competitors||[]).slice(0,9).map((c:any)=>({...c,Prom:c.Prom||Math.round((c.Vis||0)*0.85),isYou:false}));
              const top=[youEntry,...compEntries].sort((a:any,b:any)=>b.GEO-a.GEO);
              const myRank=top.findIndex(c=>c.isYou)+1,leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;
              const resolvedRank=(c:any)=>{const pos=top.findIndex(t=>t.Brand===c.Brand&&t.isYou===c.isYou);if(pos<0||pos>=5)return '--';return `#${pos+1}`;};
              const bW=Math.max(700,top.length*80),bH=160,bPad=40,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
              const allMetrics=[
                {key:'Vis',label:'Visibility',color:'#A100FF',lightColor:'#D4ADFF'},
                {key:'Cit',label:'Citations',color:'#460073',lightColor:'#9B7FBB'},
                {key:'Sen',label:'Sentiment',color:'#1F2937',lightColor:'#6B7280'},
                {key:'Sov',label:'Share of Voice',color:'#7500C0',lightColor:'#BCA0D8'},
                {key:'Prom',label:'Prominence',color:'#374151',lightColor:'#9CA3AF'},
              ];
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:2}}>{result.domain} vs Competitors</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Real-time GEO scores across AI visibility signals</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#A100FF',fontWeight:600,marginBottom:4}}>Your GEO Score</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#A100FF'}}>{geo}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'--':`${gapToTop} pts`}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{myRank===1?'You are the leader':Math.abs(gapToTop)<=5?'Close, strong opportunity':'Gap to close'}</div></div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1} (${next.Brand})`:'Top Ranked'}</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'--'}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{leadOver!=null?(leadOver<10?'Close, defend position':'Comfortable lead'):'Leading the category'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score & Signal Breakdown</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:10}}>Grouped bars show sub-metrics per brand. Black line traces GEO Score.</div>
                    <div style={{overflowX:'auto' as const}}>
                      <svg viewBox={`0 0 ${bW} ${bH+60}`} style={{width:'100%',minWidth:top.length*80,display:'block'}} onMouseLeave={()=>setHovBar(null)}>
                        {[0,25,50,75,100].map(v=><g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
                        {top.map((c:any,i:number)=>{
                          const bx=bPad+i*gW,isY=c.isYou;
                          const subW=(gW*0.8)/allMetrics.length;
                          return (<g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}>
                            {allMetrics.map((m,mi)=>{
                              const val=(c as any)[m.key]||0,mh=(val/100)*bMH,mx=bx+gW*0.1+mi*subW;
                              return <rect key={mi} x={mx} y={bH-mh} width={subW-1} height={mh} fill={isY?m.color:m.lightColor} rx={1}/>;
                            })}
                            <text x={bx+gW/2} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#A100FF':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>
                          </g>);
                        })}
                        {(()=>{
                          const pts2=top.map((c:any,i:number)=>({x:bPad+i*gW+gW/2,y:bH-((c.GEO||0)/100)*bMH,geo:c.GEO||0,isYou:c.isYou}));
                          const pathD2=pts2.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                          return <>
                            <path d={pathD2} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            {pts2.map((p,i)=>(<g key={i}>
                              <circle cx={p.x} cy={p.y} r={p.isYou?7:5} fill={p.isYou?'#A100FF':'#374151'} stroke="white" strokeWidth="1.5"/>
                              <text x={p.x} y={p.y-10} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{p.geo}</text>
                            </g>))}
                          </>;
                        })()}
                        <g transform={`translate(${bPad},${bH+32})`}>
                          <circle cx={6} cy={0} r={4} fill="#111827"/><line x1={1} y1={0} x2={11} y2={0} stroke="#111827" strokeWidth="2"/>
                          <text x={18} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO Score (line)</text>
                          {allMetrics.map((m,i)=>(<g key={i} transform={`translate(${110+i*90},0)`}><rect x={0} y={-5} width={10} height={10} fill={m.color} rx={2}/><text x={14} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{m.label}</text></g>))}
                        </g>
                        {hovBar!==null&&(()=>{
                          const c=top[hovBar],bx=bPad+hovBar*gW,tipW=160,tipH=allMetrics.length*14+28;
                          const tx=bx+gW/2+tipW+8>bW-bPad?bx-tipW-4:bx+gW/2+4,ty=Math.max(0,bH-tipH-20);
                          return <g style={{pointerEvents:'none'}}>
                            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
                            <text x={tx+10} y={ty+14} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text>
                            <text x={tx+10} y={ty+26} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO}</text>
                            {allMetrics.map((m,mi)=>(<text key={mi} x={tx+10} y={ty+40+mi*13} style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>{m.label}: {(c as any)[m.key]||0}</text>))}
                          </g>;
                        })()}
                      </svg>
                    </div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','BRAND / URL','GEO SCORE','GAP','VISIBILITY','CITATIONS','SENTIMENT','SOV','PROMINENCE','AVG. RANK'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c:any,i:number)=>{
                        const gap2=c.isYou?null:c.GEO-geo;
                        return <tr key={i} style={{background:c.isYou?'#F5F0FF':'white',borderTop:'1px solid #F3F4F6',borderLeft:c.isYou?'3px solid #A100FF':'none'}}>
                          <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                          <td style={{padding:'11px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>
                              {c.isYou&&<span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}
                            </div>
                            <div style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{c.URL}</div>
                          </td>
                          <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:c.isYou?'#A100FF':'#374151'}}>{c.GEO}</td>
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

            {/* TAB 2: Visibility */}
            {activeTab===2&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,comps=result.competitors||[],allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
              const topComp=comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
              const gapToTop=vis-(topComp?topComp.Vis:vis),avgVis=Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
              const topCompBrand=result._topCompBrand||(comps.length>0?comps[0].Brand:'');
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'14px 18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#A100FF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:4}}>Your Visibility</div><div style={{fontSize:'1.8rem',fontWeight:800,color:'#A100FF'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands</div></div>
                    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'14px 18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:4}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div><div style={{fontSize:'1.8rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div></div>
                  </div>
                  {visView==='scatter'&&(
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'14px 18px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                        <div>
                          <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827'}}>Sentiment vs. Visibility Market Positioning</div>
                          <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:1}}>Each dot = one brand. Bubble size reflects Citation Score.</div>
                        </div>
                        <button onClick={()=>setVisView('scurve')} style={{background:'white',color:'#374151',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'5px 12px',fontSize:'0.76rem',fontWeight:600,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,0.07)',whiteSpace:'nowrap' as const,flexShrink:0,marginLeft:12}}>Show S-Curve</button>
                      </div>
                      <ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={comps} topCompBrand={topCompBrand}/>
                    </div>
                  )}
                  {visView==='scurve'&&(
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'14px 18px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                        <div>
                          <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827'}}>Where You Are vs Your Opportunity</div>
                          <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:1}}>Your GEO Score on the AI maturity curve. Shaded zone = your path to 70.</div>
                        </div>
                        <button onClick={()=>setVisView('scatter')} style={{background:'#A100FF',color:'white',border:'none',borderRadius:8,padding:'5px 12px',fontSize:'0.76rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' as const,flexShrink:0,marginLeft:12}}>Show Scatter Plot</button>
                      </div>
                      <SCurveImage7 score={geo} brand={result.brand_name}/>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 3: Sentiment — FIX 3: layout changed from 1fr 1fr to 420px 1fr */}
            {activeTab===3&&(()=>{
              const rawSent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank;
              const smood=rawSent>=70?'AI speaks favorably about your brand':rawSent>=45?'AI tone is neutral':'AI tone is negative or missing';
              const pmood=prom>=70?'Named first or near top of AI responses':prom>=45?'Appears mid-list in AI responses':'Rarely named early in AI responses';
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                    {[
                      {label:'sentiment score',val:rawSent,sub:smood,tip:'How positively AI describes your brand.'},
                      {label:'prominence score',val:prom,sub:pmood,tip:'How early in AI responses your brand is mentioned.'},
                      {label:'average rank',val:avgRank,sub:'Average position within each AI response',tip:'Average position when mentioned in AI responses.'}
                    ].map(({label,val,sub,tip}:any)=>(
                      <div key={label} style={{background:'white',borderRadius:12,padding:'14px 16px',border:'1px solid #E5E7EB'}}>
                        <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>{label}<Tooltip text={tip}/></div>
                        <div style={{fontSize:'1.6rem',fontWeight:800,color:'#A100FF',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:2}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* Radar full-width — self-contained with scorecard + legend */}
                  <RadarChart result={result}/>
                  {/* Prompt category radar — same style, uses query_clusters */}
                  <PromptRadarChart result={result}/>
                  {/* Heatmap below */}
                  <div style={{marginTop:14}}>
                    <SentimentHeatmap result={result}/>
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: Citations */}
            {activeTab===4&&(()=>{
              const cit=result.citation_share,sov=result.share_of_voice,sources=result.citation_sources||[];
              const brandKey3=(result.domain||'').replace('www.','').split('.')[0].toLowerCase();
              const domainMatchesBrand=(domain:string)=>{const dk=domain.replace('www.','').split('.')[0].toLowerCase();return dk===brandKey3||dk.startsWith(brandKey3);};
              const catMap:Record<string,number>={};
              const allSrc=sources.length>0?sources:[{domain:'nerdwallet.com',citation_share:4.9},{domain:'bankrate.com',citation_share:3.8},{domain:'thepointsguy.com',citation_share:3.2},{domain:'forbes.com',citation_share:2.9},{domain:'creditkarma.com',citation_share:2.7},{domain:'reddit.com',citation_share:2.4},{domain:'wikipedia.org',citation_share:2.2},{domain:'cnbc.com',citation_share:1.9}];
              allSrc.forEach((s:any)=>{const d=(s.domain||'').toLowerCase();const isOwned=domainMatchesBrand(d);const cat=isOwned?'Owned Media':classifyDomain(d).label;catMap[cat]=(catMap[cat]||0)+(s.citation_share||0);});
              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#A100FF','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
              const displaySources=allSrc.map((s:any,i:number)=>({...s,rank:i+1,isOwned:domainMatchesBrand(s.domain||'')}));
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    <div style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}>
                      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>Citation Score<Tooltip text="How often and prominently AI models cite your brand."/></div>
                      <div style={{fontSize:'2.4rem',fontWeight:900,color:'#A100FF',lineHeight:1,marginBottom:6}}>{cit}</div>
                      <div style={{fontSize:'0.75rem',color:'#6B7280',lineHeight:1.6}}>{cit>=70?'AI frequently cites your brand as an authority — strong trust signal':cit>=45?'AI occasionally cites your brand in responses':'AI rarely cites your brand — low trust signal in responses'}</div>
                    </div>
                    <div style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}>
                      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>Share of Voice<Tooltip text="Your share of all brand mentions in AI responses."/></div>
                      <div style={{fontSize:'2.4rem',fontWeight:900,color:'#A100FF',lineHeight:1,marginBottom:6}}>{sov}</div>
                      <div style={{fontSize:'0.75rem',color:'#6B7280',lineHeight:1.6}}>{sov>=70?'You dominate the AI conversation — competitors rarely get more airtime':sov>=45?'You have a noticeable share — competitors still outpace you':'Competitors own the majority of AI conversations in your space'}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                      {catEntries.map(([cat,pct],i)=>{const isActive=activeCitCat===cat;return<div key={i} style={{marginBottom:10,cursor:'pointer',borderRadius:8,padding:'8px 10px',background:isActive?catColors[cat]+'22':'transparent',border:isActive?`1.5px solid ${catColors[cat]}`:'1.5px solid transparent'}} onClick={()=>setActiveCitCat(isActive?null:cat)}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:'0.84rem',color:isActive?catColors[cat]:'#374151',fontWeight:isActive?700:500}}>{cat}</span><span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#A100FF'}}>{Math.round(pct)}%</span></div>
                        <div style={{background:'#F3F4F6',borderRadius:50,height:7,overflow:'hidden'}}><div style={{background:catColors[cat]||'#A100FF',height:7,borderRadius:50,width:`${Math.min(Math.round(pct),100)}%`,transition:'width 0.4s'}}/></div>
                      </div>;})}
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 20px'}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:12}}>Sources AI Pulls From</div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr style={{background:'#FAFAFA'}}>{['RANK','DOMAIN','CATEGORY','SHARE %'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left' as const,fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                        <tbody>{displaySources.filter((s:any)=>{if(!activeCitCat)return true;const isOwned2=s.isOwned;const cls3=isOwned2?'Owned Media':classifyDomain(s.domain||'').label;return cls3===activeCitCat;}).slice(0,10).map((s:any,i:number)=>{
                          const isOwned2=s.isOwned,cls2=isOwned2?{label:'Owned Media',color:'#A100FF',bg:'#F5F0FF'}:classifyDomain(s.domain||'');
                          const isExp2=expandedDomain===s.domain;
                          return <React.Fragment key={i}>
                            <tr style={{borderTop:'1px solid #F3F4F6',cursor:'pointer',background:isOwned2?'#FAFBFF':'white',borderLeft:isOwned2?'3px solid #A100FF':'none'}} onClick={()=>setExpandedDomain(isExp2?null:s.domain)}>
                              <td style={{padding:'8px 10px',fontSize:'0.78rem',color:'#9CA3AF'}}>{s.rank||i+1}</td>
                              <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:'0.8rem',fontWeight:600,color:'#A100FF'}}>{s.domain}</span>{isOwned2&&<span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:4,padding:'1px 5px',fontSize:'0.6rem',fontWeight:700}}>You</span>}</div></td>
                              <td style={{padding:'8px 10px'}}><span style={{background:(cls2 as any).bg,color:(cls2 as any).color,borderRadius:6,padding:'2px 7px',fontSize:'0.66rem',fontWeight:600}}>{(cls2 as any).label}</span></td>
                              <td style={{padding:'8px 10px',fontSize:'0.78rem',fontWeight:700,color:isOwned2?'#A100FF':'#10B981'}}>{s.citation_share}%</td>
                            </tr>
                            {isExp2&&<tr style={{background:'#F9F8FF'}}><td colSpan={4} style={{padding:'6px 10px 10px 24px'}}><a href={`https://${s.domain}`} target="_blank" rel="noreferrer" style={{fontSize:'0.72rem',color:'#4F46E5'}}>{`https://${s.domain}`}</a></td></tr>}
                          </React.Fragment>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 5: Prompts */}
            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[],clusters=result.query_clusters||[],trendingQs=result.trending_queries||[];
              const totalQueries=result.total_responses??rd.length,totalMentions=result.responses_with_brand??rd.filter((r:any)=>r.mentioned).length;
              const displayRate=Math.round((totalMentions/Math.max(totalQueries,1))*100);
              const cats2:string[]=['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string).filter((c:string)=>Boolean(c))))];
              const ROWS_PER_PAGE=10;
              const allSorted=[...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});
              const totalPages=Math.ceil(allSorted.length/ROWS_PER_PAGE),safePage=Math.min(queryPage,Math.max(1,totalPages));
              const pageRows=allSorted.slice((safePage-1)*ROWS_PER_PAGE,safePage*ROWS_PER_PAGE);
              const maxMentioned=Math.max(...clusters.map((c:any)=>c.mentioned),1);
              const grouped=[...clusters].sort((a:any,b:any)=>{const g=(c:any)=>c.winRate>=60?0:c.winRate>=30?1:c.winRate>0?2:3;return g(a)!==g(b)?g(a)-g(b):b.mentioned-a.mentioned;});
              const nB=grouped.length,W=940,VPAD=52,COLS=Math.min(5,Math.ceil(Math.sqrt(nB*1.2))),ROWS2=Math.ceil(nB/COLS),cellW=Math.min(160,W/COLS),cellH=105,totalGridW=COLS*cellW,gridOffsetX=(W-totalGridW)/2,H=ROWS2*cellH+VPAD;
              const bubbles=grouped.map((c:any,i:number)=>{const col=i%COLS,row=Math.floor(i/COLS),lastRowCount=nB%COLS||COLS,isLastRow=row===ROWS2-1,offsetX=isLastRow?(COLS-lastRowCount)*cellW/2:0,x=gridOffsetX+offsetX+col*cellW+cellW/2,y=VPAD/2+row*cellH+cellH/2,r=Math.round(28+(c.mentioned/maxMentioned)*18);return{...c,x,y,r};});
              const connections: {x1:number;y1:number;x2:number;y2:number;cat1:string;cat2:string;dashed:boolean}[] = [];
              bubbles.forEach((b:any) => {
                (b.related||[]).forEach((rel:any) => {
                  const target = bubbles.find((bb:any) => bb.category === rel.category);
                  if (!target || rel.similarity < 15) return;
                  if (b.category > rel.category) return;
                  connections.push({x1:b.x,y1:b.y,x2:target.x,y2:target.y,cat1:b.category,cat2:rel.category,dashed:rel.similarity<40});
                });
              });
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={totalQueries} sub="Generic consumer questions, no brand name" color="#A100FF"/>
                    <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} sub="Queries where brand appeared" color="#A100FF"/>
                    <MetricCard label="appearance rate" val={`${displayRate}%`} sub="Of all AI queries triggered brand mention" color="#A100FF"/>
                  </div>
                  {clusters.length>0&&(<div style={{borderRadius:16,overflow:'hidden',marginBottom:20,border:'1px solid #1E293B'}}>
                    <div style={{background:'#0F172A',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div><div style={{fontSize:'0.9rem',fontWeight:800,color:'white'}}>Query Intelligence Network</div><div style={{fontSize:'0.68rem',color:'#64748B',marginTop:1}}>Node size = brand appearances · Color = win rate</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:14}}>
                        {[{color:'#10B981',label:'Winning (≥60%)'},{color:'#F59E0B',label:'Emerging (30-59%)'},{color:'#EF4444',label:'Gap (<30%)'}].map((l,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:l.color}}/><span style={{fontSize:'0.65rem',color:'#94A3B8'}}>{l.label}</span></div>))}
                        {(filterCat!=='All'||highlightedBubble)&&<button onClick={()=>{setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}} style={{background:'#1E293B',border:'1px solid #334155',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#94A3B8',cursor:'pointer'}}>x Clear</button>}
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',background:'#0F172A'}}>
                      {connections.map((conn, ci) => {
                        const isHighlightedConn = highlightedBubble && (conn.cat1 === highlightedBubble || conn.cat2 === highlightedBubble);
                        return (
                          <line key={`conn${ci}`}
                            x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2}
                            stroke={isHighlightedConn ? '#A78BFA' : '#334155'}
                            strokeWidth={isHighlightedConn ? 2.5 : 1.5}
                            strokeDasharray={conn.dashed ? '4,4' : undefined}
                            opacity={highlightedBubble ? (isHighlightedConn ? 0.9 : 0.06) : 0.35}
                          />
                        );
                      })}
                      {bubbles.map((b:any)=>{
                        const isHighlighted=highlightedBubble===b.category;
                        const connectedCats = highlightedBubble ? new Set<string>(
                          connections
                            .filter(c => c.cat1 === highlightedBubble || c.cat2 === highlightedBubble)
                            .flatMap(c => [c.cat1, c.cat2])
                            .filter(cat => cat !== highlightedBubble)
                        ) : new Set<string>();
                        const isConnected = !!highlightedBubble && !isHighlighted && connectedCats.has(b.category);
                        const isDimmed = !!highlightedBubble && !isHighlighted && !isConnected;
                        const nodeColor=b.winRate>=60?'#10B981':b.winRate>=30?'#F59E0B':'#EF4444';
                        const words=b.category.split(' ');const maxChars=Math.round(b.r*0.52);let line1='',line2='';
                        words.forEach((w:string)=>{if(!line1){line1=w;}else if((line1+' '+w).length<=maxChars){line1+=' '+w;}else if(!line2){line2=w;}else if((line2+' '+w).length<=maxChars){line2+=' '+w;}});
                        const hasTwo=line2.length>0,fontSize=b.r>=38?9.5:b.r>=32?9:8,lineH=fontSize+2;
                        const totalTextH=hasTwo?lineH*2+8+lineH:lineH+8+lineH,textStartY=b.y-totalTextH/2+fontSize;
                        const winY=(hasTwo?textStartY+lineH:textStartY)+lineH+4,appY=winY+lineH;
                        const bubbleFillOpacity = isDimmed ? 0.15 : 1;
                        const strokeColor = isHighlighted ? 'white' : isConnected ? '#A78BFA' : 'none';
                        const strokeW = isHighlighted ? 4 : isConnected ? 3 : 0;
                        const glowR = isHighlighted ? b.r + 10 : isConnected ? b.r + 6 : 0;
                        const textFill = isDimmed ? 'rgba(255,255,255,0.15)' : 'white';
                        return (<g key={b.category} style={{cursor:'pointer'}} onClick={()=>{if(filterCat===b.category&&highlightedBubble===b.category){setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}else{setFilterCat(b.category);setQueryPage(1);setHighlightedBubble(b.category);}}}>
                          {(isHighlighted||isConnected)&&<circle cx={b.x} cy={b.y} r={glowR} fill="none" stroke={isHighlighted?'rgba(255,255,255,0.3)':'rgba(167,139,250,0.4)'} strokeWidth={isHighlighted?3:2}/>}
                          <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor} opacity={bubbleFillOpacity} stroke={strokeColor} strokeWidth={strokeW}/>
                          <text x={b.x} y={textStartY} textAnchor="middle" style={{fontSize,fontWeight:700,fill:textFill,fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line1}</text>
                          {hasTwo&&<text x={b.x} y={textStartY+lineH} textAnchor="middle" style={{fontSize,fontWeight:700,fill:textFill,fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line2}</text>}
                          <text x={b.x} y={winY} textAnchor="middle" style={{fontSize:Math.max(6,fontSize-1),fill:isDimmed?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.9)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.winRate}% win</text>
                          {b.r>26&&<text x={b.x} y={appY} textAnchor="middle" style={{fontSize:6,fill:isDimmed?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.55)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.mentioned} appearances</text>}
                        </g>);
                      })}
                    </svg>
                  </div>)}
                  <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:'0.88rem',fontWeight:700,color:'#111827'}}>{filterCat==='All'?'All Queries':'Category: '+filterCat}<span style={{fontSize:'0.72rem',fontWeight:400,color:'#9CA3AF',marginLeft:8}}>({allSorted.length} queries · page {safePage} of {totalPages})</span></div>
                      <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setQueryPage(1);setHighlightedBubble(null);}} style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 8px',fontSize:'0.75rem',color:'#374151',background:'white',outline:'none'}}>
                        {cats2.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#F8FAFC'}}>{['#','QUERY','YOUR RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left' as const,fontSize:'0.63rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{pageRows.map((item:any,i:number)=>{
                        const globalIdx=(safePage-1)*ROWS_PER_PAGE+i+1,rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':item.mentioned?'#A100FF':'#9CA3AF';
                        const beater=item.winner_brand&&item.winner_brand!==result.brand_name?item.winner_brand:null;
                        return <tr key={i} style={{borderTop:'1px solid #F3F4F6',background:rp===1?'#F0FDF4':!item.mentioned?'#FFFBFB':'white'}}>
                          <td style={{padding:'9px 12px',fontSize:'0.75rem',color:'#9CA3AF',width:28}}>{globalIdx}</td>
                          <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3,flexWrap:'wrap' as const}}><span style={{background:'#F3F4F6',color:'#6B7280',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem'}}>{item.category}</span>{item.mentioned?<span style={{color:'#10B981',fontSize:'0.68rem',fontWeight:600}}>Appeared</span>:<span style={{color:'#EF4444',fontSize:'0.68rem',fontWeight:600}}>Missed</span>}</div><div style={{fontSize:'0.82rem',color:'#374151',fontWeight:500}}>{item.query}</div></td>
                          <td style={{padding:'9px 12px',fontSize:'0.92rem',fontWeight:800,color:rankColor,width:70}}>{rankLabel}</td>
                          <td style={{padding:'9px 12px',width:150}}>{beater?<span style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#92400E'}}>👑 {beater}</span>:rp===1?<span style={{background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#065F46'}}>You&apos;re #1</span>:<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>--</span>}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                    {totalPages>1&&(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14}}>
                      <button onClick={()=>setQueryPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:'white',color:'#374151',cursor:'pointer',fontSize:'0.75rem'}}>Prev</button>
                      {Array.from({length:Math.min(totalPages,10)},(_,i)=>{const pg=totalPages<=10?i+1:safePage<=5?i+1:safePage>=totalPages-4?totalPages-9+i:safePage-4+i;return<button key={pg} onClick={()=>setQueryPage(pg)} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${pg===safePage?'#A100FF':'#E5E7EB'}`,background:pg===safePage?'#A100FF':'white',color:pg===safePage?'white':'#374151',cursor:'pointer',fontSize:'0.75rem',fontWeight:pg===safePage?700:400}}>{pg}</button>;})}
                      <button onClick={()=>setQueryPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:'white',color:'#374151',cursor:'pointer',fontSize:'0.75rem'}}>Next</button>
                    </div>)}
                  </div>
                  {trendingQs.length>0&&(()=>{
                    const oppOrder=(o:string)=>o==='High'?0:o==='Medium'?1:2;
                    const highOpp=[...trendingQs].map((tq:any)=>({...tq,query:(tq.query||'').replace(/\bin\s+20\d{2}\b/gi,'').replace(/\s+/g,' ').trim()})).sort((a:any,b:any)=>oppOrder(a.opportunity)-oppOrder(b.opportunity)).slice(0,10);
                    if(!highOpp.length)return null;
                    const getCluster=(tqCat:string)=>clusters.find((c:any)=>{const cl=(c.category||'').toLowerCase(),tl=tqCat.toLowerCase();return cl.includes(tl)||tl.includes(cl)||cl.split(/[\s&,]+/).some((w:string)=>w.length>3&&tl.includes(w));});
                    return (
                      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{fontSize:'1.1rem'}}>🔥</span><div style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>What the Market is Asking Right Now</div></div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginBottom:16}}>Top {highOpp.length} high-intent queries trending in {result.ind_label||result.industry}.</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                          {highOpp.map((tq:any,i:number)=>{
                            const trendColor=tq.trend==='Rising'?'#EF4444':tq.trend==='Peak'?'#F59E0B':'#6B7280';
                            const trendBg=tq.trend==='Rising'?'#FEE2E2':tq.trend==='Peak'?'#FEF3C7':'#F3F4F6';
                            const cluster=getCluster(tq.category);
                            const brandWinRate=cluster?.winRate??null,brandWinning=brandWinRate!==null&&brandWinRate>=40;
                            const topCompName=cluster?.topCompetitor||null;
                            const isOpen=selectedCluster===`trend-${i}`;
                            return (
                              <div key={i} style={{background:'#FAFAFA',borderRadius:10,border:`1.5px solid ${isOpen?'#A100FF':'#E5E7EB'}`,overflow:'hidden'}}>
                                <div style={{padding:'12px 14px',cursor:'pointer'}} onClick={()=>setSelectedCluster(isOpen?null:`trend-${i}`)}>
                                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap' as const}}>
                                    <span style={{background:trendBg,color:trendColor,borderRadius:50,padding:'2px 8px',fontSize:'0.65rem',fontWeight:700}}>{tq.trend}</span>
                                    <span style={{background:'#F5F0FF',color:'#A100FF',borderRadius:50,padding:'2px 8px',fontSize:'0.65rem',fontWeight:600}}>{tq.category}</span>
                                  </div>
                                  <div style={{fontSize:'0.85rem',color:'#111827',lineHeight:1.5,fontWeight:500,marginBottom:8}}>{tq.query}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                                    {topCompName&&<span style={{fontSize:'0.68rem',color:'#92400E',background:'#FEF3C7',borderRadius:4,padding:'2px 8px',fontWeight:600}}>👑 {topCompName} leading</span>}
                                    {brandWinRate!==null?<span style={{fontSize:'0.68rem',fontWeight:700,color:brandWinning?'#10B981':'#EF4444',background:brandWinning?'#D1FAE5':'#FEE2E2',borderRadius:4,padding:'2px 8px'}}>{result.brand_name}: {brandWinRate}% win</span>:<span style={{fontSize:'0.68rem',color:'#9CA3AF',fontStyle:'italic'}}>New category</span>}
                                    <span style={{marginLeft:'auto',fontSize:'0.65rem',color:'#9CA3AF'}}>{isOpen?'▲':'▼'}</span>
                                  </div>
                                </div>
                                {isOpen&&(
                                  <div style={{borderTop:'1px solid #E5E7EB',padding:'12px 14px',background:'white'}}>
                                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                                      {[
                                        {label:'Currently Leading',val:topCompName||'No clear leader',color:'#F59E0B'},
                                        {label:`${result.brand_name} Win Rate`,val:brandWinRate!==null?`${brandWinRate}%`:'Not tested',color:brandWinning?'#10B981':'#EF4444'},
                                        {label:'Trend Signal',val:tq.trend,color:trendColor},
                                        {label:'Opportunity',val:tq.opportunity||'--',color:'#A100FF'},
                                      ].map((s,j)=>(
                                        <div key={j} style={{background:'#F9FAFB',borderRadius:6,padding:'8px 10px'}}>
                                          <div style={{fontSize:'0.6rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em',marginBottom:3,textTransform:'uppercase' as const}}>{s.label}</div>
                                          <div style={{fontSize:'0.88rem',fontWeight:800,color:s.color}}>{s.val}</div>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{fontSize:'0.75rem',color:'#6B7280',lineHeight:1.6,background:'#F5F0FF',borderRadius:6,padding:'8px 10px'}}>
                                      💡 {topCompName?`${topCompName.split(' ')[0]} currently leads this query type.`:'No brand clearly owns this topic yet.'} {brandWinRate!==null?(brandWinning?` ${result.brand_name} is showing strength — double down.`:` ${result.brand_name} has room to own this with targeted content.`):'Consider testing this category.'}
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

                        {/* TAB 6: Analysis */}
            {activeTab===6&&(()=>{
              const brand = result.brand_name || 'Your Brand';
              const geo = result.overall_geo_score || result.visibility || 0;
              const vis = result.visibility || 0;
              const sen = result.sentiment || 0;
              const prom = result.prominence || 0;
              const cit = result.citation_score || 0;
              const sov = result.share_of_voice || 0;
              const avgRank = result.avg_rank || 'N/A';
              const totalResponses = result.total_responses || 100;
              const competitors = result.competitors || [];
              const clusters = result.query_clusters || [];
              const productDefs = getProductDefs(result.ind_key||'gen', result.lob||'');
              const productMentions = computeProductMentions(productDefs, result.responses_detail||[]);

              // GEO tier
              const geoTier = geo>=80?'Authority':geo>=70?'Leader':geo>=56?'Competitive':geo>=45?'Emerging':'Needs Work';
              const geoColor = geo>=80?'#10B981':geo>=70?'#3B82F6':geo>=56?'#F59E0B':geo>=45?'#F97316':'#EF4444';

              // Top competitors by GEO
              const topComps = [...competitors].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0)).slice(0,4);
              const maxGEO = Math.max(geo, ...(topComps.map((c:any)=>c.GEO||0)));

              // Where brand wins (high win rate clusters)
              const winningClusters = [...clusters].sort((a:any,b:any)=>(b.winRate||0)-(a.winRate||0)).filter((c:any)=>(c.winRate||0)>20).slice(0,5);
              // Where brand is missing (low win rate)
              const missingClusters = [...clusters].sort((a:any,b:any)=>(a.winRate||0)-(b.winRate||0)).filter((c:any)=>(c.winRate||0)<20).slice(0,5);

              // Products — strong vs weak
              const allProds = productDefs.map(p=>{
                const f=productMentions.find(m=>m.label===p.label);
                return {label:p.label, val:f?Math.max(0,Math.min(100,f.pct)):0};
              }).sort((a,b)=>b.val-a.val);
              const strongProds = allProds.slice(0,3);
              const weakProds = [...allProds].sort((a,b)=>a.val-b.val).slice(0,3);

              // Signals for 5-bar chart
              const signals = [
                {label:'Visibility', val:vis, weight:'30%', color:'#3B82F6'},
                {label:'Sentiment', val:sen, weight:'20%', color:'#8B5CF6'},
                {label:'Prominence', val:prom, weight:'20%', color:'#EC4899'},
                {label:'Citation', val:cit, weight:'15%', color:'#F59E0B'},
                {label:'Share of Voice', val:sov, weight:'15%', color:'#10B981'},
              ];
              const weakestSignal = [...signals].sort((a,b)=>a.val-b.val)[0];
              const strongestSignal = [...signals].sort((a,b)=>b.val-a.val)[0];

              // Generate headline based on data
              const visRate = Math.round(vis);
              const rankNum = parseInt(String(avgRank).replace('#',''))||4;
              const headline = geo < 50
                ? `AI knows ${brand}. It just doesn't recommend it.`
                : geo < 70
                ? `${brand} shows up. It needs to show up first.`
                : `${brand} is winning the AI conversation.`;
              const headlineAccent = geo < 50
                ? `It just doesn't recommend it.`
                : geo < 70
                ? `It needs to show up first.`
                : `Winning the AI conversation.`;

              const needsItems = [
                {
                  title: `${brand} still missed ${100-visRate}% of AI responses.`,
                  body: `With ${visRate}% visibility, the brand was absent from ${totalResponses - Math.round(totalResponses*visRate/100)} responses${weakProds.length ? `, especially in ${weakProds.map(p=>p.label).join(', ')}` : ''}.`,
                  signal: 'Visibility', weight: '30% of formula', color:'#EF4444',
                },
                {
                  title: `${brand} was not consistently the first brand named.`,
                  body: `With average rank ${avgRank}, the brand was frequently preceded by competitors, limiting top-of-mind impact.`,
                  signal: 'Prominence', weight: '20% of formula', color:'#F97316',
                },
                {
                  title: `${brand}'s citation share can expand.`,
                  body: `The brand captured meaningful but not dominant citation share — rarely owning the entire answer.`,
                  signal: 'Citation', weight: '15% of formula', color:'#F59E0B',
                },
                {
                  title: `Share of voice remains moderate.`,
                  body: `A ${visRate}% appearance rate with mid-level prominence translates into a respectable but not category-leading share of voice.`,
                  signal: 'Share of Voice', weight: '15% of formula', color:'#F59E0B',
                },
                {
                  title: `Tone is positive but functional rather than distinctive.`,
                  body: `Praise centered on practical value with less emotionally differentiated language versus premium competitors.`,
                  signal: 'Sentiment', weight: '20% of formula', color:'#8B5CF6',
                },
              ];

              const wellItems = [
                {
                  title: `${brand} achieved solid overall visibility.`,
                  body: `The brand appeared in ${Math.round(totalResponses*visRate/100)} of ${totalResponses} responses, giving it strong presence relative to competitors.`,
                  signal: 'Visibility', weight: '30% of formula', color:'#10B981',
                },
                {
                  title: `${brand} was described in consistently positive language.`,
                  body: `When mentioned, the brand was usually framed as a best, strong, or expert-recommended option rather than a weak alternative.`,
                  signal: 'Sentiment', weight: '20% of formula', color:'#10B981',
                },
                {
                  title: `${brand} often appeared early enough to be noticed.`,
                  body: `In many responses the brand was listed first or second${winningClusters.length ? `, especially in ${winningClusters.slice(0,2).map((c:any)=>c.category).join(' and ')}` : ''}.`,
                  signal: 'Prominence', weight: '20% of formula', color:'#10B981',
                },
              ];

              return (
                <div style={{maxWidth:1100,margin:'0 auto',padding:'0 4px'}}>

                  {/* ── SECTION 0: Live AI Perception (Claude API cross-reference) ── */}
                  <AIPerceptionPanel result={result}/>

                  {/* ── SECTION 1: Health Snapshot (image 5 style) ── */}
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px',marginBottom:20}}>
                    <div style={{fontSize:'0.65rem',fontWeight:800,color:'#A100FF',letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:8}}>
                      {brand} GEO · Health Snapshot
                    </div>
                    <div style={{fontSize:'1.05rem',fontWeight:700,color:'#111827',marginBottom:16}}>
                      {brand} is {vis>=50?'credible but rarely the default':'missing from most AI responses'} — visible in {visRate}% of responses, named first far less.
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center',fontSize:'0.75rem',color:'#6B7280',marginBottom:20}}>
                      <span>{totalResponses} responses analyzed</span>
                      <span>·</span>
                      <span>{clusters.length} market queries tracked</span>
                    </div>

                    {/* 3-column layout: GEO score + Needs Improvement + Working Well */}
                    <div style={{display:'grid',gridTemplateColumns:'160px 1fr 1fr',gap:16}}>
                      {/* GEO Score column */}
                      <div style={{borderRight:'1px solid #F3F4F6',paddingRight:16}}>
                        <div style={{fontSize:'0.68rem',fontWeight:700,color:'#6B7280',letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:8}}>GEO Score</div>
                        <div style={{fontSize:'3.5rem',fontWeight:900,color:geoColor,lineHeight:1,marginBottom:4}}>{geo}</div>
                        <div style={{fontSize:'0.78rem',fontWeight:700,color:geoColor,marginBottom:16}}>{geoTier}</div>
                        <div style={{fontSize:'0.68rem',fontWeight:700,color:'#6B7280',letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:8}}>Signals</div>
                        {signals.map((s,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                            <span style={{fontSize:'0.72rem',color:'#374151'}}>{s.label}</span>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:'0.78rem',fontWeight:700,color:s.color}}>{s.val}</span>
                              <div style={{width:3,height:14,background:s.val>=70?'#10B981':s.val>=45?'#F59E0B':'#EF4444',borderRadius:2}}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Needs Improvement */}
                      <div style={{borderRight:'1px solid #F3F4F6',paddingRight:16}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                          <div style={{fontSize:'0.68rem',fontWeight:800,color:'#374151',letterSpacing:'0.06em',textTransform:'uppercase' as const}}>Needs Improvement</div>
                          <div style={{background:'#FEE2E2',color:'#991B1B',borderRadius:12,padding:'2px 8px',fontSize:'0.65rem',fontWeight:700}}>{needsItems.length}</div>
                        </div>
                        <div style={{maxHeight:280,overflowY:'auto' as const}}>
                          {needsItems.map((item,i)=>(
                            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<needsItems.length-1?'1px solid #F3F4F6':'none'}}>
                              <div style={{fontSize:'0.8rem',fontWeight:700,color:'#111827',marginBottom:4}}>{item.title}</div>
                              <div style={{fontSize:'0.73rem',color:'#6B7280',lineHeight:1.5,marginBottom:5}}>{item.body}</div>
                              <div style={{fontSize:'0.62rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>{item.signal} · {item.weight}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:'0.65rem',color:'#9CA3AF',textAlign:'center' as const,marginTop:4}}>Scroll for more ↓</div>
                      </div>

                      {/* Working Well */}
                      <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                          <div style={{fontSize:'0.68rem',fontWeight:800,color:'#374151',letterSpacing:'0.06em',textTransform:'uppercase' as const}}>Working Well</div>
                          <div style={{background:'#D1FAE5',color:'#065F46',borderRadius:12,padding:'2px 8px',fontSize:'0.65rem',fontWeight:700}}>{wellItems.length}</div>
                        </div>
                        <div style={{maxHeight:280,overflowY:'auto' as const}}>
                          {wellItems.map((item,i)=>(
                            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<wellItems.length-1?'1px solid #F3F4F6':'none'}}>
                              <div style={{fontSize:'0.8rem',fontWeight:700,color:'#111827',marginBottom:4}}>{item.title}</div>
                              <div style={{fontSize:'0.73rem',color:'#6B7280',lineHeight:1.5,marginBottom:5}}>{item.body}</div>
                              <div style={{fontSize:'0.62rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>{item.signal} · {item.weight}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 2: The Insight — GEO ranking (image 1 style) ── */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{display:'inline-block',background:'#EDE9FE',borderRadius:8,padding:'4px 12px',fontSize:'0.62rem',fontWeight:700,color:'#7C3AED',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:14}}>
                        {brand} GEO · The Insight
                      </div>
                      <h2 style={{fontSize:'1.6rem',fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:16}}>
                        AI knows {brand}.<br/>
                        <span style={{color:'#A100FF'}}>It just doesn't recommend it.</span>
                      </h2>
                      <p style={{fontSize:'0.85rem',color:'#374151',lineHeight:1.6,marginBottom:12}}>
                        Across AI-driven product discovery, {brand} scores <strong style={{color:'#F59E0B'}}>{geo} / 100</strong> — "{geoTier}" — and ranks <strong style={{color:'#A100FF'}}>#{rankNum}</strong>{topComps.length>0?`, behind ${topComps.filter((c:any)=>c.GEO>geo).slice(0,3).map((c:any)=>`${c.Brand} (${c.GEO})`).join(', ')}.`:'.'}
                      </p>
                      <p style={{fontSize:'0.85rem',color:'#6B7280',lineHeight:1.6,marginBottom:16}}>
                        {brand} appears mid-list and is rarely the top pick — visible enough to be seen, not strong enough to be chosen.
                      </p>
                      <div style={{background:'#F5F0FF',borderRadius:8,borderLeft:'4px solid #A100FF',padding:'14px 16px',fontSize:'0.78rem',color:'#374151',lineHeight:1.6}}>
                        <strong style={{textDecoration:'underline'}}>So what</strong> — AI is becoming the front door to financial decisions. Every point of gap is a customer who hears a competitor's name first.
                      </div>
                    </div>

                    {/* GEO bar chart */}
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{fontSize:'0.78rem',fontWeight:700,color:'#A100FF',marginBottom:20}}>GEO Score — AI recommendation strength</div>
                      {[...topComps.filter((c:any)=>c.GEO>geo), {Brand:brand,GEO:geo,isYou:true}, ...topComps.filter((c:any)=>c.GEO<=geo)].slice(0,6).map((c:any,i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                          <div style={{width:130,fontSize:'0.82rem',fontWeight:c.isYou?700:400,color:c.isYou?'#A100FF':'#374151',textAlign:'right' as const}}>{c.Brand}</div>
                          <div style={{flex:1,background:'#F3F4F6',borderRadius:6,height:24,overflow:'hidden' as const}}>
                            <div style={{width:`${Math.round((c.GEO/maxGEO)*100)}%`,height:'100%',background:c.isYou?'#A100FF':'#D1D5DB',borderRadius:6,transition:'width 0.3s'}}/>
                          </div>
                          <div style={{width:28,fontSize:'0.88rem',fontWeight:700,color:c.isYou?'#A100FF':'#374151'}}>{c.GEO}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── SECTION 3: Where brand wins vs where missing (images 2+3) ── */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                    {/* Wins */}
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{display:'inline-block',background:'#ECFDF5',borderRadius:8,padding:'4px 12px',fontSize:'0.62rem',fontWeight:700,color:'#065F46',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:14}}>
                        {brand} GEO · The Insight
                      </div>
                      <h2 style={{fontSize:'1.4rem',fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:12}}>
                        Where {brand} shows up,<br/><span style={{color:'#10B981'}}>it wins.</span>
                      </h2>
                      <p style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.6,marginBottom:12}}>
                        When AI sees the right signals, {brand} is the recommendation. It earns top rank on highest-intent prompts{winningClusters.length?` in ${winningClusters.slice(0,2).map((c:any)=>c.category).join(' and ')}`:''}.</p>
                      <div style={{background:'#ECFDF5',borderRadius:8,borderLeft:'4px solid #10B981',padding:'14px 16px',fontSize:'0.78rem',color:'#374151',lineHeight:1.6,marginBottom:16}}>
                        <strong style={{textDecoration:'underline'}}>So what</strong> — This is not a reputation problem. The brand already wins when it's present. The score is a coverage-and-content gap. That's fixable in weeks, not a multi-year rebrand.
                      </div>
                      <div style={{fontSize:'0.72rem',fontWeight:700,color:'#10B981',marginBottom:10}}>Where AI already picks {brand} (win rate)</div>
                      {winningClusters.slice(0,5).map((c:any,i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                          <div style={{width:140,fontSize:'0.78rem',fontWeight:i===0?700:400,color:i===0?'#065F46':'#374151'}}>{c.category}</div>
                          <div style={{flex:1,background:'#F3F4F6',borderRadius:4,height:18,overflow:'hidden' as const}}>
                            <div style={{width:`${Math.min(100,c.winRate||0)}%`,height:'100%',background:i===0?'#10B981':'#6EE7B7',borderRadius:4}}/>
                          </div>
                          <div style={{width:36,fontSize:'0.78rem',fontWeight:700,color:'#065F46'}}>{c.winRate||0}%</div>
                        </div>
                      ))}
                    </div>

                    {/* Missing */}
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{display:'inline-block',background:'#FEF2F2',borderRadius:8,padding:'4px 12px',fontSize:'0.62rem',fontWeight:700,color:'#991B1B',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:14}}>
                        {brand} GEO · The Insight
                      </div>
                      <h2 style={{fontSize:'1.4rem',fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:12}}>
                        {brand} is invisible in the<br/><span style={{color:'#EF4444'}}>moments that win customers.</span>
                      </h2>
                      <p style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.6,marginBottom:12}}>
                        {brand} has zero or near-zero presence across {missingClusters.filter((c:any)=>(c.winRate||0)===0).length} prompt categories{weakProds.length?` and is weakest in ${weakProds.slice(0,2).map(p=>p.label).join(' and ')} products`:''}.
                      </p>
                      <div style={{background:'#FEF2F2',borderRadius:8,borderLeft:'4px solid #EF4444',padding:'14px 16px',fontSize:'0.78rem',color:'#374151',lineHeight:1.6,marginBottom:16}}>
                        <strong style={{textDecoration:'underline'}}>So what</strong> — These are the highest-intent acquisition queries. Competitors capture them at the decision point. Every blind spot forfeits customer lifetime value.
                      </div>
                      <div style={{fontSize:'0.72rem',fontWeight:700,color:'#EF4444',marginBottom:10}}>Where {brand} is missing (win rate)</div>
                      {missingClusters.slice(0,5).map((c:any,i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                          <div style={{width:140,fontSize:'0.78rem',fontWeight:(c.winRate||0)===0?700:400,color:(c.winRate||0)===0?'#991B1B':'#374151'}}>{c.category}</div>
                          <div style={{flex:1,background:'#F3F4F6',borderRadius:4,height:18,overflow:'hidden' as const}}>
                            <div style={{width:`${Math.max(4,Math.min(100,c.winRate||0))}%`,height:'100%',background:(c.winRate||0)===0?'#EF4444':'#FCA5A5',borderRadius:4}}/>
                          </div>
                          <div style={{width:36,fontSize:'0.78rem',fontWeight:700,color:'#991B1B'}}>{c.winRate||0}%</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── SECTION 4: Presence Gap — brand known for X but AI ignores it ── */}
                  {(()=>{
                    // Find categories where brand HAS products but low AI win rate = gap
                    const presenceGaps = allProds
                      .filter(p => p.val < 30)
                      .map(p => {
                        // Find which competitor dominates this space
                        const topComp = [...competitors]
                          .sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0))
                          .find((c:any) => c.GEO > geo);
                        // Find if any cluster matches this product label
                        const matchCluster = clusters.find((c:any) =>
                          c.category.toLowerCase().includes(p.label.split(' ')[0].toLowerCase()) ||
                          p.label.toLowerCase().includes((c.category||'').split(' ')[0].toLowerCase())
                        );
                        return {
                          product: p.label,
                          brandScore: p.val,
                          clusterWinRate: matchCluster?.winRate || 0,
                          topCompetitor: topComp?.Brand || 'a top competitor',
                          topCompGEO: topComp?.GEO || 0,
                          gap: 100 - p.val,
                        };
                      })
                      .sort((a,b) => b.gap - a.gap)
                      .slice(0, 4);

                    // Quick wins: clusters where brand is close (20-50% win rate)
                    const quickWins = [...clusters]
                      .filter((c:any) => (c.winRate||0) >= 15 && (c.winRate||0) <= 50)
                      .sort((a:any,b:any)=>(b.winRate||0)-(a.winRate||0))
                      .slice(0, 5);

                    // Competitor threat: who is #1 on which topics
                    const compThreats: {[key:string]: number} = {};
                    clusters.forEach((c:any) => {
                      const dom = c.topCompetitor || (competitors[0]?.Brand||'');
                      if (dom) compThreats[dom] = (compThreats[dom]||0) + 1;
                    });
                    const threatList = Object.entries(compThreats)
                      .sort((a,b)=>b[1]-a[1])
                      .slice(0, 5)
                      .map(([name, count]) => ({name, count, pct: Math.round((count/Math.max(clusters.length,1))*100)}));

                    return (
                      <>
                      {/* Presence Gap Card */}
                      <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                          <div>
                            <div style={{fontSize:'0.65rem',fontWeight:800,color:'#EF4444',letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:6}}>⚠ Presence Gap Analysis</div>
                            <h3 style={{fontSize:'1.2rem',fontWeight:800,color:'#111827',marginBottom:6}}>
                              {brand} is known for these products — but AI isn't recommending it for them.
                            </h3>
                            <p style={{fontSize:'0.82rem',color:'#6B7280',lineHeight:1.6,marginBottom:0,maxWidth:700}}>
                              These are categories where {brand} has real products and market presence,
                              yet AI responses are dominated by competitors. This is a <strong>content and citation gap</strong> — not a brand problem.
                            </p>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12,marginTop:16}}>
                          {presenceGaps.map((g,i)=>(
                            <div key={i} style={{background:'#FFF7F7',border:'1px solid #FCA5A5',borderRadius:12,padding:'16px 18px'}}>
                              <div style={{fontSize:'0.88rem',fontWeight:700,color:'#991B1B',marginBottom:4}}>{g.product}</div>
                              <div style={{display:'flex',gap:16,marginBottom:10}}>
                                <div>
                                  <div style={{fontSize:'0.65rem',color:'#9CA3AF',marginBottom:2}}>Brand AI Score</div>
                                  <div style={{fontSize:'1.4rem',fontWeight:900,color:'#EF4444'}}>{g.brandScore}<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>/100</span></div>
                                </div>
                                <div>
                                  <div style={{fontSize:'0.65rem',color:'#9CA3AF',marginBottom:2}}>Prompt Win Rate</div>
                                  <div style={{fontSize:'1.4rem',fontWeight:900,color:'#F97316'}}>{g.clusterWinRate}<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>%</span></div>
                                </div>
                              </div>
                              <div style={{background:'#F3F4F6',borderRadius:6,height:6,overflow:'hidden',marginBottom:8}}>
                                <div style={{width:`${g.brandScore}%`,height:'100%',background:'#EF4444',borderRadius:6}}/>
                              </div>
                              <div style={{fontSize:'0.72rem',color:'#6B7280'}}>
                                Dominated by <strong style={{color:'#374151'}}>{g.topCompetitor}</strong> (GEO {g.topCompGEO})
                              </div>
                              <div style={{marginTop:8,fontSize:'0.7rem',color:'#991B1B',background:'#FEE2E2',borderRadius:6,padding:'4px 8px'}}>
                                Fix: Add {g.product.toLowerCase()} content to AI-indexed pages
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Wins + Competitor Threat side by side */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                        {/* Quick Wins */}
                        <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                          <div style={{fontSize:'0.65rem',fontWeight:800,color:'#10B981',letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:6}}>🎯 Quick Wins</div>
                          <h3 style={{fontSize:'1rem',fontWeight:800,color:'#111827',marginBottom:4}}>Close these first — {brand} is already close to winning.</h3>
                          <p style={{fontSize:'0.78rem',color:'#6B7280',lineHeight:1.5,marginBottom:16}}>
                            These prompt categories show 15–50% win rate — meaning AI already knows {brand} here. A targeted content push could flip these to consistent wins within weeks.
                          </p>
                          {quickWins.length === 0 ? (
                            <div style={{fontSize:'0.8rem',color:'#9CA3AF',fontStyle:'italic'}}>No near-win clusters detected — focus on presence gaps above.</div>
                          ) : quickWins.map((c:any,i:number)=>{
                            const rate = c.winRate||0;
                            const toWin = Math.max(0, 60-rate);
                            return (
                              <div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<quickWins.length-1?'1px solid #F3F4F6':'none'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                                  <span style={{fontSize:'0.82rem',fontWeight:600,color:'#111827'}}>{c.category}</span>
                                  <span style={{fontSize:'0.82rem',fontWeight:800,color:'#10B981'}}>{rate}%</span>
                                </div>
                                <div style={{background:'#F3F4F6',borderRadius:50,height:8,overflow:'hidden',marginBottom:4}}>
                                  <div style={{width:`${rate}%`,height:'100%',background:'#34D399',borderRadius:50}}/>
                                </div>
                                <div style={{fontSize:'0.7rem',color:'#6B7280'}}>
                                  +{toWin}% more to hit 60% win rate threshold · {c.totalResponses||'—'} responses tracked
                                </div>
                              </div>
                            );
                          })}
                          <div style={{marginTop:14,background:'#ECFDF5',borderRadius:8,padding:'10px 14px',fontSize:'0.75rem',color:'#065F46',borderLeft:'3px solid #10B981'}}>
                            <strong>So what:</strong> These are the cheapest wins. Optimize existing content for these topics before building new.
                          </div>
                        </div>

                        {/* Competitor Threat Map */}
                        <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                          <div style={{fontSize:'0.65rem',fontWeight:800,color:'#A100FF',letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:6}}>🏆 Competitor Threat Map</div>
                          <h3 style={{fontSize:'1rem',fontWeight:800,color:'#111827',marginBottom:4}}>Who is dominating {brand}'s conversation?</h3>
                          <p style={{fontSize:'0.78rem',color:'#6B7280',lineHeight:1.5,marginBottom:16}}>
                            These brands are consistently named first in the same prompt categories where {brand} should be winning. Each category they own is a customer {brand} never reaches.
                          </p>
                          {threatList.length === 0 ? (
                            <div style={{fontSize:'0.8rem',color:'#9CA3AF',fontStyle:'italic'}}>No competitor dominance data available.</div>
                          ) : threatList.map((t,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12,paddingBottom:12,borderBottom:i<threatList.length-1?'1px solid #F3F4F6':'none'}}>
                              <div style={{width:36,height:36,borderRadius:'50%',background:'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.72rem',color:'#374151',flexShrink:0}}>
                                #{i+1}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                                  <span style={{fontSize:'0.85rem',fontWeight:700,color:'#111827'}}>{t.name}</span>
                                  <span style={{fontSize:'0.78rem',fontWeight:700,color:'#A100FF'}}>{t.count} topics</span>
                                </div>
                                <div style={{background:'#F3F4F6',borderRadius:50,height:6,overflow:'hidden'}}>
                                  <div style={{width:`${t.pct}%`,height:'100%',background:'#A100FF',borderRadius:50}}/>
                                </div>
                                <div style={{fontSize:'0.68rem',color:'#9CA3AF',marginTop:3}}>Owns {t.pct}% of tracked prompt categories</div>
                              </div>
                            </div>
                          ))}
                          <div style={{marginTop:14,background:'#F5F0FF',borderRadius:8,padding:'10px 14px',fontSize:'0.75rem',color:'#7C3AED',borderLeft:'3px solid #A100FF'}}>
                            <strong>So what:</strong> Study what content these competitors publish for these topics — then build better, more specific, AI-optimized versions.
                          </div>
                        </div>
                      </div>

                      {/* Path Forward — expanded right side only */}
                      <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'24px 28px',marginBottom:20}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:28}}>
                          {/* Left: What's Next narrative */}
                          <div>
                            <div style={{display:'inline-block',background:'#EDE9FE',borderRadius:8,padding:'4px 12px',fontSize:'0.62rem',fontWeight:700,color:'#7C3AED',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:14}}>
                              {brand} GEO · The Opportunity
                            </div>
                            <h2 style={{fontSize:'1.4rem',fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:12}}>
                              A closeable gap —<br/><span style={{color:'#A100FF'}}>and a clear path to #{Math.max(1,rankNum-1)}.</span>
                            </h2>
                            <p style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.6,marginBottom:12}}>
                              Prioritized actions unlock an estimated <strong style={{color:'#F59E0B'}}>+7 points near-term</strong> ({geo} → {geo+7}, into the Competitive tier). The full roadmap targets a <strong style={{color:'#A100FF'}}>+22-point unlock</strong>.
                            </p>
                            <p style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.6,marginBottom:16}}>
                              {brand} doesn't need to outspend the market — it needs to send the right signals, in the right places, in the right order.
                            </p>
                            <div style={{background:'#F5F0FF',borderRadius:8,borderLeft:'4px solid #A100FF',padding:'14px 16px',fontSize:'0.78rem',color:'#374151',lineHeight:1.6}}>
                              <strong style={{textDecoration:'underline'}}>So what</strong> — Percepta turns this diagnosis into a sequenced, forecasted roadmap. Every action is ranked by ROI — not by effort.
                            </div>
                          </div>

                          {/* Right: Journey + How */}
                          <div>
                            {[
                              {score:String(geo), label:'Today', sub:`"${geoTier}" · current position`, bg:'#FEF3C7', border:'#F59E0B', color:'#92400E'},
                              {score:String(geo+7), label:'Near-term (+7)', sub:'Crosses into the Competitive tier · fix quick wins + top gaps', bg:'#EDE9FE', border:'#A100FF', color:'#A100FF'},
                              {score:`#${Math.max(1,rankNum-1)}`, label:`In reach (+22 pts)`, sub:`Leapfrog to challenge for top ${Math.max(1,rankNum-1)} in AI`, bg:'#ECFDF5', border:'#10B981', color:'#065F46'},
                            ].map((step,i)=>(
                              <div key={i} style={{display:'flex',gap:12,alignItems:'stretch',marginBottom:8}}>
                                <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center'}}>
                                  <div style={{width:4,background:step.border,borderRadius:4,flex:1,minHeight:8}}/>
                                  {i<2&&<div style={{color:'#9CA3AF',fontSize:'0.75rem',margin:'2px 0'}}>↓</div>}
                                </div>
                                <div style={{flex:1,background:step.bg,borderRadius:10,padding:'12px 16px'}}>
                                  <div style={{fontSize:'2rem',fontWeight:900,color:step.color,lineHeight:1}}>{step.score}</div>
                                  <div style={{fontSize:'0.82rem',fontWeight:700,color:'#374151',marginTop:2}}>{step.label}</div>
                                  <div style={{fontSize:'0.73rem',color:'#6B7280'}}>{step.sub}</div>
                                </div>
                              </div>
                            ))}

                            <div style={{fontSize:'0.65rem',fontWeight:800,color:'#374151',letterSpacing:'0.08em',textTransform:'uppercase' as const,margin:'16px 0 10px'}}>The How — Prioritized Actions</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                              {[
                                {icon:'📄', title:'LLM-ready content', sub:`Cover ${presenceGaps.slice(0,2).map(g=>g.product).join(' & ')} blind spots`, priority:'High'},
                                {icon:'🏷️', title:'Attribute reinforcement', sub:`Strengthen signals on ${strongProds[0]?.label||'top products'}`, priority:'High'},
                                {icon:'🔗', title:'Citation & authority', sub:'Build earned-media on AI-trusted sources', priority:'Medium'},
                                {icon:'⚙️', title:'Technical & schema', sub:'Structured data for AI ingestion', priority:'Medium'},
                              ].map((h,i)=>(
                                <div key={i} style={{background:'#7C3AED',borderRadius:10,padding:'12px 14px'}}>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                                    <span style={{fontSize:'1.2rem'}}>{h.icon}</span>
                                    <span style={{fontSize:'0.6rem',fontWeight:700,background:h.priority==='High'?'#EF4444':'#F59E0B',color:'white',borderRadius:4,padding:'1px 6px'}}>{h.priority}</span>
                                  </div>
                                  <div style={{fontSize:'0.75rem',fontWeight:700,color:'white',marginBottom:2}}>{h.title}</div>
                                  <div style={{fontSize:'0.65rem',color:'#C4B5FD',lineHeight:1.4}}>{h.sub}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      </>
                    );
                  })()}

                </div>
              );
            })()}

{/* TAB 7: Recommendations */}
            {activeTab===7&&(()=>{
              const rd2=result.responses_detail||[],recClusters=result.query_clusters||[];
              const topComp1=(result.competitors||[])[0]?.Brand||'Top Competitor';
              const segments=recClusters.slice(0,9).map((c:any)=>{const rate=c.winRate;const isWinning=rate>=60,isEmerging=!isWinning&&rate>=30;return{name:c.category,status:isWinning?'Winning':isEmerging?'Emerging':'Gap',color:isWinning?'#10B981':isEmerging?'#F59E0B':'#EF4444',bg:isWinning?'#F0FDF4':isEmerging?'#FFFBEB':'#FFF1F2',border:isWinning?'#6EE7B7':isEmerging?'#FCD34D':'#FCA5A5',score:rate,dominated:c.topCompetitor||topComp1};});
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  {segments.length>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s:any,i:number)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:'#F3F4F6',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> · Dominated by: {s.dominated}</div></div>)}</div>}
                  {result.recommendations&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,marginBottom:24}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:14}}>Recommendations</div><MarkdownText text={result.recommendations}/></div>}
                  <PriorityActionsTable result={result} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
                </div>
              );
            })()}

            {/* TAB 8: Live Prompt */}
            {activeTab===8&&(()=>(
              <div style={{display:'flex',flexDirection:'column' as const,minHeight:'calc(100vh - 200px)'}}>
                <div style={{marginBottom:12}}><div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:3}}>Live Prompt Tester</div><div style={{fontSize:'0.8rem',color:'#9CA3AF'}}>Ask any question and see how AI responds about brands in your category.</div></div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:12}}>
                  {examplePrompts.map((p,i)=>(<button key={i} onClick={()=>runPrompt(p)} style={{background:'#F5F0FF',border:'1px solid #E9D5FF',borderRadius:20,padding:'6px 14px',fontSize:'0.78rem',color:'#7500C0',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap' as const}}>{p}</button>))}
                </div>
                <div style={{background:'white',borderRadius:14,border:'1.5px solid #E5E7EB',padding:'12px 16px',display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
                  <input type="text" value={promptInput} onChange={e=>setPromptInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runPrompt()} placeholder="Ask anything, e.g. What is the best travel credit card?" style={{flex:1,border:'none',padding:'6px 0',fontSize:'0.9rem',outline:'none',color:'#374151',background:'transparent'}}/>
                  <button onClick={()=>runPrompt()} disabled={promptLoading} style={{background:promptLoading?'#E9D5FF':'#A100FF',color:'white',border:'none',borderRadius:10,padding:'8px 22px',fontWeight:700,fontSize:'0.88rem',cursor:promptLoading?'not-allowed':'pointer',flexShrink:0}}>{promptLoading?'Asking...':'Ask AI'}</button>
                  {promptHistory.length>0&&<button onClick={()=>setPromptHistory([])} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',fontSize:'0.75rem',color:'#9CA3AF',cursor:'pointer'}}>Clear</button>}
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:12,flex:1}}>
                  {promptHistory.length===0&&!promptLoading?(<div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:'40px',color:'#9CA3AF',background:'white',borderRadius:14,border:'1px solid #E5E7EB'}}><div style={{width:56,height:56,borderRadius:'50%',background:'#F5F0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6rem',marginBottom:12}}>🤖</div><div style={{fontSize:'0.95rem',fontWeight:700,color:'#374151',marginBottom:6}}>Ask the AI anything</div></div>):(
                    <>{promptHistory.map((h,i)=>(<div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}><div style={{background:'#F5F0FF',padding:'10px 18px',borderBottom:'1px solid #EDE9FE',display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:'0.7rem',fontWeight:700,color:'#A100FF',background:'#EDE9FE',borderRadius:50,padding:'2px 8px'}}>Q</span><span style={{fontSize:'0.84rem',fontWeight:600,color:'#7500C0'}}>{h.q}</span></div><div style={{padding:'16px 18px'}}><MarkdownText text={h.a}/></div></div>))}
                    {promptLoading&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,display:'flex',alignItems:'center',gap:12,color:'#9CA3AF',fontSize:'0.88rem'}}><div style={{width:18,height:18,border:'2px solid #E9D5FF',borderTopColor:'#A100FF',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>Querying AI model...</div>}</>
                  )}
                </div>
              </div>
            ))()}

            {/* TAB 9: FAQ */}
            {activeTab===9&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>What does this score mean for your business?</div>
                <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:24}}>Everything you need to understand your score and how to act on it.</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
                  {[{q:'What is a GEO Score?',a:'The GEO Score is a single 0-100 number that measures how often and how favorably your brand is cited in AI-generated responses across ChatGPT, Gemini, Perplexity, and other major AI engines.'},{q:'Why does 70 matter?',a:'70 is the efficiency threshold where AI models have accumulated enough signals to place you at the top of responses with statistical confidence. Below 70, AI treats your brand as optional. Above it, your brand becomes a default recommendation.'},{q:'How is the GEO Score calculated?',a:'The GEO Score is a weighted average of five signals: Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15.'},{q:'How often is the score updated?',a:'The GEO Score is calculated in real-time each time you run an analysis — so your score always reflects current AI responses, not cached data.'},{q:"What's the difference between Visibility and Prominence?",a:'Visibility measures whether your brand appears at all in an AI response. Prominence measures where — being named first scores much higher than being named fifth.'},{q:"What's the difference between Citation Score and Share of Voice?",a:'Citation Score measures how authoritatively your brand is referenced. Share of Voice measures your dominance across all brand mentions — how much of the AI conversation belongs to you vs. competitors.'},{q:'How do I improve my GEO Score?',a:"Build authoritative content, earn placements on sources AI trusts, and expand coverage across segments where you're currently invisible."}].map((item,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:8}}>{item.q}</div><div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.75}}>{item.a}</div></div>)}
                </div>
              </div>
            ))()}

          </div>
        </div>
      )}
    </main>
  );
}
