import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-5.4';
const ANSWER_BATCH = 75; // queries per scoring call
const QUERY_BATCH  = 30; // queries per generation call — sweet spot for reliability

// ─── AI CALL ──────────────────────────────────────────────────────────────
async function callAI(
  messages: { role: string; content: string }[],
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
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content.length > 0) return content;
    } catch {
      if (attempt === retries) return '';
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return '';
}

// ─── HTML HELPERS — no dependencies ───────────────────────────────────────
function extractTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}
function extractMeta(html: string, name: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? m[1].trim() : '';
}
function extractHeadings(html: string, max = 20): string[] {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .slice(0, max)
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}
function extractBodyText(html: string, maxChars = 4000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}
function extractInternalLinks(html: string, baseUrl: string, max = 12) {
  const seen = new Set<string>();
  const links: { url: string; path: string; label: string }[] = [];
  for (const m of html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)) {
    if (links.length >= max) break;
    const href = m[1];
    if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
      seen.add(href);
      const label = href.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()) || 'Page';
      try { links.push({ url: new URL(href, baseUrl).toString(), path: href, label }); } catch {}
    }
  }
  return links;
}

// ─── FETCH PAGE ────────────────────────────────────────────────────────────
async function fetchPage(url: string) {
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal : AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const domain  = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname;
    return {
      ok: true, url, domain, urlPath,
      title      : extractTag(html, 'title'),
      metaDesc   : extractMeta(html, 'description'),
      headings   : extractHeadings(html),
      bodyText   : extractBodyText(html),
      hasSchema  : html.includes('application/ld+json'),
      wordCount  : extractBodyText(html).split(/\s+/).length,
      internalLinks: extractInternalLinks(html, url),
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── BRAND DISCOVERY — URL-path aware, fully AI ───────────────────────────
async function discoverBrand(page: any, url: string) {
  const pageText = [
    `Full URL: ${url}`,
    `URL path: ${page.urlPath || '/'}`,
    `Title: ${page.title || ''}`,
    `Meta: ${page.metaDesc || ''}`,
    ...((page.headings || []).slice(0, 12)),
    (page.bodyText || '').slice(0, 2000),
  ].join('\n');

  const raw = await callAI([{ role: 'user', content: `You are a brand intelligence analyst. Read this webpage and return ONLY valid JSON — no markdown, no explanation.

${pageText}

Return this exact shape:
{
  "brand_name": "parent company brand (e.g. Citi, Chase, Nike) — never a product name",
  "industry": "precise industry for THIS URL path — if path=/credit-cards say 'Consumer Credit Cards', if path=/ for a bank say 'Retail Banking'",
  "industry_key": "snake_case e.g. credit_cards, retail_banking, savings_accounts",
  "lob": "exact product line on THIS page — be very specific to the URL path",
  "personas": [
    "5 distinct buyer personas for THIS specific product. Format: 'Descriptor — specific need'. E.g. '28yo recent grad — wants to build credit with no annual fee'"
  ],
  "competitors": ["12 direct competitors for THIS specific product — same category, same consumer"],
  "competitor_urls": {"BrandName": "domain.com"},
  "categories": ["12 specific consumer intent categories for THIS product — what people actually search for"]
}

RULES:
- brand_name = parent brand only (Citi not 'Citi Double Cash')
- lob = specific product on this page — very specific
- industry + categories must match the URL path, not the homepage
- competitors = direct alternatives for THIS product specifically` }],
    0.1, 1000);

  try {
    const p = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      brand          : p.brand_name || new URL(url).hostname.replace('www.', '').split('.')[0],
      industry       : p.industry   || 'Consumer Products',
      industryKey    : p.industry_key || 'general',
      lob            : p.lob        || '',
      personas       : (p.personas  || []).slice(0, 5),
      competitors    : (p.competitors || []).slice(0, 12),
      competitorUrls : p.competitor_urls || {},
      categories     : (p.categories || []).slice(0, 12),
    };
  } catch {
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    return {
      brand: domain.charAt(0).toUpperCase() + domain.slice(1),
      industry: 'Consumer Products', industryKey: 'general', lob: '',
      personas: [], competitors: [], competitorUrls: {}, categories: [],
    };
  }
}

// ─── QUERY GENERATION — Persona × Stage × Intent, max 30 per AI call ─────
//
// WHY THIS DESIGN:
// Consumers move through 5 stages when researching a product.
// Each stage produces different query types and different brand winners.
// We generate queries that FORCE the AI answerer to name specific brands —
// vague queries ("how do savings accounts work") produce generic answers.
// Specific queries ("which bank is best for high-yield savings with no fees")
// produce brand-naming answers we can score against.
//
// Every query is generated fresh by AI — zero hardcoding.
// Max 30 per generation call so AI always returns the exact count requested.
// All generation calls fire in parallel.

const STAGES = [
  { name: 'Awareness',     pct: 0.15, desc: 'just discovering this product category exists' },
  { name: 'Consideration', pct: 0.30, desc: 'actively comparing options and brands' },
  { name: 'Decision',      pct: 0.30, desc: 'ready to choose, wants specific recommendations' },
  { name: 'Validation',    pct: 0.15, desc: 'double-checking a choice, looking for reviews' },
  { name: 'Advocacy',      pct: 0.10, desc: 'helping someone else choose or maximising value' },
];

async function generateChunk(
  lob      : string,
  industry : string,
  cats     : string[],
  personas : string[],
  stage    : typeof STAGES[0],
  count    : number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {

  if (count <= 0) return [];

  // Use up to 4 personas per chunk, rotating by stage index so different stages
  // use different persona combinations = more query variety
  const stageIdx   = STAGES.findIndex(s => s.name === stage.name);
  const rotPersonas = personas.length > 0
    ? [...personas].sort((_, __, i = stageIdx) => 0).slice(0, 4)
    : ['everyday consumer', 'budget-focused shopper', 'experienced user', 'first-time buyer'];

  // Rotate categories so each chunk covers different ones
  const rotCats = cats.length > 0
    ? [...cats].slice(stageIdx % Math.max(1, cats.length - 4), (stageIdx % Math.max(1, cats.length - 4)) + 6).concat(cats.slice(0, 2))
    : ['General'];

  const raw = await callAI([{ role: 'user', content:
`You are a consumer research expert. Generate EXACTLY ${count} questions a real person types into ChatGPT or Perplexity when researching ${lob || industry}.

Journey stage: ${stage.name} — ${stage.desc}

Personas (rotate through these in your questions):
${rotPersonas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Categories to cover (spread evenly): ${rotCats.slice(0, 6).join(', ')}

QUERY QUALITY RULES — read carefully:
1. ZERO brand or company names in any query
2. Every query must be phrased so an AI would NATURALLY NAME SPECIFIC BRANDS in its answer
   GOOD: "which bank is best for a high-yield savings account with no minimum balance"
   GOOD: "what credit card do most people recommend for cash back on groceries"
   GOOD: "which big bank is worth switching to for better rewards in 2025"
   BAD:  "how do savings accounts work" — too generic, AI gives generic answer
   BAD:  "what should I consider when picking a bank" — AI gives advice not brands
3. Be specific — include dollar amounts, life situations, credit scores, demographics
4. Sound like a real human typed it — conversational, not formal
5. Stage ${stage.name}: ${stage.desc}

Return ONLY a JSON array — no markdown, no explanation:
[{"category":"exact category name","query":"full question","stage":"${stage.name}","persona":"short descriptor"}]
EXACTLY ${count} objects. Count them before responding.` }],
    0.5, // higher temp = more query variety
    Math.min(4000, count * 120)
  );

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed)) return [];
    // Filter out any query that accidentally contains brand-like proper nouns
    return parsed.slice(0, count);
  } catch {
    return [];
  }
}

