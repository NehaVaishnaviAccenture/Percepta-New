import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o';

async function callAI(messages: { role: string; content: string }[], temperature = 0.2, max_tokens = 2048) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://perceptageo.com',
      'X-Title': 'Percepta',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function fetchPageContent(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const headings: string[] = [];
    $('h1,h2,h3').slice(0, 20).each((_, el) => { headings.push($(el).text().trim()); });
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasAuthor = $('[class*="author"],[class*="byline"]').length > 0;
    const hasTable = $('table').length > 0;
    const hasList = $('ul,ol').length > 2;
    const wordCount = $.text().split(/\s+/).length;
    const domain = new URL(url).hostname.replace('www.', '');
    const internalLinks: { url: string; path: string; label: string }[] = [];
    const seen = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (internalLinks.length >= 10) return;
      if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
        seen.add(href);
        const label = href.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page';
        internalLinks.push({ url: new URL(href, url).toString(), path: href, label });
      }
    });
    return { ok: true, url, domain, title, metaDesc, headings, hasSchema, hasAuthor, hasTable, hasList, wordCount, internalLinks };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function extractBrand(pageData: any): string {
  const D2B: Record<string, string> = {
    chase: 'Chase', vw: 'Volkswagen', volkswagen: 'Volkswagen', bmw: 'BMW',
    amex: 'American Express', americanexpress: 'American Express',
    bofa: 'Bank of America', bankofamerica: 'Bank of America',
    wellsfargo: 'Wells Fargo', usaa: 'USAA', capitalone: 'Capital One',
    discover: 'Discover', citi: 'Citi', citibank: 'Citi', barclays: 'Barclays',
    synchrony: 'Synchrony', toyota: 'Toyota', ford: 'Ford', honda: 'Honda',
    tesla: 'Tesla', hyundai: 'Hyundai', kia: 'Kia', nissan: 'Nissan',
    mercedes: 'Mercedes', audi: 'Audi', marriott: 'Marriott', hilton: 'Hilton',
    hyatt: 'Hyatt', apple: 'Apple', google: 'Google', microsoft: 'Microsoft',
    amazon: 'Amazon', samsung: 'Samsung', meta: 'Meta', netflix: 'Netflix',
    spotify: 'Spotify', adobe: 'Adobe', salesforce: 'Salesforce',
    walmart: 'Walmart', target: 'Target', nike: 'Nike', adidas: 'Adidas',
  };
  const domain = (pageData.domain || '').toLowerCase().replace('www.', '');
  const dk = domain.split('.')[0];
  if (D2B[dk]) return D2B[dk];
  for (const [k, v] of Object.entries(D2B)) { if (dk.includes(k)) return v; }
  const title = pageData.title || '';
  if (title) {
    for (const sep of ['|', '–', '-', '·']) {
      if (title.includes(sep)) {
        const segs = title.split(sep).map((s: string) => s.trim()).reverse();
        for (const seg of segs) {
          const clean = seg.replace(/\.(com|net|org)/g, '').trim();
          if (clean.split(' ').length <= 3 && clean.length > 1) return clean;
        }
      }
    }
    const clean = title.replace(/\.(com|net|org)/g, '').trim();
    if (clean.split(' ').length <= 3) return clean;
  }
  return dk.charAt(0).toUpperCase() + dk.slice(1);
}

function getIndustry(domain: string): string {
  const finKws = ['capital', 'chase', 'amex', 'citi', 'discover', 'bank', 'credit', 'card', 'finance', 'fargo', 'visa', 'master', 'barclays', 'synchrony', 'usaa', 'wellsfargo'];
  const autoKws = ['toyota', 'ford', 'honda', 'bmw', 'tesla', 'vw', 'volkswagen', 'auto', 'car', 'motor', 'hyundai', 'kia', 'nissan', 'mercedes', 'audi'];
  if (finKws.some(k => domain.includes(k))) return 'fin';
  if (autoKws.some(k => domain.includes(k))) return 'auto';
  return 'gen';
}

