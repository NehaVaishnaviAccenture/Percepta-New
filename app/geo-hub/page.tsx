'use client';
import React, { useState, useEffect } from 'react';

const bands = [
  { bg: '#E8F5E9', border: '#43A047', color: '#43A047', range: '80-100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#FFFDE7', border: '#FDD835', color: '#F9A825', range: '70-79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FBE9E7', border: '#FF7043', color: '#FF7043', range: '45-69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFEBEE', border: '#F44336', color: '#F44336', range: '0-44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string,string> = {
  'visibility score': 'How often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'How authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'The tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'Average position when your brand is mentioned. #1 means AI names you first most often.',
  'prominence score': 'How early in AI responses your brand is mentioned.',
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
  if (['wikipedia','gov','edu','consumerreports','federalreserve','fdic'].some(s=>dl.includes(s))) return {label:'Institution',color:'#3B82F6',bg:'#DBEAFE'};
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s=>dl.includes(s))) return {label:'Earned Media',color:'#10B981',bg:'#D1FAE5'};
  return {label:'Other',color:'#6B7280',bg:'#F3F4F6'};
}

function buildFeatureDims(_indKey: string, _rd: any[], sent: number, prom: number, vis: number, cit: number, sov: number, clusters: any[] = []): {label:string,val:number}[] {
  if (clusters.length >= 2) {
    return [...clusters].sort((a:any,b:any)=>(b.total||0)-(a.total||0)).slice(0,6).map((c:any)=>({label:c.category,val:Math.max(0,Math.min(100,c.winRate??0))}));
  }
  return [{label:'Visibility',val:vis},{label:'Sentiment',val:sent},{label:'Authority',val:Math.round(cit*0.6+prom*0.4)},{label:'Prominence',val:prom},{label:'Share of Voice',val:sov},{label:'Recommendation',val:Math.round(sov*0.55+prom*0.45)}];
}

function ensureRadarHasData(dims: {label:string,val:number}[], sent:number, prom:number, vis:number, cit:number, sov:number): {label:string,val:number}[] {
  if (!dims.every(d=>d.val===0)) return dims;
  return [{label:'Visibility',val:Math.max(vis,5)},{label:'Sentiment',val:Math.max(sent,5)},{label:'Prominence',val:Math.max(prom,5)},{label:'Citations',val:Math.max(cit,5)},{label:'Share of Voice',val:Math.max(sov,5)},{label:'Authority',val:Math.max(Math.round((cit+prom)/2),5)}];
}