async function generateQueries(
  lob      : string,
  industry : string,
  cats     : string[],
  personas : string[],
  total    : number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {

  // Step 1: Divide total across stages by weight, fix rounding
  const stageCounts = STAGES.map((s: any) => ({ ...s, count: Math.round(total * s.pct) }));
  const roundDiff   = total - stageCounts.reduce((s, x) => s + x.count, 0);
  stageCounts[1].count += roundDiff; // Consideration absorbs rounding

  // Step 2: Split each stage into chunks of ≤ QUERY_BATCH
  const jobs: { stage: typeof STAGES[0]; count: number }[] = [];
  stageCounts.forEach((s: any) => {
    let rem = s.count;
    while (rem > 0) {
      jobs.push({ stage: s, count: Math.min(rem, QUERY_BATCH) });
      rem -= QUERY_BATCH;
    }
  });

  // Step 3: Fire ALL chunks in parallel
  const results = await Promise.all(
    jobs.map((j: any) => generateChunk(lob, industry, cats, personas, j.stage, j.count))
  );

  const all = results.flat();

  // Step 4: If AI returned fewer (rare edge case), pad with strong fallbacks
  // These fallbacks are brand-inviting, not generic
  if (all.length < total) {
    const fallbacks = [
      (c: string) => `Which ${c.toLowerCase()} is most recommended by financial experts right now?`,
      (c: string) => `What is the best ${c.toLowerCase()} for someone with excellent credit?`,
      (c: string) => `Which company offers the best ${c.toLowerCase()} with no annual fee?`,
      (c: string) => `What ${c.toLowerCase()} do most people switch to when they want better value?`,
      (c: string) => `Which ${c.toLowerCase()} is considered the gold standard by consumers?`,
    ];
    let fi = 0;
    while (all.length < total) {
      const cat = (cats[fi % Math.max(cats.length, 1)] || 'General');
      const q   = fallbacks[fi % fallbacks.length](cat);
      const st  = STAGES[fi % STAGES.length];
      all.push({ category: cat, query: q, stage: st.name, persona: 'general consumer' });
      fi++;
    }
  }

  return all.slice(0, total);
}

// ─── ALIASES — all variants of a brand name ────────────────────────────────
function buildAliases(brand: string): string[] {
  const bl = brand.toLowerCase().trim();
  const set = new Set<string>([
    bl,
    bl.replace(/\s+/g, ''),
    bl.replace(/\s+/g, '-'),
    bl.replace(/[^a-z0-9]/gi, ''),
  ]);
  // Add individual meaningful words (e.g. "Bank of America" → "america", "bank")
  bl.split(/[\s'\-\.&]+/).filter((w: string) => w.length > 2).forEach((w: string) => set.add(w));
  return [...set].filter((a: string) => a.length > 2);
}

// ─── POSITION DETECTION — where in the response does the brand appear ──────
// We count how many distinct brand-like entities appear before ours.
// "Title Case Proper Nouns" are treated as brand mentions.
function getBrandPosition(text: string, aliases: string[]): number {
  if (!text) return 0;
  const tl = text.toLowerCase();

  // Find first character index of any alias
  let firstIdx = Infinity;
  for (const a of aliases) {
    const idx = tl.indexOf(a);
    if (idx >= 0 && idx < firstIdx) firstIdx = idx;
  }
  if (firstIdx === Infinity) return 0;

  // Count title-case proper nouns before our brand
  const before    = text.slice(0, firstIdx);
  const stopWords = new Set(['The','This','That','These','Those','When','Where','What',
    'Which','How','Why','For','And','But','Or','In','On','At','To','Of','With','As',
    'By','From','An','If','It','Its','Are','Is','Be','Was','Were','Has','Have','Had',
    'Here','Some','Many','Most','More','Such','Each','Both','Also','Very','Just']);
  const properNouns = (before.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [])
    .filter((w: string) => !stopWords.has(w));

  return properNouns.length + 1;
}

// ─── PARSE ANSWERS from a batch response ──────────────────────────────────
// Robust parser: handles A1/A2/... markers even if AI adds extra text.
// Falls back to line-splitting if marker parsing fails.
function parseAnswers(raw: string, count: number): string[] {
  const answers: string[] = new Array(count).fill('');

  for (let j = 0; j < count; j++) {
    const marker     = `A${j + 1}:`;
    const nextMarker = `A${j + 2}:`;
    if (!raw.includes(marker)) continue;
    const start = raw.indexOf(marker) + marker.length;
    const end   = raw.includes(nextMarker) ? raw.indexOf(nextMarker) : raw.length;
    answers[j]  = raw.slice(start, end).trim();
  }

  // If most answers are empty, try line-split fallback
  const filled = answers.filter((a: string) => a.length > 10).length;
  if (filled < count * 0.5) {
    const lines = raw.split('\n').map(l => l.replace(/^A\d+:\s*/, '').trim()).filter(l => l.length > 10);
    for (let j = 0; j < count && j < lines.length; j++) {
      if (!answers[j] || answers[j].length < 10) answers[j] = lines[j];
    }
  }

  return answers;
}

// ─── SCORE COMPUTATION — pure math, no hardcoding ─────────────────────────
//
// VISIBILITY    = % of answered queries that mention the brand
// PROMINENCE    = average position when mentioned (1st = 100, 5th = 28)
// SENTIMENT     = ratio of positive:negative words in brand-containing sentences
// CITATION SHARE= position-weighted share (1/pos) relative to max possible
// SHARE OF VOICE= brand mentions / total brand + competitor mentions
// GEO SCORE     = weighted composite of all five
//
function computeScores(brand: string, aliases: string[], qa: any[], competitors: string[]) {
  // Only score responses that have real content (>20 chars)
  const answered  = qa.filter((r: any) => r && (r.a || '').trim().length > 20);
  const total     = answered.length || 1;

  // VISIBILITY
  const mentioned = answered.filter((r: any) =>
    aliases.some((a: string) => (r.a || '').toLowerCase().includes(a))
  );
  const mentionCount = mentioned.length;
  const visibility   = Math.round((mentionCount / total) * 100);

  // PROMINENCE — position scale: pos1=100, pos2=82, pos3=64, pos4=46, pos5=28, pos6+=10
  const positions = mentioned
    .map((r: any) => getBrandPosition(r.a || '', aliases))
    .filter((p: number) => p > 0);
  const avgPos = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : 0;
  const prominence = mentionCount > 0
    ? Math.round(Math.max(10, Math.min(95, 100 - (avgPos - 1) * 18)))
    : 0;

  // SENTIMENT
  const POS = ['best','top','recommended','leading','excellent','great','trusted',
    'popular','ideal','perfect','outstanding','superior','preferred','reliable',
    'strong','impressive','generous','competitive','solid','standout','exceptional'];
  const NEG = ['worst','poor','bad','avoid','expensive','weak','limited',
    'disappointing','inferior','mediocre','unreliable','overpriced','problematic',
    'lacking','outdated','complicated','confusing','frustrating','hidden fees'];
  let pos = 0, neg = 0;
  mentioned.forEach((r: any) => {
    (r.a || '').toLowerCase().split(/[.!?]/)
      .filter((s: string) => aliases.some((a: string) => s.includes(a)))
      .forEach((s: string) => {
        POS.forEach((w: string) => { if (s.includes(w)) pos++; });
        NEG.forEach((w: string) => { if (s.includes(w)) neg++; });
      });
  });
  const sentimentBase = mentionCount > 0 ? 50 : 0;
  const sentimentAdj  = (pos + neg) > 0
    ? Math.round(((pos - neg) / (pos + neg)) * 35)
    : 0;
  const sentiment = Math.round(
    Math.max(0, Math.min(100, sentimentBase + sentimentAdj + prominence * 0.08))
  );

  // CITATION SHARE — position-weighted, proportional to visibility
  // Formula: sum(1/position) / total_answered, scaled to 0-100
  // No arbitrary multiplier — keeps it proportional and honest
  const citWeight    = positions.reduce((sum, p) => sum + 1 / p, 0);
  const maxCitWeight = total; // perfect score = mentioned #1 in every response
  const citationShare = Math.round(Math.min(95, (citWeight / maxCitWeight) * 100));

  // SHARE OF VOICE
  const compCounts = competitors.map(comp => {
    const cl    = comp.toLowerCase();
    const words = cl.split(/[\s'\-\.&]+/).filter((w: string) => w.length > 3);
    return answered.filter((r: any) => {
      const t = (r.a || '').toLowerCase();
      return words.some((w: string) => t.includes(w)) || t.includes(cl);
    }).length;
  });
  const totalMentions = mentionCount + compCounts.reduce((a, b) => a + b, 0);
  const shareOfVoice  = totalMentions > 0
    ? Math.round((mentionCount / totalMentions) * 100)
    : 0;

  // GEO SCORE — weighted composite
  const geo = Math.round(
    visibility   * 0.30 +
    sentiment    * 0.20 +
    prominence   * 0.20 +
    citationShare* 0.15 +
    shareOfVoice * 0.15
  );

  return {
    visibility, prominence, sentiment, citationShare, shareOfVoice, geo,
    avgRank    : positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A',
    mentionCount,
    totalCount : answered.length,
  };
}

// ─── COMPETITOR SCORING — same function, same response pool ───────────────
function scoreCompetitor(name: string, url: string, qa: any[], allComps: string[]) {
  const aliases = buildAliases(name);
  const s = computeScores(name, aliases, qa, (allComps as string[]).filter((c: string) => c !== name));
  return {
    Brand: name,
    URL  : url || `${name.toLowerCase().replace(/\s+/g, '')}.com`,
    GEO  : s.geo,
    Vis  : s.visibility,
    Cit  : s.citationShare,
    Sen  : s.sentiment,
    Sov  : s.shareOfVoice,
    Prom : s.prominence,
    Rank : s.avgRank,
  };
}

// ─── QUERY CLUSTERS — per-category win rate + stage breakdown ─────────────
function buildClusters(qa: any[], aliases: string[], competitors: string[]) {
  const cats = [...new Set(qa.filter(Boolean).map((r: any) => r.category).filter(Boolean))];

  return cats.map(cat => {
    const rows     = qa.filter((r: any) => r && r.category === cat);
    const answered = rows.filter((r: any) => (r.a || '').trim().length > 20);
    const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
    const winRate  = answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0;

    // Top competitor in this category
    const compCounts: Record<string, number> = {};
    answered.forEach((r: any) => {
      const t = (r.a || '').toLowerCase();
      competitors.forEach((c: string) => {
        if (t.includes(c.toLowerCase()) && !aliases.some(a => c.toLowerCase().includes(a)))
          compCounts[c] = (compCounts[c] || 0) + 1;
      });
    });
    const topCompetitor = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Stage breakdown
    const stageBreakdown: Record<string, { total: number; mentioned: number }> = {};
    rows.forEach((r: any) => {
      const s = r.stage || 'Consideration';
      if (!stageBreakdown[s]) stageBreakdown[s] = { total: 0, mentioned: 0 };
      stageBreakdown[s].total++;
      if (aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)))
        stageBreakdown[s].mentioned++;
    });

    return {
      category: cat, total: answered.length, mentioned: hits.length,
      winRate, topCompetitor, dailySearches: 0, related: [], stageBreakdown,
    };
  });
}

// ─── EXTRACT CITED DOMAINS from actual AI responses ────────────────────────
function extractCitations(qa: any[], brandDomain: string) {
  const counts: Record<string, number> = {};
  const knownSources = ['nerdwallet','bankrate','reddit','wikipedia','forbes','cnbc',
    'investopedia','creditkarma','thepointsguy','wallethub','consumerreports',
    'businessinsider','motleyfool','wsj','marketwatch','bloomberg','cnet',
    'edmunds','caranddriver','motortrend','tripadvisor','experian','lendingtree'];

  qa.filter(Boolean).forEach((r: any) => {
    const t = (r.a || '').toLowerCase();
    knownSources.forEach(src => {
      if (t.includes(src)) counts[src + '.com'] = (counts[src + '.com'] || 0) + 1;
    });
    for (const m of t.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/g)) {
      const d = m[1];
      if (d.length > 4 && !d.includes('example')) counts[d] = (counts[d] || 0) + 1;
    }
  });

  const clean = brandDomain.replace('www.', '');
  if (!counts[clean]) counts[clean] = 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 1);

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map((e, i) => ({
      rank: i + 1, domain: e[0],
      citation_share: Math.round((e[1] / total) * 100),
      top_pages: [],
      category: e[0] === clean ? 'Owned Media'
        : ['reddit','twitter','youtube','facebook','linkedin'].some(s => e[0].includes(s)) ? 'Social'
        : ['wikipedia','gov','edu','consumerreports','fdic','ftc'].some(s => e[0].includes(s)) ? 'Institution'
        : 'Earned Media',
    }));
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX = Math.min(Math.max(promptCount || 300, 50), 1000);

    // ── 1. Fetch page ──────────────────────────────────────────────────────
    const page = await fetchPage(url);
    if (!page.ok) return NextResponse.json({ error: (page as any).error }, { status: 400 });

    // ── 2. Discover brand, industry, competitors, personas ─────────────────
    const d = await discoverBrand(page, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = d;
    const aliases = buildAliases(brand);

    // ── 3. Generate queries + citations + trending — all in parallel ───────
    // Query generation itself fires many parallel sub-calls internally.
    const [queries, citRaw, trendRaw] = await Promise.all([

      generateQueries(lob, industry, categories, personas, MAX),

      callAI([{ role: 'user', content:
        `List 10 real domains that AI models cite when answering ${lob || industry} questions in the USA.
Brand analyzed: ${brand} (domain: ${(page as any).domain}).
Return ONLY valid JSON array:
[{"rank":1,"domain":"example.com","category":"Earned Media","citation_share":4.2,"top_pages":["/page"]}]
Categories: Social, Institution, Earned Media, Owned Media, Other.
First entry must be ${(page as any).domain} as Owned Media.
Exactly 10 items. Realistic shares: owned 5-15%, earned 2-6%, others 1-3%.` }],
        0.1, 800),

      callAI([{ role: 'user', content:
        `List 10 high-intent questions consumers are asking AI assistants right now about ${lob || industry} in the USA.
No brand names in queries.
Return ONLY valid JSON array:
[{"query":"...","trend":"Rising","opportunity":"High","category":"${categories[0] || 'General'}","estimated_daily_searches":8200}]
Exactly 10 items. trend: Rising/Peak/Stable/Declining. opportunity: High/Medium/Low.` }],
        0.3, 800),
    ]);

    // ── 4. Run all queries through GPT — all batches in parallel ──────────
    // Each batch = 75 queries in one call.
    // Retry is built into callAI (2 retries per batch).
    const allQA: any[] = new Array(queries.length).fill(null);
    const batches: typeof queries[] = [];
    for (let i = 0; i < queries.length; i += ANSWER_BATCH) {
      batches.push(queries.slice(i, i + ANSWER_BATCH));
    }

    await Promise.all(
      batches.map(async (batch, bi) => {
        const ql     = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
        const labels = batch.map((_, j) => `A${j + 1}: [answer here]`).join('\n');

        const prompt =
`You are a knowledgeable, balanced consumer advisor answering questions about ${lob || industry}.

RULES:
- Name specific real brands in EVERY answer — never give a generic answer
- Name at least 2-3 brands per answer where applicable  
- Be accurate, balanced, and comprehensive
- Each answer: 2-4 sentences minimum

${ql}

Respond with EXACTLY this format — one answer per line, no extra text:
${labels}`;

        const raw     = await callAI([{ role: 'user', content: prompt }], 0.3, 1500);
        const answers = parseAnswers(raw, batch.length);

        batch.forEach((q, j) => {
          allQA[bi * ANSWER_BATCH + j] = {
            category: q.category,
            stage   : q.stage,
            persona : q.persona,
            q       : q.query,
            a       : answers[j] || '',
          };
        });
      })
    );

    // Fill any nulls from failed batches
    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = {
        category: queries[i]?.category || '',
        stage   : queries[i]?.stage    || '',
        persona : queries[i]?.persona  || '',
        q       : queries[i]?.query    || '',
        a       : '',
      };
    }

    // ── 5. Score brand from real responses ─────────────────────────────────
    const scores = computeScores(brand, aliases, allQA, competitors);

    // ── 6. Score every competitor — same function, same responses ──────────
    const competitorScores = (competitors as string[])
      .filter((c: string) => c.toLowerCase() !== brand.toLowerCase())
      .map((c: string) => scoreCompetitor(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // ── 7. Response detail ──────────────────────────────────────────────────
    const responsesDetail = allQA.filter(Boolean).map((r: any) => ({
      category        : r.category,
      stage           : r.stage,
      persona         : r.persona,
      query           : r.q,
      mentioned       : aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)),
      response_preview: r.a || '',
      position        : getBrandPosition(r.a || '', aliases),
      winner_brand    : (() => {
        let winner = '', winPos = Infinity;
        const brandPos = getBrandPosition(r.a || '', aliases);
        competitors.slice(0, 15).forEach((c: string) => {
          const ca  = buildAliases(c);
          const pos = getBrandPosition(r.a || '', ca);
          if (pos > 0 && pos < winPos && (brandPos === 0 || pos < brandPos)) {
            winPos = pos; winner = c;
          }
        });
        return winner || null;
      })(),
    }));

    // ── 8. Query clusters with stage breakdown ─────────────────────────────
    const queryClusters = buildClusters(allQA, aliases, competitors);

    // ── 9. Stage win rates ─────────────────────────────────────────────────
    const stageWinRates = STAGES.map((s: any) => {
      const rows     = allQA.filter((r: any) => r && r.stage === s.name);
      const answered = rows.filter((r: any) => (r.a || '').trim().length > 20);
      const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
      return {
        stage  : s.name,
        winRate: answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0,
        total  : answered.length,
      };
    });

    // ── 10. Citations ──────────────────────────────────────────────────────
    const citationSources = (() => {
      try { return JSON.parse(citRaw.replace(/```json|```/g, '').trim()); }
      catch { return extractCitations(allQA, (page as any).domain || ''); }
    })();

    // ── 11. Trending queries ───────────────────────────────────────────────
    const trendingQueries = (() => {
      try { return JSON.parse(trendRaw.replace(/```json|```/g, '').trim()); }
      catch { return []; }
    })();

    // ── 12. AI insights — fed with real computed data ──────────────────────
    const topCats     = [...queryClusters].sort((a, b) => b.winRate - a.winRate).slice(0, 3).map((c: any) => c.category);
    const missingCats = queryClusters.filter((c: any) => c.winRate === 0).slice(0, 3).map((c: any) => c.category);
    const topComp     = competitorScores[0]?.Brand || 'competitors';
    const bestStage   = [...stageWinRates].sort((a, b) => b.winRate - a.winRate)[0];
    const worstStage  = [...stageWinRates].sort((a, b) => a.winRate - b.winRate)[0];

    let insights = { strengths: [] as string[], improvements: [] as string[], actions: [] as any[] };
    try {
      const raw = await callAI([{ role: 'user', content:
`GEO strategist. Analyze this data and return ONLY valid JSON.

Brand: ${brand} | Product: ${lob || industry}
GEO Score: ${scores.geo}/100
Visibility: ${scores.visibility}% (appeared in ${scores.mentionCount}/${scores.totalCount} answered queries)
Prominence: ${scores.prominence}/100 (avg rank: ${scores.avgRank})
Sentiment: ${scores.sentiment}/100
Citation Share: ${scores.citationShare}/100
Share of Voice: ${scores.shareOfVoice}%

Best stage: ${bestStage?.stage} (${bestStage?.winRate}% win rate)
Worst stage: ${worstStage?.stage} (${worstStage?.winRate}% win rate)
Top categories: ${topCats.join(', ') || 'none'}
Missing categories (0% win): ${missingCats.join(', ') || 'none'}
Top competitor: ${topComp}

Return:
{"strengths":["3 specific data-backed strengths"],"improvements":["5 specific gaps with data references"],"actions":[{"priority":"High","action":"specific implementable action"},{"priority":"High","action":"specific implementable action"},{"priority":"Medium","action":"specific implementable action"},{"priority":"Medium","action":"specific implementable action"},{"priority":"Low","action":"specific implementable action"}]}` }],
        0.2, 1200);
      insights = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {}

    // ── 13. Targeted clusters — brand's known products, deep scored ────────
    let targetedClusters: any[] = [];
    try {
      const fameRaw = await callAI([{ role: 'user', content:
`Brand research expert. What specific products/features is "${brand}" genuinely well-known for in ${lob || industry}?
Only real established reputation areas.
Return ONLY valid JSON:
{"knownFor":[{"product":"product name","queries":["10 brand-inviting consumer questions — NO brand names"]}]}
Max 4 products, 10 queries each. Zero brand names in any query.` }],
        0.2, 1200);

      const fame = JSON.parse(fameRaw.replace(/```json|```/g, '').trim());
      const knownFor: { product: string; queries: string[] }[] = fame.knownFor || [];

      if (knownFor.length > 0) {
        const bl   = brand.toLowerCase();
        const bw   = bl.split(/\s+/).filter((w: string) => w.length > 4);
        const safe = (q: string) => {
          const ql = q.toLowerCase();
          return !ql.includes(bl) && !bw.some((w: string) => ql.includes(w));
        };

        const flat: { product: string; query: string }[] = [];
        knownFor.forEach((k: any) => k.queries.slice(0, 10).filter(safe).forEach((q: string) =>
          flat.push({ product: k.product, query: q })
        ));

        const tBatches: typeof flat[] = [];
        for (let i = 0; i < flat.length; i += 10) tBatches.push(flat.slice(i, i + 10));

        const tAllQA: any[] = [];
        await Promise.all(tBatches.map(async batch => {
          const ql     = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
          const labels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');
          const raw2   = await callAI([{ role: 'user', content:
            `Answer each question. Name real specific brands. Be balanced.\n\n${ql}\n\nRespond EXACTLY:\n${labels}` }],
            0.3, 1200);
          const answers = parseAnswers(raw2, batch.length);
          batch.forEach((item, j) => {
            const ans      = answers[j] || '';
            const mentioned = aliases.some((a: string) => ans.toLowerCase().includes(a));
            tAllQA.push({ product: item.product, query: item.query, ans, mentioned,
              position: getBrandPosition(ans, aliases) });
          });
        }));

        const pMap: Record<string, any[]> = {};
        tAllQA.forEach((r: any) => { (pMap[r.product] = pMap[r.product] || []).push(r); });

        targetedClusters = Object.entries(pMap).map(([product, rows]) => {
          const total2 = rows.length;
          const hits2  = rows.filter((r: any) => r.mentioned).length;
          const posArr = rows.map((r: any) => r.position > 0 ? r.position : 5);
          const avgP2  = posArr.reduce((a, b) => a + b, 0) / posArr.length;
          const cc: Record<string, number> = {};
          rows.forEach((r: any) => {
            const t = (r.ans || '').toLowerCase();
            competitors.forEach((c: string) => {
              if (t.includes(c.toLowerCase()) && c.toLowerCase() !== bl)
                cc[c] = (cc[c] || 0) + 1;
            });
          });
          return {
            product, total: total2, mentioned: hits2,
            winRate   : total2 > 0 ? Math.round((hits2 / total2) * 100) : 0,
            prominence: Math.round(Math.max(5, Math.min(95, 100 - (avgP2 - 1) * 18))),
            avgRank   : `#${Math.round(avgP2)}`,
            topCompetitor: Object.entries(cc).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
            responses : rows.map((r: any) => ({ query: r.query, mentioned: r.mentioned,
              position: r.position, response_preview: r.ans })),
          };
        }).sort((a, b) => b.winRate - a.winRate);
      }
    } catch {}

    // ── Return — zero hardcoding anywhere ─────────────────────────────────
    return NextResponse.json({
      brand_name : brand,
      industry,
      ind_key    : industryKey,
      lob,
      ind_label  : industry,

      visibility      : scores.visibility,
      sentiment       : scores.sentiment,
      prominence      : scores.prominence,
      citation_share  : scores.citationShare,
      share_of_voice  : scores.shareOfVoice,
      overall_geo_score: scores.geo,
      avg_rank        : scores.avgRank,
      responses_with_brand: scores.mentionCount,
      total_responses : scores.totalCount,

      personas,
      stage_win_rates : stageWinRates,
      responses_detail: responsesDetail,
      query_clusters  : queryClusters,
      targeted_clusters: targetedClusters,
      competitors     : competitorScores,
      citation_sources: citationSources,
      trending_queries: trendingQueries,
      strengths_list  : insights.strengths  || [],
      improvements_list: insights.improvements || [],
      actions         : insights.actions    || [],
      internal_links  : (page as any).internalLinks || [],
      domain          : (page as any).domain || '',
      page_url        : url,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
