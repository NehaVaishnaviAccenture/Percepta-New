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

  const tierColor=(s:number)=>s>=80?'#00A656':s>=70?'#2563EB':s>=56?'#E8A33D':s>=45?'#E8703D':'#D62F2F';

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
    <div id="tab-competitors" className="cmpTabRoot">
      {/* Hero row */}
      <div className="cmpHeroRow">
        {/* Rank pillar — span 2 */}
        <div id="competitors-rank-pillar" className="cmpCard cmpCardSpan2">
          <div className="cmpCardHeader">
            <div className="cmpCardLabel">Where you rank · {result.ind_label||'your industry'}</div>
            <button className="cmpCardLinkBtn">See methodology ›</button>
          </div>
          <div className="cmpRankRow">
            <div className="cmpRankNumber">
              {myRank}<span className="cmpRankOrdinal">{ord(myRank)}</span>
            </div>
            <div className="cmpRankOf">
              of {allBrands.length} brands in <span className="cmpRankOfBrand">{result.ind_label||'your industry'}</span>
            </div>
          </div>
          <div className="cmpRankTagline">
            {myRank===1?'Leading the field — the threat is from below.':myRank===2?`Hold #${myRank} — the threat is from below, not above.`:`Ranked #${myRank} — room to move up.`}
          </div>
          <p className="cmpRankBody">
            {brandAbove&&<><span className="cmpRankBodyBold">{brandAbove.Brand}</span>'s lead is {(brandAbove.GEO-geo)<=6?'narrow — a real opportunity to close':'there but closeable'}. </>}
            {brandBelow&&<>Watch <span className="cmpRankBodyBold">{brandBelow.Brand}</span> at {brandBelow.GEO} — {(geo-brandBelow.GEO)<=8?'they are close behind':'your lead is comfortable'}.</>}
          </p>
        </div>
        {/* Ladder — span 1 */}
        <div id="competitors-ladder" className="cmpCard">
          <div className="cmpCardHeader">
            <div className="cmpCardLabel">The ladder</div>
            <button onClick={()=>setActiveParent(5)} className="cmpCardLinkBtn">Open Priorities ›</button>
          </div>
          <div className="cmpLadderList">
            {/* TODO: consider removing the border-left on badges entirely — the tier color
                is already communicated by the badge background/text color, and the ladder
                is short enough that the visual hierarchy reads cleanly without it.
                Removing it is likely the stronger, less cluttered answer. */}
            {brandAbove&&(
              <div className="cmpLadderRow">
                <div className="cmpLadderBadge" style={{borderLeft:`3px solid ${tierColor(brandAbove.GEO)}`}}>#{myRank-1}</div>
                <div className="cmpLadderBrandName">{brandAbove.Brand}</div>
                <div className="cmpLadderDelta">+{brandAbove.GEO-geo}</div>
              </div>
            )}
            <div className="cmpLadderRowYou">
              <div className="cmpLadderBadgeYou" style={{borderLeft:`5px solid ${tierColor(geo)}`}}>#{myRank}</div>
              <div className="cmpLadderBrandNameYou">{result.brand_name}</div>
              <div className="cmpLadderScore">{geo}</div>
            </div>
            {brandBelow&&(
              <div className="cmpLadderRow">
                <div className="cmpLadderBadge" style={{borderLeft:`3px solid ${tierColor(brandBelow.GEO)}`}}>#{myRank+1}</div>
                <div className="cmpLadderBrandName">{brandBelow.Brand}</div>
                <div className="cmpLadderDelta">−{geo-brandBelow.GEO}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Chart block */}
      <div id="competitors-chart-section" className="cmpChartCard">
        <div className="cmpChartHeaderRow">
          <div>
            <div className="cmpCardLabel">The field</div>
            <div className="cmpChartSubLabel">Where every brand sits on the selected lens. Your brand highlighted.</div>
          </div>
          <button onClick={()=>setActiveParent(5)} className="cmpCardLinkBtn">Open Priorities ›</button>
        </div>
        <div className="cmpChartControls">
          <div className="cmpLensButtons">
            {LENSES.map(l=>(
              <button key={l.key} onClick={()=>setCmpLens(l.key)} className="cmpLensBtn" style={{color:cmpLens===l.key?'white':'#6B6B6B',border:`1px solid ${cmpLens===l.key?'#A100FF':'#D6D6D6'}`,background:cmpLens===l.key?'#A100FF':'white'}}>{l.label}</button>
            ))}
          </div>
          <div className="cmpToggleRow" onClick={()=>isSignal&&setCmpRef((r:boolean)=>!r)} style={{cursor:isSignal?'pointer':'default',opacity:isSignal?1:0.4}}>
            <div className="cmpTogglePill" style={{background:cmpRef&&isSignal?'#0A0A0A':'#B8B8B8'}}>
              <div className="cmpToggleKnob" style={{left:cmpRef&&isSignal?16:2}}/>
            </div>
            <span>GEO Score reference</span>
          </div>
        </div>
        <div className="cmpChartColHeader">
          <div className="cmpChartColLabel">Brand</div>
          <div/>
          <div className="cmpChartColLabel">{activeLens.label}</div>
        </div>
        <div className="cmpChartCanvas" style={{height:chartData.length*ROW_H}}>
          {chartData.map((b:any,rankIdx:number)=>{
            const val=(b as any)[activeLens.prop]||0;
            const isZebra=rankIdx%2===1;
            return (
              <div key={b.Brand} className="cmpChartRow" style={{top:rankIdx*ROW_H,height:ROW_H,background:b.isYou?'#F5E6FF':isZebra?'#F5F5F5':'white'}}>
                <div className="cmpChartBrandName" style={{color:b.isYou?'#0A0A0A':'#4A4A4A',fontWeight:b.isYou?700:400}}>{b.Brand}</div>
                <div className="cmpChartBarArea">
                  <div className="cmpChartBarBaseline"/>
                  <div className="cmpChartBarEndTick"/>
                  <div className="cmpChartBarStartTick"/>
                  <div className="cmpChartBarFill" style={{width:`${val}%`,background:b.isYou?'#A100FF':'#B8B8B8'}}/>
                  {isSignal&&cmpRef&&<div className="cmpChartRefMarker" style={{left:`calc(${b.GEO}% - 2px)`}}/>}
                </div>
                <div className="cmpChartScore" style={{fontWeight:b.isYou?600:500,color:b.isYou?'#8600D4':'#2B2B2B'}}>{val}</div>
              </div>
            );
          })}
        </div>
        <div className="cmpChartAxis">
          <div/><div className="cmpChartAxisInner">{[0,25,50,75,100].map(v=><span key={v} className="cmpChartAxisTick" style={{left:`${v}%`}}>{v}</span>)}</div><div/>
        </div>
        <div className="cmpChartFooterLabel">
          {activeLens.label}<span className="cmpChartFooterUnit">(0–100)</span>
        </div>
        <div className="cmpChartLegend">
          <div className="cmpLegendItem"><span className="cmpLegendSwatchBrand"/> Your brand</div>
          <div className="cmpLegendItem"><span className="cmpLegendSwatchOther"/> Other brands</div>
          <div className="cmpLegendItem" style={{opacity:isSignal&&cmpRef?1:0.35}}><span className="cmpLegendSwatchRef"/> GEO Score (reference)</div>
        </div>
      </div>
      {/* Table block */}
      <div id="competitors-table-section" className="cmpTableCard">
        <div className="cmpTableHeaderBlock">
          <div className="cmpTableSectionLabel">The field · Detailed scores</div>
          <div className="cmpTableSectionSub">Every brand, every signal. Click a column to sort.</div>
        </div>
        <div className="cmpTableScroll">
          <table className="cmpDataTable">
            <thead>
              <tr>
                {([{col:'rank',label:'#'},{col:'brand',label:'Brand / URL'},{col:'geo',label:'GEO Score'},{col:'gap',label:'Gap'},{col:'visibility',label:'Visibility'},{col:'sentiment',label:'Sentiment'},{col:'prominence',label:'Prominence'},{col:'citation',label:'Citation'},{col:'sov',label:'SoV'}] as {col:string;label:string}[]).map(h=>(
                  <th key={h.col} onClick={()=>setCmpSort((s:{col:string;dir:number})=>s.col===h.col?{col:h.col,dir:s.dir*-1}:{col:h.col,dir:h.col==='rank'||h.col==='brand'?1:-1})} className="cmpTableColHeader" style={{color:cmpSort.col===h.col?'#6B00A8':'#8E8E8E',textAlign:h.col==='rank'||h.col==='brand'?'left':'right'}}>
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
                    <td className="cmpTableRankCell" style={{boxShadow:b.isYou?'inset 2px 0 0 #A100FF':'none'}}>{rank}</td>
                    <td className="cmpTableBrandCell">
                      <span className="cmpTableBrandName" style={{fontWeight:b.isYou?700:500,color:b.isYou?'#6B00A8':'#1A1A1A'}}>{b.Brand}{b.isYou&&<span className="cmpTableBrandYouChip">You</span>}</span>
                      <span className="cmpTableBrandUrl">{b.URL}</span>
                    </td>
                    <td className="cmpTableNumCell" style={{fontWeight:b.isYou?600:500,color:b.isYou?'#8600D4':'#2B2B2B'}}>{b.GEO}</td>
                    <td className="cmpTableNumCell" style={{color:b.isYou?'#B8B8B8':'#4A4A4A'}}>{b.isYou?'—':(gap>0?'+':'')+gap}</td>
                    <td className="cmpTableSignalCell">{b.Vis}</td>
                    <td className="cmpTableSignalCell">{b.Sen}</td>
                    <td className="cmpTableSignalCell">{b.Prom}</td>
                    <td className="cmpTableSignalCell">{b.Cit}</td>
                    <td className="cmpTableSignalCell">{b.Sov}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="cmpTableFooter">
          <button className="cmpExportBtn">↓ Export CSV</button>
        </div>
      </div>
    </div>
  );
}