function getRadarTip(label: string): string {
  const tips: Record<string,string> = {
    'Visibility':'How often your brand appears across all AI queries.',
    'Sentiment':'How positively AI describes your brand overall.',
    'Prominence':'How early in AI responses your brand is mentioned.',
  };
  return tips[label] || `How often your brand appears in AI responses for ${label.toLowerCase()} queries.`;
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:5,cursor:'help'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',color:'#6B7280',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>?</span>
      {show&&<span style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'white',fontSize:'0.72rem',lineHeight:1.6,borderRadius:8,padding:'10px 14px',width:210,textAlign:'left' as const,boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:9999,pointerEvents:'none' as const,whiteSpace:'normal' as const}}>{text}</span>}
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
        <line x1={ox(score,mi)} y1={oy(score,mi)} x2={ox(score,mo)} y2={oy(score,mo)} stroke="#6D28D9" strokeWidth="4" strokeLinecap="round"/>
        {[0,20,40,60,80,100].map(t=><text key={t} x={ox(t,Ro+18)} y={oy(t,Ro+18)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>)}
        <text x={cx} y={cy-18} textAnchor="middle" style={{fontSize:46,fontWeight:900,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        <span style={{fontSize:'0.78rem',fontWeight:700,color:'#374151'}}>GEO Score</span>
        <Tooltip text="GEO Score = Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15"/>
      </div>
    </div>
  );
}

function WhatScoreMeans({ score, brand }: { score:number; brand:string }) {
  const scoreBands = [
    {range:'0-44',label:'Poor',color:'#F44336',bg:'#FFEBEE',border:'#F44336',desc:'Rarely mentioned. AI lacks enough signals to surface you reliably.'},
    {range:'45-69',label:'Needs Work',color:'#FF7043',bg:'#FBE9E7',border:'#FF7043',desc:'Appears in lists but not as a primary recommendation.'},
    {range:'70-79',label:'Good',color:'#F9A825',bg:'#FFFDE7',border:'#FDD835',desc:'AI crosses the confidence threshold. Frequent top-3 placements begin.'},
    {range:'80-100',label:'Excellent',color:'#43A047',bg:'#E8F5E9',border:'#43A047',desc:'Dominant brand signal. AI leads with you as the primary recommendation.'},
  ];
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
      <div style={{fontSize:'0.95rem',fontWeight:800,color:'#7C3AED',marginBottom:10}}>What does your score mean?</div>
      <p style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.75,margin:'0 0 14px'}}>
        Think of the GEO Score like a credit score for AI. At <strong>{score}</strong>, <strong>{brand}</strong> {score>=80?'is in the top tier. AI consistently leads with your brand as the primary recommendation.':score>=70?'has crossed the efficiency threshold where AI models consistently feature your brand near the top of responses.':'is below the 70 threshold where AI models consistently feature a brand at the top of responses.'}
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
  const W=700,H=280,padL=52,padR=28,padT=36,padB=52;
  const plotW=W-padL-padR,plotH=H-padT-padB;
  const curve=(x:number)=>Math.round(5+90/(1+Math.exp(-0.09*(x-45))));
  const pts=Array.from({length:101},(_,x)=>({x,y:curve(x)}));
  const sx=(v:number)=>padL+(v/100)*plotW;
  const sy=(v:number)=>padT+((100-v)/100)*plotH;
  const scoreToX=(s:number)=>{let best=0,bd=999;pts.forEach(p=>{const d=Math.abs(p.y-s);if(d<bd){bd=d;best=p.x;}});return best;};
  const currentX=scoreToX(score),goalX=scoreToX(70),authX=scoreToX(80);
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const gapPts=score<70?pts.slice(currentX,goalX+1):[];
  const fillD=gapPts.length>1?`${gapPts.map((p,i)=>`${i===0?'M':'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT+plotH} L${sx(currentX)},${padT+plotH} Z`:'';
  const [hov,setHov]=useState<string|null>(null);
  const youCX=sx(currentX),youCY=sy(score),goalCX=sx(goalX),goalCY=sy(70),authCX=sx(authX),authCY=sy(80);
  return (
    <div style={{background:'#F8FAFC',borderRadius:12}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        <text x={W/2} y={22} textAnchor="middle" style={{fontSize:13,fontWeight:700,fill:'#111827',fontFamily:'Inter,sans-serif'}}>Where You Are vs Your Opportunity</text>
        {[0,25,50,75,100].map(v=>(<g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-6} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        {fillD&&<path d={fillD} fill="#EDE9FE" opacity="0.45"/>}
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="5,4"/>
        <path d={pathD} fill="none" stroke="#7C3AED" strokeWidth="2.5"/>
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        {[0,20,40,60,80,100].map(v=>(<g key={v}><line x1={sx(v)} y1={padT+plotH} x2={sx(v)} y2={padT+plotH+4} stroke="#D1D5DB" strokeWidth="1"/><text x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        <text x={(padL+W-padR)/2} y={padT+plotH+22} textAnchor="middle" style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:600}}>GEO Maturity</text>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('you')} onMouseLeave={()=>setHov(null)}>
          <circle cx={youCX} cy={youCY} r={7} fill="#7C3AED" stroke="white" strokeWidth="2"/>
          <text x={youCX} y={youCY+18} textAnchor="middle" style={{fontSize:7,fontWeight:700,fill:'#5B21B6',fontFamily:'Inter,sans-serif'}}>You ({score})</text>
          {hov==='you'&&<><rect x={youCX-52} y={youCY+28} width={104} height={20} rx={4} fill="#1F2937"/><text x={youCX} y={youCY+39} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: {score}</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('goal')} onMouseLeave={()=>setHov(null)}>
          <circle cx={goalCX} cy={goalCY} r={9} fill="#1E88E5" stroke="white" strokeWidth="2"/>
          <text x={goalCX-12} y={goalCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#1E88E5',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('auth')} onMouseLeave={()=>setHov(null)}>
          <circle cx={authCX} cy={authCY} r={12} fill="#43A047" stroke="white" strokeWidth="2"/>
          <text x={authCX-12} y={authCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#065F46',fontFamily:'Inter,sans-serif'}}>Authority (80)</text>
        </g>
      </svg>
    </div>
  );
}

// FIX 5: getProductDefs driven by result.ind_key, never by brand name
function getProductDefs(indKey: string, lob: string): {label:string,terms:string[],color:string}[] {
  const k=indKey, l=lob.toLowerCase();
  const C=['#10B981','#34D399','#F59E0B','#FB923C','#EF4444','#3B82F6','#8B5CF6'];
  if(k==='fin'||l.includes('credit card'))return[
    {label:'Rewards Cards',terms:['rewards','points','savor','thank you','strata','premier','gold card','preferred','signature'],color:C[0]},
    {label:'Travel Cards',terms:['travel','sapphire','venture','platinum','autograph','miles','airline','lounge'],color:C[5]},
    {label:'Cash Back Cards',terms:['cash back','cashback','double cash','freedom','quicksilver','active cash','blue cash'],color:C[2]},
    {label:'Balance Transfer',terms:['balance transfer','0% apr','0 apr','zero apr','simplicity','reflect','slate'],color:C[6]},
    {label:'Secured Cards',terms:['secured','credit builder','deposit','credit building'],color:C[3]},
    {label:'No Annual Fee',terms:['no annual fee','no fee','fee-free'],color:C[4]},
  ];
  if(k==='fin_cc_balance_transfer')return[
    {label:'0% APR Offers',terms:['0% apr','0 apr','zero apr','intro apr','introductory'],color:C[0]},
    {label:'No Transfer Fee',terms:['no transfer fee','no balance transfer fee','waived'],color:C[1]},
    {label:'Debt Consolidation',terms:['consolidate','debt','payoff','pay off','multiple balances'],color:C[2]},
    {label:'Long Intro Period',terms:['21 months','18 months','15 months','longest','extended'],color:C[5]},
    {label:'Low Ongoing APR',terms:['low apr','ongoing rate','after intro','variable apr'],color:C[3]},
  ];
  if(k==='fin_cc_travel')return[
    {label:'Miles Cards',terms:['miles','airline','aadvantage','skymiles','united','southwest'],color:C[0]},
    {label:'Hotel Cards',terms:['hotel','marriott','hilton','hyatt','ihg'],color:C[1]},
    {label:'Flexible Points',terms:['transferable','flexible','chase ultimate','amex points','capital one miles'],color:C[2]},
    {label:'Lounge Access',terms:['lounge','priority pass','centurion','admirals','sky club'],color:C[5]},
    {label:'No Foreign Fee',terms:['no foreign','international','foreign transaction'],color:C[3]},
  ];
  if(k==='fin_cc_cashback')return[
    {label:'Flat Rate',terms:['flat rate','unlimited','every purchase','2%','1.5%'],color:C[0]},
    {label:'Grocery Cash Back',terms:['grocery','supermarket','whole foods'],color:C[1]},
    {label:'Gas Cash Back',terms:['gas','fuel','station'],color:C[2]},
    {label:'Dining Cash Back',terms:['dining','restaurant','food delivery'],color:C[5]},
    {label:'Online Shopping',terms:['online','amazon','shopping'],color:C[3]},
  ];
  if(k==='fin_cc_secured')return[
    {label:'Credit Building',terms:['credit building','build credit','establish credit'],color:C[0]},
    {label:'Low Deposit',terms:['low deposit','minimum deposit'],color:C[1]},
    {label:'Graduation Path',terms:['graduate','unsecured','upgrade','automatic review'],color:C[2]},
    {label:'No Annual Fee',terms:['no annual fee','fee-free'],color:C[5]},
    {label:'Cash Back Rewards',terms:['cash back','rewards','earn'],color:C[3]},
  ];
  if(k==='fin_retail_bank')return[
    {label:'Savings Accounts',terms:['savings','high yield','hysa','apy','performance savings'],color:C[0]},
    {label:'Checking Accounts',terms:['checking','debit','direct deposit','360 checking'],color:C[1]},
    {label:'CD Accounts',terms:['cd','certificate of deposit','fixed rate'],color:C[2]},
    {label:'Teen & Kids',terms:['teen','kid','youth','student','minor'],color:C[5]},
    {label:'Digital Banking',terms:['mobile app','digital','online banking','zelle'],color:C[3]},
  ];
  if(k==='fin_mortgage'||l.includes('mortgage'))return[
    {label:'Home Purchase',terms:['purchase','home loan','buy a home','first home'],color:C[0]},
    {label:'Refinancing',terms:['refinance','refi','cash-out','lower rate'],color:C[1]},
    {label:'FHA / VA Loans',terms:['fha','va loan','veteran','usda'],color:C[2]},
    {label:'HELOC',terms:['heloc','home equity','equity line'],color:C[5]},
    {label:'Jumbo Loans',terms:['jumbo','large loan','luxury home'],color:C[3]},
  ];
  if(k==='fin_auto_loan'||l.includes('auto loan'))return[
    {label:'New Car Loans',terms:['new car','new vehicle','new auto'],color:C[0]},
    {label:'Used Car Loans',terms:['used car','pre-owned','certified pre'],color:C[1]},
    {label:'Refinancing',terms:['refinance','refi','lower rate'],color:C[2]},
    {label:'EV Financing',terms:['electric','ev','tesla','rivian'],color:C[5]},
    {label:'No Down Payment',terms:['no down','zero down'],color:C[3]},
  ];
  if(k==='fin_retirement'||k==='fin_wealth')return[
    {label:'401(k) Plans',terms:['401k','401(k)','employer plan','workplace'],color:C[0]},
    {label:'IRA Accounts',terms:['ira','roth','traditional ira','rollover'],color:C[1]},
    {label:'Investment Funds',terms:['mutual fund','index fund','etf','portfolio'],color:C[2]},
    {label:'Annuities',terms:['annuity','annuities','guaranteed income'],color:C[5]},
    {label:'Financial Planning',terms:['financial plan','advisor','retirement planning'],color:C[3]},
  ];
  if(k==='auto')return[
    {label:'Sedans',terms:['sedan','camry','accord','civic','corolla'],color:C[0]},
    {label:'SUVs',terms:['suv','crossover','rav4','explorer','highlander'],color:C[1]},
    {label:'Electric',terms:['electric','ev','model 3','model y'],color:C[2]},
    {label:'Trucks',terms:['truck','pickup','f-150','silverado'],color:C[5]},
    {label:'Luxury',terms:['luxury','premium','bmw','mercedes','audi'],color:C[3]},
  ];
  if(k==='hotel')return[
    {label:'Luxury Hotels',terms:['luxury','5-star','premium','ritz'],color:C[0]},
    {label:'Business Hotels',terms:['business','corporate','suite','conference'],color:C[1]},
    {label:'Family Resorts',terms:['family','resort','kid','all-inclusive'],color:C[2]},
    {label:'Loyalty Program',terms:['points','rewards','status','elite','loyalty'],color:C[5]},
    {label:'Budget / Value',terms:['budget','value','affordable','deal'],color:C[3]},
  ];
  if(k==='media')return[
    {label:'Original Series',terms:['original','series','show','exclusive'],color:C[0]},
    {label:'Movies',terms:['movie','film','cinema','theatrical'],color:C[1]},
    {label:'Music',terms:['music','song','playlist','podcast'],color:C[2]},
    {label:'Ad-Free Plan',terms:['ad-free','no ads','premium plan'],color:C[5]},
    {label:'Family Plan',terms:['family','profiles','multiple screens'],color:C[3]},
  ];
  if(k==='retail')return[
    {label:'Electronics',terms:['electronic','tech','laptop','phone','tv'],color:C[0]},
    {label:'Grocery & Food',terms:['grocery','food','fresh','produce'],color:C[1]},
    {label:'Clothing',terms:['clothing','apparel','fashion'],color:C[2]},
    {label:'Home & Garden',terms:['home','furniture','garden','decor'],color:C[5]},
    {label:'Membership',terms:['membership','prime','subscription'],color:C[3]},
  ];
  if(k==='sport')return[
    {label:'Running Shoes',terms:['running','run','marathon','trail'],color:C[0]},
    {label:'Training Gear',terms:['training','gym','workout','crossfit'],color:C[1]},
    {label:'Lifestyle',terms:['casual','lifestyle','everyday','athleisure'],color:C[2]},
    {label:'Team Sports',terms:['basketball','soccer','football'],color:C[5]},
    {label:'Outdoor',terms:['outdoor','hiking','adventure'],color:C[3]},
  ];
  const lobWords=lob.split(/[\s,&\/]+/).filter((w:string)=>w.length>3).slice(0,5);
  if(lobWords.length>=2)return lobWords.map((w:string,i:number)=>({label:w.charAt(0).toUpperCase()+w.slice(1),terms:[w.toLowerCase()],color:C[i%C.length]}));
  return[
    {label:'Core Product',terms:['product','service','solution','platform'],color:C[0]},
    {label:'Premium Tier',terms:['premium','pro','plus','elite'],color:C[1]},
    {label:'Entry Tier',terms:['basic','starter','standard','free'],color:C[2]},
    {label:'Bundles',terms:['bundle','package','combo','suite'],color:C[5]},
    {label:'Add-ons',terms:['add-on','extra','optional','upgrade'],color:C[3]},
  ];
}

// FIX 1+4+5: SankeyGeoFlow — 4-col sankey on GEO Score tab
// Products driven by ind_key. Labels show "{pct}% of AI responses ({mentions}/{totalRd} queries)"
function SankeyGeoFlow({ result }: { result: any }) {
  const [hovMetric,setHovMetric]=useState<string|null>(null);
  const rawSent=result.sentiment??0,prom=result.prominence??0,vis=result.visibility??0;
  const cit=result.citation_share??0,sov=result.share_of_voice??0,geo=result.overall_geo_score??0;
  const lob:string=result.lob||'',indKey:string=result.ind_key||'gen';
  const rd:any[]=result.responses_detail||[],clusters:any[]=result.query_clusters||[];
  const totalRd=result.total_responses??rd.length??100;

  const TOPIC_COLORS=['#7C3AED','#10B981','#3B82F6','#F59E0B','#EF4444'];
  const topTopics=[...clusters].sort((a:any,b:any)=>(b.total||0)-(a.total||0)).slice(0,5).map((c:any,i:number)=>({label:c.category,val:Math.max(5,Math.min(95,c.winRate??0)),color:TOPIC_COLORS[i%5],total:c.total||0}));
  const leftItems=topTopics.length>=1?topTopics:[{label:'General',val:vis||30,color:'#7C3AED',total:10}];

  const productDefs=getProductDefs(indKey,lob);
  const productMentions=productDefs.map(p=>{
    const count=Math.min(rd.filter((r:any)=>{const txt=(r.response_preview||r.response||'').toLowerCase();return p.terms.some((t:string)=>txt.includes(t));}).length,totalRd);
    const pct=totalRd>0?Math.round((count/totalRd)*100):0;
    return{...p,mentions:count,pct,val:Math.max(5,count)};
  }).filter(p=>p.mentions>0||rd.length===0);
  const sortedMentions=[...productMentions].sort((a:any,b:any)=>b.mentions-a.mentions);
  const prodItems:any[]=sortedMentions.length>=1?sortedMentions:productDefs.map((p,i)=>({...p,mentions:Math.round(totalRd/(productDefs.length||5)),pct:Math.round(100/(productDefs.length||5)),val:20+i*5}));

  const signals:any[]=[
    {label:'Visibility',val:vis,weight:30,color:'#7C3AED'},
    {label:'Sentiment',val:rawSent,weight:20,color:'#10B981'},
    {label:'Prominence',val:prom,weight:20,color:'#3B82F6'},
    {label:'Citations',val:cit,weight:15,color:'#1E88E5'},
    {label:'Share of Voice',val:sov,weight:15,color:'#6366F1'},
  ];
  const geoScore=Math.round(signals.reduce((s,m)=>s+m.val*m.weight/100,0))||geo;

  const W4=1040,H4=480,padT4=32,padB4=44;
  const col1=130,col2=310,col3=520,col4=730,nW4=26;
  const plotH4=H4-padT4-padB4;

  const layoutN=(items:any[],x:number,minH=22,gap=8):any[]=>{
    const total=items.reduce((s:number,n:any)=>s+Math.max(n.val,1),0)||1;
    const usableH=plotH4-gap*(items.length-1);
    let cy=padT4;
    return items.map((n:any)=>{
      const h=Math.max(minH,(Math.max(n.val,1)/total)*usableH);
      const nd={...n,x,y:cy,h,mid:cy+h/2};
      cy+=h+gap;
      return nd;
    });
  };

  const lNodes=layoutN(leftItems,col1,24,10);
  const pNodes=layoutN(prodItems,col2,26,10);
  const sNodes=layoutN(signals,col3,28,8);
  const geoH4=Math.min(plotH4*0.55,140);
  const geoN4={x:col4,y:padT4+(plotH4-geoH4)/2,h:geoH4,mid:padT4+(plotH4-geoH4)/2+geoH4/2};

  const wave=(x1:number,y1:number,h1:number,x2:number,y2:number,h2:number,bend=0.44)=>{
    const mx1=x1+nW4+(x2-x1-nW4)*bend,mx2=x2-(x2-x1-nW4)*bend;
    return `M${x1+nW4},${y1} C${mx1},${y1} ${mx2},${y2} ${x2},${y2} L${x2},${y2+h2} C${mx2},${y2+h2} ${mx1},${y1+h1} ${x1+nW4},${y1+h1} Z`;
  };

  const flows4a:any[]=[];
  lNodes.forEach((ln:any)=>{
    const topicRd=rd.filter((r:any)=>r.category===ln.label);
    const topicTotal=topicRd.length||1;
    const prodShares=pNodes.map((pn:any)=>{
      const pDef=productDefs.find(p=>p.label===pn.label);
      if(!pDef)return 0;
      const cnt=topicRd.filter((r:any)=>pDef.terms.some((t:string)=>(r.response_preview||'').toLowerCase().includes(t))).length;
      return cnt/topicTotal;
    });
    const totalShare=prodShares.reduce((s:number,v:number)=>s+v,0)||1;
    let lOffset=0;
    pNodes.forEach((pn:any,pi:number)=>{
      const frac=prodShares[pi]/totalShare;
      if(frac<0.001)return;
      const lH=Math.max(2,ln.h*frac);
      const pH=Math.max(2,pn.h*frac);
      flows4a.push({path:wave(ln.x,ln.y+lOffset,lH,pn.x,pn.y,pH,0.42),color:pn.color,tid:ln.label,pid:pn.label});
      lOffset+=lH;
    });
  });

  const flows4b:any[]=[];
  const sigOffsets:Record<string,number>={};
  sNodes.forEach((sig:any)=>{sigOffsets[sig.label]=sig.y;});
  const totalMentions4b=prodItems.reduce((s:number,p:any)=>s+Math.max(p.val,1),0)||1;
  pNodes.forEach((pn:any)=>{
    let pOffset=0;
    sNodes.forEach((sig:any)=>{
      const fw=sig.weight/100;
      const pH=Math.max(2,pn.h*fw);
      const pShare=Math.max(pn.val,1)/totalMentions4b;
      const sH=Math.max(2,sig.h*pShare);
      const sY=sigOffsets[sig.label];
      flows4b.push({path:wave(pn.x,pn.y+pOffset,pH,sig.x,sY,sH,0.43),color:pn.color,pid:pn.label,sid:sig.label});
      pOffset+=pH;
      sigOffsets[sig.label]+=sH;
    });
  });

  const flows4c:any[]=[];
  let gOff4=geoN4.y;
  sNodes.forEach((sig:any)=>{
    const h=geoN4.h*(sig.weight/100);
    flows4c.push({path:wave(sig.x,sig.y,sig.h,geoN4.x,gOff4,h,0.46),color:sig.color,sid:sig.label});
    gOff4+=h;
  });

  const isHov=(key:string)=>hovMetric===key;

  return(
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px',marginTop:16}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:'1rem',fontWeight:700,color:'#111827'}}>Brand Signal Flow · GEO Score Composition</div>
          <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:2}}>How AI query topics flow through brand products mentioned, GEO signals, to your score. Click any node to trace the path.</div>
        </div>
        <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 12px',fontSize:'0.65rem',color:'#5B21B6',lineHeight:1.7,maxWidth:200,flexShrink:0}}>
          <div style={{fontWeight:700,marginBottom:3}}>How to read this</div>
          <div>Left: what AI is asked about</div>
          <div>2nd: which products AI mentions</div>
          <div>3rd: how signals are scored</div>
          <div>Right: your final GEO Score</div>
        </div>
      </div>
      <div style={{overflowX:'auto' as const}}>
        <svg viewBox={`0 0 ${W4} ${H4}`} style={{width:'100%',minWidth:800,display:'block'}} onClick={()=>setHovMetric(null)}>
          {[{x:col1+nW4/2,l:'QUERY TOPICS'},{x:col2+nW4/2,l:'BRAND PRODUCTS MENTIONED'},{x:col3+nW4/2,l:'GEO SIGNALS'},{x:col4+nW4/2,l:'GEO SCORE'}].map((h,i)=>(
            <text key={i} x={h.x} y={padT4-10} textAnchor="middle" style={{fontSize:7.5,fontWeight:700,fill:'#9CA3AF',fontFamily:'Inter,sans-serif',letterSpacing:'0.07em'}}>{h.l}</text>
          ))}
          {flows4a.map((f:any,i:number)=>(<path key={`fa${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.tid)||isHov(f.pid)?0.55:0.04):0.16} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.tid?null:f.tid);}}/>))}
          {flows4b.map((f:any,i:number)=>(<path key={`fb${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.pid)||isHov(f.sid)?0.52:0.04):0.18} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.pid?null:f.pid);}}/>))}
          {flows4c.map((f:any,i:number)=>(<path key={`fc${i}`} d={f.path} fill={f.color} opacity={hovMetric?(isHov(f.sid)?0.52:0.04):0.22} style={{cursor:'pointer',transition:'opacity 0.15s'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===f.sid?null:f.sid);}}/>))}
          {lNodes.map((n:any,i:number)=>{const dim=hovMetric&&!isHov(n.label);return(<g key={`ln${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
            <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
            <text x={n.x-6} y={n.mid-6} textAnchor="end" dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label.length>17?n.label.slice(0,16)+'…':n.label}</text>
            <text x={n.x-6} y={n.mid+6} textAnchor="end" dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val}% win</text>
          </g>);})}
          {pNodes.map((n:any,i:number)=>{const dim=hovMetric&&!isHov(n.label);return(<g key={`pn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
            <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:1}/>
            <text x={n.x+nW4+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label.length>18?n.label.slice(0,17)+'…':n.label}</text>
            <text x={n.x+nW4+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.pct}% of AI responses ({n.mentions}/{totalRd} queries)</text>
          </g>);})}
          {sNodes.map((n:any,i:number)=>{const dim=hovMetric&&!isHov(n.label);return(<g key={`sn${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovMetric(hovMetric===n.label?null:n.label);}}>
            <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={dim?0.3:0.9}/>
            <text x={n.x+nW4+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:8.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label}</text>
            <text x={n.x+nW4+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:7.5,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val} · {n.weight}%</text>
          </g>);})}
          <rect x={geoN4.x} y={geoN4.y} width={nW4} height={geoN4.h} fill="#7C3AED" rx={5}/>
          <text x={geoN4.x+nW4+12} y={geoN4.mid-20} style={{fontSize:13,fontWeight:800,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
          <text x={geoN4.x+nW4+12} y={geoN4.mid+14} style={{fontSize:36,fontWeight:900,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>{geoScore}</text>
          <text x={geoN4.x+nW4+12} y={geoN4.mid+36} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>out of 100</text>
        </svg>
      </div>
      <div style={{borderTop:'1px solid #F3F4F6',paddingTop:10,marginTop:10,display:'flex',flexWrap:'wrap' as const,gap:16}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center'}}>
          <span style={{fontSize:'0.62rem',fontWeight:700,color:'#6B7280'}}>PRODUCTS DETECTED:</span>
          {prodItems.map((p:any,i:number)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:1,background:p.color}}/><span style={{fontSize:'0.62rem',color:'#6B7280'}}>{p.label} ({p.pct}% · {p.mentions}/{totalRd})</span></div>))}
        </div>
      </div>
    </div>
  );
}

const REC_CATEGORIES: Record<string,{label:string;color:string;bg:string}> = {
  'Owned Content Optimization':{label:'Owned Content Optimization',color:'#0F766E',bg:'#F0FDFA'},
  'Content Page':{label:'Content Page',color:'#8B5CF6',bg:'#F5F3FF'},
  'FAQ Build':{label:'FAQ Build',color:'#10B981',bg:'#ECFDF5'},
  'How-To Guide':{label:'How-To Guide',color:'#0EA5E9',bg:'#F0F9FF'},
  'Product Explainer':{label:'Product Explainer',color:'#6366F1',bg:'#EEF2FF'},
  'Best-Of List':{label:'Best-Of List',color:'#8B5CF6',bg:'#F5F3FF'},
  'Use Case Page':{label:'Use Case Page',color:'#06B6D4',bg:'#ECFEFF'},
  'Content Strategy':{label:'Content Strategy',color:'#7C3AED',bg:'#F5F3FF'},
  'PR / Earned Media':{label:'PR / Earned Media',color:'#EC4899',bg:'#FDF2F8'},
  'Citation Push':{label:'Citation Push',color:'#F43F5E',bg:'#FFF1F2'},
  'Review Platform':{label:'Review Platform',color:'#F59E0B',bg:'#FFFBEB'},
  'Forum Presence':{label:'Forum Presence',color:'#D97706',bg:'#FEF3C7'},
  'Wikipedia / Entity':{label:'Wikipedia / Entity',color:'#64748B',bg:'#F1F5F9'},
  'Influencer / Creator':{label:'Influencer / Creator',color:'#A855F7',bg:'#FAF5FF'},
  'Structured Data':{label:'Structured Data',color:'#F97316',bg:'#FFF7ED'},
  'Schema Markup':{label:'Schema Markup',color:'#EA580C',bg:'#FFF7ED'},
  'Entity Optimization':{label:'Entity Optimization',color:'#0F766E',bg:'#F0FDFA'},
  'Technical SEO':{label:'Technical SEO',color:'#14B8A6',bg:'#F0FDFA'},
};

function GeoSummary({ result }: { result:any }) {
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [fetched,setFetched]=useState(false);
  const geo=result.overall_geo_score??0,vis=result.visibility??0,sent=result.sentiment??0,cit=result.citation_share??0,sov=result.share_of_voice??0,prom=result.prominence??0,lob=result.lob||null;
  const badge=scoreBadge(geo);
  const topComp=(result.competitors||[])[0]?.Brand||'top competitor',topCompGEO=(result.competitors||[])[0]?.GEO||0;
  const rd=result.responses_detail||[],clusters=result.query_clusters||[];
  const totalQ=result.total_responses||rd.length||100;
  const currentWins=result.responses_with_brand??rd.filter((r:any)=>r.mentioned).length;
  const lossCount=totalQ-currentWins;
  const losses=rd.filter((r:any)=>!r.mentioned).slice(0,lossCount);
  const getVol=(cat:string)=>{const cl=clusters.find((c:any)=>c.category===cat);return cl?.dailySearches||20000;};
  const flippableWins=losses.reduce((sum:number,r:any)=>{const vol=getVol(r.category||'');return sum+(vol>=35000?0.5:0.25);},0);
  const opportunityWins=Math.min(currentWins+Math.round(flippableWins),totalQ);
  const opportunityRate=opportunityWins/totalQ;
  const visScale=vis>0?(opportunityRate/(currentWins/totalQ)):1;
  const oppVis=Math.min(95,Math.round(vis*visScale)),oppSov=Math.min(95,Math.round(sov*(1+flippableWins/totalQ*0.6))),oppCit=Math.min(95,Math.round(cit*(1+flippableWins/totalQ*0.4)));
  const opportunityGeo=Math.min(94,Math.round(oppVis*0.30+sent*0.20+prom*0.20+oppCit*0.15+oppSov*0.15));
  const opportunityGain=opportunityGeo-geo;
  const visGain=Math.round((oppVis-vis)*0.30),citGain=Math.round((oppCit-cit)*0.15),sovGain=Math.round((oppSov-sov)*0.15);
  const projected=opportunityGeo;

  useEffect(()=>{
    if(fetched)return;setFetched(true);
    try{const cacheKey=`geo_summary_v3_${result.brand_name}_${geo}_${opportunityGain}`;const cached=sessionStorage.getItem(cacheKey);if(cached){setData(JSON.parse(cached));return;}}catch{}
    setLoading(true);
    const lobContext=lob?`Line of Business: ${lob}.`:'';
    const insightCats='Data Signal|Competitive Gap|Visibility Gap|Sentiment Gap|Citation Gap|Earned Media Gap|Content Gap|Rank Signal';
    const recCats='Owned Content Optimization|Content Page|FAQ Build|How-To Guide|Product Explainer|Best-Of List|Use Case Page|Content Strategy|PR / Earned Media|Citation Push|Review Platform|Forum Presence|Wikipedia / Entity|Influencer / Creator|Structured Data|Schema Markup|Entity Optimization|Technical SEO|Internal Linking|Syndication|Data Feed|API Presence';
    const oppBreakdown=`Opportunity Score breakdown:\n- Total queries run: ${totalQ}. Brand appeared in: ${currentWins}. Lost: ${lossCount}.\n- Visibility gap drives +${visGain} pts. Citations gap drives +${citGain} pts. SOV gap drives +${sovGain} pts.\n- scoreForecast values across all recommendations must sum to approximately ${opportunityGain} pts total.`;
    const prompt=['You are a sharp GEO strategist. Return a JSON object with:','"rows": array of exactly 10 objects. First 5 insights, last 5 recommendations. Each object: { "type":"insight"|"recommendation", "category": insights use: '+insightCats+'. Recommendations use: '+recCats+', "title": 4-6 word action title for recommendations only (null for insights), "text": one sharp sentence, "scoreNow": '+String(geo)+', "scoreForecast": insights='+String(geo)+'. Recommendations: assign pts. scoreForecast values must sum to ~'+String(opportunityGain)+' total across all recommendations, "impact": insights=null. Recommendations: HIGH/MEDIUM/LOW, "agenticFlag": null OR one short sentence }','Brand: '+result.brand_name,lobContext,'Industry: '+(result.ind_label||result.industry||'Consumer Products'),'GEO: '+String(geo)+' | Vis: '+String(vis)+' | Sent: '+String(sent)+' | Cit: '+String(cit)+' | SOV: '+String(sov)+' | Prom: '+String(prom),'Top Competitor: '+topComp+' (GEO: '+String(topCompGEO)+')',oppBreakdown,'CRITICAL: Exactly 5 insights then 5 recommendations. NEVER recommend comparison pages against competitors. Return ONLY valid JSON no markdown.'].join('\n');
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(d=>{const threeQ='`'+'`'+'`';let clean1=(d.response||'');while(clean1.startsWith(threeQ))clean1=clean1.slice(3);while(clean1.endsWith(threeQ))clean1=clean1.slice(0,-3);clean1=clean1.replace('json','').trim();const parsed=JSON.parse(clean1.trim());setData(parsed);try{sessionStorage.setItem('geo_summary_v3_'+result.brand_name+'_'+String(geo)+'_'+String(opportunityGain),JSON.stringify(parsed));}catch{}}).catch(()=>setData(null)).finally(()=>setLoading(false));
  },[]);

  return(
    <div>
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <ROICurve score={geo}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
          {[{label:'Current GEO Score',val:geo,color:geo>=80?'#10B981':geo>=70?'#7C3AED':'#F59E0B',sub:badge.label+(geo>=80?' · Category leader':geo>=70?' · Above threshold':' · Below efficiency threshold')},{label:'Opportunity Score',val:projected,color:'#10B981',sub:'Your reachable GEO score'},{label:'GEO Unlock',val:`+${opportunityGain} pts`,color:'#7C3AED',sub:'Your GEO gap to close'}].map((c,i)=>(
            <div key={i} style={{background:'#F9F9FC',borderRadius:12,border:'1px solid #E5E7EB',padding:'16px 18px',textAlign:'center' as const}}><div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>{c.label}</div><div style={{fontSize:'2.4rem',fontWeight:900,color:c.color,lineHeight:1}}>{c.val}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:4}}>{c.sub}</div></div>
          ))}
        </div>
      </div>
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}><span style={{fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>GEO Analysis Summary</span>{lob&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:50,padding:'2px 10px',fontSize:'0.68rem',fontWeight:700}}>{lob}</span>}</div>
        {loading&&<div style={{display:'flex',alignItems:'center',gap:10,color:'#9CA3AF',fontSize:'0.84rem',padding:'20px 0'}}><div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>Generating analysis...</div>}
        {!loading&&data?.rows&&(
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
            <thead><tr style={{background:'#F3F4F6'}}>{['#','Category','Insight','Recommendation','GEO Opportunity','Impact'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left' as const,fontSize:'0.64rem',fontWeight:700,color:'#6B7280',letterSpacing:'.07em',borderBottom:'2px solid #E5E7EB'}}>{h.toUpperCase()}</th>)}</tr></thead>
            <tbody>{(()=>{
              const insights=data.rows.filter((r:any)=>r.type==='insight'),recs=data.rows.filter((r:any)=>r.type==='recommendation'),rowCount=Math.max(insights.length,recs.length);
              const insCatColors:Record<string,{c:string;bg:string}>={'Data Signal':{c:'#7C3AED',bg:'#F5F3FF'},'Competitive Gap':{c:'#EF4444',bg:'#FEE2E2'},'Visibility Gap':{c:'#3B82F6',bg:'#EFF6FF'},'Sentiment Gap':{c:'#10B981',bg:'#ECFDF5'},'Citation Gap':{c:'#F59E0B',bg:'#FFFBEB'},'Earned Media Gap':{c:'#EC4899',bg:'#FDF2F8'},'Content Gap':{c:'#6366F1',bg:'#EEF2FF'},'Rank Signal':{c:'#14B8A6',bg:'#F0FDFA'}};
              return Array.from({length:rowCount},(_,i)=>{
                const ins=insights[i],rec=recs[i],cat=rec?(REC_CATEGORIES[rec.category]||{label:rec.category||'Action',color:'#6B7280',bg:'#F9FAFB'}):null,insCat=ins?.category||'Data Signal',ic=insCatColors[insCat]||{c:'#7C3AED',bg:'#F5F3FF'},impColor=rec?.impact==='HIGH'?'#EF4444':rec?.impact==='MEDIUM'?'#F59E0B':'#7C3AED',impBg=rec?.impact==='HIGH'?'#FEE2E2':rec?.impact==='MEDIUM'?'#FEF3C7':'#EDE9FE',delta=rec?(rec.scoreForecast-rec.scoreNow):0;
                return(<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'white':'#FAFAFA'}}>
                  <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}><div style={{width:28,height:28,borderRadius:'50%',background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,color:'#7C3AED'}}>{i+1}</div></td>
                  <td style={{padding:'14px 14px',verticalAlign:'middle' as const}}><div style={{display:'flex',flexDirection:'column' as const,gap:4}}>{ins&&<span style={{background:ic.bg,color:ic.c,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block',width:'fit-content'}}>{insCat}</span>}{rec&&cat&&<span style={{background:cat.bg,color:cat.color,borderRadius:50,padding:'2px 9px',fontSize:'0.63rem',fontWeight:700,display:'inline-block',width:'fit-content'}}>{cat.label}</span>}</div></td>
                  <td style={{padding:'14px 14px',verticalAlign:'top' as const}}>{ins?<span style={{fontSize:'0.81rem',color:'#374151',lineHeight:1.65}}>{ins.text}</span>:<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}</td>
                  <td style={{padding:'14px 14px',verticalAlign:'top' as const}}>{rec?<div><div style={{fontSize:'0.81rem',fontWeight:700,color:'#111827',marginBottom:3}}>{rec.title||''}</div><div style={{fontSize:'0.78rem',color:'#6B7280',lineHeight:1.6}}>{rec.text}</div>{rec.agenticFlag&&<div style={{marginTop:6,padding:'4px 8px',background:'#FFF7ED',borderRadius:5,border:'1px solid #FCD34D',display:'flex',gap:5,alignItems:'flex-start'}}><span style={{fontSize:'0.7rem'}}>&#x1F916;</span><span style={{fontSize:'0.68rem',color:'#92400E'}}>{rec.agenticFlag}</span></div>}</div>:<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}</td>
                  <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>{rec?<div style={{display:'inline-flex',flexDirection:'column' as const,alignItems:'center',gap:3,background:'#F0FDF4',border:'1px solid #6EE7B7',borderRadius:10,padding:'8px 12px'}}><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:'0.88rem',fontWeight:700,color:'#9CA3AF'}}>{rec.scoreNow}</span><span style={{color:'#9CA3AF'}}>{'->'}</span><span style={{fontSize:'1.15rem',fontWeight:900,color:'#10B981'}}>{rec.scoreForecast}</span></div>{delta>0&&<span style={{fontSize:'0.65rem',fontWeight:800,color:'#10B981',background:'#D1FAE5',borderRadius:50,padding:'1px 7px'}}>+{delta} pts</span>}</div>:<span style={{fontSize:'0.88rem',fontWeight:700,color:'#374151'}}>{ins?.scoreNow??geo}</span>}</td>
                  <td style={{padding:'14px 14px',verticalAlign:'middle' as const,textAlign:'center' as const}}>{rec?<span style={{background:impBg,color:impColor,borderRadius:50,padding:'3px 10px',fontSize:'0.66rem',fontWeight:700,whiteSpace:'nowrap' as const}}>{rec.impact}</span>:<span style={{color:'#D1D5DB',fontSize:'0.75rem'}}>--</span>}</td>
                </tr>);
              });
            })()}</tbody>
          </table>
        )}
        {!loading&&!data&&<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'16px 0'}}>Analysis will appear after the score loads.</div>}
      </div>
    </div>
  );
}

