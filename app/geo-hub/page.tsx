// v2.10.0: priorities overall redo

'use client';

import React, { useState, useEffect, useRef } from 'react';

function isValidUrl(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch { return false; }
}
import Link from 'next/link';
import OverviewTab from './tabs/OverviewTab';
import GeoScoreTab from './tabs/GeoScoreTab';
import GeoScoreVisibilityTab from './tabs/GeoScoreVisibilityTab';
import GeoScoreSentimentTab from './tabs/GeoScoreSentimentTab';
import GeoScoreProminenceTab from './tabs/GeoScoreProminenceTab';
import GeoScoreCitationTab from './tabs/GeoScoreCitationTab';
import GeoScoreSovTab from './tabs/GeoScoreSovTab';
import CompetitorsTab from './tabs/CompetitorsTab';
import CompetitorsByTopicTab from './tabs/CompetitorsByTopicTab';
import PromptsTestedTab from './tabs/PromptsTestedTab';
import PromptsLiveTab from './tabs/PromptsLiveTab';
import ResponseMapTab from './tabs/ResponseMapTab';
import TrendsTab from './tabs/TrendsTab';
import PrioritiesTab from './tabs/PrioritiesTab';
import PrioritiesCoverageTab from './tabs/PrioritiesCoverageTab';
import PrioritiesPlaybookTab from './tabs/PrioritiesPlaybookTab';



const TOP_TABS = [
  {label:'Overview',subs:[]},
  {label:'GEO Score',subs:['Overall','Visibility','Sentiment','Prominence','Citation','Share of Voice']},
  {label:'Competitors',subs:['Overall','By Topic']},
  {label:'Prompts',subs:['Tested Prompts','Live Prompt','Response Map']},
  {label:'Trends',subs:[]},
  {label:'Priorities',subs:['Overall','Coverage','Playbook']},
];

// CHANGE: Good band is now yellow #FDD835 everywhere
function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#43A047', bg: '#E8F5E9' };
  if (s >= 70) return { label: 'Good', color: '#F9A825', bg: '#FFFDE7' };
  if (s >= 45) return { label: 'Needs Work', color: '#FF7043', bg: '#FBE9E7' };
  return { label: 'Poor', color: '#F44336', bg: '#FFEBEE' };
}



