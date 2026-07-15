import { NextRequest, NextResponse } from 'next/server';

const MODEL        = 'openai/gpt-5.4';
const ANSWER_BATCH = 20;
const QUERY_BATCH  = 20;

// Generic words that must never be used as brand aliases
// These words appear in almost every AI response and cause false matches
const SKIP_WORDS = new Set([
  'bank','card','cards','credit','debit','express','financial','finance','capital',
  'national','federal','first','american','united','global','digital','online',
  'mobile','savings','checking','money','fund','trust','group','corp','inc',
  'company','service','services','network','direct','plus','one','best','top',
]);

// ─── CORE AI CALL ─────────────────────────────────────────────────────────────
async function ai(
  messages: { role: string; content: string }[],
  temp     = 0.1,
  tokens   = 1500,
  retries  = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res  = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://perceptageo.com',
          'X-Title'     : 'Percepta',
        },
        body  : JSON.stringify({ model: MODEL, messages, temperature: temp, max_tokens: tokens }),
        signal: AbortSignal.timeout(60000),
      });
      const txt = (await res.json()).choices?.[0]?.message?.content || '';
      if (txt.length > 0) return txt;
    } catch {
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return '';
}

// ─── JSON PARSE — handles markdown fences, trailing commas, wrapped text ──────
function parseJSON(raw: string): any {
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}
  try {
    const m = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0].replace(/,(\s*[}\]])/g, '$1')) : null;
  } catch { return null; }
}

// ─── WORD-BOUNDARY ALIAS MATCH ────────────────────────────────────────────────
// "citi" must not match "felicity", "explicit", "publicity"
// "chase" must not match "purchase", "showcase"
function hasAlias(text: string, aliases: string[]): boolean {
  return aliases.some(a => {
    const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text);
  });
}