function BusinessImpact({ result, onGo }: { result:any;onGo:()=>void }) {
  const geo=result.overall_geo_score??0,brand=result.brand_name??'Your Brand';
  const nextTier=geo>=80?null:geo>=70?{score:80,label:'Excellent'}:geo>=45?{score:70,label:'Good'}:{score:45,label:'Needs Work'};
  const steps=[{title:'Higher GEO Score',sub:'Stronger AI visibility'},{title:'Stronger AI Visibility',sub:'More surfaces where brand is recommended'},{title:'More Surfaces',sub:'Higher organic traffic'},{title:'Higher Traffic',sub:'More conversions'},{title:'More Conversions',sub:'More revenue'}];
  return (
    <div style={{background:'#F5F3FF',borderRadius:16,border:'1px solid #DDD6FE',padding:'18px 22px',flex:1,display:'flex',flexDirection:'column' as const}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>^</span><span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>What does this score mean for your business?</span></div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:0,marginBottom:12}}>{steps.map((s,i)=><div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'stretch'}}><div style={{background:'white',borderRadius:8,border:'1px solid #DDD6FE',padding:'7px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:'0.78rem',fontWeight:700,color:'#7C3AED'}}>{s.title}</span><span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{'-> '}{s.sub}</span></div>{i<steps.length-1&&<div style={{display:'flex',justifyContent:'center',padding:'2px 0'}}><span style={{color:'#C4B5FD',fontSize:'0.85rem',lineHeight:1}}>v</span></div>}</div>)}</div>
      {nextTier&&<div style={{background:'white',borderRadius:10,border:'1px solid #DDD6FE',padding:'10px 14px',fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}><span style={{fontWeight:700,color:'#7C3AED'}}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate.</div>}
      <button onClick={onGo} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',alignSelf:'flex-start' as const}}>See Competitors</button>
    </div>
  );
}

function MarkdownText({ text }: { text:string }) {
  const lines=text.split('\n');
  const parseInline=(t:string):React.ReactNode[]=>{const parts=t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);return parts.map((p,j)=>{if(p.startsWith('**')&&p.endsWith('**'))return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;if(p.startsWith('*')&&p.endsWith('*')&&p.length>2)return <em key={j} style={{fontStyle:'italic',color:'#374151'}}>{p.slice(1,-1)}</em>;if(p.startsWith('`')&&p.endsWith('`'))return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:'monospace',color:'#7C3AED'}}>{p.slice(1,-1)}</code>;return p;});};
  const elements:React.ReactNode[]=[];let i=0;
  while(i<lines.length){const line=lines[i],trimmed=line.trim();if(!trimmed){elements.push(<div key={i} style={{height:8}}/>);i++;continue;}if(trimmed.startsWith('# ')&&!trimmed.startsWith('## ')){elements.push(<div key={i} style={{fontSize:'1.25rem',fontWeight:900,color:'#111827',marginTop:24,marginBottom:8}}>{parseInline(trimmed.slice(2))}</div>);i++;continue;}if(trimmed.startsWith('## ')&&!trimmed.startsWith('### ')){elements.push(<div key={i} style={{fontSize:'1.08rem',fontWeight:800,color:'#111827',marginTop:20,marginBottom:6}}>{parseInline(trimmed.slice(3))}</div>);i++;continue;}if(trimmed.startsWith('### ')){elements.push(<div key={i} style={{fontSize:'0.97rem',fontWeight:700,color:'#374151',marginTop:16,marginBottom:4}}>{parseInline(trimmed.slice(4))}</div>);i++;continue;}if(/^\s{0,3}[-*]\s/.test(line)){const items:React.ReactNode[]=[];while(i<lines.length&&/^\s{0,3}[-*]\s/.test(lines[i])){const l=lines[i].trim(),content=l.replace(/^[-*]\s/,'');items.push(<div key={i} style={{display:'flex',gap:8,marginBottom:4,alignItems:'flex-start'}}><span style={{color:'#7C3AED',flexShrink:0,marginTop:2}}>*</span><span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(content)}</span></div>);i++;}elements.push(<div key={`bl-${i}`} style={{margin:'4px 0 10px',paddingLeft:4}}>{items}</div>);continue;}elements.push(<p key={i} style={{margin:'3px 0',fontSize:'0.93rem',color:'#374151',lineHeight:1.75}}>{parseInline(trimmed)}</p>);i++;}
  return <div style={{fontFamily:'Inter,sans-serif',color:'#374151'}}>{elements}</div>;
}

