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

const TABS = ['GEO Score', 'Competitors', 'Visibility', 'Sentiment', 'Citations', 'Prompts', 'Recommendations', 'Live Prompt'];

function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (s >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (s >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s => dl.includes(s))) return { label: 'Social', color: '#F59E0B', bg: '#FEF3C7' };
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s => dl.includes(s))) return { label: 'Institution', color: '#3B82F6', bg: '#DBEAFE' };
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s => dl.includes(s))) return { label: 'Earned Media', color: '#10B981', bg: '#D1FAE5' };
  return { label: 'Other', color: '#6B7280', bg: '#F3F4F6' };
}

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

function MetricCard({ label, val, sub, color = '#7C3AED' }: { label: string; val: any; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 16px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}{METRIC_TIPS[label.toLowerCase()] && <Tooltip text={METRIC_TIPS[label.toLowerCase()]} />}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function GeoGauge({ score, brand }: { score: number; brand: string }) {
  const badge = scoreBadge(score);
  const cx = 160, cy = 155, Ro = 130, Ri = 88;

  const a = (s: number) => Math.PI - (s / 100) * Math.PI;
  const ox = (s: number, r: number) => cx + r * Math.cos(a(s));
  const oy = (s: number, r: number) => cy - r * Math.sin(a(s));

  const seg = (s0: number, s1: number, fill: string) => {
    const lg = s1 - s0 > 50 ? 1 : 0;
    return (
      <path
        d={`M ${ox(s0,Ro)} ${oy(s0,Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1,Ro)} ${oy(s1,Ro)} L ${ox(s1,Ri)} ${oy(s1,Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0,Ri)} ${oy(s0,Ri)} Z`}
        fill={fill} stroke="white" strokeWidth="2"
      />
    );
  };

  const markerInner = Ri - 8;
  const markerOuter = Ro + 8;

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 16px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>{brand}</div>
      <svg viewBox="0 0 320 175" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {seg(0, 44, '#FECACA')}
        {seg(44, 69, '#FEF08A')}
        {seg(69, 79, '#BAE6FD')}
        {seg(79, 100, '#BBF7D0')}
        <line
          x1={ox(score, markerInner)} y1={oy(score, markerInner)}
          x2={ox(score, markerOuter)} y2={oy(score, markerOuter)}
          stroke="#6D28D9" strokeWidth="4" strokeLinecap="round"
        />
        {[0,20,40,60,80,100].map(t => (
          <text key={t} x={ox(t, Ro+18)} y={oy(t, Ro+18)} textAnchor="middle" dominantBaseline="middle"
            style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>
        ))}
        <text x={cx} y={cy - 18} textAnchor="middle"
          style={{fontSize:46,fontWeight:900,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '5px 18px', fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
    </div>
  );
}

// ── SANKEY ────────────────────────────────────────────────────
function SankeyChart({ result }: { result: any }) {
  const [hov, setHov] = useState<number | null>(null);
  const vis = result.visibility??0, cit = result.citation_share??0, sent = result.sentiment??0;
  const prom = result.prominence??0, sov = result.share_of_voice??0, geo = result.overall_geo_score??0;
  const inputs = [
    {label:'Visibility',value:vis,color:'#7C3AED',weight:30},
    {label:'Sentiment',value:sent,color:'#10B981',weight:20},
    {label:'Prominence',value:prom,color:'#3B82F6',weight:20},
    {label:'Citation',value:cit,color:'#F59E0B',weight:15},
    {label:'Share of Voice',value:sov,color:'#EF4444',weight:15},
  ];
  const W=500,H=330,lx=175,rx=415,nw=22,gH=140,gCY=H/2,nH=30,gap=20;
  const totalH = inputs.length*nH+(inputs.length-1)*gap;
  const startY = (H-totalH)/2;
  const nodes = inputs.map((n,i)=>({...n,y:startY+i*(nH+gap)}));
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',flex:1}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Composition</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        {nodes.map((n,i)=>{
          const sm=n.y+nH/2,bH=gH/inputs.length,dm=gCY-gH/2+i*bH+bH/2;
          const c1=lx+nw+(rx-lx-nw)*0.4,c2=lx+nw+(rx-lx-nw)*0.6;
          const hh=nH/2,dh=bH/2,isH=hov===i;
          return (
            <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
              <path d={`M${lx+nw},${sm-hh} C${c1},${sm-hh} ${c2},${dm-dh} ${rx},${dm-dh} L${rx},${dm+dh} C${c2},${dm+dh} ${c1},${sm+hh} ${lx+nw},${sm+hh}Z`} fill={n.color} opacity={isH?0.32:0.15} style={{transition:'opacity 0.2s'}}/>
              <rect x={lx} y={n.y} width={nw} height={nH} rx={4} fill={n.color}/>
              <text x={lx-8} y={n.y+nH/2-5} textAnchor="end" dominantBaseline="middle" style={{fontSize:12,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.label}</text>
              <text x={lx-8} y={n.y+nH/2+9} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.value}</text>
              <text x={(lx+nw+rx)/2} y={sm+2} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:600}}>{n.weight}%</text>
            </g>
          );
        })}
        <rect x={rx} y={gCY-gH/2} width={nw} height={gH} rx={4} fill="#7C3AED"/>
        <text x={rx+nw+10} y={gCY-14} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO</text>
        <text x={rx+nw+10} y={gCY+2} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>Score</text>
        <text x={rx+nw+10} y={gCY+22} textAnchor="start" dominantBaseline="middle" style={{fontSize:24,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontWeight:900}}>{geo}</text>
      </svg>
    </div>
  );
}

