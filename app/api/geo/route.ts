import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL        = 'openai/gpt-5.4';
const ANSWER_BATCH = 20;  // 20 Qs per scoring call — fits in 4000 tokens cleanly
const QUERY_BATCH  = 20;  // 20 queries per generation call — AI returns complete JSON

// Generic words that should never be used as brand aliases
// "bank", "card", "credit", "express" etc match too broadly
const GENERIC_WORDS = new Set([
  'bank','card','cards','credit','debit','express','financial','finance','capital',
  'national','federal','first','american','united','global','digital','online',
  'mobile','savings','checking','money','fund','trust','group','corp','inc',
  'company','service','services','network','direct','plus','one','best','top',
]);

// ─── AI CALL ──────────────────────────────────────────────────────────────
async function callAI(
  messages    : { role: string; content: string }[],
  temperature = 0.1,
  max_tokens  = 1500,
  retries     = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://perceptageo.com',
          'X-Title'     : 'Percepta',
        },
        body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
      });
      const data    = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content.length > 0) return content;
    } catch {
      if (attempt === retries) return '';
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  return '';
}

// ─── SAFE JSON PARSE — handles markdown, wrapped text, trailing commas ─────
function safeParseJSON(raw: string): any {
  if (!raw) return null;
  try {
    // Strip markdown fences
    const s = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(s);
  } catch {
    try {
      // Extract first JSON object or array from the string
      const objMatch   = raw.match(/\{[\s\S]*\}/);
      const arrMatch   = raw.match(/\[[\s\S]*\]/);
      const match      = arrMatch || objMatch;
      if (!match) return null;
      // Remove trailing commas before ] or }
      const cleaned = match[0].replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

// ─── HTML HELPERS ──────────────────────────────────────────────────────────
function extractTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}
function extractMeta(html: string, name: string): string {
  const a = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return (a || b)?.[1]?.trim() || '';
}
function extractHeadings(html: string, max = 20): string[] {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .slice(0, max)
    .map((m: RegExpMatchArray) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}
function extractBodyText(html: string, maxChars = 4000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, maxChars);
}
function extractInternalLinks(html: string, baseUrl: string, max = 12): { url: string; path: string; label: string }[] {
  const seen = new Set<string>();
  const links: { url: string; path: string; label: string }[] = [];
  for (const m of html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)) {
    if (links.length >= max) break;
    const href = m[1];
    if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
      seen.add(href);
      const label = href.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Page';
      try { links.push({ url: new URL(href, baseUrl).toString(), path: href, label }); } catch {}
    }
  }
  return links;
}