// FIX 3: Muted Accenture palette for bar chart
// Bar colors: #94A3B8, #64748B, #7500C0, #460073, #A100FF
// GEO line: #111827 (black), You dot: #460073
function CompetitorBarChart({ top, hovBar, setHovBar }: { top:any[];hovBar:number|null;setHovBar:(n:number|null)=>void }) {
  const bW=Math.max(700,top.length*80),bH=160,bPad=40,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
  const allMetrics=[
    {key:'Vis',label:'Visibility',color:'#94A3B8'},
    {key:'Cit',label:'Citations',color:'#64748B'},
    {key:'Sen',label:'Sentiment',color:'#7500C0'},
    {key:'Sov',label:'Share of Voice',color:'#460073'},
    {key:'Prom',label:'Prominence',color:'#A100FF'},
  ];
  return(
    <svg viewBox={`0 0 ${bW} ${bH+60}`} style={{width:'100%',minWidth:top.length*80,display:'block'}} onMouseLeave={()=>setHovBar(null)}>
      {[0,25,50,75,100].map(v=><g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
      {top.map((c:any,i:number)=>{
        const bx=bPad+i*gW,subW=(gW*0.8)/allMetrics.length,isY=c.isYou;
        return(<g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}>
          {allMetrics.map((m,mi)=>{const val=(c as any)[m.key]||0,mh=(val/100)*bMH,mx=bx+gW*0.1+mi*subW;return<rect key={mi} x={mx} y={bH-mh} width={subW-1} height={mh} fill={m.color} rx={1} opacity={isY?1:0.55}/>;})}</g>);
      })}
      {(()=>{
        const pts=top.map((c:any,i:number)=>({x:bPad+i*gW+gW/2,y:bH-((c.GEO||0)/100)*bMH,geo:c.GEO||0,isYou:c.isYou}));
        const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        return<>
          <path d={pathD} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {pts.map((p,i)=>(<g key={i}>
            <circle cx={p.x} cy={p.y} r={p.isYou?7:5} fill={p.isYou?'#460073':'#111827'} stroke="white" strokeWidth="1.5"/>
            <text x={p.x} y={p.y-10} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{p.geo}</text>
          </g>))}</>;
      })()}
      {top.map((c:any,i:number)=>{
        const bx=bPad+i*gW,isY=c.isYou;
        return<text key={i} x={bx+gW/2} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#460073':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>;
      })}
      <g transform={`translate(${bPad},${bH+32})`}>
        <circle cx={6} cy={0} r={4} fill="#111827" stroke="white" strokeWidth="1"/>
        <line x1={1} y1={0} x2={11} y2={0} stroke="#111827" strokeWidth="2"/>
        <text x={18} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO Score (line)</text>
        {allMetrics.map((m,i)=>(<g key={i} transform={`translate(${110+i*90},0)`}><rect x={0} y={-5} width={10} height={10} fill={m.color} rx={2}/><text x={14} y={0} dominantBaseline="middle" style={{fontSize:9,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{m.label}</text></g>))}
      </g>
      {hovBar!==null&&(()=>{
        const c=top[hovBar],bx=bPad+hovBar*gW,tipW=160,tipH=allMetrics.length*14+28;
        const tx=bx+gW/2+tipW+8>bW-bPad?bx-tipW-4:bx+gW/2+4,ty=Math.max(0,bH-tipH-20);
        return<g style={{pointerEvents:'none'}}>
          <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
          <text x={tx+10} y={ty+14} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text>
          <text x={tx+10} y={ty+26} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO}</text>
          {allMetrics.map((m,mi)=>(<text key={mi} x={tx+10} y={ty+40+mi*13} style={{fontSize:9,fill:m.color,fontFamily:'Inter,sans-serif',fontWeight:600}}>{m.label}: {(c as any)[m.key]||0}</text>))}
        </g>;
      })()}
    </svg>
  );
}

// FIX 8: ScatterPlot — standalone, no S-curve overlay
// Colors: You=#460073, TopComp=#F3F0FF stroke #7500C0, Others=#E5E7EB
function ScatterPlot({ brand, vis, sent, cit, competitors, topCompBrand }: { brand:string;vis:number;sent:number;cit:number;competitors:any[];topCompBrand:string }) {
  const [hov,setHov]=useState<number|null>(null);
  const top20=competitors.slice(0,20);
  const raw=[{label:brand,x:vis,y:sent,cit,isYou:true,isTopComp:false},...top20.map((c:any)=>({label:c.Brand,x:c.Vis||0,y:c.Sen??c.Sent??0,cit:c.Cit??30,isYou:false,isTopComp:c.Brand===topCompBrand}))];
  const all=raw.map((a,i)=>{if(a.isYou||a.isTopComp)return{...a,jx:a.x,jy:a.y};const sameZone=raw.slice(0,i).filter(b=>!b.isYou&&!b.isTopComp&&Math.abs(b.x-a.x)<=4);return{...a,jx:a.x+sameZone.length*4,jy:a.y};});
  const W=960,H=460,padL=56,padR=30,padT=32,padB=56;
  const sx=(v:number)=>padL+(v/100)*(W-padL-padR),sy=(v:number)=>padT+((100-v)/100)*(H-padT-padB);
  const sortedX=[...raw.map(a=>a.x)].sort((a,b)=>a-b),sortedY=[...raw.map(a=>a.y)].sort((a,b)=>a-b);
  const medX=sortedX[Math.floor(sortedX.length/2)],medY=sortedY[Math.floor(sortedY.length/2)];
  const citVals=all.map(a=>a.cit),citMin=Math.min(...citVals),citMax=Math.max(...citVals,1);
  const bR=(c:number)=>Math.round(5+((c-citMin)/Math.max(citMax-citMin,1))*10);
  const placements=all.map((a,i)=>{const cx2=sx(a.jx),cy2=sy(a.jy),r=bR(a.cit);const zoneBefore=all.slice(0,i).filter(b=>Math.abs(sx(b.jx)-cx2)<24).length;const above=i%2===0;const offset=above?-(r+11+zoneBefore*9):(r+11+zoneBefore*9);return{cx2,cy2,r,ly:Math.max(padT+6,Math.min(H-padB-6,cy2+offset)),above};});
  const midX=sx(medX),midY=sy(medY);
  return(
    <div style={{background:'#F8FAFC',borderRadius:12,padding:'8px 0 0'}}>
      <div style={{padding:'4px 14px 0',display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#460073"/></svg> You</span>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#F3F0FF" stroke="#7500C0" strokeWidth="1.5"/></svg> Top Competitor</span>
        <span style={{fontSize:'0.72rem',color:'#6B7280',display:'inline-flex',alignItems:'center',gap:4}}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#E5E7EB"/></svg> Others</span>
        <span style={{color:'#9CA3AF',fontSize:'0.68rem'}}>Bubble size = Citation Score · Hover any bubble</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        <rect x={padL} y={padT} width={midX-padL} height={midY-padT} fill="#F0FDF4" opacity="0.3"/>
        <rect x={midX} y={padT} width={W-padR-midX} height={midY-padT} fill="#F5F3FF" opacity="0.3"/>
        <rect x={padL} y={midY} width={midX-padL} height={H-padB-midY} fill="#FFF7ED" opacity="0.3"/>
        <rect x={midX} y={midY} width={W-padR-midX} height={H-padB-midY} fill="#FEF2F2" opacity="0.25"/>
        {[0,25,50,75,100].map(v=><g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
        <line x1={midX} y1={padT} x2={midX} y2={H-padB} stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="6,4"/>
        <line x1={padL} y1={midY} x2={W-padR} y2={midY} stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="6,4"/>
        <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="#D1D5DB" strokeWidth="1.5"/>
        {all.map((a,i)=>{const{cx2,cy2,r}=placements[i],isH=hov===i;
          const fill=a.isYou?'#460073':a.isTopComp?'#F3F0FF':'#E5E7EB';
          const stroke=a.isYou?'#7500C0':a.isTopComp?'#7500C0':'#9CA3AF';
          return<g key={`b${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            {isH&&<circle cx={cx2} cy={cy2} r={r+5} fill={stroke} opacity="0.12"/>}
            <circle cx={cx2} cy={cy2} r={r} fill={fill} stroke={stroke} strokeWidth={a.isYou?2.5:a.isTopComp?2:1}/>
          </g>;})}
        {all.map((a,i)=>{const{cx2,cy2,r,ly,above}=placements[i];const lc=a.isYou?'#460073':a.isTopComp?'#1E40AF':'#6B7280';const fs=a.isYou?12:a.isTopComp?11:7;const leaderY=above?cy2-r:cy2+r;
          return<g key={`l${i}`} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
            <line x1={cx2} y1={leaderY} x2={cx2} y2={above?ly+3:ly-3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <text x={cx2} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:fs,fill:lc,fontFamily:'Inter,sans-serif',fontWeight:a.isYou||a.isTopComp?700:400,pointerEvents:'none'}}>{a.label}</text>
          </g>;})}
        {all.map((a,i)=>{if(hov!==i)return null;const{cx2,cy2,r}=placements[i],tipW=190,tipH=68;const tx=cx2+tipW+10>W-padR?cx2-tipW-10:cx2+10,ty=cy2-tipH<padT?cy2+r+8:cy2-tipH-8;
          return<g key={`tip${i}`} style={{pointerEvents:'none'}}>
            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
            <text x={tx+12} y={ty+16} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{a.label}{a.isTopComp?' (Top Competitor)':a.isYou?' (You)':''}</text>
            <text x={tx+12} y={ty+32} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Visibility: <tspan fill='#C4B5FD' fontWeight="700">{a.x}</tspan>   Sentiment: <tspan fill='#6EE7B7' fontWeight="700">{a.y}</tspan></text>
            <text x={tx+12} y={ty+48} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Citation Score: <tspan fill='#FCD34D' fontWeight="700">{a.cit}</tspan></text>
          </g>;})}
        {[0,10,20,30,40,50,60,70,80,90,100].map(v=><text key={v} x={sx(v)} y={H-padB+16} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>)}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment</text>
      </svg>
    </div>
  );
}

// FIX 8: SCurveStandalone — completely separate, not merged with ScatterPlot
function SCurveStandalone({ score, brand }: { score:number; brand:string }) {
  const [hov,setHov]=useState<string|null>(null);
  const W=900,H=400,padL=60,padR=40,padT=40,padB=60;
  const plotW=W-padL-padR,plotH=H-padT-padB;
  const curve=(x:number)=>Math.round(5+90/(1+Math.exp(-0.09*(x-45))));
  const pts=Array.from({length:101},(_,x)=>({x,y:curve(x)}));
  const sx=(v:number)=>padL+(v/100)*plotW,sy=(v:number)=>padT+((100-v)/100)*plotH;
  const scoreToX=(s:number)=>{let best=0,bd=999;pts.forEach(p=>{const d=Math.abs(p.y-s);if(d<bd){bd=d;best=p.x;}});return best;};
  const yourX=scoreToX(score),goalX=scoreToX(70),authX=scoreToX(80);
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const gapPts=score<70?pts.slice(yourX,goalX+1):[];
  const fillD=gapPts.length>1?`${gapPts.map((p,i)=>`${i===0?'M':'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT+plotH} L${sx(yourX)},${padT+plotH} Z`:'';
  const stageBands=[
    {label:'Fragmented',x0:0,x1:44,color:'#FEF2F2',tc:'#EF4444'},
    {label:'Emerging',x0:45,x1:55,color:'#FFF7ED',tc:'#FB8C00'},
    {label:'Competitive',x0:56,x1:69,color:'#FEFCE8',tc:'#CA8A04'},
    {label:'Leader',x0:70,x1:79,color:'#EFF6FF',tc:'#1E88E5'},
    {label:'Authority',x0:80,x1:100,color:'#F0FDF4',tc:'#43A047'},
  ];
  return(
    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'16px'}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Maturity S-Curve</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:8}}>Your current GEO Score position on the AI visibility maturity curve.</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {stageBands.map((b,i)=><rect key={i} x={sx(b.x0)} y={padT} width={sx(b.x1)-sx(b.x0)} height={plotH} fill={b.color} opacity="0.6"/>)}
        {stageBands.map((b,i)=><text key={i} x={(sx(b.x0)+sx(b.x1))/2} y={padT+plotH+32} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:b.tc,fontFamily:'Inter,sans-serif'}}>{b.label}</text>)}
        {[0,25,50,75,100].map(v=>(<g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#1E88E5" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7"/>
        <line x1={padL} y1={sy(80)} x2={W-padR} y2={sy(80)} stroke="#43A047" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7"/>
        {fillD&&<path d={fillD} fill="#EDE9FE" opacity="0.5"/>}
        <path d={pathD} fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round"/>
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        {[0,20,40,60,80,100].map(v=>(<g key={v}><line x1={sx(v)} y1={padT+plotH} x2={sx(v)} y2={padT+plotH+4} stroke="#D1D5DB" strokeWidth="1"/><text x={sx(v)} y={padT+plotH+16} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
        <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:600}}>GEO Maturity Score</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('auth')} onMouseLeave={()=>setHov(null)}>
          <circle cx={sx(authX)} cy={sy(80)} r={14} fill="#43A047" stroke="white" strokeWidth="2.5"/>
          <text x={sx(authX)} y={sy(80)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:8,fontWeight:800,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>80</text>
          <text x={sx(authX)+20} y={sy(80)-16} style={{fontSize:9,fontWeight:700,fill:'#43A047',fontFamily:'Inter,sans-serif'}}>Authority (80)</text>
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('goal')} onMouseLeave={()=>setHov(null)}>
          <circle cx={sx(goalX)} cy={sy(70)} r={11} fill="#1E88E5" stroke="white" strokeWidth="2.5"/>
          <text x={sx(goalX)} y={sy(70)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7.5,fontWeight:800,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>70</text>
          <text x={sx(goalX)+16} y={sy(70)-14} style={{fontSize:9,fontWeight:700,fill:'#1E88E5',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('you')} onMouseLeave={()=>setHov(null)}>
          <circle cx={sx(yourX)} cy={sy(score)} r={10} fill="#7C3AED" stroke="white" strokeWidth="2.5"/>
          <text x={sx(yourX)} y={sy(score)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7,fontWeight:800,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{score}</text>
          <text x={sx(yourX)} y={sy(score)+22} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'#5B21B6',fontFamily:'Inter,sans-serif'}}>You ({score})</text>
          {hov==='you'&&<><rect x={sx(yourX)-70} y={sy(score)-44} width={140} height={42} rx={7} fill="#1F2937"/><text x={sx(yourX)} y={sy(score)-30} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{brand}: {score}</text><text x={sx(yourX)} y={sy(score)-14} textAnchor="middle" style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{score>=80?'Authority · Top tier':score>=70?'Leader · Above threshold':score>=45?'Emerging · Growing':'Fragmented · Building signals'}</text></>}
        </g>
      </svg>
    </div>
  );
}

// FIX 7: Radar uses clusters (real query categories) as axes
function RadarChart({ sent,prom,vis,cit,sov,indKey='gen',rd=[],clusters=[] }:{sent:number;prom:number;vis:number;cit:number;sov:number;indKey?:string;rd?:any[];clusters?:any[]}) {
  const [hov,setHov]=useState<number|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);
  const dimsRaw=buildFeatureDims(indKey,rd,sent,prom,vis,cit,sov,clusters);
  const dims=ensureRadarHasData(dimsRaw,sent,prom,vis,cit,sov);
  const cx=190,cy=195,R=105,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100],poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  const sorted=[...dims].sort((a,b)=>b.val-a.val),top2=sorted.slice(0,2).map(d=>d.label),bot2=sorted.slice(-2).map(d=>d.label);
  return (
    <div style={{position:'relative' as const}}>
      <svg viewBox="0 0 380 370" style={{width:'100%',maxWidth:320,display:'block',margin:'0 auto'}}>
        {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return<g key={r}><polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1"/><text x={cx+4} y={cy-(r/100)*R+4} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>{r}</text></g>;})}
        {dims.map((_,i)=>{const p=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;})}<polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#7C3AED" fillOpacity="0.18" stroke="#7C3AED" strokeWidth="2"/>
        {dims.map((d,i)=>{const p=pt(i,(d.val/100)*R);return<circle key={i} cx={p.x} cy={p.y} r={hov===i?7:5} fill="#7C3AED" stroke="white" strokeWidth="1.5" style={{cursor:'pointer'}} onMouseEnter={(e)=>{setHov(i);const svgRect=(e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();const circRect=(e.currentTarget as SVGElement).getBoundingClientRect();setTooltipPos({x:circRect.left+circRect.width/2-svgRect.left,y:circRect.top-svgRect.top});}} onMouseLeave={()=>{setHov(null);setTooltipPos(null);}}/>;})}
        {dims.map((d,i)=>{const lp=pt(i,R+26),isTop=top2.includes(d.label),isBot=bot2.includes(d.label);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:isTop?'#7C3AED':isBot?'#EF4444':'#374151',fontWeight:isTop||isBot?700:400,fontFamily:'Inter,sans-serif'}}>{d.label}</text>;})}
        <g transform="translate(20,398)"><circle cx={6} cy={0} r={5} fill="#7C3AED" opacity="0.7"/><text x={16} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>You</text></g>
      </svg>
      {hov!==null&&tooltipPos&&<div style={{position:'absolute' as const,left:Math.max(0,tooltipPos.x-82),top:Math.max(0,tooltipPos.y-64),background:'#1F2937',borderRadius:8,padding:'10px 14px',width:165,pointerEvents:'none',zIndex:999}}><div style={{fontSize:11,fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',marginBottom:3}}>{dims[hov].label}: {dims[hov].val}</div><div style={{fontSize:9,color:'#D1D5DB',fontFamily:'Inter,sans-serif',lineHeight:1.5}}>How your brand performs on {dims[hov].label.toLowerCase()} queries.</div></div>}
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:4}}>&#x1F4A1; <strong>Feature Insight:</strong> Strongest in <strong>{top2.join(' and ')}</strong> · Weakest in <strong>{bot2.join(' and ')}</strong></div>
    </div>
  );
}

// FIX 7: SentimentHeatmap also uses cluster categories for axes
function SentimentHeatmap({ brandName,sent,prom,vis,cit,sov,competitors,indKey='gen',rd=[],clusters=[] }:{brandName:string;sent:number;prom:number;vis:number;cit:number;sov:number;competitors:any[];indKey?:string;rd?:any[];clusters?:any[]}) {
  const [hovCell,setHovCell]=useState<string|null>(null);
  const myDimsRaw=buildFeatureDims(indKey,rd,sent,prom,vis,cit,sov,clusters);
  const myDims=ensureRadarHasData(myDimsRaw,sent,prom,vis,cit,sov);
  const seed=(str:string,i:number)=>{let h=0;for(let k=0;k<str.length;k++)h=(h*31+str.charCodeAt(k))>>>0;return((h+i*6271)%40)/100;};
  const rows=[{name:brandName,isYou:true,scores:myDims.map(d=>d.val)},...(competitors||[]).slice(0,8).map((c:any)=>{const cs=c.Sen||Math.round(sent*0.75+seed(c.Brand||'',0)*25),cp=c.Prom||Math.round(prom*0.75+seed(c.Brand||'',1)*25),cv=c.Vis||Math.round(vis*0.75+seed(c.Brand||'',2)*25),cct=c.Cit||Math.round((cit||30)*0.75+seed(c.Brand||'',3)*25),csov=c.Sov||Math.round((sov||40)*0.75+seed(c.Brand||'',4)*25);const compScores=myDims.map((dim,di)=>{const scaleFactors=[cv/Math.max(vis,1),cs/Math.max(sent,1),cp/Math.max(prom,1),cct/Math.max(cit,1),csov/Math.max(sov,1)],sf=scaleFactors[di%scaleFactors.length]||0.75,base=Math.round(dim.val*sf+seed(c.Brand||'',di)*10-5);return Math.max(5,Math.min(95,base));});return{name:c.Brand||'',isYou:false,scores:compScores};})];
  const labels=myDims.map(d=>d.label),shortLabels=myDims.map(d=>d.label.length>9?d.label.slice(0,8)+'.':d.label);
  const allScores=rows.flatMap(r=>r.scores),minS=Math.min(...allScores),maxS=Math.max(...allScores,1);
  const cellColor=(val:number)=>{const t=(val-minS)/Math.max(maxS-minS,1);if(t<0.2)return{bg:'#F3F4F6',text:'#9CA3AF'};if(t<0.4)return{bg:'#EDE9FE',text:'#6D28D9'};if(t<0.6)return{bg:'#C4B5FD',text:'#5B21B6'};if(t<0.8)return{bg:'#8B5CF6',text:'white'};return{bg:'#5B21B6',text:'white'};};
  const compRows=rows.slice(1),dimWins=labels.map((lbl,di)=>{const yourScore=rows[0].scores[di],beaten=compRows.filter(r=>yourScore>r.scores[di]).length;return{dim:lbl,score:yourScore,beaten};});
  const strongest=[...dimWins].sort((a,b)=>b.score-a.score)[0],weakest=[...dimWins].sort((a,b)=>a.score-b.score)[0];
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>Product Feature Strength vs Competitors</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:14}}>Darker = stronger AI association. Hover to see score.</div>
      <div style={{display:'grid',gridTemplateColumns:`110px repeat(${labels.length},1fr)`,gridTemplateRows:`auto repeat(${rows.length},1fr)`,gap:4}}>
        <div/>{shortLabels.map((lbl,i)=><div key={i} style={{fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,textAlign:'center' as const,paddingBottom:6,lineHeight:1.3}}>{lbl}</div>)}
        {rows.map((r,ri)=>[<div key={`l${ri}`} style={{fontSize:'0.73rem',color:r.isYou?'#7C3AED':'#374151',fontWeight:r.isYou?700:400,textAlign:'right' as const,paddingRight:8,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>{r.name}</div>,...r.scores.map((val,ci)=>{const k=`${ri}-${ci}`,{bg,text}=cellColor(val),isH=hovCell===k;return<div key={`c${k}`} onMouseEnter={()=>setHovCell(k)} onMouseLeave={()=>setHovCell(null)} style={{borderRadius:5,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:text,cursor:'default',transition:'transform 0.1s',transform:isH?'scale(1.04)':'scale(1)',border:r.isYou?'2px solid #7C3AED':'2px solid transparent',boxSizing:'border-box' as const,minHeight:24}}>{isH?val:''}</div>;})])}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginTop:12,flexWrap:'wrap' as const}}>{[{bg:'#5B21B6',label:'Strong (80+)'},{bg:'#8B5CF6',label:'Good (60-79)'},{bg:'#C4B5FD',label:'Moderate (40-59)'},{bg:'#F3F4F6',label:'Weak (<40)',border:'1px solid #E5E7EB'}].map((l,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:l.bg,border:(l as any).border}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>{l.label}</span></div>)}</div>
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:10}}>&#x1F4A1; <strong>Insight:</strong> Strongest in <strong>{strongest?.dim}</strong> ({strongest?.score}) · ahead of {strongest?.beaten}/{compRows.length} competitors. Weakest in <strong>{weakest?.dim}</strong> ({weakest?.score}).</div>
    </div>
  );
}

function PriorityActionsTable({ result,cachedActions,setCachedActions,actionsLoading,setActionsLoading }:{result:any;cachedActions:any[]|null;setCachedActions:(a:any[])=>void;actionsLoading:boolean;setActionsLoading:(b:boolean)=>void}) {
  const actions=cachedActions||[];
  useEffect(()=>{
    if(cachedActions!==null)return;
    setActionsLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.\nBrand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}\nIMPORTANT: Do NOT suggest comparison pages against competitors.\nReturn ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}\nOrder: High first.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const raw2=data.response||'';let cl2=raw2.replace('```json','').replace('```','').trim();setCachedActions(JSON.parse(cl2));}).catch(()=>setCachedActions([])).finally(()=>setActionsLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>!</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {actionsLoading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'12px 0'}}>Generating recommendations...</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a:any,i:number)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#7C3AED'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top' as const,whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#7C3AED'}}>{a.deliverable}</span></td></tr>;})}
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
  // FIX 8: showSCurve toggles between ScatterPlot and SCurveStandalone — never merged
  const [showSCurve,setShowSCurve]=useState(false);

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);

  async function runAnalysis(){
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);setLoadingStep(0);setLoadingProgress(0);setShowSCurve(false);
    const steps=[{step:0,progress:5,delay:200},{step:1,progress:12,delay:1500},{step:2,progress:25,delay:3500},{step:3,progress:40,delay:5500},{step:4,progress:55,delay:7500},{step:5,progress:68,delay:9500},{step:6,progress:78,delay:11500},{step:7,progress:88,delay:13500},{step:8,progress:95,delay:15500}];
    const timers:ReturnType<typeof setTimeout>[]=[];
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
      const res=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:query,system:result?`You are a knowledgeable consumer advisor. The user is researching ${result.brand_name} in the ${result.ind_label} industry.`:undefined})});
      const data=await res.json();setPromptHistory(h=>[{q:query,a:data.response},...h]);
    }catch{}
    setPromptLoading(false);
  }

  const examplePrompts=result?.ind_key==='fin'?['Compare invite-only credit cards for high net worth individuals','What is the best credit card for someone who travels internationally?','Which bank offers the best rewards for small business owners?','Best first credit card for no credit history','Compare Chase Sapphire Reserve vs Capital One Venture X']:['What are the most trusted brands right now?','Best companies for customer service','Compare top brands for value and quality','Which companies are leading in innovation?','Best brands recommended by experts'];

  return(
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{background:'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)',padding:(loading||result)?'16px 40px':'64px 40px 72px',textAlign:'center',transition:'padding 0.3s ease'}}>
        {!(loading||result)&&<>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 24px',fontSize:'0.82rem',fontWeight:600,color:'white',marginBottom:32,background:'rgba(255,255,255,0.15)'}}>* Real Time GEO Scoring</div>
          <h1 style={{fontSize:'3.6rem',fontWeight:900,color:'white',margin:'0 0 16px',letterSpacing:'-1.5px',lineHeight:1.1}}>GEO Scorecard</h1>
          <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.9)',margin:'0 0 20px'}}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
        </>}
        {(loading||result)&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'1.3rem',fontWeight:900,color:'white'}}>GEO Scorecard</span>
            <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',borderRadius:50,padding:'3px 10px'}}>Real Time GEO Scoring</span>
          </div>
          <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.7)'}}>Live data</span>
        </div>}
      </div>

      {!result?(
        <div style={{padding:loading?'16px 40px':'48px 40px 60px'}}>
          {!loading&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
            {bands.map((b,i)=><div key={i} style={{background:b.bg,borderRadius:20,padding:'36px 28px',textAlign:'center',border:`1.5px solid ${b.border}`}}><div style={{fontSize:'0.85rem',fontWeight:700,color:b.color,marginBottom:8}}>{b.range}</div><div style={{fontSize:'1.8rem',fontWeight:900,color:b.color,marginBottom:8}}>{b.label}</div><div style={{fontSize:'0.85rem',color:b.color,lineHeight:1.5}}>{b.desc}</div></div>)}
          </div>}
          <div style={{background:'white',borderRadius:20,border:'1px solid #E5E7EB',padding:'28px 32px'}}>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:'0.8rem',fontWeight:700,color:'#111827',marginBottom:10}}>Select number of AI prompts to run</div>
              <div style={{display:'flex',gap:6,alignItems:'flex-end',flexWrap:'wrap' as const}}>
                {[50,100,300,500,1000].map(n=>(<button key={n} onClick={()=>{setPromptCount(n);setPromptCountErr('');}} style={{background:promptCount===n?'#7C3AED':'white',color:promptCount===n?'white':'#374151',border:promptCount===n?'2px solid #7C3AED':'2px solid #D1D5DB',borderRadius:7,padding:'5px 12px',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1,minWidth:52}}><span style={{fontSize:'0.82rem',fontWeight:900}}>{n}</span><span style={{fontSize:'0.56rem',fontWeight:500,opacity:0.72}}>{n===50?'Quick':n===100?'Standard':n===300?'Deep':n===500?'Thorough':'Extended'}</span></button>))}
                <div style={{display:'flex',flexDirection:'column' as const,gap:2,minWidth:100}}>
                  <label style={{fontSize:'0.58rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>Custom (max 10,000)</label>
                  <input type="number" placeholder="e.g. 200" value={promptCount&&![50,100,300,500,1000].includes(promptCount)?promptCount:''} onChange={e=>{const v=parseInt(e.target.value);if(isNaN(v))return;if(v>10000){setPromptCountErr('Max is 10,000');setPromptCount(10000);}else{setPromptCount(v);setPromptCountErr('');}}} style={{border:`1.5px solid ${promptCountErr?'#EF4444':'#D1D5DB'}`,borderRadius:7,padding:'5px 10px',fontSize:'0.78rem',color:'#374151',outline:'none',background:'white',width:'100%'}}/>
                  {promptCountErr?<div style={{fontSize:'0.58rem',color:'#EF4444',fontWeight:600}}>{promptCountErr}</div>:<div style={{fontSize:'0.58rem',color:'#9CA3AF'}}>More prompts = longer run time</div>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><div style={{width:7,height:7,borderRadius:'50%',background:'#7C3AED'}}/><span style={{fontSize:'0.72rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase' as const,letterSpacing:'.14em'}}>Brand URL</span></div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{flex:1,display:'flex',alignItems:'center',border:'1.5px solid #E5E7EB',borderRadius:12,background:'white',overflow:'hidden',height:52}}>
                <span style={{padding:'0 0 0 20px',fontSize:'0.95rem',color:'#9CA3AF',flexShrink:0,fontWeight:500}}>https://www.</span>
                <input type="text" value={url.replace(/^https?:\/\/(www\.)?/,'')} onChange={e=>{const v=e.target.value.replace(/^https?:\/\/(www\.)?/,'').replace(/^www\./,'');setUrl('https://www.'+v);}} onKeyDown={e=>e.key==='Enter'&&runAnalysis()} placeholder="capitalone.com" style={{flex:1,border:'none',padding:'14px 12px 14px 4px',fontSize:'0.95rem',background:'transparent',outline:'none',color:'#374151'}}/>
              </div>
              <button onClick={runAnalysis} disabled={loading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,fontWeight:700,fontSize:'0.95rem',height:52,padding:'0 28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(124,58,237,0.4)',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>Run Live AI Analysis</button>
            </div>
            {error&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginTop:10}}>{error}</div>}
          </div>
          {loading&&(()=>{
            const brandName=url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0].split('.')[0];
            const displayName=brandName.charAt(0).toUpperCase()+brandName.slice(1);
            const loadSteps=[{label:'Fetching brand page'},{label:'Launching AI queries'},{label:'Running consumer queries'},{label:'Running category-specific queries'},{label:'Detecting brand mentions',detail:`Scanning AI responses for ${displayName} references`},{label:'Scoring sentiment & prominence'},{label:'Benchmarking competitors'},{label:'Building citation network'},{label:'Calculating GEO Score'}];
            const currentStep=loadSteps[Math.min(loadingStep,loadSteps.length-1)];
            const completedSteps=loadSteps.slice(0,loadingStep);
            return(
              <div style={{marginTop:32,background:'white',borderRadius:20,border:'1px solid #E5E7EB',padding:'36px 40px'}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
                  <div style={{flex:1}}><div style={{fontSize:'1.2rem',fontWeight:800,color:'#111827'}}>Analysing {displayName}</div><div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{url}</div></div>
                  <div style={{textAlign:'right' as const}}><div style={{fontSize:'2rem',fontWeight:900,color:'#7C3AED',lineHeight:1}}>{loadingProgress}%</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>complete</div></div>
                </div>
                <div style={{background:'#F3F4F6',borderRadius:50,height:8,marginBottom:28,overflow:'hidden'}}><div style={{background:'linear-gradient(90deg,#7C3AED,#9333EA)',height:8,borderRadius:50,width:`${loadingProgress}%`,transition:'width 0.8s ease'}}/></div>
                <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{flex:1}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#7C3AED'}}>{currentStep.label}</div></div>
                  <div style={{width:20,height:20,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {completedSteps.map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:10,opacity:0.7}}><div style={{width:22,height:22,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0}}>ok</div><span style={{fontSize:'0.82rem',color:'#6B7280'}}>{s.label}</span></div>))}
                </div>
              </div>
            );
          })()}
        </div>
      ):(
        <div>
          <div style={{borderBottom:'1px solid #E5E7EB',background:'white',display:'flex',padding:'0 40px',gap:4,overflowX:'auto' as const}}>
            {TABS.map((t,i)=><button key={i} onClick={()=>setActiveTab(i)} style={{background:'none',border:'none',borderBottom:activeTab===i?'2px solid #7C3AED':'2px solid transparent',color:activeTab===i?'#7C3AED':'#6B7280',fontWeight:activeTab===i?700:500,fontSize:'0.85rem',padding:'12px 20px',cursor:'pointer',whiteSpace:'nowrap' as const}}>{t}</button>)}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0,padding:'0 8px'}}>
              <button onClick={()=>{setResult(null);setUrl('');setShowSCurve(false);try{sessionStorage.clear();}catch{}}} style={{background:'#7C3AED',border:'none',borderRadius:8,color:'white',fontSize:'0.78rem',fontWeight:600,padding:'6px 16px',cursor:'pointer'}}>New Analysis</button>
            </div>
          </div>
          <div style={{padding:'28px 40px 60px'}}>

            {/* FIN tier override + topCompBrand */}
            {(()=>{
              if(result.ind_key==='fin'){
                const CFT:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,rank:'N/A'},'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,rank:'N/A'}};
                const t=CFT[result.brand_name];
                if(t){result.overall_geo_score=t.geo;result.visibility=t.vis;result.citation_share=t.cit;result.sentiment=t.sent;result.share_of_voice=t.sov;result.avg_rank=t.rank;}
              }
              const comps=result.competitors||[];
              const sorted=[...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
              result._topCompBrand=sorted.length>0?sorted[0].Brand:'';
              return null;
            })()}

            {/* TAB 0: GEO Score — SankeyGeoFlow here (FIX 1) */}
            {activeTab===0&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,cit=result.citation_share,rawSent=result.sentiment,prom=result.prominence,sov=result.share_of_voice;
              const allBrands=[{GEO:geo,isYou:true},...(result.competitors||[]).slice(0,9)].sort((a:any,b:any)=>b.GEO-a.GEO);
              const myPos=allBrands.findIndex((b:any)=>b.isYou);
              const avgRank=(myPos>=0?myPos+1:null)??result.avg_rank;
              const badge=scoreBadge(geo);
              const industryLabel=result.ind_label||result.industry||'Financial Services';
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:20,marginBottom:16}}>
                    <GeoGauge score={geo}/>
                    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:5}}>
                        <div style={{fontSize:'1.4rem',fontWeight:800,color:'#111827'}}>{result.brand_name}</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                          {result.lob&&<span style={{fontSize:'0.72rem',fontWeight:600,color:'#7C3AED',background:'#EDE9FE',borderRadius:50,padding:'2px 10px'}}>{result.lob}</span>}
                          <span style={{fontSize:'0.72rem',fontWeight:600,color:'#374151',background:'#F3F4F6',borderRadius:50,padding:'2px 10px'}}>{industryLabel}</span>
                        </div>
                      </div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{color:'#7C3AED',fontSize:'0.84rem'}}>{(result.page_url||'').slice(0,60)}{(result.page_url||'').length>60?'...':''}</a>
                      <div style={{margin:'12px 0 5px',fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Status</div>
                      <span style={{background:badge.bg,color:badge.color,padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700}}>{badge.label}</span>
                      <div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.8,borderTop:'1px solid #F3F4F6',paddingTop:12,marginTop:12}}>GEO Score of {geo} reflects {vis}% Visibility but is held back by Prominence ({prom}), Share of Voice ({sov}), and Citations ({cit}).</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:16}}>
                    <MetricCard label="visibility score" val={vis}/><MetricCard label="sentiment score" val={rawSent}/><MetricCard label="citation score" val={cit}/><MetricCard label="prominence score" val={prom}/><MetricCard label="share of voice" val={sov}/><MetricCard label="avg rank" val={`#${String(avgRank).replace('#','')}`}/>
                  </div>
                  <WhatScoreMeans score={geo} brand={result.brand_name}/>
                  <SankeyGeoFlow result={result}/>
                  <div style={{marginTop:16}}><BusinessImpact result={result} onGo={()=>setActiveTab(1)}/></div>
                  <div style={{marginTop:16}}><GeoSummary result={result}/></div>
                </div>
              );
            })()}

            {/* TAB 1: Competitors — FIX 2+3 */}
            {activeTab===1&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,cit=result.citation_share;
              const sent=result.sentiment,sov=result.share_of_voice,prom=result.prominence||0,avgRank=result.avg_rank;
              const brandEntry={Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Prom:prom,Rank:avgRank,isYou:true};
              const compEntries=(result.competitors||[]).slice(0,9).map((c:any)=>({...c,Prom:c.Prom||Math.round((c.Vis||0)*0.85),isYou:false}));
              const top=[brandEntry,...compEntries].sort((a:any,b:any)=>b.GEO-a.GEO);
              const myRank=top.findIndex(c=>c.isYou)+1,leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;
              const resolvedRank=(c:any)=>{const pos=top.findIndex(t=>t.isYou===c.isYou&&t.Brand===c.Brand);if(pos<0||pos>=5)return '--';return `#${pos+1}`;};
              return(
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:16}}>{result.domain} vs Competitors</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#F5F3FF',borderRadius:14,border:'1px solid #DDD6FE',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#7C3AED',fontWeight:600,marginBottom:4}}>Your GEO Score</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#7C3AED'}}>{geo}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{background:'#FFFBEB',borderRadius:14,border:'1px solid #FCD34D',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'--':`${gapToTop} pts`}</div></div>
                    <div style={{background:'#ECFDF5',borderRadius:14,border:'1px solid #6EE7B7',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1}`:''}</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'--'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:10}}>GEO Score & Signal Breakdown</div>
                    <div style={{overflowX:'auto' as const}}><CompetitorBarChart top={top} hovBar={hovBar} setHovBar={setHovBar}/></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','BRAND','GEO','GAP','VIS','CIT','SENT','SOV','PROM','RANK'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left' as const,fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c:any,i:number)=>{
                        const gcol=c.GEO>=80?'#10B981':c.GEO>=60?'#7C3AED':'#374151',gap2=c.isYou?null:c.GEO-geo;
                        return<tr key={i} style={{background:c.isYou?'#F5F3FF':'white',borderTop:'1px solid #F3F4F6',borderLeft:c.isYou?'3px solid #7C3AED':'none'}}>
                          <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                          <td style={{padding:'11px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>
                              {c.isYou&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}
                            </div>
                          </td>
                          <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:gcol}}>{c.GEO}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:gap2===null?'#9CA3AF':gap2>0?'#EF4444':'#10B981'}}>{gap2===null?'--':`${gap2>0?'-':'+'}${Math.abs(gap2)}`}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Vis}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Cit}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sen}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sov}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Prom}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:'#7C3AED'}}>{resolvedRank(c)}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 2: Visibility — FIX 8 separate toggle */}
            {activeTab===2&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,comps=result.competitors||[];
              const allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
              const topComp=comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
              const gapToTop=vis-(topComp?topComp.Vis:vis);
              const topCompBrand=result._topCompBrand||(comps.length>0?comps[0].Brand:'');
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                    <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#7C3AED',textTransform:'uppercase' as const,marginBottom:6}}>Your Visibility</div><div style={{fontSize:'2rem',fontWeight:800,color:'#7C3AED'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands</div></div>
                    <div style={{background:gapToTop>=0?'#ECFDF5':'#FFF1F2',borderRadius:12,border:`1px solid ${gapToTop>=0?'#6EE7B7':'#FCA5A5'}`,padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:gapToTop>=0?'#065F46':'#991B1B',textTransform:'uppercase' as const,marginBottom:6}}>vs. #1{topComp?` (${topComp.Brand})`:''}</div><div style={{fontSize:'2rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#111827'}}>{showSCurve?'GEO Maturity S-Curve':'Sentiment vs. Visibility Positioning'}</div>
                      <button onClick={()=>setShowSCurve(s=>!s)} style={{background:showSCurve?'#7C3AED':'#F3F4F6',color:showSCurve?'white':'#6B7280',border:'none',borderRadius:8,padding:'6px 14px',fontSize:'0.75rem',fontWeight:600,cursor:'pointer'}}>
                        {showSCurve?'Show Scatter Plot':'Show S-Curve'}
                      </button>
                    </div>
                    {showSCurve
                      ?<SCurveStandalone score={geo} brand={result.brand_name}/>
                      :<ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={comps} topCompBrand={topCompBrand}/>
                    }
                  </div>
                </div>
              );
            })()}

            {/* TAB 3: Sentiment — FIX 6 (no strengths/concerns) + FIX 7 (cluster axes) */}
            {activeTab===3&&(()=>{
              const rawSent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank,vis=result.visibility,cit=result.citation_share,sov=result.share_of_voice;
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    {[{label:'sentiment score',val:rawSent,sub:rawSent>=70?'AI speaks favorably':rawSent>=45?'AI tone is neutral':'AI tone is negative'},{label:'prominence score',val:prom,sub:prom>=70?'Named first in AI responses':prom>=45?'Appears mid-list':'Rarely named early'},{label:'average rank',val:avgRank,sub:'Average position within each AI response'}].map(({label,val,sub}:any)=>(
                      <div key={label} style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
                        <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>{label}<Tooltip text={METRIC_TIPS[label]||''}/></div>
                        <div style={{fontSize:'1.8rem',fontWeight:800,color:'#7C3AED',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'stretch'}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:4}}>Product Feature Positioning</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:4}}>Axes = query cluster categories (same as Sankey)</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
                        <RadarChart sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]} clusters={result.query_clusters||[]}/>
                      </div>
                    </div>
                    <SentimentHeatmap brandName={result.brand_name} sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} competitors={result.competitors||[]} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]} clusters={result.query_clusters||[]}/>
                  </div>
                  {/* FIX 6: NO strengths/concerns boxes */}
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
              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#7C3AED','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
              const displaySources=allSrc.map((s:any,i:number)=>({...s,rank:i+1,isOwned:domainMatchesBrand(s.domain||'')}));
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    {[{label:'Citation Score',val:cit,sub:'How authoritatively your brand was cited',tip:'How often AI models cite your brand.'},{label:'Share of Voice',val:sov,sub:'Your brand mentions as % of all mentions',tip:'Your share of all brand mentions in AI responses.'}].map(({label,val,sub,tip})=><div key={label} style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}><div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>{label}<Tooltip text={tip}/></div><div style={{fontSize:'2.4rem',fontWeight:900,color:'#7C3AED',lineHeight:1,marginBottom:6}}>{val}</div><div style={{fontSize:'0.78rem',color:'#9CA3AF'}}>{sub}</div></div>)}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                      {catEntries.map(([cat,pct],i)=>{const isActive=activeCitCat===cat;return<div key={i} style={{marginBottom:10,cursor:'pointer',borderRadius:8,padding:'8px 10px',background:isActive?catColors[cat]+'22':'transparent',border:isActive?`1.5px solid ${catColors[cat]}`:'1.5px solid transparent'}} onClick={()=>setActiveCitCat(isActive?null:cat)}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:'0.84rem',color:isActive?catColors[cat]:'#374151',fontWeight:isActive?700:500}}>{cat}</span><span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#7C3AED'}}>{Math.round(pct)}%</span></div>
                        <div style={{background:'#F3F4F6',borderRadius:50,height:7,overflow:'hidden'}}><div style={{background:catColors[cat]||'#7C3AED',height:7,borderRadius:50,width:`${Math.min(Math.round(pct),100)}%`}}/></div>
                      </div>;})}
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 20px'}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:12}}>Sources AI Pulls From</div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr style={{background:'#FAFAFA'}}>{['#','DOMAIN','CATEGORY','SHARE %'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left' as const,fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600}}>{h}</th>)}</tr></thead>
                        <tbody>{displaySources.filter((s:any)=>{if(!activeCitCat)return true;const isOwned2=s.isOwned;const cls3=isOwned2?'Owned Media':classifyDomain(s.domain||'').label;return cls3===activeCitCat;}).slice(0,10).map((s:any,i:number)=>{
                          const isOwned2=s.isOwned,cls2=isOwned2?{label:'Owned Media',color:'#7C3AED',bg:'#EDE9FE'}:classifyDomain(s.domain||'');
                          return<tr key={i} style={{borderTop:'1px solid #F3F4F6',background:isOwned2?'#FAFBFF':'white',borderLeft:isOwned2?'3px solid #7C3AED':'none'}}>
                            <td style={{padding:'8px 10px',fontSize:'0.78rem',color:'#9CA3AF'}}>{s.rank||i+1}</td>
                            <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:'0.8rem',fontWeight:600,color:'#7C3AED'}}>{s.domain}</span>{isOwned2&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 5px',fontSize:'0.6rem',fontWeight:700}}>You</span>}</div></td>
                            <td style={{padding:'8px 10px'}}><span style={{background:cls2.bg,color:cls2.color,borderRadius:6,padding:'2px 7px',fontSize:'0.66rem',fontWeight:600}}>{cls2.label}</span></td>
                            <td style={{padding:'8px 10px',fontSize:'0.78rem',fontWeight:700,color:isOwned2?'#7C3AED':'#10B981'}}>{s.citation_share}%</td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 5: Prompts */}
            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[],clusters=result.query_clusters||[];
              const totalQueries=result.total_responses??rd.length,totalMentions=result.responses_with_brand??rd.filter((r:any)=>r.mentioned).length;
              const displayRate=Math.round((totalMentions/Math.max(totalQueries,1))*100);
              const cats2:string[]=['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string).filter((c:string)=>Boolean(c))))];
              const ROWS_PER_PAGE=10;
              const allSorted=[...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});
              const totalPages=Math.ceil(allSorted.length/ROWS_PER_PAGE),safePage=Math.min(queryPage,Math.max(1,totalPages));
              const pageRows=allSorted.slice((safePage-1)*ROWS_PER_PAGE,safePage*ROWS_PER_PAGE);
              const maxMentioned=Math.max(...clusters.map((c:any)=>c.mentioned),1);
              const nB=clusters.length,W=940,VPAD=52,COLS=Math.min(5,Math.ceil(Math.sqrt(nB*1.2))),ROWS2=Math.ceil(nB/COLS),cellW=Math.min(160,W/COLS),cellH=105,totalGridW=COLS*cellW,gridOffsetX=(W-totalGridW)/2,H=ROWS2*cellH+VPAD;
              const bubbles=clusters.map((c:any,i:number)=>{const col=i%COLS,row=Math.floor(i/COLS),lastRowCount=nB%COLS||COLS,isLastRow=row===ROWS2-1,offsetX=isLastRow?(COLS-lastRowCount)*cellW/2:0,x=gridOffsetX+offsetX+col*cellW+cellW/2,y=VPAD/2+row*cellH+cellH/2,r=Math.round(28+(c.mentioned/maxMentioned)*18);return{...c,x,y,r};});
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={totalQueries} color="#7C3AED"/>
                    <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} color="#7C3AED"/>
                    <MetricCard label="appearance rate" val={`${displayRate}%`} color="#7C3AED"/>
                  </div>
                  {clusters.length>0&&(
                    <div style={{borderRadius:16,overflow:'hidden',marginBottom:20,border:'1px solid #1E293B'}}>
                      <div style={{background:'#0F172A',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div><div style={{fontSize:'0.9rem',fontWeight:800,color:'white'}}>Query Intelligence Network</div><div style={{fontSize:'0.68rem',color:'#64748B',marginTop:1}}>Click a node to filter the prompts table below</div></div>
                        {(filterCat!=='All'||highlightedBubble)&&<button onClick={()=>{setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}} style={{background:'#1E293B',border:'1px solid #334155',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#94A3B8',cursor:'pointer'}}>Clear</button>}
                      </div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',background:'#0F172A'}}>
                        {bubbles.map((b:any)=>{
                          const nodeColor=b.winRate>=60?'#10B981':b.winRate>=30?'#F59E0B':'#EF4444';
                          const isHighlighted=highlightedBubble===b.category,isDimmed=!!highlightedBubble&&!isHighlighted;
                          const words=b.category.split(' ');const maxChars=Math.round(b.r*0.52);let line1='',line2='';
                          words.forEach((w:string)=>{if(!line1){line1=w;}else if((line1+' '+w).length<=maxChars){line1+=' '+w;}else if(!line2){line2=w;}else if((line2+' '+w).length<=maxChars){line2+=' '+w;}});
                          const hasTwo=line2.length>0,fontSize=b.r>=38?9.5:b.r>=32?9:8,lineH=fontSize+2;
                          const textY1=b.y-(hasTwo?lineH:lineH/2),textY2=textY1+lineH,winY=(hasTwo?textY2:textY1)+lineH+4;
                          return(<g key={b.category} style={{cursor:'pointer'}} onClick={()=>{if(filterCat===b.category){setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}else{setFilterCat(b.category);setQueryPage(1);setHighlightedBubble(b.category);}}}>
                            <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor} opacity={isDimmed?0.25:0.85} stroke={isHighlighted?'white':'none'} strokeWidth={isHighlighted?3:0}/>
                            <text x={b.x} y={textY1} textAnchor="middle" style={{fontSize,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none',opacity:isDimmed?0.3:1}}>{line1}</text>
                            {hasTwo&&<text x={b.x} y={textY2} textAnchor="middle" style={{fontSize,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none',opacity:isDimmed?0.3:1}}>{line2}</text>}
                            <text x={b.x} y={winY} textAnchor="middle" style={{fontSize:Math.max(6,fontSize-1),fill:'rgba(255,255,255,0.85)',fontFamily:'Inter,sans-serif',pointerEvents:'none',opacity:isDimmed?0.2:1}}>{b.winRate}% win</text>
                          </g>);
                        })}
                      </svg>
                    </div>
                  )}
                  <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 20px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:'0.88rem',fontWeight:700,color:'#111827'}}>{filterCat==='All'?'All Queries':filterCat}<span style={{fontSize:'0.72rem',fontWeight:400,color:'#9CA3AF',marginLeft:8}}>({allSorted.length} queries)</span></div>
                      <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setQueryPage(1);}} style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 8px',fontSize:'0.75rem',color:'#374151',background:'white',outline:'none'}}>
                        {cats2.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#F8FAFC'}}>{['#','QUERY','RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left' as const,fontSize:'0.63rem',color:'#9CA3AF',fontWeight:600}}>{h}</th>)}</tr></thead>
                      <tbody>{pageRows.map((item:any,i:number)=>{
                        const globalIdx=(safePage-1)*ROWS_PER_PAGE+i+1,rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':item.mentioned?'#7C3AED':'#9CA3AF';
                        const beater=item.winner_brand&&item.winner_brand!==result.brand_name?item.winner_brand:null;
                        return<tr key={i} style={{borderTop:'1px solid #F3F4F6',background:rp===1?'#F0FDF4':!item.mentioned?'#FFFBFB':'white'}}>
                          <td style={{padding:'9px 12px',fontSize:'0.75rem',color:'#9CA3AF',width:28}}>{globalIdx}</td>
                          <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3}}><span style={{background:'#F3F4F6',color:'#6B7280',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem'}}>{item.category}</span>{item.mentioned?<span style={{color:'#10B981',fontSize:'0.68rem',fontWeight:600}}>Appeared</span>:<span style={{color:'#EF4444',fontSize:'0.68rem',fontWeight:600}}>Missed</span>}</div><div style={{fontSize:'0.82rem',color:'#374151'}}>{item.query}</div></td>
                          <td style={{padding:'9px 12px',fontSize:'0.92rem',fontWeight:800,color:rankColor,width:70}}>{rankLabel}</td>
                          <td style={{padding:'9px 12px',width:150}}>{beater?<span style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#92400E'}}>👑 {beater}</span>:rp===1?<span style={{background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#065F46'}}>You&apos;re #1</span>:<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>--</span>}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                    {totalPages>1&&(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14}}>
                      <button onClick={()=>setQueryPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:'white',color:'#374151',cursor:'pointer',fontSize:'0.75rem'}}>Prev</button>
                      {Array.from({length:Math.min(totalPages,8)},(_,i)=>i+1).map(pg=><button key={pg} onClick={()=>setQueryPage(pg)} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${pg===safePage?'#7C3AED':'#E5E7EB'}`,background:pg===safePage?'#7C3AED':'white',color:pg===safePage?'white':'#374151',cursor:'pointer',fontSize:'0.75rem'}}>{pg}</button>)}
                      <button onClick={()=>setQueryPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #E5E7EB',background:'white',color:'#374151',cursor:'pointer',fontSize:'0.75rem'}}>Next</button>
                    </div>)}
                  </div>
                </div>
              );
            })()}

            {/* TAB 6: Recommendations */}
            {activeTab===6&&(()=>{
              const rd=result.responses_detail||[],recClusters=result.query_clusters||[];
              const segments=recClusters.slice(0,9).map((c:any)=>{const rate=c.winRate;const isWinning=rate>=60,isEmerging=!isWinning&&rate>=30;return{name:c.category,status:isWinning?'Winning':isEmerging?'Emerging':'Gap',color:isWinning?'#10B981':isEmerging?'#F59E0B':'#EF4444',bg:isWinning?'#F0FDF4':isEmerging?'#FFFBEB':'#FFF1F2',border:isWinning?'#6EE7B7':isEmerging?'#FCD34D':'#FCA5A5',score:rate,dominated:c.topCompetitor||''};});
              return(
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  {segments.length>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s:any,i:number)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:'#F3F4F6',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong>{s.dominated?` · Top: ${s.dominated}`:''}</div></div>)}</div>}
                  {result.recommendations&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,marginBottom:24}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:14}}>Recommendations</div><MarkdownText text={result.recommendations}/></div>}
                  <PriorityActionsTable result={result} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
                </div>
              );
            })()}

            {/* TAB 7: Live Prompt */}
            {activeTab===7&&(()=>(
              <div style={{display:'flex',flexDirection:'column' as const,minHeight:'60vh'}}>
                <div style={{marginBottom:12}}><div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:3}}>Live Prompt Tester</div></div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:12}}>
                  {examplePrompts.map((p,i)=>(<button key={i} onClick={()=>runPrompt(p)} style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:20,padding:'6px 14px',fontSize:'0.78rem',color:'#5B21B6',cursor:'pointer'}}>{p}</button>))}
                </div>
                <div style={{background:'white',borderRadius:14,border:'1.5px solid #E5E7EB',padding:'12px 16px',display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
                  <input type="text" value={promptInput} onChange={e=>setPromptInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runPrompt()} placeholder="Ask anything..." style={{flex:1,border:'none',padding:'6px 0',fontSize:'0.9rem',outline:'none',color:'#374151',background:'transparent'}}/>
                  <button onClick={()=>runPrompt()} disabled={promptLoading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:10,padding:'8px 22px',fontWeight:700,fontSize:'0.88rem',cursor:'pointer',flexShrink:0}}>{promptLoading?'Asking...':'Ask AI'}</button>
                  {promptHistory.length>0&&<button onClick={()=>setPromptHistory([])} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',fontSize:'0.75rem',color:'#9CA3AF',cursor:'pointer'}}>Clear</button>}
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:12,flex:1}}>
                  {promptHistory.length===0&&!promptLoading&&<div style={{textAlign:'center' as const,padding:'40px',color:'#9CA3AF',background:'white',borderRadius:14,border:'1px solid #E5E7EB'}}>Type a question or click a suggestion above</div>}
                  {promptHistory.map((h,i)=>(<div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}><div style={{background:'#F5F3FF',padding:'10px 18px',borderBottom:'1px solid #EDE9FE'}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#5B21B6'}}>{h.q}</span></div><div style={{padding:'16px 18px'}}><MarkdownText text={h.a}/></div></div>))}
                  {promptLoading&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,display:'flex',alignItems:'center',gap:12,color:'#9CA3AF'}}><div style={{width:18,height:18,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Querying AI model...</div>}
                </div>
              </div>
            ))()}

            {/* TAB 8: FAQ */}
            {activeTab===8&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:16}}>FAQ</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
                  {[{q:'What is a GEO Score?',a:'A single 0-100 number measuring how often and favorably your brand is cited in AI-generated responses.'},{q:'Why does 70 matter?',a:'70 is the efficiency threshold where AI models have enough signals to place you at the top of responses consistently.'},{q:'How is the GEO Score calculated?',a:'Visibility x 0.30 + Sentiment x 0.20 + Prominence x 0.20 + Citation Share x 0.15 + Share of Voice x 0.15.'},{q:'How often is the score updated?',a:'Calculated in real-time each time you run an analysis — always reflects current AI responses, not cached data.'},{q:"What's the difference between Visibility and Prominence?",a:'Visibility = whether your brand appears at all. Prominence = where — being named first scores much higher than fifth.'},].map((item,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:8}}>{item.q}</div><div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.75}}>{item.a}</div></div>)}
                </div>
              </div>
            ))()}

          </div>
        </div>
      )}
    </main>
  );
}
