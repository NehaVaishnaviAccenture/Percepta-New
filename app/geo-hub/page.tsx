// v2.17.0: adjusted node colors, 10 instead of 11, adjusting headers & page widths, removed trends, redid geo score

'use client';

import React, { useState, useEffect, useRef } from 'react';

function isValidUrl(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch { return false; }
}

const BANK_KEYWORDS = ['bank','credit','savings','financial','finance','fcu','cu','federal','lending','loan','mortgage','wealth','invest','capital','citi','chase','wellsfargo','bofa','usaa','penfed','navy'];
function isBankUrl(u: string): boolean {
  if (!u) return false;
  try {
    const host = new URL(u).hostname.toLowerCase().replace(/^www\./, '');
    return BANK_KEYWORDS.some(k => host.includes(k));
  } catch { return false; }
}
const BANK_SCOPES = ['Credit Cards', 'Savings Accounts'];

function impliedScopeFromPath(urlStr: string): string | null {
  try {
    const path = new URL(urlStr).pathname.toLowerCase();
    if (!path || path === '/') return null;
    if (path.includes('credit-card') || path.includes('creditcard') || path.includes('credit_card')) return 'Credit Cards';
    if (path.includes('savings') || path.includes('hysa') || path.includes('high-yield')) return 'Savings Accounts';
    return null;
  } catch { return null; }
}
import Link from 'next/link';
import Sidebar from './Sidebar';
import GeoScoreTab from './tabs/GeoScoreTab';
import AiPresenceTab from './tabs/AiPresenceTab';
import ReachTab from './tabs/ReachTab';
import CompetitorsTab from './tabs/CompetitorsTab';
import CompetitorsByTopicTab from './tabs/CompetitorsByTopicTab';
import PromptsTestedTab from './tabs/PromptsTestedTab';
import PromptsLiveTab from './tabs/PromptsLiveTab';

import PrioritiesTab from './tabs/PrioritiesTab';
import { scoreBadge } from './lib/tiers';



