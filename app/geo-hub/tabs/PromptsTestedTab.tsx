'use client';

import React, { useState } from 'react';
import { MetricCard } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function PromptsTestedTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [filterCat, setFilterCat] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState<string|null>(null);
  const [queryPage, setQueryPage] = useState(1);
  const [highlightedBubble, setHighlightedBubble] = useState<string|null>(null);

  const rd=result.responses_detail||[];
  const clusters=result.query_clusters||[];
  const trendingQs=result.trending_queries||[];
  const totalQueries = result.total_responses ?? rd.length;
  const totalMentions = result.responses_with_brand ?? rd.filter((r:any)=>r.mentioned).length;
  const displayRate = Math.round((totalMentions / Math.max(totalQueries, 1)) * 100);

  const cats2: string[] = ['All',...Array.from(new Set<string>(rd.map((r:any)=>r.category as string).filter((c:string)=>Boolean(c))))];

  return (
    <div id="tab-prompts">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
        <MetricCard label="queries run" val={totalQueries} sub="Generic consumer questions, no brand name" color="#7C3AED"/>
        <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} sub="Queries where brand appeared" color="#7C3AED"/>
        <MetricCard label="appearance rate" val={`${displayRate}%`} sub="Of all AI queries triggered brand mention" color="#7C3AED"/>
      </div>

      {/* CHANGE: Tighter bubble network, centered layout, click highlights connections */}
      {clusters.length > 0 && (()=>{
        const maxMentioned = Math.max(...clusters.map((c:any)=>c.mentioned), 1);
        const grouped = [...clusters].sort((a:any, b:any) => {
          const g = (c:any) => c.winRate>=60?0:c.winRate>=30?1:c.winRate>0?2:3;
          return g(a)!==g(b) ? g(a)-g(b) : b.mentioned-a.mentioned;
        });

        const nB = grouped.length;
        // CHANGE: Tighter grid - fewer columns, more centered
        const W = 940, VPAD = 52;
        const COLS = Math.min(5, Math.ceil(Math.sqrt(nB * 1.2)));
        const ROWS = Math.ceil(nB / COLS);
        // CHANGE: Tighter cell size
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

        // CHANGE: determine which bubbles are "connected" to highlighted one
        const getConnectedCategories = (cat: string): Set<string> => {
          const connected = new Set<string>();
          const bubble = bubbles.find((b:any) => b.category === cat);
          if (!bubble) return connected;
          (bubble.related||[]).forEach((rel:any) => {
            if (rel.similarity >= 20) connected.add(rel.category);
          });
          // Also add any bubble that lists this bubble as related
          bubbles.forEach((b:any) => {
            if ((b.related||[]).some((rel:any) => rel.category === cat && rel.similarity >= 20)) {
              connected.add(b.category);
            }
          });
          return connected;
        };

        const connectedToHighlight = highlightedBubble ? getConnectedCategories(highlightedBubble) : new Set<string>();

        return (
          <div id="prompts-filter-row" style={{borderRadius:16,overflow:'hidden',marginBottom:20,border:'1px solid #1E293B'}}>
            <div style={{background:'#0F172A',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'0.9rem',fontWeight:800,color:'white'}}>Query Intelligence Network</div>
                <div style={{fontSize:'0.68rem',color:'#64748B',marginTop:1}}>Node size = brand appearances  .  Color = win rate  .  Click to filter prompts & highlight connections</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                {[{color:'#10B981',label:'Winning (>=60%)'},{color:'#F59E0B',label:'Emerging (30-59%)'},{color:'#EF4444',label:'Gap (<30%)'}].map((l,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:l.color}}/>
                    <span style={{fontSize:'0.65rem',color:'#94A3B8'}}>{l.label}</span>
                  </div>
                ))}
                {(filterCat!=='All'||highlightedBubble)&&<button onClick={()=>{setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);}} style={{background:'#1E293B',border:'1px solid #334155',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#94A3B8',cursor:'pointer'}}>x Clear</button>}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',background:'#0F172A'}}>
              {Array.from({length:19},(_,i)=>Array.from({length:Math.ceil(H/30)},(_,j)=>(
                <circle key={`${i}-${j}`} cx={i*(W/18)} cy={j*30} r="1" fill="#1E293B"/>
              )))}

              {/* CHANGE: Lines always visible, but highlighted connections glow when a bubble is selected */}
              {bubbles.map((b:any)=>(b.related||[]).map((rel:any)=>{
                const target=bubbles.find((bb:any)=>bb.category===rel.category);
                if(!target||rel.similarity<20) return null;
                const isHighlightedConn = highlightedBubble &&
                  (b.category === highlightedBubble || rel.category === highlightedBubble);
                const isDimmed = highlightedBubble && !isHighlightedConn;
                return <line key={`${b.category}-${rel.category}`}
                  x1={b.x} y1={b.y} x2={target.x} y2={target.y}
                  stroke={isHighlightedConn ? '#A78BFA' : '#334155'}
                  strokeWidth={isHighlightedConn ? 2.5 : rel.similarity>60?2:1}
                  strokeDasharray={rel.similarity>60?undefined:"3,4"}
                  opacity={isDimmed ? 0.1 : isHighlightedConn ? 0.9 : 0.4}/>;
              }))}

              {bubbles.map((b:any)=>{
                const isSelected = filterCat===b.category;
                const isHighlighted = highlightedBubble === b.category;
                const isConnected = connectedToHighlight.has(b.category);
                const isDimmed = highlightedBubble && !isHighlighted && !isConnected;
                const isUntapped = b.winRate===0 && b.total>0;
                const nodeColor = b.winRate>=60?'#10B981':b.winRate>=30?'#F59E0B':'#EF4444';

                const words = b.category.split(' ');
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
                const fontSize = b.r >= 38 ? 9.5 : b.r >= 32 ? 9 : 8;
                const lineH = fontSize + 2;
                const totalTextH = hasTwo ? lineH * 2 + 8 + lineH : lineH + 8 + lineH;
                const textStartY = b.y - totalTextH / 2 + fontSize;
                const textY1 = textStartY;
                const textY2 = textY1 + lineH;
                const winY = (hasTwo ? textY2 : textY1) + lineH + 4;
                const appY = winY + lineH;
                return (
                  <g key={b.category} style={{cursor:'pointer'}} onClick={()=>{
                    // CHANGE: clicking toggles filter AND highlights connections
                    if(filterCat===b.category && highlightedBubble===b.category){
                      setFilterCat('All');setQueryPage(1);setHighlightedBubble(null);
                    } else {
                      setFilterCat(b.category);setQueryPage(1);setHighlightedBubble(b.category);
                    }
                  }}>
                    <circle cx={b.x} cy={b.y} r={b.r+8} fill={nodeColor} opacity={isDimmed?0.02:isHighlighted?0.2:0.07}/>
                    <circle cx={b.x} cy={b.y} r={b.r} fill={nodeColor}
                      opacity={isDimmed?0.25:isConnected?0.95:isHighlighted?1:0.8}
                      stroke={isHighlighted?'white':isConnected?'#A78BFA':nodeColor}
                      strokeWidth={isHighlighted?3:isConnected?2:isSelected?2.5:1}/>
                    {isUntapped&&<circle cx={b.x} cy={b.y} r={b.r+3} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,3" opacity={isDimmed?0.1:0.7}/>}
                    <text x={b.x} y={textY1} textAnchor="middle" style={{fontSize,fontWeight:700,fill:isDimmed?'rgba(255,255,255,0.3)':'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line1}</text>
                    {hasTwo&&<text x={b.x} y={textY2} textAnchor="middle" style={{fontSize,fontWeight:700,fill:isDimmed?'rgba(255,255,255,0.3)':'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{line2}</text>}
                    <text x={b.x} y={winY} textAnchor="middle" style={{fontSize:Math.max(6,fontSize-1),fill:isDimmed?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.9)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.winRate}% win</text>
                    {b.r>26&&<text x={b.x} y={appY} textAnchor="middle" style={{fontSize:6,fill:isDimmed?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.55)',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>{b.mentioned} appearances</text>}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })()}

      {/* Paginated query table */}
      {(()=>{
        const ROWS_PER_PAGE = 10;
        const allSorted = [...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;});
        const totalPages = Math.ceil(allSorted.length / ROWS_PER_PAGE);
        const safePage = Math.min(queryPage, Math.max(1, totalPages));
        const pageRows = allSorted.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);
        return (
          <div id="prompts-list-section" style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:'0.88rem',fontWeight:700,color:'#111827'}}>
                {filterCat==='All'?'All Queries':'Category: '+filterCat}
                <span style={{fontSize:'0.72rem',fontWeight:400,color:'#9CA3AF',marginLeft:8}}>({allSorted.length} queries  .  page {safePage} of {totalPages})</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:'0.68rem',color:'#9CA3AF'}}>Filter:</span>
                <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setQueryPage(1);setHighlightedBubble(null);}} style={{border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 8px',fontSize:'0.75rem',color:'#374151',background:'white',outline:'none'}}>
                  {cats2.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#F8FAFC'}}>{['#','QUERY','YOUR RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left' as const,fontSize:'0.63rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
              <tbody>{pageRows.map((item:any,i:number)=>{
                const globalIdx = (safePage-1)*ROWS_PER_PAGE + i + 1;
                const rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':rp<=3?'#7C3AED':item.mentioned?'#7C3AED':'#9CA3AF',isMissed=!item.mentioned;
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
                  <td style={{padding:'9px 12px',width:150}}>{beater?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#92400E'}}>👑 {beater}</span>:rp===1?<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700,color:'#065F46'}}>You&apos;re #1</span>:<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>--</span>}</td>
                </tr>;
              })}</tbody>
            </table>
            {totalPages > 1 && (
              <div id="prompts-pagination" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14}}>
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

      {/* CHANGE: "What Market is Asking" - removed year references, removed all volume data */}
      {trendingQs.length > 0 && (()=>{
        const oppOrder = (o:string) => o==='High'?0:o==='Medium'?1:2;
        const highOpp = [...trendingQs]
          // CHANGE: strip any year references (2024, 2025, 2026, etc.) from queries
          .map((tq:any) => ({
            ...tq,
            query: (tq.query||'').replace(/\bin\s+20\d{2}\b/gi,'').replace(/\s+/g,' ').trim()
          }))
          .sort((a:any,b:any)=>oppOrder(a.opportunity)-oppOrder(b.opportunity))
          .slice(0,10);

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
              Top {highOpp.length} high-intent queries trending in {result.ind_label||result.industry} beyond what we tested.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {highOpp.map((tq:any,i:number)=>{
                const trendColor=tq.trend==='Rising'?'#EF4444':tq.trend==='Peak'?'#F59E0B':'#6B7280';
                const trendBg=tq.trend==='Rising'?'#FEE2E2':tq.trend==='Peak'?'#FEF3C7':'#F3F4F6';
                const cluster=getCluster(tq.category);
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
                        {/* CHANGE: volume data (daily estimates) removed entirely */}
                      </div>
                      <div style={{fontSize:'0.82rem',color:'#374151',lineHeight:1.5,fontWeight:500,marginBottom:6}}>{tq.query}</div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                        {topComp&&<span style={{fontSize:'0.65rem',color:'#92400E',background:'#FEF3C7',borderRadius:4,padding:'1px 7px',fontWeight:600}}>👑 {topComp} leading</span>}
                        {brandWinRate!==null
                          ?<span style={{fontSize:'0.65rem',fontWeight:700,color:brandWinning?'#10B981':'#EF4444',background:brandWinning?'#D1FAE5':'#FEE2E2',borderRadius:4,padding:'1px 7px'}}>{result.brand_name}: {brandWinRate}% win</span>
                          :<span style={{fontSize:'0.65rem',color:'#9CA3AF',fontStyle:'italic'}}>New category, not yet tested</span>
                        }
                        <span style={{marginLeft:'auto',fontSize:'0.62rem',color:'#6B7280'}}>{isOpen?'^':'v'}</span>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{borderTop:'1px solid #E5E7EB',padding:'11px 13px',background:'white'}}>
                        {/* CHANGE: removed AI Queries/Day row from expanded dropdown */}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
                          {[
                            {label:'Currently Leading',val:topComp||'No clear leader',color:'#F59E0B'},
                            {label:`${result.brand_name} Win Rate`,val:brandWinRate!==null?`${brandWinRate}%`:'Not tested',color:brandWinning?'#10B981':'#EF4444'},
                            {label:'Trend Signal',val:tq.trend,color:trendColor},
                            {label:'Opportunity',val:tq.opportunity||'--',color:'#7C3AED'},
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
}
