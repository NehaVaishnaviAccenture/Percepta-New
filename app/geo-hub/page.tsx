'use client';

import { useState } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

function scoreBadge(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (score >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (score >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s => dl.includes(s))) return { label: 'Social', color: '#7C3AED', bg: '#EDE9FE' };
  if (['wikipedia','gov','edu','consumerreports','bbb.org','federalreserve','fdic'].some(s => dl.includes(s))) return { label: 'Institution', color: '#1E40AF', bg: '#DBEAFE' };
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters'].some(s => dl.includes(s))) return { label: 'Earned Media', color: '#065F46', bg: '#D1FAE5' };
  return { label: 'Other', color: '#374151', bg: '#F3F4F6' };
}

const TABS = ['GEO Score', 'Competitors', 'Visibility', 'Sentiment', 'Citations', 'Prompts', 'Recommendations', 'Live Prompt'];

export default function GeoHub() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [promptInput, setPromptInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<{ q: string; a: string }[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');

  async function runAnalysis() {
    if (!url.trim() || !url.startsWith('http')) { setError('Please enter a valid URL starting with http:// or https://'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/geo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); setActiveTab(0); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function runPrompt() {
    if (!promptInput.trim()) return;
    setPromptLoading(true);
    try {
      const res = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptInput }) });
      const data = await res.json();
      setPromptHistory(h => [{ q: promptInput, a: data.response }, ...h]);
      setPromptInput('');
    } catch {}
    setPromptLoading(false);
  }

  const mc = (label: string, val: any, sub: string, tip = '', color = '#7C3AED') => (
    <div style={{ background: 'white', borderRadius: 10, padding: '18px 16px', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 3 }}>{sub}</div>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* HERO */}
      <div style={{
        background: 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)',
        padding: '64px 40px 72px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 50,
          padding: '8px 24px', fontSize: '0.82rem', fontWeight: 600,
          color: 'white', marginBottom: 32, background: 'rgba(255,255,255,0.15)',
        }}>
          ✦ &nbsp;Real Time GEO Scoring
        </div>
        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
          GEO Scorecard
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 20px' }}>
          Enter any brand URL · Discover your brand&apos;s AI presence
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50,
          padding: '8px 22px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)',
          background: 'rgba(255,255,255,0.12)',
        }}>
          ⏱ &nbsp;Live data · Updated in real-time · Not cached like competitors
        </div>
      </div>

      {!result ? (
        <div style={{ padding: '48px 40px 60px' }}>
          {/* Score Bands */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24, marginBottom: 40 }}>
            {bands.map((b, i) => (
              <div key={i} style={{
                background: b.bg, borderRadius: 20, padding: '36px 28px',
                textAlign: 'center', border: `1.5px solid ${b.border}`,
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: b.color, marginBottom: 8 }}>{b.range}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: b.color, marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontSize: '0.85rem', color: b.color, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Input Card */}
          <div style={{
            background: 'white', borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            padding: '28px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.14em', color: '#9CA3AF', textTransform: 'uppercase' as const }}>
                Brand URL
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAnalysis()}
                placeholder="https://www.capitalone.com/"
                style={{
                  flex: 1, borderRadius: 12, border: '1.5px solid #E5E7EB',
                  padding: '14px 20px', fontSize: '0.95rem', height: 52,
                  background: 'white', outline: 'none', color: '#374151',
                  boxSizing: 'border-box' as const,
                }}
              />
              <button
                onClick={runAnalysis}
                disabled={loading}
                style={{
                  background: '#7C3AED', color: 'white', border: 'none',
                  borderRadius: 50, fontWeight: 700, fontSize: '0.95rem',
                  height: 52, padding: '0 28px', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                  whiteSpace: 'nowrap' as const, display: 'flex',
                  alignItems: 'center', gap: 8, flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                🔍 {loading ? 'Analysing...' : 'Run Live AI Analysis'}
              </button>
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: 10 }}>{error}</div>}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 0 40px' }}>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #E5E7EB', background: 'white', display: 'flex', padding: '0 40px', gap: 4 }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === i ? '2px solid #7C3AED' : '2px solid transparent',
                color: activeTab === i ? '#7C3AED' : '#6B7280',
                fontWeight: activeTab === i ? 700 : 500,
                fontSize: '0.85rem', padding: '12px 20px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t}
              </button>
            ))}
            <button
              onClick={() => { setResult(null); setUrl(''); }}
              style={{
                marginLeft: 'auto', background: 'none', border: '1px solid #E5E7EB',
                borderRadius: 8, color: '#6B7280', fontSize: '0.78rem',
                padding: '6px 14px', cursor: 'pointer', alignSelf: 'center',
              }}
            >
              ← New Analysis
            </button>
          </div>

          <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>

            {/* TAB 0: GEO Score */}
            {activeTab === 0 && (() => {
              const geo = result.overall_geo_score;
              const badge = scoreBadge(geo);
              const vis = result.visibility; const cit = result.citation_share;
              const sent = result.sentiment; const prom = result.prominence;
              const sov = result.share_of_voice; const avgRank = result.avg_rank;
              const top10 = [
                { Brand: result.brand_name, URL: result.domain, GEO: geo, Vis: vis, Cit: cit, Sen: sent, Sov: sov, Rank: avgRank, isYou: true },
                ...(result.competitors || []).map((c: any) => ({ ...c, isYou: false }))
              ].sort((a, b) => b.GEO - a.GEO);
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
                    {/* Gauge */}
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, textAlign: 'center' }}>
                      <div style={{ position: 'relative', marginBottom: 16 }}>
                        <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 220, margin: '0 auto', display: 'block' }}>
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F3F4F6" strokeWidth="16" strokeLinecap="round" />
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#7C3AED" strokeWidth="16" strokeLinecap="round"
                            strokeDasharray={`${(geo / 100) * 251.2} 251.2`} />
                          <text x="100" y="95" textAnchor="middle" style={{ fontSize: 32, fontWeight: 900, fill: '#7C3AED' }}>{geo}</text>
                          <text x="100" y="112" textAnchor="middle" style={{ fontSize: 11, fill: '#9CA3AF' }}>out of 100</text>
                        </svg>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>{result.brand_name}</div>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 50, padding: '5px 18px', fontSize: '0.82rem', fontWeight: 700 }}>{badge.label}</span>
                    </div>
                    {/* Summary */}
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24 }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontSize: '0.82rem' }}>
                        {result.page_url?.slice(0, 70)}{result.page_url?.length > 70 ? '...' : ''}
                      </a>
                      <div style={{ margin: '12px 0' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '4px 14px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 700 }}>{badge.label}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                        GEO Score {geo} · Visibility {vis}% · Citation {cit} · Sentiment {sent} · Prominence {prom} · Share of Voice {sov}
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {mc('Visibility Score', `${vis}%`, 'AI response presence')}
                    {mc('Citation Score', cit, 'Source authority')}
                    {mc('Sentiment Score', sent, 'Brand perception', '', '#10B981')}
                    {mc('Avg. Rank', avgRank, 'AI mention position', '', '#3B82F6')}
                  </div>

                  {/* Competitor Table */}
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>{result.domain} vs Competitors — {result.ind_label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Real-time GEO scores. Highlighted row is you.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                          {['#', 'Brand', 'GEO', 'Visibility', 'Citation', 'Sentiment', 'Share of Voice', 'Avg Rank'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {top10.map((c: any, i: number) => {
                          const gcol = c.GEO >= 80 ? '#10B981' : c.GEO >= 60 ? '#F59E0B' : '#EF4444';
                          return (
                            <tr key={i} style={{ background: c.isYou ? '#F5F3FF' : i % 2 === 0 ? 'white' : '#FAFAFA', borderLeft: c.isYou ? '3px solid #7C3AED' : 'none' }}>
                              <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: c.isYou ? 700 : 400, color: '#111827' }}>
                                  {c.Brand} {c.isYou && <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>You</span>}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.URL}</div>
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '0.88rem', fontWeight: 700, color: gcol }}>{c.GEO}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Vis}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Cit}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sen}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Sov}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#374151' }}>{c.Rank}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 1: Competitors */}
            {activeTab === 1 && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                <p style={{ color: '#6B7280' }}>Competitor breakdown is shown in the GEO Score tab.</p>
              </div>
            )}

            {/* TAB 2: Visibility */}
            {activeTab === 2 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {mc('Visibility Score', `${result.visibility}%`, `Appeared in ${result.responses_with_brand} of 20 queries`)}
                  {mc('Average Rank', result.avg_rank, 'Position when mentioned')}
                  {mc('Query Appearances', `${result.responses_with_brand}/20`, 'Out of 20 generic industry queries')}
                </div>
                {(result.internal_links || []).length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Page Intelligence</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Which pages of {result.domain} are being cited by AI.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>
                          {['Page', 'Path', 'Status'].map(h => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(result.internal_links || []).slice(0, 8).map((lk: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: 600, color: '#111827' }}>{lk.label}</td>
                            <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#9CA3AF' }}>{lk.path}</td>
                            <td style={{ padding: '10px 14px' }}><span style={{ background: '#F3F4F6', color: '#9CA3AF', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>Detected</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Sentiment */}
            {activeTab === 3 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {mc('Sentiment Score', result.sentiment, result.sentiment >= 70 ? 'Positive — AI speaks favorably' : result.sentiment >= 45 ? 'Neutral — room to improve' : 'Needs attention', '', '#10B981')}
                  {mc('Prominence Score', result.prominence, result.prominence >= 70 ? 'Named first — strong prominence' : result.prominence >= 45 ? 'Mid-list mentions' : 'Buried in responses')}
                  {mc('Average Rank', result.avg_rank, 'Average mention position', '', '#3B82F6')}
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Sentiment Strengths</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                      <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0FDF4' }}>
                        <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: Citations */}
            {activeTab === 4 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {mc('Citation Score', result.citation_share, 'How authoritatively your brand was cited')}
                  {mc('Share of Voice', result.share_of_voice, 'Your brand mentions as % of all mentions')}
                </div>
                {(result.citation_sources || []).length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Sources AI is Pulling From</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Domains influencing AI knowledge about this brand.</div>
                    {(result.citation_sources || []).map((s: any, i: number) => {
                      const cls = classifyDomain(s.domain);
                      const bw = Math.min(s.citation_share * 3, 100);
                      return (
                        <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, width: 18 }}>{s.rank}</span>
                            <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=14`} width={14} height={14} alt="" />
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', flex: 1 }}>{s.domain}</span>
                            <span style={{ background: cls.bg, color: cls.color, borderRadius: 50, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600 }}>{cls.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, width: 80, overflow: 'hidden' }}>
                                <div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: bw }} />
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED' }}>{s.citation_share}%</span>
                            </div>
                          </div>
                          {s.top_pages?.length > 0 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #F3F4F6' }}>
                              {s.top_pages.slice(0, 3).map((pg: string, j: number) => <div key={j} style={{ fontSize: '0.75rem', color: '#7C3AED', padding: '2px 0' }}>{pg}</div>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Prompts */}
            {activeTab === 5 && (() => {
              const rd = result.responses_detail || [];
              const cats = ['All', ...Array.from(new Set(rd.map((r: any) => r.category))) as string[]];
              const filtered = rd.filter((r: any) => filterCat === 'All' || r.category === filterCat).slice(0, 10);
              const catStats: Record<string, { total: number; mentioned: number }> = {};
              rd.forEach((r: any) => {
                if (!catStats[r.category]) catStats[r.category] = { total: 0, mentioned: 0 };
                catStats[r.category].total++;
                if (r.mentioned) catStats[r.category].mentioned++;
              });
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {Object.entries(catStats).map(([c, v]) => (
                      <div key={c} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginBottom: 6 }}>{c}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ background: '#F3F4F6', borderRadius: 4, height: 5, flex: 1, overflow: 'hidden' }}>
                            <div style={{ background: '#7C3AED', height: 5, borderRadius: 4, width: `${Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED' }}>{Math.round((v.mentioned / Math.max(v.total, 1)) * 100)}%</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{v.mentioned} of {v.total} queries</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem', color: '#374151', background: 'white', outline: 'none' }}>
                      {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Top 10 Prompts</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Generic consumer questions. No brand name used.</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#FAFAFA' }}>
                          {['#', 'Query', 'Rank'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item: any, i: number) => {
                          const rp = item.position; const rd2 = rp > 0 ? `#${rp}` : 'N/A';
                          const rc = rp === 1 ? '#10B981' : rp <= 3 ? '#7C3AED' : item.mentioned ? '#F59E0B' : '#9CA3AF';
                          return (
                            <tr key={i} style={{ background: item.mentioned ? '#F5F3FF' : 'white', borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                                  <span style={{ background: '#EDE9FE', color: '#5B21B6', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 600 }}>{item.category}</span>
                                  <span style={{ background: item.mentioned ? '#D1FAE5' : '#F3F4F6', color: item.mentioned ? '#065F46' : '#9CA3AF', borderRadius: 4, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{item.mentioned ? 'Appeared' : 'Not Mentioned'}</span>
                                </div>
                                <div style={{ fontSize: '0.83rem', color: '#374151' }}>{item.query}</div>
                              </td>
                              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rc }}>{rd2}</div>
                                <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Rank</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* TAB 6: Recommendations */}
            {activeTab === 6 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46', marginBottom: 16 }}>What is Working Well</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {(result.strengths_list || []).slice(0, 3).map((s: string, i: number) => (
                        <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0FDF4' }}>
                          <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>+</span><span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9F1239', marginBottom: 16 }}>What Needs Improvement</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {(result.improvements_list || []).slice(0, 5).map((w: string, i: number) => (
                        <li key={i} style={{ padding: '10px 0', fontSize: '0.84rem', color: '#374151', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #FFF1F2' }}>
                          <span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>x</span><span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Priority Actions</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>Each action mapped to the relevant Accenture workstream deliverable.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', borderBottom: '2px solid #E5E7EB', paddingBottom: 8, marginBottom: 4 }}>
                    {['Priority', 'Action', 'Linked Deliverable'].map(h => <div key={h} style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{h}</div>)}
                  </div>
                  {(result.actions || []).map((a: any, i: number) => {
                    const dm: Record<string, [string, string]> = { High: ['Workstream 01: ARD', 'AXO Baseline Report and Brand Ranking Index'], Medium: ['Workstream 02: AOP', 'LLM-Ready Content Package and Content Influence Blueprint'], Low: ['Workstream 03: DTI', 'Schema Optimization Guide and Metadata Remediation Plan'] };
                    const priBg: Record<string, string> = { High: '#FEE2E2', Medium: '#FEF3C7', Low: '#DCFCE7' };
                    const priTc: Record<string, string> = { High: '#991B1B', Medium: '#92400E', Low: '#166534' };
                    const [pk, deliv] = dm[a.priority] || ['', ''];
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 0, borderBottom: '1px solid #F3F4F6', padding: '14px 0', alignItems: 'start' }}>
                        <div><span style={{ background: priBg[a.priority], color: priTc[a.priority], borderRadius: 4, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{a.priority}</span></div>
                        <div style={{ fontSize: '0.84rem', color: '#374151', paddingRight: 16 }}>{a.action}</div>
                        <div>
                          <span style={{ background: '#EDE9FE', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600 }}>{pk}</span>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>{deliv}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: Live Prompt */}
            {activeTab === 7 && (
              <div>
                <div style={{ background: '#7C3AED', borderRadius: 12, padding: '24px 28px', color: 'white', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Live AI Prompt Lab</h3>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Type any prompt and see exactly how GPT-4o responds in real time.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <input
                    type="text"
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runPrompt()}
                    placeholder="e.g. What is the best travel credit card for high net worth individuals?"
                    style={{ flex: 1, borderRadius: 12, border: '1.5px solid #DDD6FE', padding: '14px 18px', fontSize: '0.95rem', height: 52, background: '#FAFAFE', outline: 'none' }}
                  />
                  <button onClick={runPrompt} disabled={promptLoading} style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', padding: '0 24px', height: 52, cursor: 'pointer' }}>
                    {promptLoading ? '...' : 'Run'}
                  </button>
                </div>
                {promptHistory.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0 10px' }}>
                      <div style={{ background: '#F4F4F4', color: '#111827', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '60%', fontSize: '0.95rem' }}>{item.q}</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.a}</div>
                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />
                  </div>
                ))}
                {promptHistory.length > 0 && (
                  <button onClick={() => setPromptHistory([])} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, color: '#6B7280', fontSize: '0.78rem', padding: '6px 14px', cursor: 'pointer' }}>
                    Clear history
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}