// ── BUSINESS IMPACT ───────────────────────────────────────────
function BusinessImpact({ result, onGo }: { result: any; onGo: () => void }) {
  const geo = result.overall_geo_score??0, brand = result.brand_name??'Your Brand';
  const nextTier = geo>=80?null:geo>=70?{score:80,label:'Excellent'}:geo>=45?{score:70,label:'Good'}:{score:45,label:'Needs Work'};
  const steps = [
    {title:'Higher GEO Score',sub:'Stronger AI visibility'},
    {title:'Stronger AI Visibility',sub:'More surfaces where brand is recommended'},
    {title:'More Surfaces',sub:'Higher organic traffic'},
    {title:'Higher Traffic',sub:'More conversions'},
    {title:'More Conversions',sub:'More revenue'},
  ];
  return (
    <div style={{background:'#F5F3FF',borderRadius:16,border:'1px solid #DDD6FE',padding:'18px 22px',flex:1,display:'flex',flexDirection:'column' as const}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span>↗</span><span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>What does this score mean for your business?</span>
      </div>
      {/* Vertical flowchart */}
      <div style={{display:'flex',flexDirection:'column' as const,gap:0,marginBottom:12}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'stretch'}}>
            <div style={{background:'white',borderRadius:8,border:'1px solid #DDD6FE',padding:'7px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:'0.78rem',fontWeight:700,color:'#7C3AED'}}>{s.title}</span>
              <span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>→ {s.sub}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{display:'flex',justifyContent:'center',padding:'2px 0'}}>
                <span style={{color:'#C4B5FD',fontSize:'0.85rem',lineHeight:1}}>↓</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {nextTier&&(
        <div style={{background:'white',borderRadius:10,border:'1px solid #DDD6FE',padding:'10px 14px',fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}>
          <span style={{fontWeight:700,color:'#7C3AED'}}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate — directly increasing brand surfacing per AI query. Each tier jump reflects a materially higher chance AI recommends your brand first.
        </div>
      )}
      <button onClick={onGo} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',alignSelf:'flex-start' as const}}>
        See Competitors →
      </button>
    </div>
  );
}

// ── LINK ANALYSIS ─────────────────────────────────────────────
function LinkAnalysis({ result }: { result: any }) {
  const [hov, setHov] = useState<string|null>(null);
  const brand = result.brand_name||'Brand';
  const competitors = (result.competitors||[]).slice(0,4);
  const sources = (result.citation_sources||[]).slice(0,4);
  const W=700,H=420,cx=W/2,cy=H/2-10;
  type N={id:string;x:number;y:number;label:string;full:string;r:number;fill:string;stroke:string;type:string;pct?:number};
  const nodes:N[]=[];
  nodes.push({id:'brand',x:cx,y:cy,label:brand.length>10?brand.slice(0,9)+'…':brand,full:brand,r:42,fill:'#7C3AED',stroke:'#7C3AED',type:'brand'});
  const cA=competitors.map((_:any,i:number)=>Math.PI*0.6+(i/Math.max(competitors.length-1,1))*Math.PI*0.85);
  competitors.forEach((c:any,i:number)=>{nodes.push({id:`c${i}`,x:cx+210*Math.cos(cA[i]),y:cy-155*Math.sin(cA[i]),label:(c.Brand||'').length>12?c.Brand.slice(0,11)+'…':c.Brand,full:c.Brand,r:24,fill:'#C4B5FD',stroke:'#8B5CF6',type:'competitor'});});
  const sA=sources.map((_:any,i:number)=>-Math.PI*0.25+(i/Math.max(sources.length-1,1))*Math.PI*0.65);
  sources.forEach((s:any,i:number)=>{const dom=(s.domain||'').split('.')[0];nodes.push({id:`s${i}`,x:cx+215*Math.cos(sA[i]),y:cy-145*Math.sin(sA[i]),label:dom,full:s.domain,r:20,fill:'#6EE7B7',stroke:'#10B981',type:'source',pct:s.citation_share});});
  const center=nodes[0];
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'24px 28px',marginTop:24}}>
      <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>AI Citation Network</div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:12}}>Brands and sources co-cited with {brand} in AI responses</div>
      <div style={{background:'#F8FAFC',borderRadius:12}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
          {nodes.slice(1).map(n=>(
            <line key={n.id} x1={center.x} y1={center.y} x2={n.x} y2={n.y} stroke={n.type==='competitor'?'#C4B5FD':'#6EE7B7'} strokeWidth={hov===n.id||hov==='brand'?2:1.2} opacity={hov&&hov!==n.id&&hov!=='brand'?0.15:0.65} style={{transition:'all 0.2s'}}/>
          ))}
          {nodes.map(n=>{
            const isH=hov===n.id;
            return (
              <g key={n.id} onMouseEnter={()=>setHov(n.id)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>
                {isH&&<circle cx={n.x} cy={n.y} r={n.r+8} fill={n.stroke} opacity="0.15"/>}
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} opacity={hov&&!isH&&hov!=='brand'?0.35:1} style={{transition:'all 0.2s'}}/>
                {n.type==='brand'&&<text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:'white',fontFamily:'Inter,sans-serif',fontWeight:700,pointerEvents:'none'}}>{n.label}</text>}
                {n.type!=='brand'&&<text x={n.x} y={n.y+n.r+14} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:500,pointerEvents:'none'}}>{n.label}</text>}
                {n.type==='brand'&&<text x={n.x} y={n.y+n.r+16} textAnchor="middle" dominantBaseline="middle" style={{fontSize:12,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:600,pointerEvents:'none'}}>{brand}</text>}
                {n.type==='source'&&n.pct!=null&&<text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:9,fill:'#065F46',fontFamily:'Inter,sans-serif',fontWeight:700,pointerEvents:'none'}}>{n.pct}%</text>}
                {isH&&n.type!=='brand'&&(<g><rect x={n.x-55} y={n.y-n.r-28} width={110} height={20} rx={5} fill="#1F2937"/><text x={n.x} y={n.y-n.r-18} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'white',fontFamily:'Inter,sans-serif'}}>{n.full}</text></g>)}
              </g>
            );
          })}
          {[{fill:'#7C3AED',label:'Your Brand'},{fill:'#C4B5FD',label:'Competitors'},{fill:'#6EE7B7',label:'Sources'}].map((l,i)=>(
            <g key={i} transform={`translate(${W/2-160+i*120},${H-24})`}>
              <circle cx={8} cy={0} r={7} fill={l.fill}/>
              <text x={20} y={0} dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{l.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── MARKDOWN ──────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.85,fontFamily:'Inter,sans-serif'}}>
      {lines.map((line,i)=>{
        if(!line.trim()) return <div key={i} style={{height:10}}/>;
        const bold=(t:string)=>t.split(/(\*\*.*?\*\*)/g).map((p,j)=>p.startsWith('**')&&p.endsWith('**')?<strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>:p);
        if(line.startsWith('## ')) return <div key={i} style={{fontSize:'1.05rem',fontWeight:800,color:'#111827',marginTop:18,marginBottom:6}}>{bold(line.slice(3))}</div>;
        if(line.startsWith('# ')) return <div key={i} style={{fontSize:'1.15rem',fontWeight:900,color:'#111827',marginTop:18,marginBottom:6}}>{bold(line.slice(2))}</div>;
        if(/^\d+\.\s/.test(line)){const num=line.match(/^\d+/)![0];return <div key={i} style={{display:'flex',gap:10,marginBottom:6,paddingLeft:4}}><span style={{fontWeight:700,color:'#7C3AED',minWidth:20}}>{num}.</span><span>{bold(line.replace(/^\d+\.\s/,''))}</span></div>;}
        if(/^[-•]\s/.test(line)||/^\s{2,}[-•]\s/.test(line)){const ind=/^\s{4,}/.test(line)?24:8;return <div key={i} style={{display:'flex',gap:8,marginBottom:5,paddingLeft:ind}}><span style={{color:'#7C3AED',flexShrink:0,marginTop:2}}>•</span><span>{bold(line.replace(/^\s*[-•]\s/,''))}</span></div>;}
        if(line.trim()==='---') return <hr key={i} style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'14px 0'}}/>;
        return <p key={i} style={{margin:'3px 0'}}>{bold(line)}</p>;
      })}
    </div>
  );
}