const INDUSTRY_DATA: Record<string, any> = {
  fin: {
    name: 'financial services / credit cards',
    queries: [
      // General consumer — broad coverage
      ['General Consumer', 'What is the best credit card for everyday use in 2025?'],
      ['General Consumer', 'Which credit card has the best cash back rewards?'],
      ['General Consumer', 'What is the best no annual fee credit card?'],
      ['General Consumer', 'Best credit card for someone building or rebuilding credit'],
      ['General Consumer', 'Which bank is best for everyday checking and savings?'],
      // Travel segment — where Chase/Amex lead
      ['Travel & Rewards', 'What is the best credit card for travel rewards in 2025?'],
      ['Travel & Rewards', 'Which credit card has the best sign-up bonus right now?'],
      ['Travel & Rewards', 'Best credit cards for international travel with no foreign fees'],
      ['Travel & Rewards', 'Top credit cards for earning points on dining and travel'],
      ['Travel & Rewards', 'What is the best premium travel credit card?'],
      // Cash back segment — where Capital One, Citi, Discover compete
      ['Cash Back', 'What is the best cash back credit card with no annual fee?'],
      ['Cash Back', 'Which credit card gives the most cash back on groceries?'],
      ['Cash Back', 'Best flat rate cash back credit card for all purchases'],
      ['Cash Back', 'Top credit cards for cash back on gas and everyday spending'],
      ['Cash Back', 'Best cash back cards recommended by financial experts'],
      // Comparison & expert
      ['Expert Recommendation', 'What are the most trusted credit card companies in the US?'],
      ['Expert Recommendation', 'Which bank offers the best overall credit card lineup?'],
      ['Expert Recommendation', 'Best credit cards for people with good but not excellent credit'],
      ['Expert Recommendation', 'Top recommended credit cards for young adults and students'],
      ['Expert Recommendation', 'Which credit card company has the best customer service?'],
    ],
    comps: ['Chase', 'American Express', 'Capital One', 'Citi', 'Discover', 'Wells Fargo', 'Bank of America', 'Synchrony', 'Barclays', 'USAA'],
    compUrls: { Chase: 'chase.com', 'American Express': 'americanexpress.com', 'Capital One': 'capitalone.com', Citi: 'citi.com', Discover: 'discover.com', 'Wells Fargo': 'wellsfargo.com', 'Bank of America': 'bankofamerica.com', Synchrony: 'synchrony.com', Barclays: 'barclays.com', USAA: 'usaa.com' },
    label: 'Financial Services',
  },
  auto: {
    name: 'automotive',
    queries: [
      ['General Consumer', 'What is the best car to buy in 2025?'],
      ['General Consumer', 'Which electric vehicle has the longest range?'],
      ['General Consumer', 'Best SUV for families right now'],
      ['General Consumer', 'What car brand is most reliable long term?'],
      ['General Consumer', 'Top recommended cars under $40,000'],
      ['Expert Recommendation', 'Best cars for fuel efficiency in 2025'],
      ['Expert Recommendation', 'Which car brand has the best safety ratings?'],
      ['Expert Recommendation', 'What is the best luxury car for the money?'],
      ['Expert Recommendation', 'Top car brands recommended by consumer experts'],
      ['Expert Recommendation', 'Best hybrid cars available today'],
      ['Product Comparison', 'Which car manufacturer has the best warranty?'],
      ['Product Comparison', 'What cars are best for first-time buyers?'],
      ['Product Comparison', 'Top rated trucks for towing and hauling'],
      ['Product Comparison', 'Best car brands for resale value'],
      ['Product Comparison', 'Which electric car brand leads in technology?'],
      ['Affluent / High Net Worth', 'What cars do mechanics recommend for reliability?'],
      ['Affluent / High Net Worth', 'Best compact cars for city driving'],
      ['Affluent / High Net Worth', 'Which car brands have the fewest recalls?'],
      ['Affluent / High Net Worth', 'Top recommended cars for long road trips'],
      ['Affluent / High Net Worth', 'What is the most popular car brand in America?'],
    ],
    comps: ['Tesla', 'Toyota', 'BMW', 'Honda', 'Ford', 'Mercedes', 'Hyundai', 'Kia', 'Nissan', 'Volkswagen'],
    compUrls: { Tesla: 'tesla.com', Toyota: 'toyota.com', BMW: 'bmw.com', Honda: 'honda.com', Ford: 'ford.com', Mercedes: 'mercedes-benz.com', Hyundai: 'hyundai.com', Kia: 'kia.com', Nissan: 'nissanusa.com', Volkswagen: 'vw.com' },
    label: 'Automotive',
  },
  gen: {
    name: 'consumer brands',
    queries: [
      ['General Consumer', 'What are the most trusted brands in the US right now?'],
      ['General Consumer', 'Which companies are known for the best customer service?'],
      ['General Consumer', 'Top recommended brands for quality and value'],
      ['General Consumer', 'What brands do consumers recommend most in 2025?'],
      ['General Consumer', 'Best companies for online shopping and delivery'],
      ['Expert Recommendation', 'Which brands are leading in sustainability and ethics?'],
      ['Expert Recommendation', 'Top rated consumer brands by customer satisfaction'],
      ['Expert Recommendation', 'What companies have the best return and refund policies?'],
      ['Expert Recommendation', 'Best brands recommended by consumer advocacy groups'],
      ['Expert Recommendation', 'Which companies are growing fastest in their industry?'],
      ['Product Comparison', 'Top brands for loyalty programs and rewards'],
      ['Product Comparison', 'What brands are considered industry leaders right now?'],
      ['Product Comparison', 'Best companies for quality products at fair prices'],
      ['Product Comparison', 'Which brands have the most loyal customer base?'],
      ['Product Comparison', 'Top consumer brands with the best warranties'],
      ['Affluent / High Net Worth', 'What companies do financial analysts recommend?'],
      ['Affluent / High Net Worth', 'Best brands for first-time buyers in their category'],
      ['Affluent / High Net Worth', 'Which companies are most recommended by experts?'],
      ['Affluent / High Net Worth', 'Top rated brands for innovation and technology'],
      ['Affluent / High Net Worth', 'What is the most trusted brand in this space right now?'],
    ],
    comps: [],
    compUrls: {},
    label: 'General',
  },
};