const TOP_TABS = [
  {label:'Overview',subs:['GEO Score','AI Presence','Reach']},
  {label:'Competitors',subs:['Overall','By Topic']},
  {label:'Prompts',subs:['Tested Prompts','Live Prompt']},
  {label:'Priorities',subs:[]},
];

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
  const promptCount = 300;
  const [d3ScopeSelected,setD3ScopeSelected]=useState('');
  const [d3ShowCustomScope,setD3ShowCustomScope]=useState(false);
  const [d3CustomScope,setD3CustomScope]=useState('');
  const [detectedScopes,setDetectedScopes]=useState<string[]>([]);
  const [detectedScopedUrls,setDetectedScopedUrls]=useState<Record<string,string>>({});
  const [scopeDetecting,setScopeDetecting]=useState(false);
  const scopeDebounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [elapsedSec,setElapsedSec]=useState(0);
  const [analysisError,setAnalysisError]=useState<{title:string;code:string;message:string;reduceDesc:string}|null>(null);
  const [playbookActions,setPlaybookActions]=useState<any[]|null>(null);
  const [livePromptQuery,setLivePromptQuery]=useState('');
  const [livePromptHistory,setLivePromptHistory]=useState<{q:string;a:string}[]>([]);

  // Restore report from session storage on mount — actions are stored with the result.
  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved){const parsed=JSON.parse(saved);setResult(parsed);setPlaybookActions(Array.isArray(parsed.actions)&&parsed.actions.length>0?parsed.actions:null);}if(savedUrl)setUrl(savedUrl);}catch{}},[]);
  useEffect(()=>{if(loading){setElapsedSec(0);const t=setInterval(()=>setElapsedSec(s=>s+1),1000);return()=>clearInterval(t);}}, [loading]);

  // Scope detection: fires when url becomes valid; debounced 700ms
  useEffect(()=>{
    if(!isValidUrl(url)){
      setDetectedScopes([]);
      setDetectedScopedUrls({});
      setD3ScopeSelected('');
      setD3ShowCustomScope(false);
      setD3CustomScope('');
      setScopeDetecting(false);
      if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);
      return;
    }
    // Auto-select implied scope immediately (synchronous, before debounce)
    const implied=isBankUrl(url)?impliedScopeFromPath(url):null;
    if(implied) setD3ScopeSelected(implied);
    setScopeDetecting(true);
    setDetectedScopes([]);
    setDetectedScopedUrls({});
    setD3ShowCustomScope(false);
    setD3CustomScope('');
    if(!implied) setD3ScopeSelected('');
    if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);
    scopeDebounceRef.current=setTimeout(async()=>{
      try{
        const res=await fetch('/api/detect-scope',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
        const data=await res.json();
        if(data.scopes&&Array.isArray(data.scopes)) setDetectedScopes(data.scopes);
        if(data.scopedUrls&&typeof data.scopedUrls==='object') setDetectedScopedUrls(data.scopedUrls);
      }catch{}
      setScopeDetecting(false);
    },700);
    return()=>{if(scopeDebounceRef.current) clearTimeout(scopeDebounceRef.current);};
  },[url]);


  async function runAnalysis(){
    const effectiveScope=d3ScopeSelected==='+ Custom'?d3CustomScope.trim():d3ScopeSelected;
    if(!isValidUrl(url)){setError('Please enter a valid URL (e.g. citi.com)');return;}
    if(!effectiveScope){setError('Please select a scope before running the analysis.');return;}
    const scopedPath=detectedScopedUrls[d3ScopeSelected];
    const urlIsRoot=(()=>{try{const p=new URL(url).pathname;return p==='/'||p===''}catch{return false}})();
    const effectiveUrl=urlIsRoot&&scopedPath&&d3ScopeSelected!=='General'&&d3ScopeSelected!=='+ Custom'
      ?url.replace(/\/$/,'')+scopedPath:url;
    setError('');setAnalysisError(null);setLoading(true);setLoadingStep(0);setLoadingProgress(0);
    const steps = [
      { step: 0, progress: 5, delay: 200 },
      { step: 1, progress: 15, delay: 2000 },
      { step: 2, progress: 28, delay: 4000 },
      { step: 3, progress: 42, delay: 6000 },
      { step: 4, progress: 58, delay: 8000 },
      { step: 5, progress: 72, delay: 10000 },
      { step: 6, progress: 84, delay: 12000 },
      { step: 7, progress: 93, delay: 14000 },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({step,progress,delay})=>{
      timers.push(setTimeout(()=>{setLoadingStep(step);setLoadingProgress(progress);},delay));
    });
    try{
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url: effectiveUrl, promptCount, scope: effectiveScope})});
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
      } else{
        // playbook_actions come back in the same response — no second fetch needed.
        setResult(data);setActiveParent(0);setActiveSub(0);setPlaybookActions(data.actions||[]);setLivePromptHistory([]);setLivePromptQuery('');
        try{sessionStorage.setItem('geo_result',JSON.stringify(data));sessionStorage.setItem('geo_url',effectiveUrl);}catch{}
      }
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

    const SCOPE_PILLS = isBankUrl(url) ? ['General', ...BANK_SCOPES] : ['General', ...detectedScopes];

    // Implied scope: derived from URL path for bank URLs — locks all other pills
    const impliedScope = isBankUrl(url) ? impliedScopeFromPath(url) : null;

    // Effective URL: transforms root domain to scope-specific page when scope is selected
    const urlIsRootDomain = (()=>{try{const p=new URL(url).pathname;return p==='/'||p===''}catch{return false}})();
    const scopedPath = detectedScopedUrls[d3ScopeSelected];
    const previewEffectiveUrl = urlIsRootDomain && scopedPath && d3ScopeSelected !== 'General' && d3ScopeSelected !== '+ Custom'
      ? url.replace(/\/$/, '') + scopedPath
      : url;

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
          <Sidebar onNewAnalysis={()=>{setAnalysisError(null);setLoading(false);}}/>

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
                      const disabled=impliedScope!==null&&pill!==impliedScope;
                      return (
                        <div
                          id={`scan-scope-pill-${i}`}
                          className={`scanScopePill${sel?' scanScopePillSelected':''}${disabled?' scanScopePillDisabled':''}`}
                          key={pill}
                          onClick={disabled?undefined:()=>{setD3ScopeSelected(pill);setD3ShowCustomScope(false);}}
                        >
                          {pill}
                        </div>
                      );
                    })}
                    <div
                      id="scan-scope-custom"
                      className={`scanScopeCustom${d3ScopeSelected==='+ Custom'?' scanScopeCustomSelected':''}${impliedScope?' scanScopeCustomDisabled':''}`}
                      onClick={impliedScope?undefined:()=>{setD3ScopeSelected('+ Custom');setD3ShowCustomScope(true);}}
                    >
                      + Custom
                    </div>
                  </div>

                  {/* Will-analyze hint — only shows when URL will be transformed */}
                  {previewEffectiveUrl !== url && (
                    <div style={{marginTop:6,fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:10,color:'#7A7A90'}}>
                      → Will analyze <span style={{color:'#A100FF'}}>{previewEffectiveUrl.replace(/^https?:\/\//,'')}</span>
                    </div>
                  )}

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
          <Sidebar onNewAnalysis={()=>setAnalysisError(null)}/>
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
              {['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Priorities'].map((t,i)=>(
                <div id={`error-nav-item-${i}`} className="errorNavItem" key={t} style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'0 14px',display:'flex',alignItems:'center',whiteSpace:'nowrap' as const,fontFamily:'Inter,sans-serif'}}>{t}</div>
              ))}
            </div>
            {/* White canvas */}
            <div id="error-canvas" className="errorCanvas" style={{flex:1,background:'#f3f4f6',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',padding:'40px 24px'}}>
              {/* Failure card */}
              <div id="error-card" className="errorCard" style={{position:'relative',zIndex:1,width:'100%',maxWidth:560,animation:'d3fadeUp 0.35s cubic-bezier(0.20,0,0.00,1) both',boxShadow:'0 4px 32px rgba(0,0,0,0.10)'}}>
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
          <Sidebar onNewAnalysis={()=>{setLoading(false);setAnalysisError(null);}}/>

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
              {['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Priorities'].map((t,i)=>(
                <div id={`loading-nav-item-${i}`} className="loadingNavItem" key={t} style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.28)',fontFamily:'Inter,sans-serif',padding:'0 14px',display:'flex',alignItems:'center',borderBottom:'2px solid transparent',whiteSpace:'nowrap' as const}}>{t}</div>
              ))}
            </div>

            {/* White canvas */}
            <div id="loading-canvas" className="loadingCanvas" style={{flex:1,background:'#f3f4f6',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',position:'relative'}}>
              {/* Loading card */}
              <div id="loading-panel" className="loadingPanel" style={{position:'relative',zIndex:1,width:'100%',maxWidth:560,boxShadow:'0 4px 32px rgba(0,0,0,0.10)'}}>

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
                      <span id="loading-progress-pct" className="loadingProgressPct" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace",fontSize:11,fontWeight:500,color:'rgb(189, 74, 255)'}}>{loadingProgress}%</span>
                    </div>
                    <div id="loading-progress-track" className="loadingProgressTrack" style={{height:2,background:'rgba(255,255,255,0.08)',overflow:'hidden',position:'relative' as const}}>
                      <div id="loading-progress-fill" className="loadingProgressFill" style={{height:'100%',background:'rgb(161, 0, 255)',width:`${loadingProgress}%`,transition:'width 0.7s cubic-bezier(0.20,0,0.00,1)',position:'relative' as const}}>
                        <div id="loading-shimmer" className="loadingShimmer" style={{position:'absolute' as const,top:0,right:-40,width:40,height:'100%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',animation:'d3shimmer 1.8s ease-in-out infinite'}}/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* White card body */}
                <div id="loading-steps-list" className="loadingStepsList" style={{background:'#FFFFFF',border:'1px solid #E4E4EC',borderTop:'none',padding:'20px 28px 24px',display:'flex',flexDirection:'column',gap:16}}>

                  {/* Percepta GEO V1 info block — periwinkle, solid filled i icon */}
                  <div id="loading-v1-note" className="loadingV1Note" style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:'rgba(91,127,212,0.04)',border:'1px solid rgba(91,127,212,0.18)'}}>
                    <svg id="loading-v1-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0,marginTop:1}}>
                      <circle cx="8" cy="8" r="8" fill="#5B7FD4"/>
                      <circle cx="8" cy="5" r="1.1" fill="white"/>
                      <rect x="7.1" y="7.2" width="1.8" height="4.5" rx="0.9" fill="white"/>
                    </svg>
                    <div id="loading-v1-text" className="loadingV1Text">
                      <div id="loading-v1-label" className="loadingV1Label" style={{fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#5B7FD4',marginBottom:4,fontFamily:'Inter,sans-serif'}}>Percepta GEO V1</div>
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

                  {/* Nav warning — solid filled triangle */}
                  <div id="loading-nav-warning" className="loadingNavWarning" style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(245,166,35,0.05)',border:'1px solid rgba(245,166,35,0.15)',fontSize:11,color:'#3D3D50',lineHeight:1.5,fontFamily:'Inter,sans-serif'}}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                      <path d="M7.13 2.17 1.1 12.75A1.03 1.03 0 0 0 2 14.25h12a1.03 1.03 0 0 0 .9-1.5L8.87 2.17a1.03 1.03 0 0 0-1.74 0z" fill="#F5A623"/>
                      <rect x="7.1" y="5.8" width="1.8" height="3.8" rx="0.9" fill="white"/>
                      <circle cx="8" cy="11.3" r="1" fill="white"/>
                    </svg>
                    Leaving this page will cancel the analysis. Results are not saved until complete.
                  </div>

                </div>

                {/* Cancel analysis bar */}
                <button
                  id="loading-cancel-btn"
                  onClick={() => { setLoading(false); setAnalysisError(null); }}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,width:'100%',padding:'13px 24px',background:'#FFF',border:'1px solid #E4E4EC',borderTop:'1px solid #EDEDF2',cursor:'pointer',fontSize:12,fontWeight:500,color:'#A04040',fontFamily:'Inter,sans-serif'}}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="1.5" y1="1.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="1.5" x2="1.5" y2="10.5"/></svg>
                  Cancel analysis
                </button>

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
      <Sidebar
        onNewAnalysis={()=>{setResult(null);setUrl('');try{sessionStorage.clear();}catch{}}}
        breadcrumb={result?.brand_name ? {section:'Reports',label:result.brand_name} : undefined}
      />

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
              {result?.brand_known_for?.length>0&&(
                <>&nbsp;&nbsp;·&nbsp;&nbsp;<span className="orgKnownFor">Known for {(result.brand_known_for as string[]).length===1
                  ? result.brand_known_for[0]
                  : (result.brand_known_for as string[]).length===2
                    ? `${result.brand_known_for[0]} and ${result.brand_known_for[1]}`
                    : `${(result.brand_known_for as string[]).slice(0,-1).join(', ')}, and ${result.brand_known_for[result.brand_known_for.length-1]}`
                }</span></>
              )}
            </div>
          </div>
          {(result?.ind_label||d3ScopeSelected)&&<div className="orgChip">
            {(d3ScopeSelected&&d3ScopeSelected!=='+ Custom'
              ? d3ScopeSelected
              : (d3CustomScope.trim()||result?.ind_label||'')
            ).split(' ').slice(0,3).join(' ')}
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




            {activeParent===0&&activeSub===0&&<GeoScoreTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub} playbookActions={playbookActions||[]}/>}
            {activeParent===0&&activeSub===1&&<AiPresenceTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===0&&activeSub===2&&<ReachTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===0&&<CompetitorsTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===1&&activeSub===1&&<CompetitorsByTopicTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub}/>}
            {activeParent===2&&activeSub===0&&<PromptsTestedTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub} setLivePromptQuery={setLivePromptQuery}/>}
            {activeParent===2&&activeSub===1&&<PromptsLiveTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub} initialQuery={livePromptQuery} onQueryConsumed={()=>setLivePromptQuery('')} promptHistory={livePromptHistory} setPromptHistory={setLivePromptHistory}/>}
            {activeParent===3&&<PrioritiesTab result={result} resultComps={resultComps} setActiveParent={setActiveParent} setActiveSub={setActiveSub} playbookActions={playbookActions}/>}


          </div>
        </div>
      </div>
    </div>
  );
}