// ─── BUILD BRAND ALIASES ──────────────────────────────────────────────────────
// Only the full name, no-space version, and hyphenated version
// Individual words only if ≥6 chars and not a generic word
function aliases(brand: string): string[] {
  const bl  = brand.toLowerCase().trim();
  const set = new Set([bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-')]);
  bl.split(/[\s'\-\.&]+/)
    .filter(w => w.length >= 6 && !SKIP_WORDS.has(w))
    .forEach(w => set.add(w));
  return [...set].filter(a => a.length >= 3);
}

// ─── POSITION DETECTION ───────────────────────────────────────────────────────
// How many competitor brands are mentioned BEFORE our brand in the response?
// pos=1 = we are the first brand named
// pos=3 = two other brands named before us
// Uses a known-brand list passed in, not fragile proper-noun detection
function position(text: string, als: string[], compAliasList?: string[][]): number {
  if (!text) return 0;
  const tl = text.toLowerCase();

  // Find where our brand first appears
  let ourIdx = Infinity;
  for (const a of als) {
    const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = tl.match(new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`));
    if (m && m.index !== undefined && m.index < ourIdx) ourIdx = m.index;
  }
  if (ourIdx === Infinity) return 0;

  // Count how many competitor aliases appear before our brand
  if (!compAliasList || compAliasList.length === 0) {
    // Fallback: return 1 (no competitor info available)
    return 1;
  }

  let brandsBefore = 0;
  for (const compAls of compAliasList) {
    for (const a of compAls) {
      const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = tl.match(new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`));
      if (m && m.index !== undefined && m.index < ourIdx) {
        brandsBefore++;
        break; // count each competitor once
      }
    }
  }

  return brandsBefore + 1;
}

// ─── PARSE BATCH ANSWERS ──────────────────────────────────────────────────────
function parseAnswers(raw: string, n: number): string[] {
  const out = new Array(n).fill('');
  for (let j = 0; j < n; j++) {
    const mk = `A${j + 1}:`, nm = `A${j + 2}:`;
    if (!raw.includes(mk)) continue;
    const s = raw.indexOf(mk) + mk.length;
    const e = (j + 1 < n && raw.indexOf(nm) > s) ? raw.indexOf(nm) : raw.length;
    out[j] = raw.slice(s, e).trim();
  }
  // Fallback: line-split if fewer than half filled
  if (out.filter(a => a.length > 10).length < n * 0.5) {
    const lines = raw.split('\n').map(l => l.replace(/^A\d+:\s*/, '').trim()).filter(l => l.length > 10);
    for (let j = 0; j < n && j < lines.length; j++) {
      if (!out[j] || out[j].length < 10) out[j] = lines[j];
    }
  }
  return out;
}

// ─── HTML HELPERS ─────────────────────────────────────────────────────────────
const tag  = (html: string, t: string) => (html.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1] || '').replace(/<[^>]+>/g, '').trim();
const meta = (html: string, n: string) => (html.match(new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${n}["']`, 'i')))?.[1]?.trim() || '';
const heads = (html: string) => [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].slice(0, 20).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const body  = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<footer[\s\S]*?<\/footer>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
const ilinks = (html: string, base: string) => {
  const seen = new Set<string>(); const out: { url: string; path: string; label: string }[] = [];
  for (const m of html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)) {
    if (out.length >= 12) break;
    const h = m[1];
    if (h.startsWith('/') && h.length > 1 && !seen.has(h)) {
      seen.add(h);
      try { out.push({ url: new URL(h, base).toString(), path: h, label: h.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page' }); } catch {}
    }
  }
  return out;
};

// ─── FETCH PAGE ───────────────────────────────────────────────────────────────
async function fetchPage(url: string) {
  try {
    const html    = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })).text();
    const domain  = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname;
    return { ok: true as const, url, domain, urlPath, title: tag(html, 'title'), metaDesc: meta(html, 'description'), headings: heads(html), bodyText: body(html), hasSchema: html.includes('application/ld+json'), wordCount: body(html).split(/\s+/).length, internalLinks: ilinks(html, url) };
  } catch (e: any) { return { ok: false as const, error: e.message }; }
}

// ─── BRAND DISCOVERY ─────────────────────────────────────────────────────────
async function discover(page: any, url: string) {
  const ctx = [`URL: ${url}`, `Path: ${page.urlPath || '/'}`, `Title: ${page.title || ''}`, `Meta: ${page.metaDesc || ''}`, ...(page.headings || []).slice(0, 10), (page.bodyText || '').slice(0, 2000)].join('\n');
  const raw = await ai([{ role: 'user', content: `Brand analyst. Return ONLY valid JSON, no markdown.\n\n${ctx}\n\nReturn:\n{"brand_name":"parent brand only (Citi/Chase — never a product name)","industry":"industry for THIS URL path","industry_key":"snake_case","lob":"exact product on this page","personas":["5 buyer personas as: Type — specific need"],"competitors":["10 direct competitors for this product"],"competitor_urls":{"Brand":"domain.com"},"categories":["10 consumer intent categories for this product"]}\n\nRules: brand_name=parent only. industry+categories=URL path not homepage. competitors=direct alternatives only.` }], 0.1, 1400);
  const p = parseJSON(raw);
  if (p?.brand_name) return {
    brand: p.brand_name as string, industry: (p.industry || 'Consumer Products') as string,
    industryKey: (p.industry_key || 'general') as string, lob: (p.lob || '') as string,
    personas: ((p.personas || []) as string[]).slice(0, 5),
    competitors: ((p.competitors || []) as string[]).slice(0, 10),
    competitorUrls: (p.competitor_urls || {}) as Record<string, string>,
    categories: ((p.categories || []) as string[]).slice(0, 10),
  };
  const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
  return { brand: domain.charAt(0).toUpperCase() + domain.slice(1), industry: 'Consumer Products', industryKey: 'general', lob: '', personas: [] as string[], competitors: [] as string[], competitorUrls: {} as Record<string, string>, categories: [] as string[] };
}

// ─── QUERY GENERATION ─────────────────────────────────────────────────────────
// Logic: Persona × Journey Stage × Intent
//
// 5 stages split total queries by weight:
//   Awareness 15%     — broad: "best credit card right now"
//   Consideration 30% — compare: "which card better for groceries vs travel"
//   Decision 30%      — specific: "best card for 780 score, $1500/month spend"
//   Validation 15%    — confirm: "is the annual fee worth it"
//   Advocacy 10%      — recommend: "what card should I tell my friend to get"
//
// Every query framed to force brand-naming answers from GPT
// Max 20 per AI call — JSON always complete
// All calls parallel

const STAGES = [
  { name: 'Awareness',     pct: 0.15, desc: 'broad discovery — what types exist, what is best overall' },
  { name: 'Consideration', pct: 0.30, desc: 'comparing — which is better, what do experts recommend' },
  { name: 'Decision',      pct: 0.30, desc: 'choosing — what should I specifically get for my exact situation' },
  { name: 'Validation',    pct: 0.15, desc: 'confirming — is this worth it, real user experiences' },
  { name: 'Advocacy',      pct: 0.10, desc: 'recommending — what to suggest to others, how to get most value' },
];

async function genChunk(lob: string, industry: string, cats: string[], personas: string[], stage: typeof STAGES[0], count: number, ci: number): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  if (count <= 0) return [];
  const p3 = personas.length > 0 ? [...personas.slice(ci % Math.max(personas.length, 1)), ...personas].slice(0, 3) : ['everyday consumer', 'budget-focused buyer', 'experienced user'];
  const c4 = cats.length > 0 ? [...cats.slice((ci * 3) % Math.max(cats.length, 1)), ...cats].slice(0, 4) : ['General'];
  const raw = await ai([{ role: 'user', content: `Write ${count} questions a person types into ChatGPT about ${lob || industry}.\n\nStage: ${stage.name} — ${stage.desc}\nPersonas: ${p3.join(' | ')}\nCategories: ${c4.join(', ')}\n\nRules:\n- No brand names in questions\n- Questions must invite specific brand recommendations in the answer\n- Mix short ("best credit card for groceries") with specific ("best cash back card for $600/month food spend")\n- Natural conversational tone\n- Spread across all categories\n\nReturn JSON only:\n[{"category":"name","query":"question","stage":"${stage.name}","persona":"type"}]\nExactly ${count} items.` }], 0.5, Math.max(2000, count * 120), 2);
  const p = parseJSON(raw);
  if (!Array.isArray(p)) return [];
  return p.filter((x: any) => x?.query?.length > 8).slice(0, count);
}

async function genQueries(lob: string, industry: string, cats: string[], personas: string[], total: number): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  const counts = STAGES.map(s => ({ ...s, count: Math.round(total * s.pct) }));
  counts[1].count += total - counts.reduce((s, x) => s + x.count, 0); // fix rounding

  const jobs: { stage: typeof STAGES[0]; count: number; ci: number }[] = [];
  counts.forEach(s => { let r = s.count, ci = 0; while (r > 0) { jobs.push({ stage: s, count: Math.min(r, QUERY_BATCH), ci: ci++ }); r -= QUERY_BATCH; } });

  const all = (await Promise.all(jobs.map(j => genChunk(lob, industry, cats, personas, j.stage, j.count, j.ci)))).flat();

  // Fallback: brand-inviting queries if AI generation fell short
  if (all.length < total) {
    const prod = lob || industry || 'this product';
    const pool = [
      `What is the best ${prod} right now?`, `Which ${prod} do most people recommend?`,
      `What ${prod} is worth it for excellent credit?`, `Which ${prod} has best rewards with no annual fee?`,
      `What is the top-rated ${prod} for everyday spending?`, `Which ${prod} gives best value for high earners?`,
      `What ${prod} do financial experts recommend?`, `Which ${prod} has highest customer satisfaction?`,
      `What is the most popular ${prod} in the USA?`, `Which ${prod} is best for frequent travelers?`,
    ];
    let fi = 0;
    while (all.length < total) {
      const cat = cats[fi % Math.max(cats.length, 1)] || 'General';
      all.push({ category: cat, query: pool[fi % pool.length], stage: STAGES[fi % STAGES.length].name, persona: 'general consumer' });
      fi++;
    }
  }
  return all.slice(0, total);
}

// ─── SCORE COMPUTATION ────────────────────────────────────────────────────────
// VISIBILITY     = % of answered queries mentioning brand (word-boundary matched)
// PROMINENCE     = scaled avg position: pos1→100, pos2→82, pos3→64, pos4→46, pos5+→28
// SENTIMENT      = positive vs negative word ratio in brand sentences (base 50, ±40)
// CITATION SHARE = sum(1/pos) / mentionCount × 100 — position-quality score 0-95
// SHARE OF VOICE = brand-mentioned responses / any-brand-mentioned responses (Set-based)
// GEO SCORE      = Vis×0.30 + Sen×0.20 + Prom×0.20 + Cit×0.15 + SOV×0.15
function score(brand: string, als: string[], qa: any[], comps: string[]) {
  const answered  = qa.filter(r => r && (r.a || '').trim().length > 10);
  const total     = answered.length || 1;

  // VISIBILITY — word-boundary match only
  const mentioned    = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
  const mentionCount = mentioned.length;
  const visibility   = Math.round((mentionCount / total) * 100);

  // PROMINENCE — now uses competitor aliases for accurate position detection
  const compAliasList = comps.map(c => aliases(c));
  const positions = mentioned.map(r => position(r.a || '', als, compAliasList)).filter(p => p > 0);
  const avgPos    = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;
  const prominence = mentionCount > 0 ? Math.round(Math.max(10, Math.min(95, 100 - (avgPos - 1) * 18))) : 0;

  // SENTIMENT — pure pos/neg ratio, not contaminated by prominence
  const POS = ['best','top','recommended','leading','excellent','great','trusted','popular','ideal','perfect','outstanding','superior','preferred','reliable','strong','impressive','generous','competitive','solid','standout','exceptional','renowned'];
  const NEG = ['worst','poor','bad','avoid','expensive','weak','limited','disappointing','inferior','mediocre','unreliable','overpriced','problematic','lacking','outdated','complicated','confusing','frustrating','hidden fees','complaints'];
  let posW = 0, negW = 0;
  mentioned.forEach(r => {
    (r.a || '').toLowerCase().split(/[.!?]+/)
      .filter((s: string) => hasAlias(s, als))
      .forEach((s: string) => {
        POS.forEach(w => { if (s.includes(w)) posW++; });
        NEG.forEach(w => { if (s.includes(w)) negW++; });
      });
  });
  const sentiment = Math.round(Math.max(0, Math.min(100,
    (mentionCount > 0 ? 50 : 0) + ((posW + negW) > 0 ? Math.round(((posW - negW) / (posW + negW)) * 40) : 0)
  )));

  // CITATION SHARE — position quality, independent of visibility
  const citWeight     = positions.reduce((s, p) => s + 1 / p, 0);
  const citationShare = Math.round(Math.min(95, (citWeight / Math.max(mentionCount, 1)) * 100));

  // SHARE OF VOICE — Set prevents one response with 5 brands counting 5× in denominator
  const top8     = comps.slice(0, 8);
  const brandSet = new Set<number>(), anySet = new Set<number>();
  answered.forEach((r, i) => {
    const t = (r.a || '').toLowerCase();
    if (hasAlias(t, als)) { brandSet.add(i); anySet.add(i); }
    top8.forEach(c => { if (hasAlias(t, aliases(c))) anySet.add(i); });
  });
  const shareOfVoice = Math.round((brandSet.size / Math.max(anySet.size, 1)) * 100);

  // GEO
  const geo = Math.round(visibility * 0.30 + sentiment * 0.20 + prominence * 0.20 + citationShare * 0.15 + shareOfVoice * 0.15);

  return { visibility, prominence, sentiment, citationShare, shareOfVoice, geo, avgRank: positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A', mentionCount, totalCount: answered.length };
}

// ─── COMPETITOR SCORING ───────────────────────────────────────────────────────
function scoreComp(name: string, url: string, qa: any[], allComps: string[]) {
  const als = aliases(name);
  const s   = score(name, als, qa, allComps.filter(c => c !== name));
  return { Brand: name, URL: url || `${name.toLowerCase().replace(/\s+/g, '')}.com`, GEO: s.geo, Vis: s.visibility, Cit: s.citationShare, Sen: s.sentiment, Sov: s.shareOfVoice, Prom: s.prominence, Rank: s.avgRank };
}

// ─── CLUSTERS ─────────────────────────────────────────────────────────────────
function clusters(qa: any[], als: string[], comps: string[]) {
  const cats = [...new Set(qa.filter(Boolean).map(r => r.category).filter(Boolean))] as string[];
  return cats.map(cat => {
    const rows     = qa.filter(r => r && r.category === cat);
    const answered = rows.filter(r => (r.a || '').trim().length > 10);
    const hits     = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
    const winRate  = answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0;
    const cc: Record<string, number> = {};
    answered.forEach(r => { const t = (r.a || '').toLowerCase(); comps.forEach(c => { if (hasAlias(t, aliases(c))) cc[c] = (cc[c] || 0) + 1; }); });
    const stageBreakdown: Record<string, { total: number; mentioned: number }> = {};
    rows.forEach(r => {
      const s = r.stage || 'Consideration';
      if (!stageBreakdown[s]) stageBreakdown[s] = { total: 0, mentioned: 0 };
      stageBreakdown[s].total++;
      if (hasAlias((r.a || '').toLowerCase(), als)) stageBreakdown[s].mentioned++;
    });
    return { category: cat, total: answered.length, mentioned: hits.length, winRate, topCompetitor: Object.entries(cc).sort((a, b) => b[1] - a[1])[0]?.[0] || '', dailySearches: 0, related: [], stageBreakdown };
  });
}

// ─── CITATIONS ────────────────────────────────────────────────────────────────
const SOURCES: Record<string, string> = { nerdwallet: 'Earned Media', bankrate: 'Earned Media', creditkarma: 'Earned Media', thepointsguy: 'Earned Media', wallethub: 'Earned Media', investopedia: 'Earned Media', consumerreports: 'Institution', forbes: 'Earned Media', cnbc: 'Earned Media', businessinsider: 'Earned Media', motleyfool: 'Earned Media', wsj: 'Earned Media', marketwatch: 'Earned Media', bloomberg: 'Earned Media', reddit: 'Social', twitter: 'Social', youtube: 'Social', linkedin: 'Social', wikipedia: 'Institution', fdic: 'Institution', consumerfinance: 'Institution', experian: 'Institution', lendingtree: 'Earned Media' };

function extractCitations(qa: any[], domain: string, brand: string) {
  const counts: Record<string, number> = {};
  const clean = domain.replace('www.', '');
  const re    = new RegExp(`(?<![a-z0-9])${brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i');
  qa.filter(Boolean).forEach(r => {
    const t = (r.a || '').toLowerCase();
    if (re.test(t) || t.includes(clean)) counts[clean] = (counts[clean] || 0) + 1;
    Object.keys(SOURCES).forEach(src => { if (t.includes(src)) counts[src + '.com'] = (counts[src + '.com'] || 0) + 1; });
  });
  if (!counts[clean]) counts[clean] = 1;
  const tot = Object.values(counts).reduce((a, b) => a + b, 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map((e, i) => ({
    rank: i + 1, domain: e[0], citation_share: Math.round((e[1] / tot) * 100), top_pages: [],
    category: e[0] === clean ? 'Owned Media' : (SOURCES[e[0].replace('.com', '')] || 'Earned Media'),
  }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX = Math.min(Math.max(promptCount || 300, 50), 1000);

    // 1. Fetch page
    const page = await fetchPage(url);
    if (!page.ok) return NextResponse.json({ error: page.error }, { status: 400 });

    // 2. Discover brand
    const d = await discover(page, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = d;
    const als = aliases(brand);

    // 3. Generate queries + citations + trending — all parallel
    const [queries, citRaw, trendRaw] = await Promise.all([
      genQueries(lob, industry, categories, personas, MAX),
      ai([{ role: 'user', content: `List 10 domains AI models actually cite for ${lob || industry} questions in the USA.\nBrand: ${brand} (domain: ${page.domain})\nReturn ONLY valid JSON:\n[{"rank":1,"domain":"nerdwallet.com","category":"Earned Media","citation_share":12,"top_pages":["/best-credit-cards"]}]\nInclude ${page.domain} as rank 1 (Owned Media). Exactly 10 items.` }], 0.1, 1000),
      ai([{ role: 'user', content: `List 10 trending questions consumers ask AI about ${lob || industry} in USA. No brand names. Short natural questions.\nReturn ONLY valid JSON:\n[{"query":"best credit card for groceries","trend":"Rising","opportunity":"High","category":"Cash Back","estimated_daily_searches":8200}]\nExactly 10 items.` }], 0.3, 900),
    ]);

    // 4. Answer all queries — parallel batches, 4000 tokens each
    const allQA: any[] = new Array(queries.length).fill(null);
    const batches = Array.from({ length: Math.ceil(queries.length / ANSWER_BATCH) }, (_, i) => queries.slice(i * ANSWER_BATCH, (i + 1) * ANSWER_BATCH));

    await Promise.all(batches.map(async (batch, bi) => {
      const ql  = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
      const lbs = batch.map((_, j) => `A${j + 1}:`).join('\n');
      const raw = await ai([
        { role: 'system', content: `You are a knowledgeable balanced consumer advisor for ${lob || industry}. Always name specific real brands. Never be vague or generic.` },
        { role: 'user',   content: `Answer every question. Name 2-4 real brands per answer. Be balanced. 1-3 sentences each.\n\n${ql}\n\nFormat:\n${lbs}` },
      ], 0.3, 4000, 2);
      const answers = parseAnswers(raw, batch.length);
      batch.forEach((q, j) => {
        allQA[bi * ANSWER_BATCH + j] = { category: q.category, stage: q.stage, persona: q.persona, q: q.query, a: answers[j] || '' };
      });
    }));

    // Fill any nulls from failed batches
    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = { category: queries[i]?.category || '', stage: queries[i]?.stage || '', persona: queries[i]?.persona || '', q: queries[i]?.query || '', a: '' };
    }

    // 5. Score brand
    const scores = score(brand, als, allQA, competitors);

    // 6. Score competitors — same function, same response pool
    const competitorScores = competitors
      .filter(c => c.toLowerCase() !== brand.toLowerCase())
      .map(c => scoreComp(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // 7. Response detail
    const compAliasList = competitors.map(c => aliases(c));
    const responsesDetail = allQA.filter(Boolean).map(r => {
      const t        = (r.a || '').toLowerCase();
      const isMentioned = hasAlias(t, als);
      const brandPos = isMentioned ? position(r.a || '', als, compAliasList) : 0;
      let winner = '', winPos = Infinity;
      competitors.slice(0, 12).forEach(c => {
        const ca  = aliases(c);
        const pos = position(r.a || '', ca, compAliasList.filter(x => x !== ca));
        if (pos > 0 && pos < winPos && (brandPos === 0 || pos < brandPos)) { winPos = pos; winner = c; }
      });
      return {
        category: r.category, stage: r.stage, persona: r.persona, query: r.q,
        mentioned: isMentioned,
        response_preview: r.a || '',
        position: brandPos,
        winner_brand: winner || null,
      };
    });

    // 8. Clusters
    const queryClusters = clusters(allQA, als, competitors);

    // 9. Stage win rates
    const stageWinRates = STAGES.map(s => {
      const rows     = allQA.filter(r => r && r.stage === s.name);
      const answered = rows.filter(r => (r.a || '').trim().length > 10);
      const hits     = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
      return { stage: s.name, winRate: answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0, total: answered.length };
    });

    // 10. Citations
    const citationSources = (() => {
      const p = parseJSON(citRaw);
      return Array.isArray(p) && p.length > 0 ? p : extractCitations(allQA, page.domain, brand);
    })();

    // 11. Trending
    const trendingQueries = (() => { const p = parseJSON(trendRaw); return Array.isArray(p) ? p : []; })();

    // 12. Insights + targeted clusters — parallel
    const topCats    = [...queryClusters].sort((a, b) => b.winRate - a.winRate).slice(0, 3).map(c => c.category);
    const missCats   = queryClusters.filter(c => c.winRate === 0).slice(0, 3).map(c => c.category);
    const topComp    = competitorScores[0]?.Brand || 'competitors';
    const bestStage  = [...stageWinRates].sort((a, b) => b.winRate - a.winRate)[0];
    const worstStage = [...stageWinRates].sort((a, b) => a.winRate - b.winRate)[0];

    const [insightsRaw, targetedClusters] = await Promise.all([

      ai([{ role: 'user', content: `GEO strategist. Return ONLY valid JSON.\nBrand:${brand} Product:${lob||industry} GEO:${scores.geo} Vis:${scores.visibility}%(${scores.mentionCount}/${scores.totalCount}) Prom:${scores.prominence}(${scores.avgRank}) Sen:${scores.sentiment} Cit:${scores.citationShare} SOV:${scores.shareOfVoice}%\nBestStage:${bestStage?.stage} ${bestStage?.winRate}% WorstStage:${worstStage?.stage} ${worstStage?.winRate}%\nTopCats:${topCats.join(',')||'none'} Missing:${missCats.join(',')||'none'} TopComp:${topComp}\nReturn:{"strengths":["3 specific data-backed strengths"],"improvements":["5 specific gaps"],"actions":[{"priority":"High","action":"action"},{"priority":"High","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Low","action":"action"}]}` }], 0.2, 1200),

      (async (): Promise<any[]> => {
        try {
          const fRaw = await ai([{ role: 'user', content: `What specific products/features is "${brand}" genuinely known for in ${lob||industry}? Only real established reputation.\nReturn ONLY valid JSON:\n{"knownFor":[{"product":"name","queries":["10 short brand-inviting questions, NO brand names"]}]}\nMax 3 products.` }], 0.2, 1200);
          const fame = parseJSON(fRaw);
          const knownFor: { product: string; queries: string[] }[] = fame?.knownFor || [];
          if (!knownFor.length) return [];
          const bl  = brand.toLowerCase();
          const bw  = bl.split(/\s+/).filter(w => w.length > 4);
          const ok  = (q: string) => { const ql = q.toLowerCase(); return !ql.includes(bl) && !bw.some(w => ql.includes(w)); };
          const flat: { product: string; query: string }[] = [];
          knownFor.forEach(k => k.queries.slice(0, 10).filter(ok).forEach(q => flat.push({ product: k.product, query: q })));
          const tBatches = Array.from({ length: Math.ceil(flat.length / 10) }, (_, i) => flat.slice(i * 10, (i + 1) * 10));
          const tQA: any[] = [];
          await Promise.all(tBatches.map(async batch => {
            const ql  = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
            const lbs = batch.map((_, j) => `A${j + 1}:`).join('\n');
            const r2  = await ai([{ role: 'user', content: `Answer naming real brands. Be balanced.\n\n${ql}\n\nFormat:\n${lbs}` }], 0.3, 2000, 2);
            const answers = parseAnswers(r2, batch.length);
            batch.forEach((item, j) => {
              const ans = answers[j] || '';
              tQA.push({ product: item.product, query: item.query, ans, mentioned: hasAlias(ans.toLowerCase(), als), position: position(ans, als) });
            });
          }));
          const pMap: Record<string, any[]> = {};
          tQA.forEach(r => { (pMap[r.product] = pMap[r.product] || []).push(r); });
          return Object.entries(pMap).map(([product, rows]) => {
            const total2 = rows.length, hits2 = rows.filter(r => r.mentioned).length;
            const posArr = rows.filter(r => r.mentioned && r.position > 0).map(r => r.position);
            const avgP2  = posArr.length > 0 ? posArr.reduce((a: number, b: number) => a + b, 0) / posArr.length : 3;
            const cc: Record<string, number> = {};
            rows.forEach(r => { const t = (r.ans||'').toLowerCase(); competitors.forEach(c => { if (hasAlias(t, aliases(c)) && c.toLowerCase() !== bl) cc[c] = (cc[c]||0)+1; }); });
            return { product, total: total2, mentioned: hits2, winRate: total2 > 0 ? Math.round((hits2/total2)*100) : 0, prominence: Math.round(Math.max(5, Math.min(95, 100-(avgP2-1)*18))), avgRank: `#${Math.round(avgP2)}`, topCompetitor: Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'', responses: rows.map(r => ({ query: r.query, mentioned: r.mentioned, position: r.position, response_preview: r.ans })) };
          }).sort((a, b) => b.winRate - a.winRate);
        } catch { return []; }
      })(),
    ]);

    const insights = parseJSON(insightsRaw) || { strengths: [], improvements: [], actions: [] };

    return NextResponse.json({
      brand_name: brand, industry, ind_key: industryKey, lob, ind_label: industry,
      visibility: scores.visibility, sentiment: scores.sentiment, prominence: scores.prominence,
      citation_share: scores.citationShare, share_of_voice: scores.shareOfVoice,
      overall_geo_score: scores.geo, avg_rank: scores.avgRank,
      responses_with_brand: scores.mentionCount, total_responses: scores.totalCount,
      personas, stage_win_rates: stageWinRates,
      responses_detail: responsesDetail, query_clusters: queryClusters,
      targeted_clusters: targetedClusters, competitors: competitorScores,
      citation_sources: citationSources, trending_queries: trendingQueries,
      strengths_list: insights.strengths || [], improvements_list: insights.improvements || [],
      actions: insights.actions || [],
      internal_links: page.internalLinks || [], domain: page.domain || '', page_url: url,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