// ─── FETCH PAGE ─────────────────────────────────────────────────────────────
async function fetchPage(url: string) {
  try {
    const res     = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    const html    = await res.text();
    const domain  = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname;
    return {
      ok: true, url, domain, urlPath,
      title: extractTag(html, 'title'), metaDesc: extractMeta(html, 'description'),
      headings: extractHeadings(html), bodyText: extractBodyText(html),
      hasSchema: html.includes('application/ld+json'),
      wordCount: extractBodyText(html).split(/\s+/).length,
      internalLinks: extractInternalLinks(html, url),
    };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ─── BRAND DISCOVERY ────────────────────────────────────────────────────────
async function discoverBrand(page: any, url: string) {
  const pageText = [
    `URL: ${url}`, `Path: ${page.urlPath || '/'}`,
    `Title: ${page.title || ''}`, `Meta: ${page.metaDesc || ''}`,
    ...((page.headings || []).slice(0, 10) as string[]),
    (page.bodyText || '').slice(0, 2000),
  ].join('\n');

  const raw = await callAI([{ role: 'user', content:
`Brand intelligence analyst. Return ONLY valid JSON, no markdown.

${pageText}

Return:
{"brand_name":"parent brand (Citi/Chase/Nike — never a product name)","industry":"industry for THIS URL path","industry_key":"snake_case","lob":"exact product on this page","personas":["5 buyer personas as Descriptor — need"],"competitors":["10 direct competitors for this product"],"competitor_urls":{"Brand":"domain.com"},"categories":["10 consumer intent categories for this product"]}

Rules: brand_name=parent only. industry+categories match URL path not homepage.` }],
    0.1, 1400);

  const p = safeParseJSON(raw);
  if (p && p.brand_name) {
    return {
      brand         : p.brand_name as string,
      industry      : (p.industry     || 'Consumer Products') as string,
      industryKey   : (p.industry_key || 'general') as string,
      lob           : (p.lob          || '') as string,
      personas      : ((p.personas    || []) as string[]).slice(0, 5),
      competitors   : ((p.competitors || []) as string[]).slice(0, 10),
      competitorUrls: (p.competitor_urls || {}) as Record<string, string>,
      categories    : ((p.categories  || []) as string[]).slice(0, 10),
    };
  }
  const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
  return {
    brand: domain.charAt(0).toUpperCase() + domain.slice(1),
    industry: 'Consumer Products', industryKey: 'general', lob: '',
    personas: [] as string[], competitors: [] as string[],
    competitorUrls: {} as Record<string, string>, categories: [] as string[],
  };
}

// ─── QUERY GENERATION ────────────────────────────────────────────────────────
//
// DESIGN: Persona × Stage × Intent — zero hardcoding
//
// STAGES divide the buyer journey. Each stage produces different query patterns:
//   Awareness:     "what is the best X" — broad, categorical
//   Consideration: "X vs Y which is better for [situation]" — comparative
//   Decision:      "which specific X should I get if I [exact situation]" — specific
//   Validation:    "is X actually worth it / reliable" — confirmatory
//   Advocacy:      "what X would you recommend to [someone else]" — social
//
// PERSONAS from page content ensure queries reflect real buyer language
// QUERIES must force the AI answerer to name brands — vague questions produce vague answers
//
const STAGES = [
  { name: 'Awareness',     pct: 0.15, desc: 'broad discovery, what is X, what types exist' },
  { name: 'Consideration', pct: 0.30, desc: 'comparing options, which is better, what do experts say' },
  { name: 'Decision',      pct: 0.30, desc: 'ready to pick, what should I specifically get' },
  { name: 'Validation',    pct: 0.15, desc: 'confirming choice, is X worth it, real reviews' },
  { name: 'Advocacy',      pct: 0.10, desc: 'recommending to others, maximising what they have' },
];

async function generateChunk(
  lob: string, industry: string, cats: string[], personas: string[],
  stage: typeof STAGES[0], count: number, chunkIdx: number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  if (count <= 0) return [];

  const p3 = personas.length > 0
    ? [...personas.slice(chunkIdx % Math.max(personas.length, 1)), ...personas].slice(0, 3)
    : ['everyday consumer', 'budget-focused buyer', 'experienced user'];

  const offset = (chunkIdx * 3) % Math.max(cats.length, 1);
  const c4 = cats.length > 0 ? [...cats.slice(offset), ...cats].slice(0, 4) : ['General'];

  const raw = await callAI([{ role: 'user', content:
`Write ${count} questions someone types into ChatGPT about ${lob || industry}. Stage: ${stage.name} (${stage.desc}).

Persona types: ${p3.join(' | ')}
Categories: ${c4.join(', ')}

Requirements:
- No brand names in the questions
- Questions must lead to brand recommendations in the answer (not generic advice)
- Short and natural — how a real person would type it
- Mix of lengths: some short ("best credit card for groceries"), some specific ("best cash back card if I spend $600/month on food and $200 on gas")
- Cover all categories

Return JSON array only:
[{"category":"name","query":"question","stage":"${stage.name}","persona":"type"}]
Exactly ${count} items.` }],
    0.5, Math.max(2000, count * 120), 2);

  const parsed = safeParseJSON(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item: any) => item && typeof item.query === 'string' && item.query.length > 8)
    .slice(0, count);
}

async function generateQueries(
  lob: string, industry: string, cats: string[], personas: string[], total: number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {

  const stageCounts = STAGES.map((s: typeof STAGES[0]) => ({ ...s, count: Math.round(total * s.pct) }));
  const diff = total - stageCounts.reduce((sum: number, s: any) => sum + s.count, 0);
  stageCounts[1].count += diff;

  const jobs: { stage: typeof STAGES[0]; count: number; chunkIdx: number }[] = [];
  stageCounts.forEach((s: any) => {
    let rem = s.count, ci = 0;
    while (rem > 0) { jobs.push({ stage: s, count: Math.min(rem, QUERY_BATCH), chunkIdx: ci++ }); rem -= QUERY_BATCH; }
  });

  const results = await Promise.all(jobs.map((j: any) => generateChunk(lob, industry, cats, personas, j.stage, j.count, j.chunkIdx)));
  const all = results.flat();

  // Fallback: short, varied, brand-inviting queries using actual product name
  if (all.length < total) {
    const prod = lob || industry || 'this product';
    const pool = [
      `What is the best ${prod} right now?`,
      `Which ${prod} do most people recommend?`,
      `What ${prod} is worth it for someone with excellent credit?`,
      `Which ${prod} has the best rewards with no annual fee?`,
      `What is the top-rated ${prod} for everyday spending?`,
      `Which ${prod} gives the best value for high earners?`,
      `What ${prod} do financial experts recommend most?`,
      `Which ${prod} has the highest customer satisfaction?`,
      `What is the most popular ${prod} in the USA?`,
      `Which ${prod} is best for someone who travels frequently?`,
    ];
    let fi = 0;
    while (all.length < total) {
      const cat = cats[fi % Math.max(cats.length, 1)] || 'General';
      const st  = STAGES[fi % STAGES.length];
      all.push({ category: cat, query: pool[fi % pool.length], stage: st.name, persona: 'general consumer' });
      fi++;
    }
  }
  return all.slice(0, total);
}

// ─── BUILD ALIASES ──────────────────────────────────────────────────────────
// Critical: generic words MUST be excluded — "bank" would match every response,
// "express" matches "expressly", "card" matches "credit card for..." everywhere.
// Only use full brand name, no-space version, and hyphenated version.
// Individual words only if they are ≥6 chars AND not in GENERIC_WORDS.
function buildAliases(brand: string): string[] {
  const bl  = brand.toLowerCase().trim();
  const set = new Set<string>([
    bl,
    bl.replace(/\s+/g, ''),   // "capitalOne" → "capitalone"
    bl.replace(/\s+/g, '-'),  // "capital-one"
  ]);
  // Add individual words only if meaningful and not generic
  bl.split(/[\s'\-\.&]+/)
    .filter((w: string) => w.length >= 6 && !GENERIC_WORDS.has(w))
    .forEach((w: string) => set.add(w));
  return [...set].filter((a: string) => a.length >= 3);
}

// ─── BRAND POSITION ─────────────────────────────────────────────────────────
// Counts proper nouns before the brand's first mention.
// pos=1 means brand named first, pos=3 means 2 other brands named before it.
function getBrandPosition(text: string, aliases: string[]): number {
  if (!text) return 0;
  const tl = text.toLowerCase();

  let firstIdx = Infinity;
  for (const a of aliases) {
    const idx = tl.indexOf(a);
    if (idx >= 0 && idx < firstIdx) firstIdx = idx;
  }
  if (firstIdx === Infinity) return 0;

  const before    = text.slice(0, firstIdx);
  const stopWords = new Set([
    'The','This','That','These','Those','When','Where','What','Which','How','Why',
    'For','And','But','Or','In','On','At','To','Of','With','As','By','From','An',
    'If','It','Its','Are','Is','Be','Was','Were','Has','Have','Had','Here','Some',
    'Many','Most','More','Such','Each','Both','Also','Very','Just','About','After',
    'Before','Between','Since','Without','Within','Along','Around','Below','Above',
  ]);
  const properNouns = (before.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*/g) || [])
    .filter((w: string) => !stopWords.has(w));
  return properNouns.length + 1;
}

// ─── PARSE ANSWERS ───────────────────────────────────────────────────────────
function parseAnswers(raw: string, count: number): string[] {
  const answers: string[] = new Array(count).fill('');

  for (let j = 0; j < count; j++) {
    const marker     = `A${j + 1}:`;
    const nextMarker = `A${j + 2}:`;
    if (!raw.includes(marker)) continue;
    const start   = raw.indexOf(marker) + marker.length;
    const hasNext = j + 1 < count && raw.indexOf(nextMarker) > start;
    const end     = hasNext ? raw.indexOf(nextMarker) : raw.length;
    answers[j]    = raw.slice(start, end).trim();
  }

  // Fallback: line-split if fewer than half filled
  const filled = answers.filter((a: string) => a.length > 10).length;
  if (filled < count * 0.5) {
    const lines = raw.split('\n')
      .map((l: string) => l.replace(/^A\d+:\s*/, '').trim())
      .filter((l: string) => l.length > 10);
    for (let j = 0; j < count && j < lines.length; j++) {
      if (!answers[j] || answers[j].length < 10) answers[j] = lines[j];
    }
  }
  return answers;
}

// ─── SCORE COMPUTATION ───────────────────────────────────────────────────────
//
// VISIBILITY     = % of answered queries where brand appears
// PROMINENCE     = scaled avg position (1st=100, 2nd=82, 3rd=64, 4th=46, 5th=28)
// SENTIMENT      = pos/neg word ratio in brand-containing sentences (base 50)
// CITATION SHARE = how prominently brand is cited: (citWeight/mentionCount)×100
//                  citWeight = sum(1/position) — #1 mention worth more than #3
//                  Scaled 0-95. Independent of visibility (fixes "always tiny" bug)
// SHARE OF VOICE = Set-based: responses_mentioning_brand / responses_mentioning_any_brand
//                  Set prevents one response with 5 brands inflating denominator 5×
// GEO            = Vis×0.30 + Sen×0.20 + Prom×0.20 + Cit×0.15 + SOV×0.15
//
function computeScores(brand: string, aliases: string[], qa: any[], competitors: string[]) {
  const answered     = qa.filter((r: any) => r && (r.a || '').trim().length > 10);
  const total        = answered.length || 1;

  // VISIBILITY
  const mentioned    = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
  const mentionCount = mentioned.length;
  const visibility   = Math.round((mentionCount / total) * 100);

  // PROMINENCE
  const positions = mentioned
    .map((r: any) => getBrandPosition(r.a || '', aliases))
    .filter((p: number) => p > 0);
  const avgPos    = positions.length > 0 ? positions.reduce((a: number, b: number) => a + b, 0) / positions.length : 0;
  const prominence = mentionCount > 0 ? Math.round(Math.max(10, Math.min(95, 100 - (avgPos - 1) * 18))) : 0;

  // SENTIMENT
  const POS = ['best','top','recommended','leading','excellent','great','trusted','popular',
    'ideal','perfect','outstanding','superior','preferred','reliable','strong','impressive',
    'generous','competitive','solid','standout','exceptional','renowned','well-known','award'];
  const NEG = ['worst','poor','bad','avoid','expensive','weak','limited','disappointing',
    'inferior','mediocre','unreliable','overpriced','problematic','lacking','outdated',
    'complicated','confusing','frustrating','hidden fees','complaints','issues'];
  let pos = 0, neg = 0;
  mentioned.forEach((r: any) => {
    (r.a || '').toLowerCase().split(/[.!?]+/)
      .filter((s: string) => aliases.some((a: string) => s.includes(a)))
      .forEach((s: string) => {
        POS.forEach((w: string) => { if (s.includes(w)) pos++; });
        NEG.forEach((w: string) => { if (s.includes(w)) neg++; });
      });
  });
  const sentimentBase = mentionCount > 0 ? 50 : 0;
  const sentimentAdj  = (pos + neg) > 0 ? Math.round(((pos - neg) / (pos + neg)) * 35) : 0;
  const sentiment     = Math.round(Math.max(0, Math.min(100, sentimentBase + sentimentAdj + prominence * 0.08)));

  // CITATION SHARE — independent of visibility, based purely on position quality
  // citWeight = sum(1/pos) for all mentions. Max if all at pos1 = mentionCount×1
  // Scale to 0-100: what % of perfect citation did we achieve?
  const citWeight     = positions.reduce((sum: number, p: number) => sum + 1 / p, 0);
  const maxCit        = Math.max(mentionCount, 1);
  const citationShare = Math.round(Math.min(95, (citWeight / maxCit) * 100));

  // SHARE OF VOICE — Set-based, cap competitors at 8 to keep SOV meaningful
  const topComps             = (competitors as string[]).slice(0, 8);
  const brandSet             = new Set<number>();
  const anyBrandSet          = new Set<number>();
  answered.forEach((r: any, i: number) => {
    const t = (r.a || '').toLowerCase();
    if (aliases.some((a: string) => t.includes(a))) { brandSet.add(i); anyBrandSet.add(i); }
    topComps.forEach((comp: string) => {
      const ca = buildAliases(comp);
      if (ca.some((a: string) => t.includes(a))) anyBrandSet.add(i);
    });
  });
  const shareOfVoice = Math.round((brandSet.size / Math.max(anyBrandSet.size, 1)) * 100);

  // GEO SCORE
  const geo = Math.round(visibility*0.30 + sentiment*0.20 + prominence*0.20 + citationShare*0.15 + shareOfVoice*0.15);

  return {
    visibility, prominence, sentiment, citationShare, shareOfVoice, geo,
    avgRank: positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A',
    mentionCount, totalCount: answered.length,
  };
}

// ─── COMPETITOR SCORING ─────────────────────────────────────────────────────
function scoreCompetitor(name: string, compUrl: string, qa: any[], allComps: string[]) {
  const aliases = buildAliases(name);
  const s = computeScores(name, aliases, qa, (allComps as string[]).filter((c: string) => c !== name));
  return {
    Brand: name,
    URL  : compUrl || `${name.toLowerCase().replace(/\s+/g, '')}.com`,
    GEO: s.geo, Vis: s.visibility, Cit: s.citationShare,
    Sen: s.sentiment, Sov: s.shareOfVoice, Prom: s.prominence, Rank: s.avgRank,
  };
}

// ─── QUERY CLUSTERS ─────────────────────────────────────────────────────────
function buildClusters(qa: any[], aliases: string[], competitors: string[]) {
  const cats = [...new Set(qa.filter(Boolean).map((r: any) => r.category).filter(Boolean))] as string[];
  return cats.map((cat: string) => {
    const rows     = qa.filter((r: any) => r && r.category === cat);
    const answered = rows.filter((r: any) => (r.a || '').trim().length > 10);
    const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
    const winRate  = answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0;
    const compCounts: Record<string, number> = {};
    answered.forEach((r: any) => {
      const t = (r.a || '').toLowerCase();
      (competitors as string[]).forEach((c: string) => {
        const ca = buildAliases(c);
        if (ca.some((a: string) => t.includes(a))) compCounts[c] = (compCounts[c] || 0) + 1;
      });
    });
    const stageBreakdown: Record<string, { total: number; mentioned: number }> = {};
    rows.forEach((r: any) => {
      const s = r.stage || 'Consideration';
      if (!stageBreakdown[s]) stageBreakdown[s] = { total: 0, mentioned: 0 };
      stageBreakdown[s].total++;
      if (aliases.some((a: string) => (r.a || '').toLowerCase().includes(a))) stageBreakdown[s].mentioned++;
    });
    return {
      category: cat, total: answered.length, mentioned: hits.length, winRate,
      topCompetitor: Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      dailySearches: 0, related: [], stageBreakdown,
    };
  });
}

// ─── EXTRACT CITATIONS from real AI responses ───────────────────────────────
// Scans actual AI answers for mentions of known source domains.
// These sources appear as text names (e.g. "NerdWallet", "Reddit") not URLs.
// Bug fix: match by name (nerdwallet) not by URL (nerdwallet.com) — AI doesn't cite URLs
const KNOWN_SOURCES: Record<string, string> = {
  'nerdwallet': 'Earned Media', 'bankrate': 'Earned Media', 'creditkarma': 'Earned Media',
  'thepointsguy': 'Earned Media', 'wallethub': 'Earned Media', 'investopedia': 'Earned Media',
  'consumerreports': 'Institution', 'forbes': 'Earned Media', 'cnbc': 'Earned Media',
  'businessinsider': 'Earned Media', 'motleyfool': 'Earned Media', 'wsj': 'Earned Media',
  'marketwatch': 'Earned Media', 'bloomberg': 'Earned Media', 'money': 'Earned Media',
  'reddit': 'Social', 'twitter': 'Social', 'youtube': 'Social', 'linkedin': 'Social',
  'wikipedia': 'Institution', 'fdic': 'Institution', 'consumerfinance': 'Institution',
  'experian': 'Institution', 'equifax': 'Institution', 'lendingtree': 'Earned Media',
};

function extractCitations(qa: any[], brandDomain: string, brand: string): any[] {
  const counts: Record<string, number> = {};
  const clean = brandDomain.replace('www.', '');
  const brandLower = brand.toLowerCase();

  qa.filter(Boolean).forEach((r: any) => {
    const t = (r.a || '').toLowerCase();
    // Count brand's own domain mentions
    if (t.includes(brandLower) || t.includes(clean)) {
      counts[clean] = (counts[clean] || 0) + 1;
    }
    // Count known sources by name (not URL)
    Object.keys(KNOWN_SOURCES).forEach((src: string) => {
      if (t.includes(src)) counts[src + '.com'] = (counts[src + '.com'] || 0) + 1;
    });
  });

  // Ensure brand domain always appears
  if (!counts[clean]) counts[clean] = 1;
  const tot = Object.values(counts).reduce((a: number, b: number) => a + b, 1);

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((e, i) => ({
      rank: i + 1, domain: e[0],
      citation_share: Math.round((e[1] / tot) * 100),
      top_pages: [],
      category: e[0] === clean ? 'Owned Media' : (KNOWN_SOURCES[e[0].replace('.com', '')] || 'Earned Media'),
    }));
}

// ─── MAIN POST HANDLER ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX = Math.min(Math.max(promptCount || 300, 50), 1000);

    // 1. Fetch page
    const page = await fetchPage(url);
    if (!page.ok) return NextResponse.json({ error: (page as any).error }, { status: 400 });

    // 2. Discover brand, industry, competitors, personas
    const d = await discoverBrand(page, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = d;
    const aliases = buildAliases(brand);

    // 3. Generate queries + citations + trending — all parallel
    const [queries, citRaw, trendRaw] = await Promise.all([

      generateQueries(lob, industry, categories, personas, MAX),

      // Citations: AI knows which domains it actually cites — ask it directly
      callAI([{ role: 'user', content:
`List 10 authoritative domains that AI models (ChatGPT, Perplexity) actually cite when answering ${lob || industry} questions in the USA.
Brand being scored: ${brand} (domain: ${(page as any).domain})
Return ONLY valid JSON:
[{"rank":1,"domain":"nerdwallet.com","category":"Earned Media","citation_share":12,"top_pages":["/best-credit-cards"]}]
Categories: Earned Media, Owned Media, Social, Institution, Other.
Include ${(page as any).domain} as rank 1 (Owned Media). Include a mix of earned media and institutions. Exactly 10 items.` }],
        0.1, 1000),

      // Trending: short natural questions, no brand names
      callAI([{ role: 'user', content:
`List 10 trending questions consumers are asking AI assistants about ${lob || industry} in the USA.
Return ONLY valid JSON:
[{"query":"best credit card for groceries","trend":"Rising","opportunity":"High","category":"Cash Back","estimated_daily_searches":8200}]
Rules: no brand names, short natural questions (under 15 words), realistic search volumes.
Exactly 10 items.` }],
        0.3, 900),
    ]);

    // 4. Answer all queries — parallel batches, max_tokens=4000
    const allQA: any[] = new Array(queries.length).fill(null);
    const batches: typeof queries[] = [];
    for (let i = 0; i < queries.length; i += ANSWER_BATCH) batches.push(queries.slice(i, i + ANSWER_BATCH));

    await Promise.all(batches.map(async (batch, bi) => {
      const ql     = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
      const labels = batch.map((_, j) => `A${j + 1}:`).join('\n');
      const prompt =
`Consumer advisor for ${lob || industry}. Answer every question. Name real brands — never be vague.
Name 2-4 brands per answer. Be balanced. 1-3 sentences per answer.

${ql}

Format:
${labels}`;
      const raw     = await callAI([{ role: 'user', content: prompt }], 0.3, 4000, 2);
      const answers = parseAnswers(raw, batch.length);
      batch.forEach((q, j) => {
        allQA[bi * ANSWER_BATCH + j] = {
          category: q.category, stage: q.stage, persona: q.persona,
          q: q.query, a: answers[j] || '',
        };
      });
    }));

    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = {
        category: queries[i]?.category || '', stage: queries[i]?.stage || '',
        persona: queries[i]?.persona || '', q: queries[i]?.query || '', a: '',
      };
    }

    // 5. Score brand
    const scores = computeScores(brand, aliases, allQA, competitors);

    // 6. Score competitors — same function, same pool
    const competitorScores = (competitors as string[])
      .filter((c: string) => c.toLowerCase() !== brand.toLowerCase())
      .map((c: string) => scoreCompetitor(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // 7. Response detail
    // NOTE: "avg_rank" on the main card = avg position WITHIN AI responses (e.g. #2 = named 2nd on average)
    // Position in competitor table = rank in the GEO leaderboard — these are DIFFERENT metrics
    const responsesDetail = allQA.filter(Boolean).map((r: any) => ({
      category: r.category, stage: r.stage, persona: r.persona, query: r.q,
      mentioned: aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)),
      response_preview: r.a || '',
      position: getBrandPosition(r.a || '', aliases),
      winner_brand: (() => {
        let winner = '', winPos = Infinity;
        const brandPos = getBrandPosition(r.a || '', aliases);
        (competitors as string[]).slice(0, 12).forEach((c: string) => {
          const ca  = buildAliases(c);
          const pos = getBrandPosition(r.a || '', ca);
          if (pos > 0 && pos < winPos && (brandPos === 0 || pos < brandPos)) { winPos = pos; winner = c; }
        });
        return winner || null;
      })(),
    }));

    // 8. Clusters
    const queryClusters = buildClusters(allQA, aliases, competitors);

    // 9. Stage win rates
    const stageWinRates = STAGES.map((s: typeof STAGES[0]) => {
      const rows     = allQA.filter((r: any) => r && r.stage === s.name);
      const answered = rows.filter((r: any) => (r.a || '').trim().length > 10);
      const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
      return { stage: s.name, winRate: answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0, total: answered.length };
    });

    // 10. Citations — try AI-generated first, fallback to scanning real responses
    const citationSources = (() => {
      const parsed = safeParseJSON(citRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return extractCitations(allQA, (page as any).domain || '', brand);
    })();

    // 11. Trending
    const trendingQueries = (() => {
      const parsed = safeParseJSON(trendRaw);
      return Array.isArray(parsed) ? parsed : [];
    })();

    // 12. Insights
    const topCats    = [...queryClusters].sort((a, b) => b.winRate - a.winRate).slice(0, 3).map((c: any) => c.category);
    const missCats   = queryClusters.filter((c: any) => c.winRate === 0).slice(0, 3).map((c: any) => c.category);
    const topComp    = competitorScores[0]?.Brand || 'competitors';
    const bestStage  = [...stageWinRates].sort((a, b) => b.winRate - a.winRate)[0];
    const worstStage = [...stageWinRates].sort((a, b) => a.winRate - b.winRate)[0];

    let insights = { strengths: [] as string[], improvements: [] as string[], actions: [] as any[] };
    try {
      const iRaw = await callAI([{ role: 'user', content:
`GEO strategist. Return ONLY valid JSON.
Brand:${brand} Product:${lob||industry} GEO:${scores.geo} Visibility:${scores.visibility}%(${scores.mentionCount}/${scores.totalCount}) Prominence:${scores.prominence}(${scores.avgRank}) Sentiment:${scores.sentiment} Citation:${scores.citationShare} SOV:${scores.shareOfVoice}%
Best stage:${bestStage?.stage} ${bestStage?.winRate}% Worst:${worstStage?.stage} ${worstStage?.winRate}%
Top:${topCats.join(',')||'none'} Missing:${missCats.join(',')||'none'} TopComp:${topComp}
Return:{"strengths":["3 strengths"],"improvements":["5 gaps"],"actions":[{"priority":"High","action":"action"},{"priority":"High","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Low","action":"action"}]}` }],
        0.2, 1200);
      const ip = safeParseJSON(iRaw);
      if (ip) insights = ip;
    } catch {}

    // 13. Targeted clusters
    let targetedClusters: any[] = [];
    try {
      const fRaw = await callAI([{ role: 'user', content:
`What specific products/features is "${brand}" genuinely known for in ${lob||industry}? Only real established reputation.
Return ONLY valid JSON:
{"knownFor":[{"product":"name","queries":["10 short brand-inviting questions, NO brand names"]}]}
Max 3 products.` }], 0.2, 1200);

      const fame    = safeParseJSON(fRaw);
      const knownFor: { product: string; queries: string[] }[] = fame?.knownFor || [];

      if (knownFor.length > 0) {
        const bl   = brand.toLowerCase();
        const bw   = bl.split(/\s+/).filter((w: string) => w.length > 4);
        const safe = (q: string) => { const ql = q.toLowerCase(); return !ql.includes(bl) && !bw.some((w: string) => ql.includes(w)); };
        const flat: { product: string; query: string }[] = [];
        knownFor.forEach((k: any) => k.queries.slice(0, 10).filter(safe).forEach((q: string) => flat.push({ product: k.product, query: q })));
        const tBatches: typeof flat[] = [];
        for (let i = 0; i < flat.length; i += 10) tBatches.push(flat.slice(i, i + 10));
        const tAllQA: any[] = [];
        await Promise.all(tBatches.map(async (batch) => {
          const ql     = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
          const labels = batch.map((_, j) => `A${j + 1}:`).join('\n');
          const r2     = await callAI([{ role: 'user', content: `Answer naming real brands. Be balanced.\n\n${ql}\n\nFormat:\n${labels}` }], 0.3, 2000, 2);
          const answers = parseAnswers(r2, batch.length);
          batch.forEach((item, j) => {
            const ans = answers[j] || '';
            tAllQA.push({ product: item.product, query: item.query, ans, mentioned: aliases.some((a: string) => ans.toLowerCase().includes(a)), position: getBrandPosition(ans, aliases) });
          });
        }));
        const pMap: Record<string, any[]> = {};
        tAllQA.forEach((r: any) => { (pMap[r.product] = pMap[r.product] || []).push(r); });
        targetedClusters = Object.entries(pMap).map(([product, rows]) => {
          const total2 = rows.length, hits2 = rows.filter((r: any) => r.mentioned).length;
          const posArr = rows.map((r: any) => r.position > 0 ? r.position : 5);
          const avgP2  = posArr.reduce((a: number, b: number) => a + b, 0) / posArr.length;
          const cc: Record<string, number> = {};
          rows.forEach((r: any) => { const t = (r.ans||'').toLowerCase(); (competitors as string[]).forEach((c: string) => { if (t.includes(c.toLowerCase()) && c.toLowerCase()!==bl) cc[c]=(cc[c]||0)+1; }); });
          return {
            product, total: total2, mentioned: hits2,
            winRate: total2 > 0 ? Math.round((hits2/total2)*100) : 0,
            prominence: Math.round(Math.max(5, Math.min(95, 100-(avgP2-1)*18))),
            avgRank: `#${Math.round(avgP2)}`,
            topCompetitor: Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'',
            responses: rows.map((r: any) => ({ query: r.query, mentioned: r.mentioned, position: r.position, response_preview: r.ans })),
          };
        }).sort((a, b) => b.winRate - a.winRate);
      }
    } catch {}

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
      strengths_list: insights.strengths||[], improvements_list: insights.improvements||[],
      actions: insights.actions||[],
      internal_links: (page as any).internalLinks||[], domain: (page as any).domain||'', page_url: url,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