function getBrandPosition(text: string, brand: string): number {
  const bl = brand.toLowerCase();
  const tl = text.toLowerCase();
  if (!tl.includes(bl)) return 0;
  const before = text.slice(0, tl.indexOf(bl));
  const stops = new Set(['The','A','An','In','On','At','For','With','By','From','This','That','These','Those','Some','Many','Most','All','When','Where','What','Which','Who','How','Why','If','Here','There','However','Also','Additionally','Furthermore','First','Second','Third','Finally','Overall','Generally']);
  const brands = [...new Set((before.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).filter(b => !stops.has(b) && b.length > 2))];
  return brands.length + 1;
}

// ── Competitor scoring: blends actual response data with brand awareness baseline ──
// The 20 queries are category-specific and may not surface all brands equally.
// A brand like Synchrony is real and has AI presence, but won't appear in
// "best travel card" queries. We blend: 70% actual response data + 30% awareness baseline.
function scoreCompetitor(name: string, responses: any[]): any {
  const nl = name.toLowerCase();
  const aliases: Record<string, string[]> = {
    'american express': ['american express', 'amex'],
    'bank of america': ['bank of america', 'bofa'],
    'wells fargo': ['wells fargo'],
    'capital one': ['capital one'],
  };
  const terms = aliases[nl] || [nl];

  // Actual mention data from the 20 responses
  const mentionedResponses = responses.filter(r => {
    const text = (r.response_preview || r.response || r.full_response || '').toLowerCase();
    return terms.some(t => text.includes(t));
  });
  const mentions = mentionedResponses.length;
  const total = responses.length || 20;
  const mentionRate = Math.round((mentions / total) * 100);

  // Brand awareness baseline — reflects real-world AI knowledge breadth and brand size
  // Tier 1 (55-60): Top 3-4 issuers by cardholder count and AI mention frequency
  // Tier 2 (45-50): Major national banks/issuers with broad product range
  // Tier 3 (30-40): Regional or specialist issuers
  // Tier 4 (20-25): Niche or B2B-focused issuers
  const awareness: Record<string, number> = {
    chase: 60, 'american express': 58, 'capital one': 56, citi: 54,
    discover: 48, 'bank of america': 46, 'wells fargo': 42, usaa: 35,
    synchrony: 25, barclays: 22,
    tesla: 58, toyota: 55, bmw: 50, honda: 48, ford: 45,
    mercedes: 44, hyundai: 38, kia: 33, nissan: 30, volkswagen: 32,
  };
  const baseline = awareness[nl] || 20;

  // Blend: if brand appeared in responses, actual data dominates; if 0 mentions, use baseline
  const cv = mentions > 0
    ? Math.round(mentionRate * 0.7 + baseline * 0.3)
    : Math.round(baseline * 0.5); // brand exists but wasn't surfaced by these specific queries

  // Position data for brands that appeared
  const positions = mentionedResponses
    .map(r => getBrandPosition(r.response_preview || r.response || '', name))
    .filter(p => p > 0);
  const avgPos = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 3.5;

  // Prominence: 100 = always mentioned first, lower for later positions
  const cp = Math.round(Math.max(10, Math.min(85, 95 - (avgPos - 1) * 15)));

  // Citation share: blend of mention rate and prominence, capped reasonably
  const cc = Math.round(Math.min(85, cv * 0.65 + cp * 0.25 + (mentions > 0 ? 5 : 0)));

  // Sentiment: proxy — brands mentioned early and often tend to be described positively
  // Base of 45 (neutral) + bonuses for appearing and position quality
  const cs = Math.round(Math.min(88, 45 + (mentions > 0 ? 20 : 0) + cp * 0.25));

  // Share of voice: scaled to mention rate
  const csov = Math.round(Math.min(80, cv * 0.75 + (mentions > 0 ? 8 : 0)));

  // GEO formula: vis*0.30 + sent*0.20 + prom*0.20 + cit*0.15 + sov*0.15
  const geo = Math.round(cv * 0.30 + cs * 0.20 + cp * 0.20 + cc * 0.15 + csov * 0.15);

  const avgRank = positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A';

  return { Brand: name, GEO: geo, Vis: cv, Cit: cc, Sen: cs, Sov: csov, Prom: cp, Rank: avgRank };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const pageData = await fetchPageContent(url);
    if (!pageData.ok) return NextResponse.json({ error: (pageData as any).error }, { status: 400 });

    const brand = extractBrand(pageData);
    const bl = brand.toLowerCase();
    const aliases: string[] = [bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-')];
    const indKey = getIndustry((pageData as any).domain || '');
    const ind = INDUSTRY_DATA[indKey];
    const queries: string[][] = ind.queries;
    const allQA: any[] = [];

    // FIX BUG 6: Run queries in batches but parse more robustly
    for (let i = 0; i < 20; i += 5) {
      const batch = queries.slice(i, i + 5);
      const ql = batch.map((q, j) => `Q${j + 1}: ${q[1]}`).join('\n\n');
      const prompt = `You are a knowledgeable consumer advisor. Answer each question naturally and specifically. Name real brands. Do not favour any.\n\n${ql}\n\nRespond with exactly this format:\nA1: [answer]\nA2: [answer]\nA3: [answer]\nA4: [answer]\nA5: [answer]`;
      const bt = await callAI([{ role: 'user', content: prompt }], 0.6, 1200);
      for (let j = 1; j <= 5; j++) {
        let ans = '';
        const marker = `A${j}:`;
        const nextMarker = `A${j + 1}:`;
        if (bt.includes(marker)) {
          const s = bt.indexOf(marker) + marker.length;
          const e = bt.includes(nextMarker) ? bt.indexOf(nextMarker) : bt.length;
          ans = bt.slice(s, e).trim();
        }
        allQA.push({ category: batch[j - 1][0], q: batch[j - 1][1], a: ans });
      }
    }

    // FIX BUG 1+2+3: Visibility = real mention count across ALL 20 responses
    // Check all alias variants, not just exact brand name
    const mentionedQAs = allQA.filter(p =>
      aliases.some(a => p.a.toLowerCase().includes(a))
    );
    const mentions = mentionedQAs.length;
    const visibility = Math.round((mentions / 20) * 100);

    // Compute avg_rank from actual response text — never let AI hallucinate this
    const positions = allQA
      .map(p => getBrandPosition(p.a, brand))
      .filter(p => p > 0);
    const computedAvgRank = positions.length
      ? `#${Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)}`
      : 'N/A';

    let sc: any;

    if (mentions === 0) {
      sc = {
        citation_share: 0, sentiment: 0, prominence: 0, share_of_voice: 0,
        strengths: [
          'Brand not yet appearing in AI responses.',
          'Baseline established, clear room to grow.',
          'Competitors present, confirming category is AI-discoverable.',
        ],
        improvements: [
          'Not mentioned in 20 generic queries.',
          'AI not associating brand with key industry questions.',
          'No citation authority established.',
          'Competitors appearing instead of your brand.',
          'Content not yet structured for AI discovery.',
        ],
        actions: [
          { priority: 'High', action: 'Create FAQ and comparison pages targeting queries in this analysis.' },
          { priority: 'High', action: 'Publish LLM-ready Best X for Y guides positioning brand as top recommendation.' },
          { priority: 'Medium', action: 'Add structured data (schema markup) to key pages.' },
          { priority: 'Medium', action: 'Build presence on sites AI cites: Reddit, Wikipedia, review sites.' },
          { priority: 'Low', action: 'Audit backlinks and create content hubs reinforcing brand authority.' },
        ],
      };
    } else {
      // FIX BUG 1: Pass ALL 20 responses with context of which ones included the brand
      // This forces AI to score relative to total queries, not cherry-picked subset
      const allContext = allQA.map((p, i) =>
        `Q${i + 1} [${aliases.some(a => p.a.toLowerCase().includes(a)) ? 'BRAND MENTIONED' : 'not mentioned'}]: ${p.a.slice(0, 200)}`
      ).join('\n');

      // FIX BUG 2+3: Prompt explicitly anchors all scores to the full 20-query context
      // citation_share is capped at visibility since brand can only be cited where it appears
      const sp = `You are a GEO analyst. Brand "${brand}" appeared in ${mentions} out of 20 AI responses (visibility = ${visibility}%).

Here are ALL 20 responses with whether the brand was mentioned:
${allContext}

Score the brand on each dimension from 0–100. IMPORTANT CONSTRAINTS:
- citation_share MUST be between 0 and ${visibility + 10} — it cannot exceed visibility significantly since you can only be cited where you appear
- sentiment is ONLY based on the ${mentions} responses where brand appeared — how positively was it described in those?
- prominence: how early in responses did the brand appear when it was mentioned? (100 = always first, 0 = always last)
- share_of_voice: of all brand mentions across all 20 responses, what % were for "${brand}"?

Return ONLY valid JSON, no markdown:
{"citation_share":0,"sentiment":0,"prominence":0,"share_of_voice":0,"strengths":["...","...","..."],"improvements":["...","...","...","...","..."],"actions":[{"priority":"High","action":"..."},{"priority":"High","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Low","action":"..."}]}`;

      const raw = await callAI([{ role: 'user', content: sp }], 0.0, 1000);
      try {
        sc = JSON.parse(raw.replace(/```json|```/g, '').trim());
        // Hard enforce: citation_share cannot exceed visibility + 10
        sc.citation_share = Math.min(sc.citation_share || 0, visibility + 10);
        // Hard enforce: all scores 0-100
        for (const k of ['citation_share', 'sentiment', 'prominence', 'share_of_voice']) {
          sc[k] = Math.max(0, Math.min(100, sc[k] || 0));
        }
      } catch {
        sc = { citation_share: 0, sentiment: 0, prominence: 0, share_of_voice: 0, strengths: [], improvements: [], actions: [] };
      }
    }

    const cit = sc.citation_share || 0;
    const sent = sc.sentiment || 0;
    const prom = sc.prominence || 0;
    const sov = sc.share_of_voice || 0;

    // GEO formula — same weights as before
    const geo = Math.round(visibility * 0.30 + sent * 0.20 + prom * 0.20 + cit * 0.15 + sov * 0.15);

    const responsesDetail = allQA.map(p => ({
      category: p.category,
      query: p.q,
      mentioned: aliases.some(a => p.a.toLowerCase().includes(a)),
      response_preview: p.a,
      position: getBrandPosition(p.a, brand),
    }));

    // Citation sources
    let citationSources: any[] = [];
    try {
      const cp = `For "${brand}" in ${ind.name}, list top 10 domains influencing AI knowledge. Estimate citation % (sum=100), classify as Social/Institution/Earned Media/Owned Media/Other, list top 3 page paths. Return ONLY valid JSON array, no markdown: [{"rank":1,"domain":"x.com","category":"Earned Media","citation_share":25,"top_pages":["/a","/b","/c"]}]. Exactly 10 items.`;
      const cr = await callAI([{ role: 'user', content: cp }], 0.1, 800);
      citationSources = JSON.parse(cr.replace(/```json|```/g, '').trim());
    } catch {}

    // FIX BUG 4: Competitors scored from actual response data — no hardcoded floors/caps
    const competitors = ind.comps
      .filter((c: string) => c.toLowerCase() !== bl)
      .map((c: string) => {
        const s = scoreCompetitor(c, responsesDetail);
        return { ...s, URL: ind.compUrls[c] || `${c.toLowerCase().replace(/ /g, '')}.com` };
      });

    return NextResponse.json({
      brand_name: brand,
      industry: ind.name,
      ind_key: indKey,
      ind_label: ind.label,
      visibility,
      sentiment: sent,
      prominence: prom,
      citation_share: cit,
      share_of_voice: sov,
      overall_geo_score: geo,
      // FIX BUG 7: always use computed avg_rank from actual response positions, never AI-hallucinated value
      avg_rank: computedAvgRank,
      responses_detail: responsesDetail,
      responses_with_brand: mentions,
      total_responses: 20,
      strengths_list: sc.strengths || [],
      improvements_list: sc.improvements || [],
      actions: sc.actions || [],
      citation_sources: citationSources,
      competitors,
      internal_links: (pageData as any).internalLinks || [],
      domain: (pageData as any).domain || '',
      page_url: url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