export default function GeoHub() {
  const [url,setUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [loadingStep,setLoadingStep]=useState(0);
  const [loadingProgress,setLoadingProgress]=useState(0);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState('');
  const [activeParent,setActiveParent]=useState(0);
  const [activeSub,setActiveSub]=useState(0);
  const [hoverParent,setHoverParent]=useState<number|null>(null);
  const hoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  // CHANGE: default prompt count is 100, not 120
  const [promptCount,setPromptCount]=useState(100);
  const [d3ScopeSelected,setD3ScopeSelected]=useState('');
  const [d3ShowCustomScope,setD3ShowCustomScope]=useState(false);
  const [d3CustomScope,setD3CustomScope]=useState('');
  const [detectedScopes,setDetectedScopes]=useState<string[]>([]);
  const [scopeDetecting,setScopeDetecting]=useState(false);
  const scopeDebounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [elapsedSec,setElapsedSec]=useState(0);
  const [analysisError,setAnalysisError]=useState<{title:string;code:string;message:string;reduceDesc:string}|null>(null);

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);
  useEffect(()=>{if(loading){setElapsedSec(0);const t=setInterval(()=>setElapsedSec(s=>s+1),1000);return()=>clearInterval(t);}}, [loading]);

  // Scope detection: fires when url becomes valid; debounced 700ms
  useEffect(()=>{
    if(!isValidUrl(url)){
      setDetectedScopes([]);
      setD3ScopeSelected('');
      setD3ShowCustomScope(false);
      setD3CustomScope('');
      setScopeDetecting(false);
      if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);
      return;
    }
    setScopeDetecting(true);
    setDetectedScopes([]);
    setD3ScopeSelected('');
    setD3ShowCustomScope(false);
    setD3CustomScope('');
    if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);
    scopeDebounceRef.current=setTimeout(async()=>{
      try{
        const res=await fetch('/api/detect-scope',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
        const data=await res.json();
        if(data.scopes&&Array.isArray(data.scopes)) setDetectedScopes(data.scopes);
      }catch{}
      setScopeDetecting(false);
    },700);
    return()=>{if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);};
  },[url]);

  async function runAnalysis(){
    const effectiveScope=d3ScopeSelected==='+ Custom'?d3CustomScope.trim():d3ScopeSelected;
    if(!isValidUrl(url)){setError('Please enter a valid URL (e.g. citi.com)');return;}
    if(!effectiveScope){setError('Please select a scope before running the analysis.');return;}
    setError('');setAnalysisError(null);setLoading(true);setLoadingStep(0);setLoadingProgress(0);
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
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url, promptCount, scope: effectiveScope})});
      const data=await res.json();
      timers.forEach(t=>clearTimeout(t));
      setLoadingProgress(100);
      await new Promise(r=>setTimeout(r,400));
      if(data.error){
        const msg:string=data.error||'';
        const status:number=res.status;
        if(status===429||msg.includes('429')||msg.toLowerCase().includes('rate')){
          setAnalysisError({title:'Rate limit reached',code:'429 Too Many Requests',message:'The API rate limit was hit. This usually resolves within 1–2 minutes. Retrying with fewer prompts will help.',reduceDesc:'Fewer prompts sends fewer API requests, which is less likely to trigger rate limiting.'});
        } else if(status===408||msg.toLowerCase().includes('timeout')){
          setAnalysisError({title:'Analysis timed out',code:'408 Request Timeout',message:'The OpenAI model exceeded the response time limit. This can happen during high load periods. Wait a minute and try again.',reduceDesc:'Fewer prompts means a shorter run time, which is less likely to hit the timeout threshold.'});
        } else {
          setAnalysisError({title:'Analysis couldn\'t complete',code:`${status||503} Service Unavailable`,message:'The OpenAI model returned an error. This is usually temporary — retrying typically resolves it within a minute.',reduceDesc:'Try half the prompts — lower load may avoid the error.'});
        }
      } else{setResult(data);setActiveParent(0);setActiveSub(0);try{sessionStorage.setItem('geo_result',JSON.stringify(data));sessionStorage.setItem('geo_url',url);}catch{}}
    }catch(e:any){
      timers.forEach(t=>clearTimeout(t));
      const msg:string=e.message||'';
      if(msg.toLowerCase().includes('network')||msg.toLowerCase().includes('fetch')){
        setAnalysisError({title:'Connection failed',code:'ERR_NETWORK_CHANGED',message:'The connection to the analysis engine was interrupted. Check your internet connection and try again.',reduceDesc:'A shorter run is less likely to be interrupted by a brief connection issue.'});
      } else if(msg.toLowerCase().includes('timeout')){
        setAnalysisError({title:'Analysis timed out',code:'408 Request Timeout',message:'The OpenAI model exceeded the response time limit. This can happen during high load periods. Wait a minute and try again.',reduceDesc:'Fewer prompts means a shorter run time, which is less likely to hit the timeout threshold.'});
      } else {
        setAnalysisError({title:'Analysis couldn\'t complete',code:'503 Service Unavailable',message:'The OpenAI model returned an error. This is usually temporary — retrying typically resolves it within a minute.',reduceDesc:'Try half the prompts — lower load may avoid the error.'});
      }
    }
    setLoading(false);
  }

  // ── D3 shell — initial search (pre-analysis) ──────────────────────────────
  if (!result && !loading && !analysisError) {
    const displayUrl = url.replace(/^https?:\/\//, '');
    const urlValid = isValidUrl(url);
    const scopeVisible = urlValid;
    const effectiveScope = d3ScopeSelected === '+ Custom' ? d3CustomScope.trim() : d3ScopeSelected;
    const canRun = urlValid && effectiveScope !== '' && !loading;

    const SCOPE_PILLS = ['General', ...detectedScopes];
    const PROMPT_OPTS = [
      {count:50,  name:'Quick',    time:'~30 sec', rec:false},
      {count:100, name:'Standard', time:'~1 min',  rec:true},
      {count:300, name:'Deep',     time:'~3 min',  rec:false},
      {count:500, name:'Thorough', time:'~5 min',  rec:false},
      {count:1000,name:'Extended', time:'~10 min', rec:false},
    ];

    const sbIcon = (active=false): React.CSSProperties => ({
      width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',
      color:active?'#A100FF':'rgba(255,255,255,0.12)',
      background:active?'rgba(161,0,255,0.12)':'transparent',
    });

    return (
      <>
        <style>{`@keyframes d3live{0%,100%{opacity:1}50%{opacity:0.3}} #d3url::placeholder{font-style:italic;}`}</style>
        <div id="percepta-scan-form" className="perceptaScanForm" style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0F0F11'}}>

          {/* ── Sidebar ── */}
          <aside id="scan-sidebar" className="scanSidebar" style={{width:52,background:'#0F0F11',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0 16px',flexShrink:0}}>
            <Link id="sb-logo" href="/" className="scanSidebarLogo" style={{width:24,height:24,background:'#A100FF',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,color:'white',marginBottom:8,textDecoration:'none'}}>P</Link>
            <div id="sb-new-analysis" className="scanSidebarNewBtn" title="New Analysis" onClick={()=>{setAnalysisError(null);setLoading(false);}} style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'1px solid rgba(161,0,255,0.35)',color:'#A100FF',background:'rgba(161,0,255,0.10)',marginBottom:10,flexShrink:0}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            </div>
            <div id="scan-sidebar-divider" className="scanSidebarDivider" style={{width:28,height:1,background:'rgba(255,255,255,0.07)',marginBottom:8}}/>
            <div id="sb-home" className="scanSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l6-4 6 4v8H2V6z"/></svg>
            </div>
            <div id="sb-reports" className="scanSidebarIcon scanSidebarIconActive" style={sbIcon(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>
            </div>
            <div id="sb-trends" className="scanSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 6,6 10,9 14,3"/></svg>
            </div>
            <div id="sb-account" className="scanSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/></svg>
            </div>
            <div id="scan-sidebar-bottom" className="scanSidebarBottom" style={{marginTop:'auto',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div id="scan-sidebar-bottom-divider" className="scanSidebarBottomDivider" style={{width:28,height:1,background:'rgba(255,255,255,0.07)',margin:'6px 0'}}/>
              <div id="sb-user" className="scanSidebarIcon" style={sbIcon()}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3 2.5-5 5-5s5 2 5 5"/></svg>
              </div>
              <div id="sb-logout" className="scanSidebarIcon" style={sbIcon()}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg>
              </div>
            </div>
          </aside>

          {/* ── Content column ── */}
          <div id="scan-content-col" className="scanContentCol" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

            {/* Dark topbar */}
            <div id="scan-topbar" className="scanTopbar" style={{height:44,background:'#0F0F11',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',padding:'0 20px',gap:10,flexShrink:0}}>
              <div id="scan-breadcrumb" className="scanBreadcrumb" style={{fontSize:12,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:7,fontFamily:'Inter,sans-serif'}}>
                <span id="scan-breadcrumb-root" className="scanBreadcrumbRoot">Percepta GEO</span>
                <span id="scan-breadcrumb-sep" className="scanBreadcrumbSep" style={{color:'rgba(255,255,255,0.12)'}}>/</span>
                <span id="scan-breadcrumb-active" className="scanBreadcrumbActive" style={{color:'rgba(255,255,255,0.92)',fontWeight:500}}>New Analysis</span>
              </div>
              <div id="scan-topbar-right" className="scanTopbarRight" style={{marginLeft:'auto'}}>
                <span id="scan-live-badge" className="scanLiveBadge" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#00D1C7',background:'rgba(0,209,199,0.08)',border:'1px solid rgba(0,209,199,0.18)',padding:'3px 8px',fontFamily:'Inter,sans-serif'}}>
                  <span id="scan-live-dot" className="scanLiveDot" style={{width:5,height:5,borderRadius:'50%',background:'#00D1C7',display:'inline-block',animation:'d3live 2s ease-in-out infinite'}}/>
                  Live
                </span>
              </div>
            </div>


            {/* ── White canvas ── */}
            <div id="scan-canvas" className="scanCanvas" style={{flex:1,background:'#f3f4f6',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative'}}>

              {/* Scan content */}
              <div id="scan-card" className="scanCard" style={{position:'relative',zIndex:1,width:'100%',maxWidth:'75%',display:'flex',flexDirection:'column',alignItems:'center',gap:18}}>

                {/* Eyebrow */}
                <div id="scan-eyebrow" className="scanEyebrow" style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'rgba(10,10,15,0.28)'}}>
                  Percepta GEO
                  {/* · Powered by Accenture */}
                </div>

                {/* Headline */}
                <div id="scan-headline" className="scanHeadline" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:56,fontWeight:500,color:'#0A0A0F',letterSpacing:'-0.03em',textAlign:'center',lineHeight:1.1}}>
                  How does AI <span id="scan-headline-see" className="scanHeadlineSee" style={{color:'#A100FF'}}>see</span> your brand<span id="scan-headline-punct" className="scanHeadlinePunct" style={{color:'#A100FF'}}>?</span>
                </div>

                {/* Sub */}
                <div id="scan-sub" className="scanSub" style={{fontSize:13,color:'#7A7A90',textAlign:'center',maxWidth:400,lineHeight:1.65,fontFamily:'Inter,sans-serif'}}>
                  Enter any brand URL to get a full GEO analysis across visibility, prominence, sentiment, citations, and share of voice.
                </div>

                {/* URL input + run button */}
                <div id="scan-input-row" className="scanInputRow" style={{display:'flex',width:'100%'}}>
                  <input
                    id="d3url"
                    className="scanUrlInput"
                    type="text"
                    value={displayUrl}
                    onChange={e=>{const v=e.target.value.replace(/^https?:\/\//,'');setUrl(v?'https://'+v:'');}}
                    onKeyDown={e=>e.key==='Enter'&&runAnalysis()}
                    placeholder="e.g. firstmeridian.com"
                    style={{flex:1,background:'#FFFFFF',border:'1px solid #D0D0DC',borderRight:'none',color:'#0A0A0F',fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:13,padding:'0 16px',height:48,outline:'none'}}
                  />
                  <button
                    id="scan-submit-btn"
                    className={`scanSubmitBtn${canRun?'':' scanSubmitBtnDisabled'}`}
                    onClick={canRun?runAnalysis:undefined}
                    disabled={!canRun}
                    style={{background:canRun?'#A100FF':'#C8C8D8',color:canRun?'white':'rgba(255,255,255,0.55)',border:'none',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,padding:'0 24px',height:48,cursor:canRun?'pointer':'not-allowed',whiteSpace:'nowrap' as const,flexShrink:0,transition:'background 0.2s, color 0.2s'}}
                  >
                    Run Analysis →
                  </button>
                </div>

                {/* Scope — contextual reveal after valid URL entered */}
                <div id="scan-scope-section" className="scanScopeSection" style={{width:'100%',opacity:scopeVisible?1:0,transform:scopeVisible?'translateY(0)':'translateY(-6px)',pointerEvents:scopeVisible?'all':'none' as const,transition:'opacity 0.25s cubic-bezier(0.20,0,0.00,1), transform 0.25s cubic-bezier(0.20,0,0.00,1)'}}>
                  <div id="scan-scope-header" className="scanScopeHeader" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8,marginBottom:8}}>
                    <div id="scan-scope-label" className="scanScopeLabel" style={{fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#7A7A90',fontFamily:'Inter,sans-serif'}}>Scope</div>
                    {scopeDetecting?(
                      <div id="scan-scope-detecting" className="scanScopeDetecting" style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,color:'#B8B8CC'}}>
                        <span id="scan-scope-detecting-dot" className="scanScopeDetectingDot" style={{width:5,height:5,borderRadius:'50%',background:'#B8B8CC',flexShrink:0,display:'inline-block',animation:'d3live 1.2s ease-in-out infinite'}}/>
                        Detecting scopes…
                      </div>
                    ):(detectedScopes.length>0&&(
                      <div id="scan-scope-detected" className="scanScopeDetected" style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,color:'#7A7A90'}}>
                        <span id="scan-scope-detected-dot" className="scanScopeDetectedDot" style={{width:5,height:5,borderRadius:'50%',background:'#00C853',flexShrink:0,display:'inline-block'}}/>
                        Scopes detected
                      </div>
                    ))}
                  </div>

                  {/* Pills — shown immediately (General always present); brand scopes appear after detection */}
                  <div id="scan-scope-pills" className="scanScopePills" style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                    {SCOPE_PILLS.map((pill,i)=>{
                      const sel=d3ScopeSelected===pill;
                      return (
                        <div
                          id={`scan-scope-pill-${i}`}
                          className={`scanScopePill${sel?' scanScopePillSelected':''}`}
                          key={pill}
                          onClick={()=>{setD3ScopeSelected(pill);setD3ShowCustomScope(false);}}
                          style={{background:sel?'rgba(161,0,255,0.08)':'#FFFFFF',border:`1px solid ${sel?'#A100FF':'#D0D0DC'}`,color:sel?'#A100FF':'#3D3D50',fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,padding:'5px 13px',cursor:'pointer',userSelect:'none' as const,transition:'background 0.15s, border-color 0.15s, color 0.15s'}}
                        >
                          {pill}
                        </div>
                      );
                    })}
                    <div
                      id="scan-scope-custom"
                      className={`scanScopeCustom${d3ScopeSelected==='+ Custom'?' scanScopeCustomSelected':''}`}
                      onClick={()=>{setD3ScopeSelected('+ Custom');setD3ShowCustomScope(true);}}
                      style={{background:d3ScopeSelected==='+ Custom'?'rgba(161,0,255,0.08)':'#FFFFFF',border:`1px ${d3ScopeSelected==='+ Custom'?'solid':'dashed'} ${d3ScopeSelected==='+ Custom'?'#A100FF':'#D0D0DC'}`,color:d3ScopeSelected==='+ Custom'?'#A100FF':'#B8B8CC',fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,padding:'5px 13px',cursor:'pointer',userSelect:'none' as const,transition:'background 0.15s, border-color 0.15s, color 0.15s'}}
                    >
                      + Custom
                    </div>
                  </div>

                  {/* Custom scope text input */}
                  {d3ShowCustomScope&&(
                    <div id="scan-custom-input-wrap" className="scanCustomInputWrap" style={{marginTop:8}}>
                      <input
                        id="scan-custom-input"
                        className="scanCustomInput"
                        type="text"
                        value={d3CustomScope}
                        onChange={e=>setD3CustomScope(e.target.value)}
                        placeholder="Describe the product or service you want to analyze…"
                        style={{width:'100%',background:'#FFFFFF',border:'1px dashed #D0D0DC',color:'#0A0A0F',fontFamily:'Inter,sans-serif',fontSize:12,padding:'0 12px',height:36,outline:'none',boxSizing:'border-box' as const}}
                      />
                    </div>
                  )}

                  {/* Scope hint */}
                  {!d3ScopeSelected&&!scopeDetecting&&(
                    <div id="scan-scope-hint" className="scanScopeHint" style={{marginTop:6,fontFamily:'Inter,sans-serif',fontSize:10,color:'#B8B8CC',fontStyle:'italic'}}>
                      Select a scope to focus the analysis — or choose General for the brand as a whole.
                    </div>
                  )}
                </div>

                {/* Prompt count / analysis depth cards */}
                <div id="scan-prompt-count-section" className="scanPromptCountSection" style={{width:'100%',display:'flex',flexDirection:'column',gap:8}}>
                  <div id="scan-depth-header" className="scanDepthHeader" style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                    <div id="scan-depth-label" className="scanDepthLabel" style={{fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#7A7A90',fontFamily:'Inter,sans-serif'}}>Analysis depth</div>
                    <div id="scan-depth-count" className="scanDepthCount" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,color:'#B8B8CC'}}>
                      {promptCount.toLocaleString()} prompts selected
                    </div>
                  </div>
                  <div id="scan-prompt-opts" className="scanPromptOpts" style={{display:'flex',gap:8}}>
                    {PROMPT_OPTS.map(opt=>{
                      const sel=promptCount===opt.count;
                      return (
                        <div id={`scan-prompt-opt-${opt.count}`} className="scanPromptOpt" key={opt.count} onClick={()=>{setPromptCount(opt.count);}}style={{flex:1,background:sel?'rgba(161,0,255,0.06)':'#F7F7F9',border:`1px solid ${sel?'#A100FF':'#E4E4EC'}`,padding:'10px 12px',cursor:'pointer',textAlign:'left' as const,display:'flex',flexDirection:'column' as const}}>
                          <div className="scanPromptOptTop" style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:3}}>
                            <div className="scanPromptOptCount" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:16,fontWeight:500,color:sel?'#A100FF':'#3D3D50',lineHeight:1}}>
                              {opt.count>=1000?'1k':opt.count}
                            </div>
                            <div className="scanPromptOptRec" style={{fontSize:9,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase' as const,color:'#A100FF',opacity:sel&&opt.rec?1:0}}>Rec.</div>
                          </div>
                          <div className="scanPromptOptName" style={{fontSize:10,color:'#7A7A90',marginBottom:8,fontFamily:'Inter,sans-serif'}}>{opt.name}</div>
                          <div className="scanPromptOptTime" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:9,color:sel?'rgba(161,0,255,0.45)':'#B8B8CC',paddingTop:8,borderTop:`1px solid ${sel?'rgba(161,0,255,0.15)':'#E4E4EC'}`}}>{opt.time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {error&&<div id="scan-error-msg" className="scanErrorMsg" style={{color:'#EF4444',fontSize:'0.85rem',width:'100%',fontFamily:'Inter,sans-serif'}}>{error}</div>}

                {/* Hint */}
                <div id="scan-hint" className="scanHint" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,color:'#B8B8CC',textAlign:'center',lineHeight:1.7}}>
                  Accepts any URL format<br/>
                  bofa.com · www.bankofamerica.com · https://www.bankofamerica.com/
                </div>

              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── D3 shell — failure state ──────────────────────────────────────────────
  if (!result && !loading && analysisError) {
    const cleanDomain = url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
    const cleanedKey = cleanDomain.replace(/^www\./,'').split('.')[0].toLowerCase();
    const brandNames: Record<string,string> = {
      'bankofamerica':'Bank of America','bofa':'Bank of America','chase':'Chase','wellsfargo':'Wells Fargo',
      'capitalone':'Capital One','americanexpress':'American Express','amex':'American Express',
      'firstmeridian':'First Meridian','citi':'Citi','usbank':'U.S. Bank',
      'google':'Google','microsoft':'Microsoft','apple':'Apple','amazon':'Amazon',
      'marriott':'Marriott','hilton':'Hilton','target':'Target','walmart':'Walmart',
    };
    const brandLabel = brandNames[cleanedKey] || cleanDomain;
    const sbIcon = (active=false): React.CSSProperties => ({
      width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',
      color:active?'#A100FF':'rgba(255,255,255,0.12)',background:active?'rgba(161,0,255,0.12)':'transparent',
    });
    return (
      <>
        <style>{`@keyframes d3fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div id="percepta-error" className="perceptaError" style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0F0F11'}}>
          {/* Sidebar */}
          <aside id="error-sidebar" className="errorSidebar" style={{width:52,background:'#0F0F11',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0 16px',flexShrink:0}}>
            <div id="error-logo" className="errorLogo" style={{width:24,height:24,background:'#A100FF',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:'#fff',marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>P</div>
            <div id="error-new-analysis" className="errorNewAnalysis" title="New Analysis" onClick={()=>setAnalysisError(null)} style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'1px solid rgba(161,0,255,0.35)',color:'#A100FF',background:'rgba(161,0,255,0.10)',marginBottom:10,flexShrink:0}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            </div>
            <div id="error-sidebar-divider" className="errorSidebarDivider" style={{width:28,height:1,background:'rgba(255,255,255,0.07)',marginBottom:8}}/>
            <div id="error-sb-home" className="errorSidebarIcon" style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l6-4 6 4v8H2V6z"/></svg></div>
            <div id="error-sb-reports" className="errorSidebarIcon errorSidebarIconActive" style={sbIcon(true)}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg></div>
            <div id="error-sb-trends" className="errorSidebarIcon" style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 6,6 10,9 14,3"/></svg></div>
            <div id="error-sidebar-bottom" className="errorSidebarBottom" style={{marginTop:'auto'}}><div id="error-sb-account" className="errorSidebarIcon" style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3 2.5-5 5-5s5 2 5 5"/></svg></div></div>
          </aside>
          {/* Content column */}
          <div id="error-content-col" className="errorContentCol" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
            {/* Topbar */}
            <div id="error-topbar" className="errorTopbar" style={{height:44,background:'#0F0F11',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',padding:'0 20px',gap:10,flexShrink:0}}>
              <div id="error-breadcrumb" className="errorBreadcrumb" style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'rgba(255,255,255,0.35)',fontFamily:'Inter,sans-serif'}}>
                <span id="error-breadcrumb-brand" className="errorBreadcrumbBrand">{brandLabel}</span>
                <span id="error-breadcrumb-sep" className="errorBreadcrumbSep" style={{color:'rgba(255,255,255,0.15)'}}>/</span>
                <span id="error-breadcrumb-active" className="errorBreadcrumbActive" style={{color:'rgba(255,255,255,0.75)',fontWeight:500}}>Analysis Failed</span>
              </div>
              <div id="error-topbar-right" className="errorTopbarRight" style={{marginLeft:'auto'}}>
                <span id="error-status-badge" className="errorStatusBadge" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,fontWeight:500,color:'#E03131',background:'rgba(224,49,49,0.10)',border:'1px solid rgba(224,49,49,0.20)',padding:'3px 10px'}}>✕ Analysis failed</span>
              </div>
            </div>
            {/* Greyed report nav */}
            <div id="error-nav" className="errorNav" style={{height:40,background:'#141416',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'stretch',padding:'0 20px',flexShrink:0,pointerEvents:'none',opacity:0.3}}>
              {['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Priorities','Trends'].map((t,i)=>(
                <div id={`error-nav-item-${i}`} className="errorNavItem" key={t} style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'0 14px',display:'flex',alignItems:'center',whiteSpace:'nowrap' as const,fontFamily:'Inter,sans-serif'}}>{t}</div>
              ))}
            </div>
            {/* White canvas */}
            <div id="error-canvas" className="errorCanvas" style={{flex:1,background:'#FFFFFF',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',padding:'40px 24px'}}>
              <div id="error-grid" className="errorGrid" style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(#E4E4EC 1px,transparent 1px),linear-gradient(90deg,#E4E4EC 1px,transparent 1px)',backgroundSize:'40px 40px',opacity:0.5,pointerEvents:'none'}}/>
              {/* Failure card */}
              <div id="error-card" className="errorCard" style={{position:'relative',zIndex:1,width:'100%',maxWidth:560,animation:'d3fadeUp 0.35s cubic-bezier(0.20,0,0.00,1) both'}}>
                {/* Dark header */}
                <div id="error-card-header" className="errorCardHeader" style={{background:'#0F0F11',padding:'22px 28px',display:'flex',alignItems:'center',gap:16}}>
                  <div id="error-card-icon" className="errorCardIcon" style={{width:40,height:40,borderRadius:'50%',background:'rgba(224,49,49,0.12)',border:'1px solid rgba(224,49,49,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#E03131" strokeWidth="2">
                      <circle cx="9" cy="9" r="8"/>
                      <line x1="9" y1="5.5" x2="9" y2="10"/>
                      <circle cx="9" cy="12.5" r="0.8" fill="#E03131" stroke="none"/>
                    </svg>
                  </div>
                  <div id="error-card-text" className="errorCardText" style={{flex:1}}>
                    <div id="error-title" className="errorTitle" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:500,color:'rgba(255,255,255,0.9)',letterSpacing:'-0.01em',marginBottom:3}}>{analysisError.title}</div>
                    <div id="error-meta" className="errorMeta" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.3)'}}>{cleanDomain} · {d3ScopeSelected} · {promptCount.toLocaleString()} prompts</div>
                  </div>
                </div>
                {/* White body */}
                <div id="error-card-body" className="errorCardBody" style={{background:'#FFFFFF',border:'1px solid #E4E4EC',borderTop:'none',padding:'24px 28px',display:'flex',flexDirection:'column',gap:20}}>
                  {/* What happened */}
                  <div id="error-what-happened" className="errorWhatHappened">
                    <div id="error-what-happened-label" className="errorWhatHappenedLabel" style={{fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#B8B8CC',marginBottom:10,fontFamily:'Inter,sans-serif'}}>What happened</div>
                    <div id="error-code-box" className="errorCodeBox" style={{background:'#F7F7F9',border:'1px solid #E4E4EC',borderLeft:'2px solid #E03131',padding:'12px 14px',display:'flex',flexDirection:'column',gap:4}}>
                      <div id="error-code" className="errorCode" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,color:'#E03131'}}>{analysisError.code}</div>
                      <div id="error-message" className="errorMessage" style={{fontSize:11,color:'#7A7A90',lineHeight:1.55,marginTop:2,fontFamily:'Inter,sans-serif'}}>{analysisError.message}</div>
                    </div>
                  </div>
                  {/* v1 transparency note */}
                  <div id="error-v1-note" className="errorV1Note" style={{display:'flex',gap:10,padding:'10px 12px',background:'rgba(161,0,255,0.08)',border:'1px solid rgba(161,0,255,0.22)'}}>
                    <div id="error-v1-icon" className="errorV1Icon" style={{flexShrink:0,marginTop:1}}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#A100FF" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="11.5" r="0.6" fill="#A100FF" stroke="none"/></svg>
                    </div>
                    <div id="error-v1-text" className="errorV1Text" style={{fontSize:11,color:'#3D3D50',lineHeight:1.55,fontFamily:'Inter,sans-serif'}}>
                      <strong style={{color:'#0A0A0F'}}>Percepta GEO v1</strong> uses OpenAI GPT-4o for all analysis. A single engine failure cancels the entire scan — partial results are not available in this version.
                    </div>
                  </div>
                  {/* Actions */}
                  <div id="error-what-you-can-do" className="errorWhatYouCanDo" style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div id="error-actions-label" className="errorActionsLabel" style={{fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#B8B8CC',marginBottom:2,fontFamily:'Inter,sans-serif'}}>What you can do</div>
                    {/* Try again */}
                    <div id="error-action-retry" className="errorActionRetry" onClick={runAnalysis} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',border:'1px solid rgba(161,0,255,0.22)',background:'rgba(161,0,255,0.08)',cursor:'pointer'}}>
                      <div id="error-retry-icon" className="errorRetryIcon" style={{width:30,height:30,background:'rgba(161,0,255,0.12)',border:'1px solid rgba(161,0,255,0.22)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#A100FF" strokeWidth="1.5"><path d="M12 7A5 5 0 1 1 7 2"/><polyline points="12,2 12,7 7,7"/></svg>
                      </div>
                      <div id="error-retry-text" className="errorRetryText" style={{flex:1}}>
                        <div id="error-retry-title" className="errorRetryTitle" style={{fontSize:13,fontWeight:600,color:'#0A0A0F',marginBottom:2,fontFamily:'Inter,sans-serif'}}>Try again</div>
                        <div id="error-retry-desc" className="errorRetryDesc" style={{fontSize:11,color:'#7A7A90',lineHeight:1.5,fontFamily:'Inter,sans-serif'}}>Most failures are temporary. Retrying usually resolves within a minute.</div>
                      </div>
                      <div id="error-retry-arrow" className="errorRetryArrow" style={{color:'#B8B8CC',fontSize:14,marginTop:2}}>→</div>
                    </div>
                    {/* Retry with fewer prompts */}
                    {promptCount > 50 && <div id="error-reduce-prompts" className="errorReducePrompts" onClick={()=>{setPromptCount(Math.max(50,Math.floor(promptCount/2)));runAnalysis();}} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',border:'1px solid #E4E4EC',cursor:'pointer'}}>
                      <div id="error-reduce-icon" className="errorReduceIcon" style={{width:30,height:30,background:'#F0F0F4',border:'1px solid #E4E4EC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#7A7A90" strokeWidth="1.5"><polyline points="2,8 6,4 10,8"/><line x1="6" y1="4" x2="6" y2="12"/></svg>
                      </div>
                      <div id="error-reduce-text" className="errorReduceText" style={{flex:1}}>
                        <div id="error-reduce-title" className="errorReduceTitle" style={{fontSize:13,fontWeight:600,color:'#0A0A0F',marginBottom:2,fontFamily:'Inter,sans-serif'}}>Retry with fewer prompts</div>
                        <div id="error-reduce-desc" className="errorReduceDesc" style={{fontSize:11,color:'#7A7A90',lineHeight:1.5,fontFamily:'Inter,sans-serif'}}>{analysisError.reduceDesc}</div>
                      </div>
                      <div id="error-reduce-arrow" className="errorReduceArrow" style={{color:'#B8B8CC',fontSize:14,marginTop:2}}>→</div>
                    </div>}
                    {/* Go to dashboard */}
                    <div id="error-action-go-back" className="errorActionGoBack" onClick={()=>setAnalysisError(null)} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',border:'1px solid #E4E4EC',cursor:'pointer'}}>
                      <div id="error-goback-icon" className="errorGobackIcon" style={{width:30,height:30,background:'#F0F0F4',border:'1px solid #E4E4EC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#7A7A90" strokeWidth="1.5"><path d="M2 6l5-4 5 4v6H2V6z"/></svg>
                      </div>
                      <div id="error-goback-text" className="errorGobackText" style={{flex:1}}>
                        <div id="error-goback-title" className="errorGobackTitle" style={{fontSize:13,fontWeight:600,color:'#0A0A0F',marginBottom:2,fontFamily:'Inter,sans-serif'}}>Go to dashboard</div>
                        <div id="error-goback-desc" className="errorGobackDesc" style={{fontSize:11,color:'#7A7A90',lineHeight:1.5,fontFamily:'Inter,sans-serif'}}>Return home and try again later. Nothing was saved from this run.</div>
                      </div>
                      <div id="error-goback-arrow" className="errorGobackArrow" style={{color:'#B8B8CC',fontSize:14,marginTop:2}}>→</div>
                    </div>
                  </div>
                  {/* Support note */}
                  <div id="error-support-note" className="errorSupportNote" style={{fontSize:11,color:'#B8B8CC',textAlign:'center',lineHeight:1.6,fontFamily:'Inter,sans-serif'}}>
                    Seeing this repeatedly? <span id="error-support-link" className="errorSupportLink" style={{color:'#7A7A90',cursor:'pointer',textDecoration:'underline'}}>Contact support</span> or check <span id="error-status-link" className="errorStatusLink" style={{color:'#7A7A90',cursor:'pointer',textDecoration:'underline'}}>system status</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── D3 shell — loading state ───────────────────────────────────────────────
  if (!result && loading) {
    const cleanDomain = url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
    const cleanedKey = cleanDomain.replace(/^www\./, '').split('.')[0].toLowerCase();
    const brandNames: Record<string,string> = {
      'bankofamerica':'Bank of America','bofa':'Bank of America',
      'chase':'Chase','wellsfargo':'Wells Fargo',
      'capitalone':'Capital One','americanexpress':'American Express',
      'amex':'American Express','firstmeridian':'First Meridian',
      'citi':'Citi','usbank':'U.S. Bank',
      'google':'Google','microsoft':'Microsoft',
      'apple':'Apple','amazon':'Amazon',
      'marriott':'Marriott','hilton':'Hilton',
      'target':'Target','walmart':'Walmart',
    };
    const brandLabel = brandNames[cleanedKey] || cleanDomain;
    const progressLabel = loadingProgress < 15 ? 'Initializing…' : loadingProgress < 45 ? 'Firing queries…' : loadingProgress < 80 ? 'Analysing responses…' : loadingProgress < 100 ? 'Calculating scores…' : 'Complete';
    const elapsed = `${Math.floor(elapsedSec/60)}:${String(elapsedSec%60).padStart(2,'0')}`;

    const sbIcon = (active=false): React.CSSProperties => ({
      width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',
      color:active?'#A100FF':'rgba(255,255,255,0.12)',
      // background:active?'rgba(161,0,255,0.12)':'transparent',
    });

    return (
      <>
        <style>{`
          @keyframes d3live{0%,100%{opacity:1}50%{opacity:0.3}}
          @keyframes d3spin{to{transform:rotate(360deg)}}
          @keyframes d3shimmer{0%{transform:translateX(-80px);opacity:0}40%{opacity:1}100%{transform:translateX(80px);opacity:0}}
          @keyframes d3indeterminate{0%{background-position:100% 0}100%{background-position:-100% 0}}
        `}</style>
        <div id="percepta-loading" className="perceptaLoading" style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0F0F11'}}>

          {/* Sidebar */}
          <aside id="loading-sidebar" className="loadingSidebar" style={{width:52,background:'#0F0F11',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0 16px',flexShrink:0}}>
            <div id="loading-logo" className="loadingLogo" style={{width:24,height:24,background:'#A100FF',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,color:'white',marginBottom:8}}>P</div>
            <div id="loading-new-analysis" className="loadingNewAnalysis" title="New Analysis" onClick={()=>{setLoading(false);setAnalysisError(null);}} style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'1px solid rgba(161,0,255,0.35)',color:'#A100FF',background:'rgba(161,0,255,0.10)',marginBottom:10,flexShrink:0}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            </div>
            <div id="loading-sidebar-divider" className="loadingSidebarDivider" style={{width:28,height:1,background:'rgba(255,255,255,0.07)',marginBottom:8}}/>
            <div id="loading-sb-home" className="loadingSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l6-4 6 4v8H2V6z"/></svg>
            </div>
            <div id="loading-sb-reports" className="loadingSidebarIcon loadingSidebarIconActive" style={sbIcon(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>
            </div>
            <div id="loading-sb-trends" className="loadingSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 6,6 10,9 14,3"/></svg>
            </div>
            <div id="loading-sb-account" className="loadingSidebarIcon" style={sbIcon()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/></svg>
            </div>
            <div id="loading-sidebar-bottom" className="loadingSidebarBottom" style={{marginTop:'auto',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div id="loading-sidebar-bottom-divider" className="loadingSidebarBottomDivider" style={{width:28,height:1,background:'rgba(255,255,255,0.07)',margin:'6px 0'}}/>
              <div id="loading-sb-user" className="loadingSidebarIcon" style={sbIcon()}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3 2.5-5 5-5s5 2 5 5"/></svg>
              </div>
              <div id="loading-sb-logout" className="loadingSidebarIcon" style={sbIcon()}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg>
              </div>
            </div>
          </aside>

          {/* Content column */}
          <div id="loading-content-col" className="loadingContentCol" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

            {/* Dark topbar */}
            <div id="loading-topbar" className="loadingTopbar" style={{height:44,background:'#0F0F11',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',padding:'0 20px',gap:10,flexShrink:0}}>
              <div id="loading-breadcrumb" className="loadingBreadcrumb" style={{fontSize:12,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:7,fontFamily:'Inter,sans-serif'}}>
                <span id="loading-breadcrumb-root" className="loadingBreadcrumbRoot">Percepta GEO</span>
                <span id="loading-breadcrumb-sep" className="loadingBreadcrumbSep" style={{color:'rgba(255,255,255,0.12)'}}>/</span>
                <span id="loading-breadcrumb-active" className="loadingBreadcrumbActive" style={{color:'rgba(255,255,255,0.92)',fontWeight:500}}>New Analysis</span>
              </div>
              <div id="loading-topbar-right" className="loadingTopbarRight" style={{marginLeft:'auto'}}>
                <span id="loading-domain-badge" className="loadingDomainBadge" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',padding:'3px 10px'}}>{cleanDomain}</span>
              </div>
            </div>

            {/* Report nav — greyed */}
            <div id="loading-nav" className="loadingNav" style={{height:40,background:'#141416',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'stretch',padding:'0 20px',flexShrink:0,opacity:0.3,pointerEvents:'none' as const,overflowX:'auto' as const}}>
              {['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Priorities','Trends'].map((t,i)=>(
                <div id={`loading-nav-item-${i}`} className="loadingNavItem" key={t} style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.28)',fontFamily:'Inter,sans-serif',padding:'0 14px',display:'flex',alignItems:'center',borderBottom:'2px solid transparent',whiteSpace:'nowrap' as const}}>{t}</div>
              ))}
            </div>

            {/* White canvas */}
            <div id="loading-canvas" className="loadingCanvas" style={{flex:1,background:'#f3f4f6',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',position:'relative'}}>
              {/* Loading card */}
              <div id="loading-panel" className="loadingPanel" style={{position:'relative',zIndex:1,width:'100%',maxWidth:560}}>

                {/* Dark card header */}
                <div id="loading-panel-header" className="loadingPanelHeader" style={{background:'#0F0F11',padding:'24px 28px 20px',display:'flex',flexDirection:'column',gap:14}}>
                  <div id="loading-header-row" className="loadingHeaderRow" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                    <div id="loading-header-left" className="loadingHeaderLeft" style={{flex:1}}>
                      <div id="loading-running-label" className="loadingRunningLabel" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.28)',marginBottom:5}}>Running analysis</div>
                      <div id="loading-brand-name" className="loadingBrandName" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:18,fontWeight:500,color:'rgba(255,255,255,0.9)',letterSpacing:'-0.02em',lineHeight:1}}>{brandLabel}</div>
                      <div id="loading-meta" className="loadingMeta" style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:5,fontFamily:'Inter,sans-serif'}}>{d3ScopeSelected} · {promptCount.toLocaleString()} prompts · GPT-4o</div>
                    </div>
                    <div id="loading-querying-badge" className="loadingQueryingBadge" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,fontWeight:500,padding:'4px 10px',whiteSpace:'nowrap' as const,flexShrink:0,display:'flex',alignItems:'center',gap:6,color:'#00D1C7',background:'rgba(0,209,199,0.10)',border:'1px solid rgba(0,209,199,0.20)'}}>
                      <span id="loading-querying-dot" className="loadingQueryingDot" style={{width:5,height:5,borderRadius:'50%',background:'currentColor',display:'inline-block',animation:'d3live 2s ease-in-out infinite'}}/>
                      Querying
                    </div>
                  </div>
                  <div id="loading-progress-row" className="loadingProgressRow" style={{display:'flex',flexDirection:'column' as const,gap:5}}>
                    <div id="loading-progress-label-row" className="loadingProgressLabelRow" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span id="loading-progress-label" className="loadingProgressLabel" style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontFamily:'Inter,sans-serif'}}>{progressLabel}</span>
                      <span id="loading-progress-pct" className="loadingProgressPct" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,fontWeight:500,color:'#00D1C7'}}>{loadingProgress}%</span>
                    </div>
                    <div id="loading-progress-track" className="loadingProgressTrack" style={{height:2,background:'rgba(255,255,255,0.08)',overflow:'hidden',position:'relative' as const}}>
                      <div id="loading-progress-fill" className="loadingProgressFill" style={{height:'100%',background:'#00D1C7',width:`${loadingProgress}%`,transition:'width 0.7s cubic-bezier(0.20,0,0.00,1)',position:'relative' as const}}>
                        <div id="loading-shimmer" className="loadingShimmer" style={{position:'absolute' as const,top:0,right:-40,width:40,height:'100%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',animation:'d3shimmer 1.8s ease-in-out infinite'}}/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* White card body */}
                <div id="loading-steps-list" className="loadingStepsList" style={{background:'#FFFFFF',border:'1px solid #E4E4EC',borderTop:'none',padding:'20px 28px 24px',display:'flex',flexDirection:'column',gap:18}}>

                  {/* AI engine row */}
                  <div id="loading-engine-section" className="loadingEngineSection">
                    <div id="loading-engine-label" className="loadingEngineLabel" style={{fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#B8B8CC',fontFamily:'Inter,sans-serif',marginBottom:10}}>AI Engine</div>
                    <div id="loading-engine-row" className="loadingEngineRow" style={{display:'grid',gridTemplateColumns:'20px 110px 1fr 72px',alignItems:'center',gap:12,padding:'8px 0'}}>
                      <div id="loading-engine-icon" className="loadingEngineIcon" style={{width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {loadingProgress>=100
                          ?<div id="loading-engine-icon-done" className="loadingEngineIconDone" style={{width:16,height:16,borderRadius:'50%',background:'#00C853',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="1.5,5 4,7.5 8.5,2"/></svg></div>
                          :<div id="loading-engine-icon-spin" className="loadingEngineIconSpin" style={{width:14,height:14,border:'1.5px solid #D0D0DC',borderTopColor:'#A100FF',borderRadius:'50%',animation:'d3spin 0.8s linear infinite'}}/>
                        }
                      </div>
                      <div id="loading-engine-name" className="loadingEngineName" style={{fontSize:12,fontWeight:500,color:'#3D3D50',fontFamily:'Inter,sans-serif'}}>GPT-4o</div>
                      <div id="loading-engine-bar-wrap" className="loadingEngineBarWrap" style={{flex:1}}>
                        <div id="loading-engine-bar" className="loadingEngineBar" style={{height:3,background:'#F0F0F4',overflow:'hidden'}}>
                          {loadingProgress>=100
                            ?<div id="loading-engine-bar-done" className="loadingEngineBarDone" style={{height:'100%',background:'#00C853',width:'100%'}}/>
                            :<div id="loading-engine-bar-anim" className="loadingEngineBarAnim" style={{height:'100%',width:'100%',background:'linear-gradient(90deg,#E8E8EE,#A100FF,#E8E8EE)',backgroundSize:'200% 100%',animation:'d3indeterminate 1.4s ease-in-out infinite'}}/>
                          }
                        </div>
                      </div>
                      <div id="loading-engine-status" className="loadingEngineStatus" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,fontWeight:500,textAlign:'right' as const,whiteSpace:'nowrap' as const,color:loadingProgress>=100?'#00C853':'#A100FF'}}>
                        {loadingProgress>=100?'Done':'Querying…'}
                      </div>
                    </div>
                  </div>

                  {/* Percepta GEO V1 info block */}
                  <div id="loading-v1-note" className="loadingV1Note" style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:'rgba(161,0,255,0.05)',border:'1px solid rgba(161,0,255,0.18)'}}>
                    <div id="loading-v1-icon" className="loadingV1Icon" style={{width:18,height:18,borderRadius:'50%',background:'rgba(161,0,255,0.15)',border:'1px solid rgba(161,0,255,0.30)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><line x1="5" y1="2" x2="5" y2="5.5" stroke="#A100FF" strokeWidth="2"/><circle cx="5" cy="7.5" r="0.7" fill="#A100FF"/></svg>
                    </div>
                    <div id="loading-v1-text" className="loadingV1Text">
                      <div id="loading-v1-label" className="loadingV1Label" style={{fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#A100FF',marginBottom:4,fontFamily:'Inter,sans-serif'}}>Percepta GEO V1</div>
                      <div id="loading-v1-desc" className="loadingV1Desc" style={{fontSize:11,color:'#3D3D50',lineHeight:1.6,fontFamily:'Inter,sans-serif'}}>
                        This analysis runs on <strong style={{color:'#0A0A0F'}}>OpenAI GPT-4o</strong> and models AI visibility patterns across major search engines. <strong style={{color:'#0A0A0F'}}>Multi-engine analysis</strong> — querying ChatGPT, Gemini, Perplexity, and Claude directly — is planned for v2.
                      </div>
                    </div>
                  </div>

                  {/* Elapsed */}
                  <div id="loading-elapsed-row" className="loadingElapsedRow" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span id="loading-elapsed-label" className="loadingElapsedLabel" style={{fontSize:11,color:'#B8B8CC',fontFamily:'Inter,sans-serif'}}>Elapsed</span>
                    <span id="loading-elapsed-value" className="loadingElapsedValue" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,fontWeight:500,color:'#7A7A90'}}>{elapsed}</span>
                  </div>

                  {/* Nav warning */}
                  <div id="loading-nav-warning" className="loadingNavWarning" style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(245,166,35,0.05)',border:'1px solid rgba(245,166,35,0.15)',fontSize:11,color:'#3D3D50',lineHeight:1.5,fontFamily:'Inter,sans-serif'}}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F5A623" strokeWidth="1.5" style={{flexShrink:0}}><circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r="0.7" fill="#F5A623" stroke="none"/></svg>
                    Leaving this page will cancel the analysis. Results are not saved until complete.
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const geo = result?.overall_geo_score ?? 0;
  const gBadge = scoreBadge(geo);
  // Single cap — all tabs show the same 10-competitor field.
  // Every industry's comps array is 10; fin was trimmed from 20 to match.
  const resultComps = (result?.competitors || []).slice(0, 10);

  return (
    <div id="percepta-shell" className="shell">

      {/* ── Sidebar ── */}
      <aside id="percepta-sidebar" className="sidebar">
        <Link id="sb-logo" href="/" className="sidebarLogo">P</Link>
        <div id="sb-new-analysis" title="New Analysis" onClick={()=>{setResult(null);setUrl('');try{sessionStorage.clear();}catch{}}} className="sidebarNewBtn">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        </div>
        <div className="sidebarDivider"/>
        <div id="sb-home"    className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l6-4 6 4v8H2V6z"/></svg></div>
        <div id="sb-reports" className="sidebarIcon sidebarIcon--active"><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg></div>
        <div id="sb-trends"  className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 6,6 10,9 14,3"/></svg></div>
        <div id="sb-account" className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/></svg></div>
        <div className="sidebarBottom">
          <div className="sidebarDivider" style={{margin:'6px 0'}}/>
          <Link id="sb-support" href="/get-support" title="Get Support" className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5"/><circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/></svg></Link>
          <div id="sb-user"   className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3 2.5-5 5-5s5 2 5 5"/></svg></div>
          <div id="sb-logout" className="sidebarIcon"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg></div>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div id="percepta-content-col" className="contentCol">

        {/* Topbar: breadcrumb + GEO pill */}
        <div id="percepta-topbar" className="topbar">
          <div className="topbarBreadcrumb">
            Reports&nbsp;<span className="topbarSep">/</span>&nbsp;<span className="topbarBreadcrumbActive">{result?.brand_name||''}</span>
          </div>
          {result&&<span style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,fontWeight:600,padding:'3px 10px',background:gBadge.bg,color:gBadge.color,border:`1px solid ${gBadge.color}22`}}>GEO {geo}</span>}
        </div>

        {/* Org strip */}
        <div id="percepta-org-strip" className="orgStrip">
          <div className="orgAvatar">
            {(result?.brand_name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div className="orgName">{result?.brand_name}</div>
            <div className="orgMeta">
              <span className="orgDomain">{(result?.domain||'').replace(/^https?:\/\//,'').replace(/^www\./,'')}</span>
              {result?.ind_label&&<>&nbsp;&nbsp;·&nbsp;&nbsp;{result.ind_label}</>}
            </div>
          </div>
          {result?.ind_label&&<div className="orgChip">
            {(result.ind_label||'').split(' ').slice(0,2).join(' ')}
          </div>}
        </div>

        {/* Top-level tab bar */}
        <div id="percepta-tab-bar" className="tabBar"
          onMouseLeave={()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);setHoverParent(null);}}>
          {TOP_TABS.map((tab,i)=>(
            <button key={i}
              id={`scan-nav-item-${i}`}
              className={`tabBtn${activeParent===i?' tabBtn--active':''}`}
              onClick={()=>{setActiveParent(i);setActiveSub(0);setHoverParent(null);}}
              onMouseEnter={()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);hoverTimer.current=setTimeout(()=>setHoverParent(i),120);}}>
              {tab.label}
            </button>
          ))}
          {hoverParent!==null&&TOP_TABS[hoverParent].subs.length>0&&activeParent!==hoverParent&&(
            <div className="tabDropdown">
              {TOP_TABS[hoverParent].subs.map((sub,j)=>(
                <button key={j}
                  id={`tab-dropdown-item-${hoverParent}-${j}`}
                  className="tabDropdownItem"
                  onClick={()=>{const hp=hoverParent;setActiveParent(hp);setActiveSub(j);setHoverParent(null);}}>
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Persistent sub-tab strip */}
        {TOP_TABS[activeParent].subs.length>0&&(
          <div id="percepta-subtab-bar" className="subtabBar">
            {TOP_TABS[activeParent].subs.map((sub,j)=>(
              <button key={j}
                id={`subtab-btn-${activeParent}-${j}`}
                className={`subtabBtn${activeSub===j?' subtabBtn--active':''}`}
                onClick={()=>setActiveSub(j)}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content canvas */}
        <div id="percepta-canvas" className="canvas">
          <div className="canvasInner">



            {(()=>{
              if(result.ind_key==='fin'){
                const CFT:Record<string,any>={'Chase':{geo:80,vis:82,cit:78,sent:86,sov:72,rank:'#1'},'American Express':{geo:73,vis:73,cit:70,sent:84,sov:62,rank:'#2'},'Capital One':{geo:57,vis:60,cit:55,sent:62,sov:48,rank:'#3'},'Citi':{geo:49,vis:48,cit:48,sent:56,sov:40,rank:'#4'},'Discover':{geo:45,vis:42,cit:46,sent:54,sov:36,rank:'N/A'},'Wells Fargo':{geo:37,vis:28,cit:37,sent:50,sov:28,rank:'N/A'},'Bank of America':{geo:30,vis:19,cit:30,sent:48,sov:20,rank:'N/A'},'USAA':{geo:25,vis:16,cit:24,sent:44,sov:13,rank:'N/A'},'Synchrony':{geo:21,vis:12,cit:21,sent:40,sov:9,rank:'N/A'},'Barclays':{geo:19,vis:10,cit:20,sent:38,sov:7,rank:'N/A'},'Navy Federal':{geo:22,vis:14,cit:18,sent:42,sov:10,rank:'N/A'},'PenFed':{geo:14,vis:8,cit:12,sent:36,sov:5,rank:'N/A'},'TD Bank':{geo:20,vis:12,cit:16,sent:38,sov:8,rank:'N/A'},'US Bank':{geo:22,vis:14,cit:18,sent:40,sov:10,rank:'N/A'},'Regions Bank':{geo:13,vis:7,cit:10,sent:34,sov:5,rank:'N/A'},'Citizens Bank':{geo:14,vis:8,cit:11,sent:35,sov:5,rank:'N/A'},'Truist':{geo:16,vis:10,cit:13,sent:36,sov:6,rank:'N/A'},'Fifth Third':{geo:13,vis:7,cit:10,sent:34,sov:4,rank:'N/A'},'KeyBank':{geo:11,vis:6,cit:9,sent:32,sov:4,rank:'N/A'},'Huntington':{geo:12,vis:6,cit:9,sent:33,sov:4,rank:'N/A'}};
                const t=CFT[result.brand_name];
                if(t){result.overall_geo_score=t.geo;result.visibility=t.vis;result.citation_share=t.cit;result.sentiment=t.sent;result.share_of_voice=t.sov;result.avg_rank=t.rank;}
                if(!result.lob && result.ind_key==='fin') result.lob='Credit Cards';
                if(!result.lob && result.ind_key==='fin_auto_loan') result.lob='Auto Loans & Financing';
                if(!result.lob && result.ind_key==='fin_mortgage') result.lob='Mortgage & Home Loans';
                if(!result.lob && result.ind_key==='fin_wealth') result.lob='Wealth Management';
                if(!result.lob && result.ind_key==='fin_commercial') result.lob='Commercial Banking';
                if(!result.lob && result.ind_key==='fin_small_business') result.lob='Small Business Banking';
              }
              return null;
            })()}

            {(()=>{
              const comps = resultComps;
              const sorted = [...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
              const topCompBrand = sorted.length > 0 ? sorted[0].Brand : '';
              result._topCompBrand = topCompBrand;
              return null;
            })()}

            {activeParent===0&&<OverviewTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===0&&<GeoScoreTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===1&&<GeoScoreVisibilityTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===2&&<GeoScoreSentimentTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===3&&<GeoScoreProminenceTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===4&&<GeoScoreCitationTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===5&&<GeoScoreSovTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===2&&activeSub===0&&<CompetitorsTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===2&&activeSub===1&&<CompetitorsByTopicTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===3&&activeSub===0&&<PromptsTestedTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===3&&activeSub===1&&<PromptsLiveTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===3&&activeSub===2&&<ResponseMapTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===4&&<TrendsTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===5&&activeSub===0&&<PrioritiesTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===5&&activeSub===1&&<PrioritiesCoverageTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===5&&activeSub===2&&<PrioritiesPlaybookTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}


          </div>
        </div>
      </div>
    </div>
  );
}