// ── RADAR ─────────────────────────────────────────────────────
function RadarChart({ sent, prom, vis }: { sent: number; prom: number; vis: number }) {
  const dims=[{label:'Positivity',val:sent},{label:'Authority',val:Math.round(sent*0.85)},{label:'Trust',val:Math.round(vis*0.9)},{label:'Relevance',val:Math.round(prom*0.95)},{label:'Clarity',val:Math.round(sent*0.75)},{label:'Recommendation',val:Math.round(vis*0.8)}];
  const cx=160,cy=155,R=105,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100];
  const poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  return (
    <svg viewBox="0 0 320 310" style={{width:'100%',maxWidth:300}}>
      {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return <polygon key={r} points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1"/>;} )}
      {dims.map((_,i)=>{const p=pt(i,R);return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;} )}
      <polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="2"/>
      {dims.map((d,i)=>{const lp=pt(i,R+20);return <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{d.label}</text>;} )}
    </svg>
  );
}

function VisibilityBars({ brand, vis, competitors }: { brand: string; vis: number; competitors: any[] }) {
  const all=[{Brand:brand,Vis:vis,isYou:true},...competitors.map(c=>({Brand:c.Brand,Vis:c.Vis,isYou:false}))].sort((a,b)=>b.Vis-a.Vis);
  const max=Math.max(...all.map(a=>a.Vis),1);
  return (
    <div>
      {all.map((a,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <div style={{width:18,fontSize:'0.8rem',color:a.isYou?'#7C3AED':'#9CA3AF',fontWeight:a.isYou?700:400}}>{i+1}</div>
          <div style={{width:140,fontSize:'0.84rem',color:'#374151',fontWeight:a.isYou?700:400}}>
            {a.Brand}{a.isYou&&<span style={{marginLeft:6,fontSize:'0.68rem',background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 5px',fontWeight:700}}>← You</span>}
          </div>
          <div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:8,overflow:'hidden'}}>
            <div style={{background:a.isYou?'#7C3AED':'#D1D5DB',height:8,borderRadius:50,width:`${(a.Vis/max)*100}%`}}/>
          </div>
          <div style={{width:32,fontSize:'0.85rem',fontWeight:700,color:a.isYou?'#7C3AED':'#374151',textAlign:'right' as const}}>{a.Vis}</div>
        </div>
      ))}
    </div>
  );
}

function ScatterPlot({ brand, vis, geo, competitors }: { brand: string; vis: number; geo: number; competitors: any[] }) {
  const all=[{label:brand,x:vis,y:geo,isYou:true},...competitors.map(c=>({label:c.Brand,x:c.Vis,y:c.GEO,isYou:false}))];
  const W=400,H=230,pad=40,xMax=Math.max(...all.map(a=>a.x),100);
  const sx=(v:number)=>pad+(v/xMax)*(W-pad*2);
  const sy=(v:number)=>H-pad-(v/100)*(H-pad*2);
  const avgX=Math.round(all.reduce((s,a)=>s+a.x,0)/all.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      <line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad} stroke="#E5E7EB" strokeWidth="1"/>
      <line x1={pad} y1={pad} x2={pad} y2={H-pad} stroke="#E5E7EB" strokeWidth="1"/>
      {[0,25,50,75,100].map(v=>(<g key={v}><line x1={pad} y1={sy(v)} x2={W-pad} y2={sy(v)} stroke="#F3F4F6" strokeWidth="1"/><text x={pad-6} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
      <line x1={sx(avgX)} y1={pad} x2={sx(avgX)} y2={H-pad} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4,4"/>
      <text x={sx(avgX)+4} y={pad+10} style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>avg {avgX}</text>
      {all.map((a,i)=><circle key={i} cx={sx(a.x)} cy={sy(a.y)} r={a.isYou?7:5} fill={a.isYou?'#7C3AED':'#D1D5DB'}/>)}
      <text x={W/2} y={H-5} textAnchor="middle" style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
      <text x={10} y={H/2} textAnchor="middle" transform={`rotate(-90,10,${H/2})`} style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO</text>
    </svg>
  );
}

function CitationPie({ sources }: { sources: any[] }) {
  if(!sources||sources.length===0) return null;
  const cx=110,cy=110,R=90;
  const colors=['#7C3AED','#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#EC4899'];
  let cum=-Math.PI/2;
  const slices=sources.map((s,i)=>{
    const a=(s.citation_share/100)*2*Math.PI;
    const x1=cx+R*Math.cos(cum),y1=cy+R*Math.sin(cum);
    cum+=a;
    const x2=cx+R*Math.cos(cum),y2=cy+R*Math.sin(cum);
    const mA=cum-a/2,lx=cx+(R+18)*Math.cos(mA),ly=cy+(R+18)*Math.sin(mA);
    return {path:`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${a>Math.PI?1:0} 1 ${x2},${y2}Z`,lx,ly,share:s.citation_share,color:colors[i%colors.length]};
  });
  return (
    <svg viewBox="0 0 220 220" style={{width:'100%',maxWidth:220}}>
      {slices.map((s,i)=>(<g key={i}><path d={s.path} fill={s.color} stroke="white" strokeWidth="1.5"/>{s.share>=8&&<text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:600}}>{s.share}%</text>}</g>))}
    </svg>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function GeoHub() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [promptInput, setPromptInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<{q:string;a:string}[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [hovBar, setHovBar] = useState<number|null>(null);

  async function runAnalysis() {
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);
    try {
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await res.json();
      if(data.error) setError(data.error); else {setResult(data);setActiveTab(0);}
    } catch(e:any){setError(e.message);}
    setLoading(false);
  }

  async function runPrompt(q?:string) {
    const query=q||promptInput;
    if(!query.trim()) return;
    setPromptLoading(true);
    if(!q) setPromptInput('');
    try {
      const res=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:query})});
      const data=await res.json();
      setPromptHistory(h=>[{q:query,a:data.response},...h]);
    } catch{}
    setPromptLoading(false);
  }

  const examplePrompts = result?.ind_key==='fin' ? [
    'Compare invite-only credit cards for high net worth individuals',
    'What is the best credit card for someone who travels internationally?',
    'Which bank offers the best rewards for small business owners?',
    'Best first credit card for someone with no credit history',
    'Compare Chase Sapphire Reserve vs Capital One Venture X for travel',
  ] : result?.ind_key==='auto' ? [
    'Best electric vehicle for long road trips in 2025',
    'Most reliable SUV for families',
    'Compare Tesla Model 3 vs BMW i4',
    'Best car for first-time buyers under $30,000',
    'Which car brand has the best safety record?',
  ] : [
    'What are the most trusted brands right now?',
    'Best companies for customer service in 2025',
    'Compare top brands for value and quality',
    'Which companies are leading in innovation?',
    'Best brands recommended by experts',
  ];

  return (
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      {/* HERO */}
      <div style={{background:'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)',padding:'64px 40px 72px',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 24px',fontSize:'0.82rem',fontWeight:600,color:'white',marginBottom:32,background:'rgba(255,255,255,0.15)'}}>✦ &nbsp;Real Time GEO Scoring</div>
        <h1 style={{fontSize:'3.6rem',fontWeight:900,color:'white',margin:'0 0 16px',letterSpacing:'-1.5px',lineHeight:1.1}}>GEO Scorecard</h1>
        <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.9)',margin:'0 0 20px'}}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:50,padding:'8px 22px',fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.12)'}}>⏱ &nbsp;Live data · Updated in real-time · Not cached like competitors</div>
      </div>

      {!result ? (
        <div style={{padding:'48px 40px 60px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:24,marginBottom:40}}>
            {bands.map((b,i)=>(
              <div key={i} style={{background:b.bg,borderRadius:20,padding:'36px 28px',textAlign:'center',border:`1.5px solid ${b.border}`}}>
                <div style={{fontSize:'0.85rem',fontWeight:700,color:b.color,marginBottom:8}}>{b.range}</div>
                <div style={{fontSize:'1.8rem',fontWeight:900,color:b.color,marginBottom:8}}>{b.label}</div>
                <div style={{fontSize:'0.85rem',color:b.color,lineHeight:1.5}}>{b.desc}</div>
              </div>
            ))}
          </div>
          <div style={{background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'28px 32px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#7C3AED'}}/>
              <span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'.14em',color:'#9CA3AF',textTransform:'uppercase' as const}}>Brand URL</span>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <input type="text" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runAnalysis()} placeholder="https://www.capitalone.com/"
                style={{flex:1,borderRadius:12,border:'1.5px solid #E5E7EB',padding:'14px 20px',fontSize:'0.95rem',height:52,background:'white',outline:'none',color:'#374151',boxSizing:'border-box' as const}}/>
              <button onClick={runAnalysis} disabled={loading}
                style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,fontWeight:700,fontSize:'0.95rem',height:52,padding:'0 28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(124,58,237,0.4)',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                🔍 {loading?'Analysing...':'Run Live AI Analysis'}
              </button>
            </div>
            {error&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginTop:10}}>{error}</div>}
          </div>
        </div>
      ) : (
        <div>
          <div style={{borderBottom:'1px solid #E5E7EB',background:'white',display:'flex',padding:'0 40px',gap:4}}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setActiveTab(i)} style={{background:'none',border:'none',borderBottom:activeTab===i?'2px solid #7C3AED':'2px solid transparent',color:activeTab===i?'#7C3AED':'#6B7280',fontWeight:activeTab===i?700:500,fontSize:'0.85rem',padding:'12px 20px',cursor:'pointer',transition:'all 0.15s'}}>{t}</button>
            ))}
            <button onClick={()=>{setResult(null);setUrl('');}} style={{marginLeft:'auto',background:'none',border:'1px solid #E5E7EB',borderRadius:8,color:'#6B7280',fontSize:'0.78rem',padding:'6px 14px',cursor:'pointer',alignSelf:'center'}}>← New Analysis</button>
          </div>

          <div style={{padding:'28px 40px 60px'}}>

            {/* TAB 0: GEO SCORE */}
            {activeTab===0&&(()=>{
              const geo=result.overall_geo_score,badge=scoreBadge(geo);
              const vis=result.visibility,cit=result.citation_share,sent=result.sentiment;
              const prom=result.prominence,sov=result.share_of_voice,avgRank=result.avg_rank;

              // ── UPDATED SUMMARY TEXT ──────────────────────────────
              const summaryText=`GEO Score of ${geo} reflects ${vis}% Visibility but is held back by Prominence (${prom}), typically mentioned mid-list rather than first; Share of Voice (${sov}), competitors are dominating more of the AI conversation; Citation (${cit}), rarely the top pick in AI responses; Sentiment (${sent}), neutral tone with no strong recommendation language.`;
              // ─────────────────────────────────────────────────────

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
                    <MetricCard label="sentiment score" val={sent} color="#10B981"/>
                    <MetricCard label="citation score" val={cit} color="#F59E0B"/>
                    <MetricCard label="avg rank" val={avgRank} color="#3B82F6"/>
                  </div>
                  <div style={{display:'flex',gap:20,marginBottom:16}}>
                    <SankeyChart result={result}/>
                    <BusinessImpact result={result} onGo={()=>setActiveTab(1)}/>
                  </div>

                </div>
              );
            })()}

            {/* TAB 1: COMPETITORS */}
            {activeTab===1&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,cit=result.citation_share;
              const sent=result.sentiment,sov=result.share_of_voice,avgRank=result.avg_rank;
              const top=[
                {Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Rank:avgRank,isYou:true},
                ...(result.competitors||[]).map((c:any)=>({...c,isYou:false}))
              ].sort((a,b)=>b.GEO-a.GEO);
              const myRank=top.findIndex(c=>c.isYou)+1;
              const leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;
              const bW=680,bH=140,bPad=32,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:2}}>{result.domain} vs Competitors — {result.ind_label}</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Real-time GEO scores across AI visibility signals</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#F5F3FF',borderRadius:14,border:'1px solid #DDD6FE',padding:'18px 22px'}}>
                      <div style={{fontSize:'0.75rem',color:'#7C3AED',fontWeight:600,marginBottom:4}}>Your Rank</div>
                      <div style={{fontSize:'2.2rem',fontWeight:900,color:'#7C3AED'}}>#{myRank}</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>out of {top.length} competitors</div>
                    </div>
                    <div style={{background:'#FFFBEB',borderRadius:14,border:'1px solid #FCD34D',padding:'18px 22px'}}>
                      <div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div>
                      <div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'—':`${gapToTop} pts`}</div>
                      <div style={{fontSize:'0.75rem',color:'#92400E'}}>{myRank===1?'You are the leader':Math.abs(gapToTop)<=5?'Close — strong opportunity to overtake':'Gap to close'}</div>
                    </div>
                    <div style={{background:'#ECFDF5',borderRadius:14,border:'1px solid #6EE7B7',padding:'18px 22px'}}>
                      <div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1} (${next.Brand})`:'Top Ranked'}</div>
                      <div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'—'}</div>
                      <div style={{fontSize:'0.75rem',color:'#065F46'}}>{leadOver!=null?(leadOver<10?'Close — defend this position':'Comfortable but not safe'):'Leading the category'}</div>
                    </div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Comparison</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:10}}>Hover over any brand to see full metrics</div>
                    <svg viewBox={`0 0 ${bW} ${bH+44}`} style={{width:'100%',display:'block'}} onMouseLeave={()=>setHovBar(null)}>
                      {[0,25,50,75,100].map(v=>(<g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>))}
                      {top.map((c:any,i:number)=>{
                        const bx=bPad+i*gW+gW*0.08,bw2=gW*0.26;
                        const gh=((c.GEO||0)/100)*bMH,vh=((c.Vis||0)/100)*bMH,ch=((c.Cit||0)/100)*bMH;
                        const isY=c.isYou,isH=hovBar===i;
                        const tipY=bH-Math.max(gh,vh,ch)-58;
                        return (
                          <g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}>
                            <rect x={bx} y={bH-gh} width={bw2} height={gh} fill={isY?'#1F2937':'#D1D5DB'} rx={2}/>
                            <rect x={bx+bw2+2} y={bH-vh} width={bw2} height={vh} fill={isY?'#7C3AED':'#A5B4FC'} rx={2}/>
                            <rect x={bx+bw2*2+4} y={bH-ch} width={bw2} height={ch} fill={isY?'#C4B5FD':'#DDD6FE'} rx={2}/>
                            <text x={bx+bw2*1.5} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#7C3AED':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>
                            {isH&&(
                              <g>
                                <rect x={Math.min(bx-5,bW-145)} y={tipY} width={140} height={52} rx={6} fill="#1F2937"/>
                                <text x={Math.min(bx-5,bW-145)+70} y={tipY+13} textAnchor="middle" style={{fontSize:10,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text>
                                <text x={Math.min(bx-5,bW-145)+70} y={tipY+28} textAnchor="middle" style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO} · Vis: {c.Vis} · Cit: {c.Cit}</text>
                                <text x={Math.min(bx-5,bW-145)+70} y={tipY+42} textAnchor="middle" style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Sen: {c.Sen} · SoV: {c.Sov} · Rank: {c.Rank}</text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                      <g transform={`translate(${bW/2-90},${bH+28})`}>
                        {[{color:'#1F2937',label:'GEO'},{color:'#7C3AED',label:'Visibility'},{color:'#C4B5FD',label:'Citations'}].map((l,i)=>(
                          <g key={i} transform={`translate(${i*80},0)`}><rect x={0} y={-5} width={10} height={10} fill={l.color} rx={2}/><text x={14} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{l.label}</text></g>
                        ))}
                      </g>
                    </svg>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{background:'#FAFAFA'}}>
                          {['#','BRAND / URL','GEO SCORE','GAP','VISIBILITY','CITATIONS','SENTIMENT','SOV','AVG. RANK'].map(h=>(
                            <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {top.map((c:any,i:number)=>{
                          const gcol=c.GEO>=80?'#10B981':c.GEO>=60?'#7C3AED':'#374151';
                          const gap2=c.isYou?null:c.GEO-geo;
                          return (
                            <tr key={i} style={{background:c.isYou?'#F5F3FF':'white',borderTop:'1px solid #F3F4F6',borderLeft:c.isYou?'3px solid #7C3AED':'none'}}>
                              <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                              <td style={{padding:'11px 12px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:7}}>
                                  <span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>
                                  {c.isYou&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}
                                </div>
                                <div style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{c.URL}</div>
                              </td>
                              <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:gcol}}>{c.GEO}</td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:gap2===null?'#9CA3AF':gap2>0?'#EF4444':'#10B981'}}>
                                {gap2===null?'—':`${gap2>0?'':'+'}${Math.abs(gap2)} pts`}
                              </td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Vis}</td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Cit}</td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sen}</td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sov}</td>
                              <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:'#7C3AED'}}>{c.Rank}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 2: VISIBILITY */}
            {activeTab===2&&(()=>{
              const vis=result.visibility;
              const comps=result.competitors||[];
              const allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const avgVis=Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24}}>
                    <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'18px 18px'}}>
                      <div style={{fontSize:'0.65rem',fontWeight:600,color:'#7C3AED',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Rank (Visibility)</div>
                      <div style={{fontSize:'2rem',fontWeight:800,color:'#7C3AED'}}>#{myVisRank}</div>
                      <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>out of {allVis.length} institutions</div>
                    </div>
                    <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'18px 18px'}}>
                      <div style={{fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Score</div>
                      <div style={{fontSize:'2rem',fontWeight:800,color:'#111827'}}>{vis}</div>
                      <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>vs industry avg {avgVis}</div>
                    </div>
                    <div style={{background:'#ECFDF5',borderRadius:12,border:'1px solid #6EE7B7',padding:'18px 18px'}}>
                      <div style={{fontSize:'0.65rem',fontWeight:600,color:'#065F46',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>vs. Industry Average</div>
                      <div style={{fontSize:'2rem',fontWeight:800,color:'#065F46'}}>{vis>avgVis?'+':''}{vis-avgVis} pts</div>
                      <div style={{fontSize:'0.72rem',color:'#065F46'}}>{vis>avgVis?'Above average':'Below average'}</div>
                    </div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px',marginBottom:24}}>
                    <VisibilityBars brand={result.brand_name} vis={vis} competitors={result.competitors||[]}/>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}>
                    <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>GEO Score vs. Visibility — Market Positioning</div>
                    <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Each dot = one institution. Your brand is highlighted in purple.</div>
                    <ScatterPlot brand={result.brand_name} vis={vis} geo={result.overall_geo_score} competitors={result.competitors||[]}/>
                  </div>
                </div>
              );
            })()}

            {/* TAB 3: SENTIMENT */}
            {activeTab===3&&(()=>{
              const sent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank,vis=result.visibility;
              const smood=sent>=70?'Positive — AI speaks favorably':sent>=45?'Neutral — room to improve':'Needs attention';
              const pmood=prom>=70?'Named first — strong prominence':prom>=45?'Mid-list mentions':'Buried in responses';
              const weeks=[sent-8,sent-6,sent-7,sent-4,sent-2,sent].map((v,i)=>({wk:`Wk ${i+1}`,val:Math.max(0,Math.min(100,v))}));
              const minW=Math.min(...weeks.map(w=>w.val))-5,maxW=Math.max(...weeks.map(w=>w.val))+5;
              const wx=(i:number)=>40+i*58,wy=(v:number)=>95-((v-minW)/(maxW-minW))*75;
              const lp=weeks.map((w,i)=>`${wx(i)},${wy(w.val)}`).join(' ');
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="sentiment score" val={sent} sub={smood} color="#7C3AED"/>
                    <MetricCard label="prominence score" val={prom} sub={pmood} color="#7C3AED"/>
                    <MetricCard label="average rank" val={avgRank} sub="Average mention position in AI responses" color="#7C3AED"/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:12}}>Sentiment Dimensions</div>
                      <div style={{display:'flex',justifyContent:'center'}}><RadarChart sent={sent} prom={prom} vis={vis}/></div>
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:12}}>Sentiment Over Time</div>
                      <svg viewBox="0 0 380 120" style={{width:'100%',display:'block'}}>
                        {[minW,Math.round((minW+maxW)/2),maxW].map(v=>(<g key={v}><line x1={30} y1={wy(v)} x2={360} y2={wy(v)} stroke="#F3F4F6" strokeWidth="1"/><text x={26} y={wy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{Math.round(v)}</text></g>))}
                        <polyline points={lp} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinejoin="round"/>
                        <polyline points={`${lp} ${wx(5)},105 ${wx(0)},105`} fill="#7C3AED" fillOpacity="0.08"/>
                        {weeks.map((w,i)=>(<g key={i}><circle cx={wx(i)} cy={wy(w.val)} r={3} fill="#7C3AED"/><text x={wx(i)} y={113} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{w.wk}</text></g>))}
                      </svg>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>✓ Sentiment Strengths</div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>
                        {(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=>(<li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>))}
                      </ul>
                    </div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>✗ Areas of Concern</div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>
                        {(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=>(<li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>✗</span><span>{w}</span></li>))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: CITATIONS */}
            {activeTab===4&&(()=>{
              const cit=result.citation_share,sov=result.share_of_voice;
              const sources=result.citation_sources||[];
              const catMap:Record<string,number>={};
              sources.forEach((s:any)=>{const cl=classifyDomain(s.domain);catMap[cl.label]=(catMap[cl.label]||0)+s.citation_share;});
              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#7C3AED',Other:'#6B7280',Social:'#F59E0B',Institution:'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:20}}>
                    <div><div style={{fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:5}}>Citation Score</div><div style={{fontSize:'2.6rem',fontWeight:900,color:'#7C3AED'}}>{cit}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>How authoritatively your brand was cited</div></div>
                    <div><div style={{fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:5}}>Share of Voice</div><div style={{fontSize:'2.6rem',fontWeight:900,color:'#7C3AED'}}>{sov}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>Your brand mentions as % of all mentions</div></div>
                  </div>
                  {sources.length>0&&(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                      <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                        <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation Share by Source</div>
                        <div style={{display:'flex',justifyContent:'center'}}><CitationPie sources={sources}/></div>
                      </div>
                      <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                        <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                        {catEntries.map(([cat,pct],i)=>(
                          <div key={i} style={{marginBottom:12}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:'0.84rem',color:'#374151'}}>{cat}</span><span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#374151'}}>{Math.round(pct)}%</span></div>
                            <div style={{background:'#F3F4F6',borderRadius:50,height:6,overflow:'hidden'}}><div style={{background:catColors[cat]||'#7C3AED',height:6,borderRadius:50,width:`${Math.round(pct)}%`}}/></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sources.length>0&&(
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,marginBottom:20}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sources AI is Pulling From — {result.brand_name}</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:16}}>Domains that most influenced AI knowledge. Citation Share % = each source&apos;s contribution to total AI brand mentions.</div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr style={{background:'#FAFAFA'}}>{['RANK','DOMAIN','CATEGORY','CITATION SHARE %'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {sources.map((s:any,i:number)=>{
                            const cls=classifyDomain(s.domain),bw=Math.min(s.citation_share*3,100);
                            return (<tr key={i} style={{borderTop:'1px solid #F3F4F6'}}><td style={{padding:'11px 14px',fontSize:'0.82rem',color:'#9CA3AF'}}>{s.rank}</td><td style={{padding:'11px 14px',fontSize:'0.86rem',fontWeight:600,color:'#7C3AED'}}>{s.domain}</td><td style={{padding:'11px 14px'}}><span style={{background:cls.bg,color:cls.color,borderRadius:8,padding:'3px 10px',fontSize:'0.72rem',fontWeight:600}}>{cls.label}</span></td><td style={{padding:'11px 14px'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:5,overflow:'hidden'}}><div style={{background:'#7C3AED',height:5,borderRadius:50,width:`${bw}%`}}/></div><span style={{fontSize:'0.82rem',fontWeight:700,color:'#7C3AED',width:34}}>{s.citation_share}%</span></div></td></tr>);
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <LinkAnalysis result={result}/>
                </div>
              );
            })()}

            {/* TAB 5: PROMPTS */}
            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[];
              const cats=['All',...Array.from(new Set(rd.map((r:any)=>r.category))) as string[]];
              const filtered=rd.filter((r:any)=>filterCat==='All'||r.category===filterCat).slice(0,10);
              const catStats:Record<string,{total:number;mentioned:number}>={};
              rd.forEach((r:any)=>{if(!catStats[r.category])catStats[r.category]={total:0,mentioned:0};catStats[r.category].total++;if(r.mentioned)catStats[r.category].mentioned++;});
              const totalMentions=rd.filter((r:any)=>r.mentioned).length;
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={20} sub="Generic consumer questions, no brand name" color="#7C3AED"/>
                    <MetricCard label="appearances" val={`${totalMentions}/20`} sub="Shown queries where brand appeared" color="#7C3AED"/>
                    <MetricCard label="appearance rate" val={`${Math.round((totalMentions/20)*100)}%`} sub="Of all AI queries triggered brand mention" color="#7C3AED"/>
                  </div>
                  <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:10}}>Appearance Rate by Category</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
                    {Object.entries(catStats).map(([c,v])=>(
                      <div key={c} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 16px'}}>
                        <div style={{fontSize:'0.8rem',fontWeight:600,color:'#111827',marginBottom:7}}>{c}</div>
                        <div style={{background:'#F3F4F6',borderRadius:50,height:5,marginBottom:5,overflow:'hidden'}}><div style={{background:'#7C3AED',height:5,borderRadius:50,width:`${Math.round((v.mentioned/Math.max(v.total,1))*100)}%`}}/></div>
                        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{v.mentioned} of {v.total} queries</span><span style={{fontSize:'0.76rem',fontWeight:700,color:'#7C3AED'}}>{Math.round((v.mentioned/Math.max(v.total,1))*100)}%</span></div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div><div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827'}}>Queries Run ({filtered.length} shown)</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>Generic consumer questions. Rank = actual position brand was mentioned within each AI response.</div></div>
                    <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',fontSize:'0.82rem',color:'#374151',background:'white',outline:'none'}}>
                      {cats.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','QUERY','RANK'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filtered.map((item:any,i:number)=>{
                          const rp=item.position,rd2=rp>0?`#${rp}`:'N/A';
                          const rc=rp===1?'#10B981':rp<=3?'#7C3AED':item.mentioned?'#7C3AED':'#9CA3AF';
                          return (<tr key={i} style={{borderTop:'1px solid #F3F4F6'}}><td style={{padding:'13px 14px',fontSize:'0.8rem',color:'#9CA3AF',verticalAlign:'top'}}>{i+1}</td><td style={{padding:'13px 14px'}}><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:5}}><span style={{background:'#EDE9FE',color:'#5B21B6',borderRadius:6,padding:'2px 9px',fontSize:'0.7rem',fontWeight:600}}>{item.category}</span>{item.mentioned?<span style={{color:'#10B981',fontSize:'0.76rem',fontWeight:600}}>✓ Appeared</span>:<span style={{color:'#9CA3AF',fontSize:'0.76rem'}}>— Not Mentioned</span>}</div><div style={{fontSize:'0.86rem',color:'#374151',fontWeight:500}}>{item.query}</div></td><td style={{padding:'13px 14px',textAlign:'right' as const,fontSize:'1rem',fontWeight:800,color:rc,verticalAlign:'top'}}>{rd2}</td></tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 6: RECOMMENDATIONS */}
            {activeTab===6&&(()=>{
              const geo=result.overall_geo_score,fin=result.ind_key==='fin';
              const segments=fin?[
                {name:'General Consumers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.9),dominated:'Chase, Citi'},
                {name:'Travelers / Rewards',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.min(100,Math.round(geo*1.1)),dominated:'Amex, Chase'},
                {name:'Affluent / HNW',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.45),dominated:'Amex Centurion, Chase Sapphire'},
                {name:'First-Time Users',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.95),dominated:'Discover'},
                {name:'Cashback Seekers',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.5),dominated:'Citi, Wells Fargo'},
                {name:'Small Business',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.35),dominated:'Amex, Chase Ink'},
              ]:[
                {name:'General Consumers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.9),dominated:'Top Competitors'},
                {name:'Expert Seekers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*1.0),dominated:'Industry Leaders'},
                {name:'Premium Segment',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.5),dominated:'Competitors'},
              ];
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:14}}>Which audience segments is your brand winning vs. losing in AI responses?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>
                    {segments.map((s,i)=>(
                      <div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span>
                          <span style={{background:s.status==='Winning'?'#D1FAE5':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span>
                        </div>
                        <div style={{background:s.status==='Winning'?'#D1FAE5':'#FEE2E2',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div>
                        <div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> &nbsp;·&nbsp; Dominated by: {s.dominated}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>⚡</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>GEO Health Summary</span></div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Based on how your brand performed across 20 generic AI queries — no brand name was used.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>✓ What is Working Well</div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=>(<li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>✓</span><span>{s}</span></li>))}</ul>
                    </div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}>
                      <div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>✗ What Needs Improvement</div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,5).map((w:string,i:number)=>(<li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>✗</span><span>{w}</span></li>))}</ul>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>⚡</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>Priority Actions — Implementable</span></div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(result.actions||[]).map((a:any,i:number)=>{
                          const dm:Record<string,[string,string,string]>={High:['#FEE2E2','#991B1B','Workstream 01 — ARD'],Medium:['#FEF3C7','#92400E','Workstream 02 — AOP'],Low:['#DCFCE7','#166534','Workstream 03 — DT1']};
                          const [bg,tc,ws]=dm[a.priority]||['#F3F4F6','#374151',''];
                          const seg=segments[i%segments.length];
                          return (<tr key={i} style={{borderTop:'1px solid #F3F4F6'}}><td style={{padding:'14px 14px'}}><span style={{background:bg,color:tc,borderRadius:50,padding:'3px 11px',fontSize:'0.76rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'14px 14px',fontSize:'0.82rem',fontWeight:600,color:'#7C3AED'}}>{seg?.name}</td><td style={{padding:'14px 14px',fontSize:'0.8rem',color:'#6B7280'}}>Content Page</td><td style={{padding:'14px 14px',fontSize:'0.82rem',color:'#374151',maxWidth:320}}>{a.action}</td><td style={{padding:'14px 14px',fontSize:'0.8rem',fontWeight:600,color:'#7C3AED'}}>{ws}</td></tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 7: LIVE PROMPT */}
            {activeTab===7&&(
              <div>
                <div style={{background:'#F5F3FF',borderRadius:14,border:'1px solid #DDD6FE',padding:'18px 22px',marginBottom:22}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                    <span style={{fontSize:'1.1rem',color:'#7C3AED'}}>✦</span>
                    <span style={{fontSize:'0.98rem',fontWeight:700,color:'#7C3AED'}}>Optional: Test a Custom Prompt</span>
                  </div>
                  <p style={{fontSize:'0.83rem',color:'#7C3AED',margin:0,lineHeight:1.6}}>Run any query you think AI users would use in your industry. See how your brand ranks in the response — and who beats you.</p>
                </div>
                <div style={{fontSize:'0.67rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:10}}>Example Prompts</div>
                <div style={{display:'flex',flexWrap:'wrap' as const,gap:10,marginBottom:22}}>
                  {examplePrompts.map((p,i)=>(
                    <button key={i} onClick={()=>setPromptInput(p)}
                      style={{background:'white',border:'1px solid #E5E7EB',borderRadius:50,padding:'8px 16px',fontSize:'0.82rem',color:'#374151',cursor:'pointer',lineHeight:1.4}}>
                      {p.length>56?p.slice(0,55)+'...':p}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:'0.67rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:10}}>Your Prompt</div>
                <textarea value={promptInput} onChange={e=>setPromptInput(e.target.value)}
                  placeholder="Enter any AI search query relevant to your industry..."
                  rows={3}
                  style={{width:'100%',borderRadius:12,border:'1.5px solid #DDD6FE',padding:'14px 18px',fontSize:'0.92rem',background:'white',outline:'none',color:'#374151',resize:'vertical',boxSizing:'border-box' as const,fontFamily:'Inter,sans-serif',marginBottom:14,display:'block'}}
                />
                <button onClick={()=>runPrompt()} disabled={promptLoading}
                  style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,padding:'11px 28px',fontSize:'0.9rem',fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}>
                  🔍 Run Prompt
                </button>
                {promptLoading&&(
                  <div style={{display:'flex',alignItems:'center',gap:10,background:'#F5F3FF',borderRadius:10,padding:'12px 16px',marginTop:14,border:'1px solid #DDD6FE'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:'#7C3AED',animation:'pulse 1s infinite'}}/>
                    <span style={{fontSize:'0.84rem',color:'#7C3AED',fontWeight:500}}>Running GPT-4o queries...</span>
                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
                  </div>
                )}
                {promptHistory.length>0&&<hr style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'24px 0'}}/>}
                {promptHistory.map((item,i)=>(
                  <div key={i} style={{marginBottom:28}}>
                    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                      <div style={{background:'white',border:'1px solid #E5E7EB',color:'#374151',borderRadius:'18px 18px 4px 18px',padding:'11px 16px',maxWidth:'65%',fontSize:'0.9rem'}}>{item.q}</div>
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                      <MarkdownText text={item.a}/>
                    </div>
                  </div>
                ))}
                {promptHistory.length>0&&<button onClick={()=>setPromptHistory([])} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:8,color:'#6B7280',fontSize:'0.78rem',padding:'6px 14px',cursor:'pointer'}}>Clear history</button>}
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
