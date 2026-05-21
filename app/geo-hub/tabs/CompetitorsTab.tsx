'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function CompetitorsTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [cmpLens, setCmpLens] = useState('GEO');
  const [cmpRef, setCmpRef] = useState(true);
  const [cmpSort, setCmpSort] = useState<{col:string;dir:number}>({col:'rank',dir:1});

  const geo=result.overall_geo_score??0;
  const vis=result.visibility??0,sent=result.sentiment??0,prom=result.prominence??0,cit=result.citation_share??0,sov=result.share_of_voice??0;
  const comps=resultComps;
  const myData={Brand:result.brand_name||'You',URL:result.domain||'',GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Prom:prom,isYou:true};
  const allBrands=[myData,...comps.map((c:any)=>({Brand:c.Brand||c.brand_name||'',URL:c.URL||c.domain||'',GEO:c.GEO||0,Vis:c.Vis||c.visibility||0,Cit:c.Cit||c.citation_share||0,Sen:c.Sen||c.sentiment||0,Sov:c.Sov||c.share_of_voice||0,Prom:c.Prom||c.prominence||0,isYou:false}))].sort((a,b)=>b.GEO-a.GEO);
  const myRank=allBrands.findIndex(b=>b.isYou)+1;
  const brandAbove=myRank>1?allBrands[myRank-2]:null;
  const brandBelow=myRank<allBrands.length?allBrands[myRank]:null;
  const LENSES=[
    {key:'GEO',label:'GEO Score',prop:'GEO'},
    {key:'Vis',label:'Visibility',prop:'Vis'},
    {key:'Sen',label:'Sentiment',prop:'Sen'},
    {key:'Prom',label:'Prominence',prop:'Prom'},
    {key:'Cit',label:'Citation',prop:'Cit'},
    {key:'Sov',label:'Share of Voice',prop:'Sov'},
  ];
  const activeLens=LENSES.find(l=>l.key===cmpLens)||LENSES[0];
  const chartData=[...allBrands].sort((a:any,b:any)=>((b as any)[activeLens.prop]||0)-((a as any)[activeLens.prop]||0));
  const isSignal=cmpLens!=='GEO';
  const ORDS:Record<number,string>={1:'st',2:'nd',3:'rd'};
  const ord=(n:number)=>ORDS[n]||'th';
  const ROW_H=38;
  const tableData=[...allBrands];
  tableData.forEach((b:any,i:number)=>{b._rank=i+1;b._gap=b.isYou?0:(b.GEO-geo);});
  const sCol=cmpSort.col,sDir=cmpSort.dir;
  if(sCol==='rank') tableData.sort((a:any,b:any)=>(a._rank-b._rank)*sDir);
  else if(sCol==='brand') tableData.sort((a:any,b:any)=>a.Brand.localeCompare(b.Brand)*sDir);
  else if(sCol==='gap') tableData.sort((a:any,b:any)=>(a._gap-b._gap)*sDir);
  else{const p=sCol==='visibility'?'Vis':sCol==='sentiment'?'Sen':sCol==='prominence'?'Prom':sCol==='citation'?'Cit':sCol==='sov'?'Sov':'GEO';tableData.sort((a:any,b:any)=>((a as any)[p]-(b as any)[p])*sDir);}
  return (
    <div id="tab-competitors" style={{display:'grid',gap:14}}>
      {/* Hero row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,alignItems:'stretch'}}>
        {/* Rank pillar — span 2 */}
        <div id="competitors-rank-pillar" style={{gridColumn:'span 2',background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',display:'flex',flexDirection:'column' as const}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',fontFamily:'Inter,sans-serif'}}>Where you rank · {result.ind_label||'your industry'}</div>
            <button style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>See methodology ›</button>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:18}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:88,lineHeight:0.95,letterSpacing:'-0.04em',color:'#0A0A0A'}}>
              {myRank}<span style={{fontSize:52,fontWeight:500,letterSpacing:'-0.02em'}}>{ord(myRank)}</span>
            </div>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:18,color:'#6B6B6B',fontWeight:400,lineHeight:1.2,paddingBottom:6,whiteSpace:'nowrap' as const}}>
              of {allBrands.length} brands in <span style={{color:'#A100FF',fontWeight:500}}>{result.ind_label||'your industry'}</span>
            </div>
          </div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:600,color:'#0A0A0A',lineHeight:1.4,letterSpacing:'-0.01em'}}>
            {myRank===1?'Leading the field — the threat is from below.':myRank===2?`Hold #${myRank} — the threat is from below, not above.`:`Ranked #${myRank} — room to move up.`}
          </div>
          <p style={{fontFamily:'Inter,sans-serif',fontSize:14,lineHeight:1.5,color:'#4A4A4A',maxWidth:'58ch',marginTop:6,marginBottom:0}}>
            {brandAbove&&<><span style={{color:'#1A1A1A',fontWeight:600}}>{brandAbove.Brand}</span>'s lead is {(brandAbove.GEO-geo)<=6?'narrow — a real opportunity to close':'there but closeable'}. </>}
            {brandBelow&&<>Watch <span style={{color:'#1A1A1A',fontWeight:600}}>{brandBelow.Brand}</span> at {brandBelow.GEO} — {(geo-brandBelow.GEO)<=8?'they are close behind':'your lead is comfortable'}.</>}
          </p>
        </div>
        {/* Ladder — span 1 */}
        <div id="competitors-ladder" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',display:'flex',flexDirection:'column' as const}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',fontFamily:'Inter,sans-serif'}}>The ladder</div>
            <button onClick={()=>setActiveParent(5)} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>Open Action Plan ›</button>
          </div>
          <div style={{display:'flex',flexDirection:'column' as const,flex:1}}>
            {brandAbove&&(
              <div style={{display:'grid',gridTemplateColumns:'56px 1fr auto',gap:20,alignItems:'center',padding:'6px 4px'}}>
                <div style={{width:56,height:48,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:500,color:'#6B6B6B',border:'1px solid #D6D6D6',background:'white',flexShrink:0}}>#{myRank-1}</div>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:14,color:'#2B2B2B',fontWeight:400}}>{brandAbove.Brand}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:400,color:'#4A4A4A',textAlign:'right' as const,letterSpacing:'-0.01em',whiteSpace:'nowrap' as const}}>+{brandAbove.GEO-geo}</div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'56px 1fr auto',gap:20,alignItems:'center',padding:'14px 4px'}}>
              <div style={{width:56,height:48,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600,color:'white',background:'#A100FF',border:'1px solid #A100FF',flexShrink:0}}>#{myRank}</div>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:20,color:'#0A0A0A',fontWeight:700}}>{result.brand_name}</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:500,color:'#A100FF',textAlign:'right' as const,letterSpacing:'-0.02em'}}>{geo}</div>
            </div>
            {brandBelow&&(
              <div style={{display:'grid',gridTemplateColumns:'56px 1fr auto',gap:20,alignItems:'center',padding:'6px 4px'}}>
                <div style={{width:56,height:48,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:500,color:'#6B6B6B',border:'1px solid #D6D6D6',background:'white',flexShrink:0}}>#{myRank+1}</div>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:14,color:'#2B2B2B',fontWeight:400}}>{brandBelow.Brand}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:400,color:'#4A4A4A',textAlign:'right' as const,letterSpacing:'-0.01em',whiteSpace:'nowrap' as const}}>−{geo-brandBelow.GEO}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Chart block */}
      <div id="competitors-chart-section" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',fontFamily:'Inter,sans-serif'}}>The field</div>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:13,color:'#6B6B6B',marginTop:3}}>Where every brand sits on the selected lens. Your brand highlighted.</div>
          </div>
          <button onClick={()=>setActiveParent(5)} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>Open Action Plan ›</button>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:20,flexWrap:'wrap' as const}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap' as const}}>
            {LENSES.map(l=>(
              <button key={l.key} onClick={()=>setCmpLens(l.key)} style={{fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,color:cmpLens===l.key?'white':'#6B6B6B',padding:'5px 11px',border:`1px solid ${cmpLens===l.key?'#A100FF':'#D6D6D6'}`,background:cmpLens===l.key?'#A100FF':'white',cursor:'pointer',whiteSpace:'nowrap' as const,transition:'all 120ms ease'}}>{l.label}</button>
            ))}
          </div>
          <div onClick={()=>isSignal&&setCmpRef((r:boolean)=>!r)} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#4A4A4A',cursor:isSignal?'pointer':'default',userSelect:'none' as const,whiteSpace:'nowrap' as const,opacity:isSignal?1:0.4}}>
            <div style={{width:32,height:18,borderRadius:999,background:cmpRef&&isSignal?'#0A0A0A':'#B8B8B8',position:'relative' as const,transition:'background 140ms',flexShrink:0}}>
              <div style={{position:'absolute' as const,width:14,height:14,borderRadius:'50%',background:'white',top:2,left:cmpRef&&isSignal?16:2,transition:'left 140ms'}}/>
            </div>
            <span>GEO Score reference</span>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'132px 1fr 80px',gap:16,padding:'0 8px 10px',borderBottom:'1px solid #E5E5E5',marginBottom:8}}>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#8E8E8E',textAlign:'right' as const,fontFamily:'Inter,sans-serif'}}>Brand</div>
          <div/>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#8E8E8E',textAlign:'right' as const,fontFamily:'Inter,sans-serif'}}>{activeLens.label}</div>
        </div>
        <div style={{position:'relative' as const,height:chartData.length*ROW_H}}>
          {chartData.map((b:any,rankIdx:number)=>{
            const val=(b as any)[activeLens.prop]||0;
            const isZebra=rankIdx%2===1;
            return (
              <div key={b.Brand} style={{position:'absolute' as const,left:0,right:0,top:rankIdx*ROW_H,height:ROW_H,display:'grid',gridTemplateColumns:'132px 1fr 80px',gap:16,alignItems:'center',padding:'0 8px',background:b.isYou?'#F5E6FF':isZebra?'#F5F5F5':'white'}}>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:13,color:b.isYou?'#0A0A0A':'#4A4A4A',fontWeight:b.isYou?700:400,textAlign:'right' as const,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{b.Brand}</div>
                <div style={{position:'relative' as const,height:22}}>
                  <div style={{position:'absolute' as const,left:0,right:0,top:'50%',height:1,background:'#E5E5E5'}}/>
                  <div style={{position:'absolute' as const,right:0,top:'50%',transform:'translateY(-50%)',width:1,height:7,background:'#D6D6D6'}}/>
                  <div style={{position:'absolute' as const,left:0,top:'50%',transform:'translateY(-50%)',width:1,height:7,background:'#D6D6D6'}}/>
                  <div style={{position:'absolute' as const,left:0,top:'50%',transform:'translateY(-50%)',height:14,width:`${val}%`,background:b.isYou?'#A100FF':'#B8B8B8',transition:'width 320ms cubic-bezier(0.2,0,0,1)'}}/>
                  {isSignal&&cmpRef&&<div style={{position:'absolute' as const,top:'50%',transform:'translateY(-50%)',left:`calc(${b.GEO}% - 2px)`,width:4,height:22,background:'#0A0A0A',transition:'left 320ms cubic-bezier(0.2,0,0,1)'}}/>}
                </div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:b.isYou?600:500,color:b.isYou?'#8600D4':'#2B2B2B',textAlign:'right' as const,letterSpacing:'-0.01em'}}>{val}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'132px 1fr 80px',gap:16,marginTop:10,padding:'0 8px'}}>
          <div/><div style={{position:'relative' as const,height:16}}>{[0,25,50,75,100].map(v=><span key={v} style={{position:'absolute' as const,top:0,left:`${v}%`,transform:'translateX(-50%)',fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:'#8E8E8E'}}>{v}</span>)}</div><div/>
        </div>
        <div style={{textAlign:'center' as const,marginTop:14,fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B6B6B',letterSpacing:'0.04em'}}>
          {activeLens.label}<span style={{color:'#8E8E8E',fontFamily:"'JetBrains Mono',monospace",fontWeight:400,marginLeft:4,fontSize:10}}>(0–100)</span>
        </div>
        <div style={{display:'flex',gap:18,marginTop:18,paddingTop:14,borderTop:'1px solid #E5E5E5',fontSize:11,color:'#6B6B6B',flexWrap:'wrap' as const,fontFamily:'Inter,sans-serif'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{display:'inline-block',width:16,height:12,background:'#A100FF'}}/> Your brand</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{display:'inline-block',width:16,height:12,background:'#B8B8B8'}}/> Other brands</div>
          <div style={{display:'flex',alignItems:'center',gap:6,opacity:isSignal&&cmpRef?1:0.35}}><span style={{display:'inline-block',width:4,height:14,background:'#0A0A0A'}}/> GEO Score (reference)</div>
        </div>
      </div>
      {/* Table block */}
      <div id="competitors-table-section" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px'}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',fontFamily:'Inter,sans-serif'}}>The field · Detailed scores</div>
          <div style={{fontFamily:'Inter,sans-serif',fontSize:13,color:'#6B6B6B',marginTop:3}}>Every brand, every signal. Click a column to sort.</div>
        </div>
        <div style={{overflowX:'auto' as const}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr>
                {([{col:'rank',label:'#'},{col:'brand',label:'Brand / URL'},{col:'geo',label:'GEO Score'},{col:'gap',label:'Gap'},{col:'visibility',label:'Visibility'},{col:'sentiment',label:'Sentiment'},{col:'prominence',label:'Prominence'},{col:'citation',label:'Citation'},{col:'sov',label:'SoV'}] as {col:string;label:string}[]).map(h=>(
                  <th key={h.col} onClick={()=>setCmpSort((s:{col:string;dir:number})=>s.col===h.col?{col:h.col,dir:s.dir*-1}:{col:h.col,dir:h.col==='rank'||h.col==='brand'?1:-1})} style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:cmpSort.col===h.col?'#6B00A8':'#8E8E8E',textAlign:h.col==='rank'||h.col==='brand'?'left' as const:'right' as const,padding:'0 14px 10px',borderBottom:'1px solid #D6D6D6',whiteSpace:'nowrap' as const,cursor:'pointer',userSelect:'none' as const}}>
                    {h.label}{cmpSort.col===h.col&&<span style={{fontSize:9,marginLeft:2}}>{cmpSort.dir===1?'▲':'▼'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((b:any,i:number)=>{
                const gap=(b as any)._gap;
                const rank=(b as any)._rank;
                const isZebra=!b.isYou&&i%2===1;
                return (
                  <tr key={b.Brand} style={{background:b.isYou?'#F5E6FF':isZebra?'#F5F5F5':'white'}}>
                    <td style={{padding:'11px 14px',textAlign:'left' as const,color:'#8E8E8E',fontFamily:"'JetBrains Mono',monospace",fontSize:11,boxShadow:b.isYou?'inset 2px 0 0 #A100FF':'none'}}>{rank}</td>
                    <td style={{padding:'11px 14px',textAlign:'left' as const}}>
                      <span style={{fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:b.isYou?700:500,color:b.isYou?'#6B00A8':'#1A1A1A'}}>{b.Brand}{b.isYou&&<span style={{display:'inline-block',fontSize:9,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#6B00A8',marginLeft:6,verticalAlign:1}}>You</span>}</span>
                      <span style={{display:'block',fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#8E8E8E',marginTop:1}}>{b.URL}</span>
                    </td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:b.isYou?600:500,color:b.isYou?'#8600D4':'#2B2B2B',letterSpacing:'-0.01em'}}>{b.GEO}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:500,color:b.isYou?'#B8B8B8':'#4A4A4A',letterSpacing:'-0.01em'}}>{b.isYou?'—':(gap>0?'+':'')+gap}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,color:'#4A4A4A'}}>{b.Vis}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,color:'#4A4A4A'}}>{b.Sen}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,color:'#4A4A4A'}}>{b.Prom}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,color:'#4A4A4A'}}>{b.Cit}</td>
                    <td style={{padding:'11px 14px',textAlign:'right' as const,color:'#4A4A4A'}}>{b.Sov}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:14,paddingTop:14,borderTop:'1px solid #E5E5E5'}}>
          <button style={{background:'none',border:'none',fontSize:11,fontWeight:500,color:'#6B6B6B',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'Inter,sans-serif'}}>↓ Export CSV</button>
        </div>
      </div>
    </div>
  );
}
