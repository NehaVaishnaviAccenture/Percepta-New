import { NextRequest, NextResponse } from 'next/server';

const MODEL        = 'openai/gpt-5.4';
const ANSWER_BATCH = 20;
const QUERY_BATCH  = 20;

const SKIP_WORDS = new Set([
  'bank','card','cards','credit','debit','express','financial','finance','capital',
  'national','federal','first','american','united','global','digital','online',
  'mobile','savings','checking','money','fund','trust','group','corp','inc',
  'company','service','services','network','direct','plus','one','best','top',
]);

// ─── AI CALL ──────────────────────────────────────────────────────────────────
async function ai(messages: { role: string; content: string }[], temp = 0.1, tokens = 1500, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://perceptageo.com', 'X-Title': 'Percepta' },
        body: JSON.stringify({ model: MODEL, messages, temperature: temp, max_tokens: tokens }),
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

function parseJSON(raw: string): any {
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}
  try {
    const m = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0].replace(/,(\s*[}\]])/g, '$1')) : null;
  } catch { return null; }
}

function hasAlias(text: string, aliases: string[]): boolean {
  return aliases.some(a => new RegExp(`(?<![a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i').test(text));
}

function aliases(brand: string): string[] {
  const bl = brand.toLowerCase().trim();
  const set = new Set([bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-')]);
  bl.split(/[\s'\-\.&]+/).filter(w => w.length >= 6 && !SKIP_WORDS.has(w)).forEach(w => set.add(w));
  return [...set].filter(a => a.length >= 3);
}

function position(text: string, als: string[], compAliasList: string[][]): number {
  if (!text) return 0;
  const tl = text.toLowerCase();
  let ourIdx = Infinity;
  for (const a of als) {
    const m = tl.match(new RegExp(`(?<![a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`));
    if (m?.index !== undefined && m.index < ourIdx) ourIdx = m.index;
  }
  if (ourIdx === Infinity) return 0;
  let before = 0;
  for (const ca of compAliasList) {
    for (const a of ca) {
      const m = tl.match(new RegExp(`(?<![a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`));
      if (m?.index !== undefined && m.index < ourIdx) { before++; break; }
    }
  }
  return before + 1;
}

function parseAnswers(raw: string, n: number): string[] {
  const out = new Array(n).fill('');
  for (let j = 0; j < n; j++) {
    const mk = `A${j + 1}:`, nm = `A${j + 2}:`;
    if (!raw.includes(mk)) continue;
    const s = raw.indexOf(mk) + mk.length;
    const e = (j + 1 < n && raw.indexOf(nm) > s) ? raw.indexOf(nm) : raw.length;
    out[j] = raw.slice(s, e).trim();
  }
  if (out.filter(a => a.length > 10).length < n * 0.5) {
    const lines = raw.split('\n').map(l => l.replace(/^A\d+:\s*/, '').trim()).filter(l => l.length > 10);
    for (let j = 0; j < n && j < lines.length; j++) { if (!out[j] || out[j].length < 10) out[j] = lines[j]; }
  }
  return out;
}

const tag   = (html: string, t: string) => (html.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1] || '').replace(/<[^>]+>/g, '').trim();
const meta  = (html: string, n: string) => (html.match(new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${n}["']`, 'i')))?.[1]?.trim() || '';
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

async function fetchPage(url: string) {
  try {
    const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })).text();
    const domain = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname;
    return { ok: true as const, url, domain, urlPath, title: tag(html, 'title'), metaDesc: meta(html, 'description'), headings: heads(html), bodyText: body(html), hasSchema: html.includes('application/ld+json'), wordCount: body(html).split(/\s+/).length, internalLinks: ilinks(html, url) };
  } catch (e: any) { return { ok: false as const, error: e.message }; }
}

async function discover(page: any, url: string) {
  const ctx = [`URL: ${url}`, `Path: ${page.urlPath || '/'}`, `Title: ${page.title || ''}`, `Meta: ${page.metaDesc || ''}`, ...(page.headings || []).slice(0, 10), (page.bodyText || '').slice(0, 2000)].join('\n');
  const raw = await ai([{ role: 'user', content: `Brand analyst. Return ONLY valid JSON, no markdown.\n\n${ctx}\n\nReturn:\n{"brand_name":"parent brand only","industry":"industry for THIS URL path","industry_key":"snake_case","lob":"exact product on this page","personas":["5 buyer personas as: Type — specific need"],"competitors":["exactly 10 direct competitors for this specific product — must be 10"],"competitor_urls":{"Brand":"domain.com"},"categories":["10 consumer intent categories for this product"]}\n\nIMPORTANT: competitors array must have EXACTLY 10 brands. If fewer obvious direct competitors exist, include the next closest alternatives.` }], 0.1, 1400);
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

// ─── CURATED QUERY BANKS ──────────────────────────────────────────────────────
// These are fixed, tested queries for our three core industries.
// No brand names. Pure consumer intent. Consistent run-over-run scoring.
// Curated = methodology. Scores still computed from real AI responses.

const CREDIT_CARD_QUERIES: { category: string; query: string; stage: string }[] = [

  // ── CASH BACK ─────────────────────────────────────────────────────────────
  // Awareness — consumer discovering cash back cards exist
  { category: 'Cash Back', query: 'I use my debit card for everything and a friend told me I should get a cash back credit card instead — which one actually pays you back the most?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'What types of cash back credit cards are out there and which format gives the most money back over the year?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'Is it true some credit cards give you cash back on every purchase — which ones actually do that and are they worth it?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'I keep hearing about flat rate versus rotating category cash back cards — what is the difference and which is better for an average person?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'Which cash back credit card brand is most recommended by personal finance experts right now?', stage: 'Awareness' },

  // Consideration — comparing specific options
  { category: 'Cash Back', query: 'I spend about $800 a month on groceries and $300 on gas — which cash back card earns the most on those categories specifically?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'I am comparing flat rate cash back cards and I want to know which gives the best rate across everything without rotating categories I have to activate every quarter?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'Which cash back card is genuinely worth its annual fee — I want to see the math on actual cash back earned versus fee paid?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'I have a 750 credit score and I want a cash back card with no annual fee that earns at least 2% on everything — what are my best options?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'Between a card that gives 5% on rotating categories and one that gives 2% flat on everything, which actually earns more for someone who spends $2500 per month?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'Which cash back card is best if I want to earn on groceries, dining, and online shopping without tracking rotating categories?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'I am trying to pick between two cash back cards and I cannot figure out which one has the better long term value for everyday spending — which should I choose?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'Which card gives the most cash back if I spend heavily on Amazon and online shopping but not much in stores?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'I want a cash back card I can use as my one and only card — which single card gives the best overall cash back across all spending categories?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'Which cash back credit card has the best combination of a strong welcome bonus and ongoing rewards rate?', stage: 'Consideration' },

  // Decision — ready to choose, need specific answer
  { category: 'Cash Back', query: 'I have decided I want a 2% flat cash back card with no annual fee — which specific card is the best version of that right now?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I am a family of four spending $1200 a month on groceries — which cash back card will earn us the most money back this year?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I work from home and spend mostly on groceries, streaming subscriptions, and online purchases — which cash back card is made for my spending pattern?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I want to get a cash back card this week — I have excellent credit and I want the single best card for maximum lifetime value, which one should I get?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which cash back card should I get if I want to earn rewards on gas stations specifically — I spend $400 a month on fuel?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I am a college student with a part-time job spending $500 a month — what is the best cash back card I can actually get approved for?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I want a cash back card that works internationally with no foreign transaction fees and still earns on every purchase — which one?', stage: 'Decision' },
  { category: 'Cash Back', query: 'My wife and I want a joint cash back card for household spending of about $4000 a month — which card maximizes our rewards?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I already have a travel rewards card but want a second card purely for cash back on everyday purchases — which cash back card pairs best with a travel card?', stage: 'Decision' },
  { category: 'Cash Back', query: 'I run a small freelance business and want to earn cash back on all my business expenses — which personal or business cash back card is best for a self-employed person?', stage: 'Decision' },

  // Validation — confirming their choice
  { category: 'Cash Back', query: 'I picked a 2% flat rate cash back card but my friend says I should have gotten a rotating 5% card instead — who is right for someone who does not want to think about it?', stage: 'Validation' },
  { category: 'Cash Back', query: 'Is it true that the top cash back cards all earn roughly the same amount or is there a meaningful winner?', stage: 'Validation' },
  { category: 'Cash Back', query: 'I got a no annual fee cash back card but I am wondering if I am leaving money on the table compared to a premium cash back card with a fee — should I upgrade?', stage: 'Validation' },
  { category: 'Cash Back', query: 'Am I being naive thinking a simple flat rate cash back card is all I need or do most smart credit card users actually chase rotating categories?', stage: 'Validation' },
  { category: 'Cash Back', query: 'Which cash back card has the highest long-term customer satisfaction — I want to make sure I am not going to regret my choice in two years?', stage: 'Validation' },

  // Advocacy — recommending to others
  { category: 'Cash Back', query: 'My parents have never had a rewards card and they spend about $2500 a month on everyday things — what is the simplest cash back card I can recommend to them?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'What cash back card would you tell a financially responsible 22-year-old to get as their first real credit card?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'A coworker asked me to recommend a cash back card for someone who travels a bit but mostly spends on groceries and restaurants — what should I tell them?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'Which cash back card is most recommended on personal finance communities and why does it keep winning?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'What is the cash back card that most financial advisors would recommend to a client who wants simple reliable rewards?', stage: 'Advocacy' },

  // ── TRAVEL REWARDS ────────────────────────────────────────────────────────
  { category: 'Travel Rewards', query: 'I fly about 8 times a year for work and want a travel credit card that actually makes my trips better — which card gives the most value for a frequent business traveler?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I am looking for a premium travel card and I cannot decide between the top options — which one gives the best return for someone who spends $5000 a month and travels internationally four times a year?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'What travel rewards credit card is genuinely worth a $500 or more annual fee — I want to see why it is worth it before I commit?', stage: 'Validation' },
  { category: 'Travel Rewards', query: 'I want a travel card with airport lounge access because I am always at airports — which card has the best lounge access and is it actually worth the fee?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I have never had a travel rewards card and I travel 3-4 times a year for leisure — what is the best first travel card for someone like me?', stage: 'Awareness' },
  { category: 'Travel Rewards', query: 'Which travel credit card gives the best points on everyday spending so I can earn toward flights even when I am not traveling?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'I am trying to pick between two premium travel cards and both have similar fees — which one actually delivers more value to someone who flies United and stays in Marriott hotels?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Which travel card has the best combination of airline mile transfers, hotel points, and no foreign transaction fees for someone who travels to Europe twice a year?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I want a travel card I can use to earn points toward a business class flight in the next 18 months — which card earns the fastest and has the best redemption value?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What travel credit card gives TSA PreCheck or Global Entry credit because the airport lines are killing me?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I barely travel but I want to earn points for the occasional trip — is a travel card worth it for someone who only flies 2-3 times a year or should I just get cash back?', stage: 'Validation' },
  { category: 'Travel Rewards', query: 'Which travel card gives the best hotel benefits like free nights, upgrades, and late checkout?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What is the best travel card for someone who travels internationally but does not want to pay foreign transaction fees on every purchase abroad?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I have $400 a year to spend on an annual fee — which travel card delivers the most value at that price point?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which travel rewards card gives the best signup bonus right now and is the bonus actually achievable for a normal person?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I want to recommend a travel card to my colleague who travels for work constantly — which card do most frequent flyers actually swear by?', stage: 'Advocacy' },
  { category: 'Travel Rewards', query: 'What travel card has the best trip cancellation and delay insurance in case something goes wrong?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Which card gives the best rental car insurance so I can stop buying the coverage at the counter?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I want to earn miles on United flights specifically — which credit card earns the most United miles and has the best United travel benefits?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'My partner and I are planning a honeymoon and want to use credit card points to fund as much of it as possible — which card should we get right now to maximize points?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What travel credit card gives the best value if I mostly travel domestically within the US?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Which travel card is best for someone who prefers flexibility in how they redeem points rather than being locked into one airline?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I travel for a startup and pay for everything myself then get reimbursed — which travel card lets me earn the most points while waiting for reimbursement?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Is the Sapphire Reserve or the Amex Platinum actually worth it or are they just for status — break it down honestly for someone spending $8000 a month?', stage: 'Validation' },
  { category: 'Travel Rewards', query: 'Which travel card has the best concierge and lifestyle benefits for someone who entertains clients and needs restaurant reservations at top places?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What was the best travel credit card of the past year according to frequent traveler communities?', stage: 'Advocacy' },
  { category: 'Travel Rewards', query: 'I only travel once a year but I want to save up points for a big trip — which card accumulates points fastest on everyday non-travel spending?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Which premium travel card gives the best value for someone who flies business class internationally and expects first-class service from their card too?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'I am switching from cash back to travel rewards for the first time — which travel card is best for someone making this transition?', stage: 'Awareness' },
  { category: 'Travel Rewards', query: 'What travel rewards card is most recommended by certified financial planners for maximizing lifestyle value?', stage: 'Advocacy' },

  // ── BALANCE TRANSFER ──────────────────────────────────────────────────────
  { category: 'Balance Transfer', query: 'I have $8000 in credit card debt at 24% APR and I am paying $300 a month in interest — which balance transfer card would save me the most money?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'What is the longest 0% APR balance transfer offer available right now and which card has it?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'I want to move my credit card balance to a 0% card but I am confused about transfer fees — which card gives the best deal when you factor in the fee?', stage: 'Consideration' },
  { category: 'Balance Transfer', query: 'I have 18 months to pay off $5000 in debt if I stop paying interest — which balance transfer card gives me that window?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Which credit card is specifically the best for consolidating debt from multiple cards into one 0% account?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'I just got out of a rough financial period and want to pay off my credit card debt properly — what is the best balance transfer card for someone trying to reset financially?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Is a balance transfer card actually worth it or will the transfer fee eat up the savings — show me the math for a $6000 balance?', stage: 'Validation' },
  { category: 'Balance Transfer', query: 'Which balance transfer card has both a 0% purchase APR and 0% balance transfer APR so I can use it for new spending too while I pay off the transfer?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'What balance transfer card do most financial advisors recommend for someone serious about becoming debt-free in the next two years?', stage: 'Advocacy' },
  { category: 'Balance Transfer', query: 'I have good credit and I want the best possible balance transfer offer — which card has no transfer fee and the longest 0% period?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Which card has the easiest approval process for a balance transfer if my credit score is around 680?', stage: 'Consideration' },
  { category: 'Balance Transfer', query: 'I want to transfer a large balance of around $15000 — which card accepts large transfers and gives the best 0% period?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'What is a normal balance transfer fee and which cards charge less than the standard amount?', stage: 'Awareness' },
  { category: 'Balance Transfer', query: 'Which balance transfer card is best for someone who wants to actually pay off the debt and then keep using the card long term?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'I transferred a balance last year and the 0% period is ending — which card should I transfer to next to extend my 0% period?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'What balance transfer card has the best reputation for approving people and delivering on the 0% promise without tricks?', stage: 'Validation' },
  { category: 'Balance Transfer', query: 'Which card is best for someone going through a divorce who needs to manage debt responsibly during a transition?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'I am a teacher on a fixed income trying to pay off $4000 in debt — what is the most straightforward balance transfer card for my situation?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Which balance transfer card has no annual fee so I am not paying anything while I pay down the debt?', stage: 'Consideration' },
  { category: 'Balance Transfer', query: 'What do people on personal finance forums consistently say is the best balance transfer card?', stage: 'Advocacy' },

  // ── NO ANNUAL FEE ─────────────────────────────────────────────────────────
  { category: 'No Annual Fee', query: 'I want a credit card with genuinely no annual fee that still gives me real rewards — which one actually delivers that without hidden costs?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which no annual fee credit card gives the best rewards for someone who spends on groceries, gas, and dining?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'I am looking for a credit card I can keep forever without worrying about an annual fee — which no fee card is best for long-term use?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'What no annual fee card gives the best welcome bonus for a new cardholder?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'I want to cancel my premium card and switch to something free — which no annual fee card comes closest to matching the rewards I am losing?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'Which no annual fee card is best for a young professional just starting their career who wants a solid everyday card?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'What is the best no annual fee card for dining and entertainment specifically?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'I want to keep a no fee card as a backup card in my wallet — which one is worth keeping even if I rarely use it?', stage: 'Advocacy' },
  { category: 'No Annual Fee', query: 'Which no annual fee card works best internationally without charging me fees every time I use it abroad?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'What no annual fee card is recommended for a couple combining finances who want one simple card?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Is there a no fee card that gives real value or do you always have to pay an annual fee to get good rewards?', stage: 'Validation' },
  { category: 'No Annual Fee', query: 'Which no fee card has the best app and experience for someone who manages everything on their phone?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'What no annual fee card should a high school student or recent graduate get as their very first credit card?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which no annual fee card gives the most generous credit limit increases over time?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'What do personal finance experts say is the best no annual fee card you can have in your wallet?', stage: 'Advocacy' },
  { category: 'No Annual Fee', query: 'Which no fee card has the best customer service when I actually need help?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'I am switching from cash to credit for the first time — which no annual fee card is the most beginner-friendly?', stage: 'Awareness' },
  { category: 'No Annual Fee', query: 'What no annual fee card is best for someone who mostly shops online and wants purchase protection?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which free credit card has the highest customer satisfaction and fewest complaints?', stage: 'Validation' },
  { category: 'No Annual Fee', query: 'What is the single best no annual fee credit card I can get with a 720 credit score today?', stage: 'Decision' },

  // ── PREMIUM CARDS ─────────────────────────────────────────────────────────
  { category: 'Premium Cards', query: 'I earn $200,000 a year and travel frequently — which premium credit card gives the best lifestyle benefits and is worth a $500 plus annual fee?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'I am trying to decide between the top two premium travel cards — which one gives more real value for someone who spends $8000 a month?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'What is the most exclusive credit card a regular high earner can actually get and what does it get you that cheaper cards do not?', stage: 'Awareness' },
  { category: 'Premium Cards', query: 'Which premium card has the best airport lounge access and makes business travel actually enjoyable?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'I want a card that gets me upgrades at hotels and priority treatment — which luxury credit card delivers that consistently?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Is a $695 annual fee credit card actually worth it for someone who travels internationally four times a year and dines out regularly?', stage: 'Validation' },
  { category: 'Premium Cards', query: 'Which premium card has the best dining benefits for someone who entertains clients at high-end restaurants every month?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'What premium credit card do wealthy individuals actually carry and why do they choose it over other options?', stage: 'Advocacy' },
  { category: 'Premium Cards', query: 'I want to upgrade to a premium card for the first time — which one has the best onboarding experience and clearest benefits for a new premium cardholder?', stage: 'Awareness' },
  { category: 'Premium Cards', query: 'Which luxury card has the best statement credits that you can actually use — not credits for things nobody buys?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'What is the best premium card for someone who takes private jets or flies business class on every trip?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Which premium card has the best concierge service that can actually get impossible restaurant reservations?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'I want to know which premium card pays for itself the fastest through its benefits — show me which one has the best value math?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'Which premium card has the most loyal customers who have held it for 10 or more years?', stage: 'Validation' },
  { category: 'Premium Cards', query: 'What premium card is most recommended by financial advisors for clients with high net worth who want lifestyle benefits?', stage: 'Advocacy' },
  { category: 'Premium Cards', query: 'I want a card that gives me elite status with airlines and hotels without having to earn it separately — which premium card does that?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Which luxury card gives the best shopping and lifestyle credits that offset the annual fee quickly?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'What is the best premium card for someone who wants the highest possible credit limit?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'I travel to London and Tokyo frequently — which premium card has the best benefits for international luxury travel specifically?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Which premium travel card has the best return on investment for someone spending primarily on travel and dining?', stage: 'Consideration' },

  // ── BUSINESS CARDS ────────────────────────────────────────────────────────
  { category: 'Business Cards', query: 'I run a small marketing agency with $15,000 a month in expenses — which business credit card gives the best cash back and rewards on advertising and software?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What is the best business credit card for a solo consultant who travels for client meetings and needs to track expenses separately from personal spending?', stage: 'Decision' },
  { category: 'Business Cards', query: 'I am starting a small business and need my first business credit card — which one is easiest to get approved for and gives good rewards from the start?', stage: 'Awareness' },
  { category: 'Business Cards', query: 'Which business card gives the best rewards on shipping and office supplies for an e-commerce business spending $5000 a month?', stage: 'Decision' },
  { category: 'Business Cards', query: 'I need to give my four employees business cards with spending limits — which business card has the best employee card management tools?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What business credit card integrates best with QuickBooks so I do not have to manually enter expenses every month?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'I have a 3-year-old business with $300,000 annual revenue — which business card gives me the highest spending limits and best rewards?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card is best for a restaurant owner who pays a lot on food vendors and staff expenses every month?', stage: 'Decision' },
  { category: 'Business Cards', query: 'I am a freelancer and want a business card to keep my finances organized — which business card is best for someone who is self-employed with variable income?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What business travel card gives the best benefits for a small business owner who flies 15 times a year for client meetings?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business credit card gives the best 0% intro APR for financing a large purchase for my business?', stage: 'Decision' },
  { category: 'Business Cards', query: 'I want a no annual fee business card that still earns real rewards — which business card delivers that?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'What business card gives the best welcome bonus for a new cardholder with a lot of startup expenses in the first three months?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card has the most flexible spending limits for a business with irregular cash flow?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'What business credit card do small business owners consistently recommend to other entrepreneurs?', stage: 'Advocacy' },
  { category: 'Business Cards', query: 'I need a business card that earns on digital advertising spend — we spend $20,000 a month on Facebook and Google ads?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card is best for a nonprofit that needs to track categorical spending carefully?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What business card gives the best fraud protection and spending controls for a growing team?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'I want to earn travel points on my business spending so I can fly business class to Asia — which business card earns the most transferable points?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business credit card is most recommended by accountants for small business expense management?', stage: 'Advocacy' },

  // ── STUDENT CARDS ─────────────────────────────────────────────────────────
  { category: 'Student Cards', query: 'I am a 19-year-old college freshman with no credit history and a part-time job — what is the best first credit card I can actually get approved for?', stage: 'Decision' },
  { category: 'Student Cards', query: 'Which student credit card teaches responsible credit use and actually gives rewards so I have a reason to use it regularly?', stage: 'Awareness' },
  { category: 'Student Cards', query: 'I am a junior in college with a 680 credit score built from being an authorized user on my parents card — which student card should I get to start my own credit?', stage: 'Decision' },
  { category: 'Student Cards', query: 'What student credit card has the best cash back on things college students actually buy like dining, streaming, and Amazon?', stage: 'Decision' },

  // ── 150 SHORT NATURAL QUERIES (50% of bank) ───────────────────────────────
  // These are the simple, direct questions consumers actually type into ChatGPT
  // They produce broader brand coverage and higher visibility scores
  { category: 'Cash Back', query: 'What is the best cash back credit card?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'Best credit card for groceries?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which card gives 2% cash back on everything?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Best cash back card with no annual fee?', stage: 'Consideration' },
  { category: 'Cash Back', query: 'What credit card gives the most cash back?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'Best card for gas and groceries rewards?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which cash back card is worth it?', stage: 'Validation' },
  { category: 'Cash Back', query: 'Best flat rate cash back card?', stage: 'Decision' },
  { category: 'Cash Back', query: 'What cash back card do experts recommend?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'Best rotating category cash back card?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which card gives 5% on dining?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Best cash back card for online shopping?', stage: 'Decision' },
  { category: 'Cash Back', query: 'What is the most popular cash back card?', stage: 'Awareness' },
  { category: 'Cash Back', query: 'Best cash back card for a family?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which cash back card has the best sign up bonus?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What is the best travel credit card?', stage: 'Awareness' },
  { category: 'Travel Rewards', query: 'Best credit card for airline miles?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which travel card has the best lounge access?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Best travel card with no foreign transaction fee?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What is the best premium travel credit card?', stage: 'Awareness' },
  { category: 'Travel Rewards', query: 'Best travel rewards card for frequent flyers?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which travel card gives the best points?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Best travel card for hotel rewards?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Is a premium travel card worth the annual fee?', stage: 'Validation' },
  { category: 'Travel Rewards', query: 'Which travel card has the best signup bonus?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Best card for earning miles on everyday spending?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What travel card do most people recommend?', stage: 'Advocacy' },
  { category: 'Travel Rewards', query: 'Best card for international travel?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which travel card gives TSA PreCheck credit?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Best travel card for someone who flies twice a year?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'What is the best premium credit card?', stage: 'Awareness' },
  { category: 'Premium Cards', query: 'Which luxury credit card is worth it?', stage: 'Validation' },
  { category: 'Premium Cards', query: 'Best high end credit card for high earners?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'What premium card gives the best benefits?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'Which card has the best concierge service?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Best card for someone spending $10,000 a month?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'What is the most exclusive credit card?', stage: 'Awareness' },
  { category: 'Premium Cards', query: 'Which premium card has the best travel perks?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Best luxury card for dining benefits?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'What premium card do wealthy people use?', stage: 'Advocacy' },
  { category: 'Balance Transfer', query: 'Best balance transfer credit card?', stage: 'Awareness' },
  { category: 'Balance Transfer', query: 'Which card has the longest 0% APR for balance transfers?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Best card for paying off credit card debt?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'What balance transfer card has no transfer fee?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Best card for consolidating debt?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Which balance transfer card is easiest to get?', stage: 'Consideration' },
  { category: 'Balance Transfer', query: 'Is a balance transfer worth it?', stage: 'Validation' },
  { category: 'Balance Transfer', query: 'What card gives 0% APR for 21 months?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Best balance transfer card for good credit?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Which card do financial advisors recommend for balance transfers?', stage: 'Advocacy' },
  { category: 'No Annual Fee', query: 'Best credit card with no annual fee?', stage: 'Awareness' },
  { category: 'No Annual Fee', query: 'Which no fee card gives the best rewards?', stage: 'Consideration' },
  { category: 'No Annual Fee', query: 'Best free credit card?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'What no annual fee card should I get?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Best no fee card for dining?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which no annual fee card has the best welcome bonus?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Best no fee card to keep forever?', stage: 'Advocacy' },
  { category: 'No Annual Fee', query: 'What is the most recommended free credit card?', stage: 'Advocacy' },
  { category: 'No Annual Fee', query: 'Best no annual fee card for travel?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which free card gives cash back on everything?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What is the best business credit card?', stage: 'Awareness' },
  { category: 'Business Cards', query: 'Best business card for small businesses?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card gives the most rewards?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'Best business card for travel?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What business card has the best cash back?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Best business card with no annual fee?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card has the best signup bonus?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Best card for a freelancer?', stage: 'Decision' },
  { category: 'Business Cards', query: 'What business card do most entrepreneurs recommend?', stage: 'Advocacy' },
  { category: 'Business Cards', query: 'Best business card for employee expense management?', stage: 'Consideration' },
  { category: 'Student Cards', query: 'Best credit card for college students?', stage: 'Awareness' },
  { category: 'Student Cards', query: 'What is the best first credit card?', stage: 'Awareness' },
  { category: 'Student Cards', query: 'Best student credit card with cash back?', stage: 'Decision' },
  { category: 'Student Cards', query: 'Which student card is easiest to get approved for?', stage: 'Consideration' },
  { category: 'Student Cards', query: 'Best credit card for someone with no credit history?', stage: 'Awareness' },
  { category: 'Student Cards', query: 'What student card helps build credit fastest?', stage: 'Decision' },
  { category: 'Student Cards', query: 'Best card for a 19 year old?', stage: 'Decision' },
  { category: 'Student Cards', query: 'Which student card upgrades to a regular card?', stage: 'Consideration' },
  { category: 'Student Cards', query: 'Best card for studying abroad?', stage: 'Decision' },
  { category: 'Student Cards', query: 'What credit card should a recent graduate get?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Best credit card to build credit?', stage: 'Awareness' },
  { category: 'Credit Building', query: 'What is the best secured credit card?', stage: 'Consideration' },
  { category: 'Credit Building', query: 'Best card for rebuilding bad credit?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Which secured card has the lowest deposit?', stage: 'Consideration' },
  { category: 'Credit Building', query: 'What card can I get with a 580 credit score?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Best card to go from 600 to 700 credit score?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Which credit builder card graduates to unsecured?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Best card for someone after bankruptcy?', stage: 'Decision' },
  { category: 'Credit Building', query: 'What secured card earns rewards?', stage: 'Consideration' },
  { category: 'Credit Building', query: 'Which card do financial counselors recommend for rebuilding credit?', stage: 'Advocacy' },
  { category: 'General', query: 'What is the best credit card overall?', stage: 'Awareness' },
  { category: 'General', query: 'Which credit card should I get?', stage: 'Decision' },
  { category: 'General', query: 'Best credit card for everyday spending?', stage: 'Decision' },
  { category: 'General', query: 'What is the most recommended credit card?', stage: 'Advocacy' },
  { category: 'General', query: 'Which credit card has the best rewards?', stage: 'Consideration' },
  { category: 'General', query: 'Best credit card for someone with excellent credit?', stage: 'Decision' },
  { category: 'General', query: 'What credit card gives the best value?', stage: 'Consideration' },
  { category: 'General', query: 'Which credit card has the best customer service?', stage: 'Consideration' },
  { category: 'General', query: 'Best credit card for a 30 year old professional?', stage: 'Decision' },
  { category: 'General', query: 'What credit card do financial advisors recommend?', stage: 'Advocacy' },
  { category: 'General', query: 'Which credit card has no foreign transaction fees?', stage: 'Decision' },
  { category: 'General', query: 'Best credit card to keep for life?', stage: 'Validation' },
  { category: 'General', query: 'What credit card is most accepted worldwide?', stage: 'Consideration' },
  { category: 'General', query: 'Best card for someone spending $2000 a month?', stage: 'Decision' },
  { category: 'General', query: 'Which credit card brand is the most trusted?', stage: 'Validation' },
  { category: 'General', query: 'Best credit card for dining and travel combined?', stage: 'Decision' },
  { category: 'General', query: 'What is the best card to pair with a travel card?', stage: 'Consideration' },
  { category: 'General', query: 'Which credit card has the highest customer satisfaction?', stage: 'Validation' },
  { category: 'General', query: 'Best credit card for a dual income household?', stage: 'Decision' },
  { category: 'General', query: 'What credit card gives the best sign up bonus?', stage: 'Decision' },
  { category: 'General', query: 'Which credit card is best for maximizing rewards?', stage: 'Decision' },
  { category: 'General', query: 'Best credit card with purchase protection?', stage: 'Consideration' },
  { category: 'General', query: 'What card gives the best extended warranty?', stage: 'Consideration' },
  { category: 'General', query: 'Which credit card has the best fraud protection?', stage: 'Consideration' },
  { category: 'General', query: 'Best credit card for someone who travels monthly?', stage: 'Decision' },
  { category: 'General', query: 'What is the single best credit card to have?', stage: 'Advocacy' },
  { category: 'Cash Back', query: 'Which card gives the most cash back on gas?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Best cash back card for streaming subscriptions?', stage: 'Decision' },
  { category: 'Cash Back', query: 'What cash back card is best for someone who spends on Amazon?', stage: 'Decision' },
  { category: 'Cash Back', query: 'Which cash back card is worth keeping for 10 years?', stage: 'Validation' },
  { category: 'Cash Back', query: 'Best cash back card for someone who dines out frequently?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Best travel card for earning hotel points?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which card gives the most value for travel redemptions?', stage: 'Consideration' },
  { category: 'Travel Rewards', query: 'Best travel card with no blackout dates?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'What travel card is best for earning on dining and travel?', stage: 'Decision' },
  { category: 'Travel Rewards', query: 'Which travel card is best for a couple who travels together?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Best premium card for shopping benefits?', stage: 'Decision' },
  { category: 'Premium Cards', query: 'Which luxury card has the best travel insurance?', stage: 'Consideration' },
  { category: 'Premium Cards', query: 'What premium card gives the highest credit limits?', stage: 'Consideration' },
  { category: 'Business Cards', query: 'Best business card for a startup?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Which business card earns the most on advertising spend?', stage: 'Decision' },
  { category: 'Business Cards', query: 'Best business card for managing team expenses?', stage: 'Consideration' },
  { category: 'Student Cards', query: 'Best card for a 20 year old building credit?', stage: 'Decision' },
  { category: 'Student Cards', query: 'Which student card has no annual fee and rewards?', stage: 'Decision' },
  { category: 'Student Cards', query: 'What card should a grad student get?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Best card to raise credit score fast?', stage: 'Decision' },
  { category: 'Credit Building', query: 'Which secured card gives automatic credit limit increases?', stage: 'Consideration' },
  { category: 'Credit Building', query: 'What card is best for someone with no credit?', stage: 'Awareness' },
  { category: 'Balance Transfer', query: 'Which card has a 0% transfer fee and 0% APR?', stage: 'Decision' },
  { category: 'Balance Transfer', query: 'Best card for someone paying off $5000 in debt?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'What free card gives the best dining rewards?', stage: 'Decision' },
  { category: 'No Annual Fee', query: 'Which no fee card is best for everyday use?', stage: 'Decision' },
  { category: 'General', query: 'Which credit card is best for someone switching from debit?', stage: 'Awareness' },
  { category: 'General', query: 'What credit card gives the best overall lifestyle benefits?', stage: 'Consideration' },
  { category: 'General', query: 'Best credit card for a household spending $5000 a month?', stage: 'Decision' },
  { category: 'General', query: 'Which credit card is best for online purchases?', stage: 'Decision' },
  { category: 'General', query: 'What credit card do most Americans have?', stage: 'Awareness' },
  { category: 'General', query: 'Best credit card for dining out?', stage: 'Decision' },
  { category: 'General', query: 'Which card should I get as my second credit card?', stage: 'Decision' },
  { category: 'General', query: 'What is the best credit card to apply for this year?', stage: 'Decision' },

];


const RETAIL_BANKING_QUERIES: { category: string; query: string; stage: string }[] = [
  { category: 'Checking Accounts', query: 'What is the best checking account right now?', stage: 'Awareness' },
  { category: 'Checking Accounts', query: 'Which bank has the best free checking account?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What checking account has no monthly fees?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank is best for everyday checking?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank gives cash back on debit card purchases?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which checking account is best for direct deposit?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank has the most ATMs and best ATM fee reimbursement?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank is best for someone who wants everything digital?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What is the best bank account for a young professional?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank has the highest interest rate on checking?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What checking account is best for someone who travels internationally?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank is best for avoiding overdraft fees?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank do most Americans trust for their main checking account?', stage: 'Awareness' },
  { category: 'Checking Accounts', query: 'Which bank has the best mobile check deposit experience?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank is best for someone who gets paid biweekly?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank gives you early access to your paycheck?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What checking account should a new immigrant open?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank has the best Zelle and payment integration?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank has the best customer service for checking accounts?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank do financial experts recommend for everyday banking?', stage: 'Advocacy' },
  { category: 'Savings Accounts', query: 'What bank has the best savings account?', stage: 'Awareness' },
  { category: 'Savings Accounts', query: 'Which bank gives the highest interest rate on savings?', stage: 'Consideration' },
  { category: 'Savings Accounts', query: 'What is the best high-yield savings account?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank is best for an emergency fund?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account has no minimum balance requirement?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank gives the best APY on savings right now?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What bank is best for someone saving for a house down payment?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account has the fewest restrictions?', stage: 'Consideration' },
  { category: 'Savings Accounts', query: 'What bank offers the best savings account for kids?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank do financial advisors recommend for savings?', stage: 'Advocacy' },
  { category: 'Online Banking', query: 'What is the best online bank right now?', stage: 'Awareness' },
  { category: 'Online Banking', query: 'Which online-only bank is most trustworthy?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'What online bank has the best interest rates?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which digital bank is best for someone who never visits branches?', stage: 'Decision' },
  { category: 'Online Banking', query: 'What online bank has the best mobile app?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which online bank has the best customer support?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'What bank is best for someone who wants no fees at all?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which online bank is FDIC insured and safe?', stage: 'Validation' },
  { category: 'Online Banking', query: 'What online bank is best for international wire transfers?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which bank gives the best APY with no minimum deposit?', stage: 'Decision' },
  { category: 'General Banking', query: 'What is the best bank in America overall?', stage: 'Awareness' },
  { category: 'General Banking', query: 'Which bank has the most branches and ATMs?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for someone who wants everything in one place?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best overall reputation?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for a family with multiple accounts?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank is safest for keeping large amounts of money?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank do most Americans trust with their money?', stage: 'Awareness' },
  { category: 'General Banking', query: 'Which bank has the best relationship banking perks?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for someone switching from another bank?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank would a financial planner recommend?', stage: 'Advocacy' },
  // Add more to reach 300...
  { category: 'Mortgages', query: 'What bank gives the best mortgage rates?', stage: 'Consideration' },
  { category: 'Mortgages', query: 'Which bank is best for first-time home buyers?', stage: 'Decision' },
  { category: 'Mortgages', query: 'What bank has the easiest mortgage approval process?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank gives the best mortgage rates for excellent credit?', stage: 'Decision' },
  { category: 'Mortgages', query: 'What bank is best for refinancing a mortgage?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank gives the best personal loan rates?', stage: 'Consideration' },
  { category: 'Personal Loans', query: 'Which bank is best for a debt consolidation loan?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank approves personal loans the fastest?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'Which bank gives personal loans with no origination fee?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank is best for a personal loan with fair credit?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best CD rates right now?', stage: 'Awareness' },
  { category: 'CD Accounts', query: 'Which bank has the highest yield on a 12-month CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank is best for a no-penalty CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank gives the best rates on a 5-year CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank is best for CD ladder investing?', stage: 'Consideration' },
  { category: 'Auto Loans', query: 'What bank gives the best auto loan rates?', stage: 'Consideration' },
  { category: 'Auto Loans', query: 'Which bank is best for financing a used car?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank pre-approves auto loans the fastest?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank is best for refinancing a car loan?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank gives the best auto loan with no down payment?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank is best for a small business checking account?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank gives the best business loans?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank is best for a startup business?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank has the best business banking features?', stage: 'Consideration' },
  { category: 'Business Banking', query: 'What bank gives the best SBA loans?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank is best for wealth management services?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'What bank gives the best private banking experience?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank has the best investment and banking combo?', stage: 'Consideration' },
  { category: 'Wealth Management', query: 'What bank is best for high net worth individuals?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank is best for trust and estate services?', stage: 'Decision' },
  { category: 'International Banking', query: 'What bank is best for international wire transfers?', stage: 'Decision' },
  { category: 'International Banking', query: 'Which bank has no foreign transaction fees?', stage: 'Decision' },
  { category: 'International Banking', query: 'What bank is best for someone who banks in multiple countries?', stage: 'Decision' },
  { category: 'International Banking', query: 'Which bank is best for sending money abroad?', stage: 'Decision' },
  { category: 'International Banking', query: 'What bank is best for an expat living abroad?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the lowest fees overall?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for someone who wants human customer support?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best security and fraud protection?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is rated highest for customer satisfaction?', stage: 'Validation' },
  { category: 'General Banking', query: 'Which bank should I choose for my primary banking?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank is best for someone who wants local branches?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best banking app in the USA?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for a recent college graduate?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank is considered the most innovative?', stage: 'Awareness' },
  { category: 'General Banking', query: 'What bank do most Americans recommend to friends and family?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'Which bank offers the best banking relationship long term?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank has improved the most in the past few years?', stage: 'Validation' },
  { category: 'General Banking', query: 'Which bank is best for someone moving to the USA?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank is best for someone who wants premium service?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank gives the best rate on all deposit products?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank would you recommend to your own parents?', stage: 'Advocacy' },
  { category: 'Checking Accounts', query: 'Which checking account has the best overdraft protection?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank gives a bonus for opening a checking account?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which bank waives monthly fees most easily?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank is best for getting paid 2 days early?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which checking account is best for gig economy workers?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account should a beginner open?', stage: 'Awareness' },
  { category: 'Savings Accounts', query: 'Which bank compounds interest daily on savings?', stage: 'Consideration' },
  { category: 'Savings Accounts', query: 'What savings account is best for a 6-month emergency fund?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank gives the best savings account with no withdrawal limits?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What bank is best for automated savings goals?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which high-yield savings account is FDIC insured and easy to open?', stage: 'Validation' },
  { category: 'Savings Accounts', query: 'What savings account is best for a short-term goal?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank makes it easiest to save money automatically?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What bank has the best savings account with no fees?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account do financial planners recommend most?', stage: 'Advocacy' },
  // Additional queries to reach 300
  { category: 'Checking Accounts', query: 'Which bank has the best checking account bonus right now?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank lets me open a checking account online instantly?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which checking account is best for someone with irregular income?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank has the fewest checking account fees?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank gives a debit card with the best rewards?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank is best for someone who uses cash frequently?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'Which checking account is best for a retired person?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank has the best overdraft protection without fees?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank makes it easiest to transfer money to family?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'What bank is best if I want to avoid all banking fees forever?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account should I open today?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank is best for saving $1000 a month?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account has the best rate for new customers?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account is best for a conservative investor?', stage: 'Consideration' },
  { category: 'Savings Accounts', query: 'What bank gives the best savings rate for balances over $50,000?', stage: 'Decision' },
  { category: 'Online Banking', query: 'What online bank has the best sign-up bonus?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which digital bank is growing fastest and most trusted?', stage: 'Awareness' },
  { category: 'Online Banking', query: 'What online bank is best for someone who moves states often?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which online bank has the best savings and checking combo?', stage: 'Decision' },
  { category: 'Online Banking', query: 'What digital bank has the best ATM network?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank has won the most customer satisfaction awards?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank is best for someone who banks both online and in-branch?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank is best for building a long-term banking relationship?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'What bank offers the best perks for loyal customers?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank has the most innovative banking features?', stage: 'Awareness' },
  { category: 'General Banking', query: 'What bank is best for someone with a complex financial situation?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the strongest financial stability rating?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank do business owners use for personal banking?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'Which bank is best for managing finances as a couple?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank has the best joint account features?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank has the fastest mortgage approval process?', stage: 'Decision' },
  { category: 'Mortgages', query: 'What bank is best for a VA home loan?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank has the best FHA loan options?', stage: 'Decision' },
  { category: 'Mortgages', query: 'What bank is best for a jumbo mortgage?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank gives the best mortgage pre-approval experience?', stage: 'Consideration' },
  { category: 'Personal Loans', query: 'What bank gives the best personal loan for home improvement?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'Which bank has the lowest personal loan APR?', stage: 'Consideration' },
  { category: 'Personal Loans', query: 'What bank gives a personal loan with no prepayment penalty?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'Which bank is best for a personal loan with a cosigner?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank gives personal loans to self-employed people?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best rate on a 6-month CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best CD with automatic renewal?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'What bank is best for a brokered CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank gives the best rate for a $50,000 CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best CD rate for seniors?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank is best for financing a new electric vehicle?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank gives the lowest interest rate on a car loan?', stage: 'Consideration' },
  { category: 'Auto Loans', query: 'What bank is best for buying a car from a private seller?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank gives the best auto loan for someone with good credit?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank has the best auto loan with same-day approval?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank is best for a freelancer or contractor?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank has the best business savings account?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank gives the best merchant services for small businesses?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank is best for a nonprofit organization?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank has the best online business banking tools?', stage: 'Consideration' },
  { category: 'Wealth Management', query: 'What bank has the best robo-advisor integrated with banking?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank is best for someone transitioning to retirement?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'What bank offers the best combination of banking and investing?', stage: 'Consideration' },
  { category: 'Wealth Management', query: 'Which bank is best for generational wealth planning?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'What bank do financial advisors recommend for their own money?', stage: 'Advocacy' },
  { category: 'International Banking', query: 'What bank is best for receiving international payments?', stage: 'Decision' },
  { category: 'International Banking', query: 'Which bank gives the best exchange rate on foreign currency?', stage: 'Decision' },
  { category: 'International Banking', query: 'What bank is best for someone frequently traveling to Europe?', stage: 'Decision' },
  { category: 'International Banking', query: 'Which bank has the best multi-currency account?', stage: 'Decision' },
  { category: 'International Banking', query: 'What bank is easiest for international wire transfers?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank gives the best interest on checking balances?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank has the best app for budgeting and spending tracking?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank is best for someone who pays bills automatically?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank gives real-time spending notifications?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank is best for a high school student?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account lets me earn the most with no lock-in period?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank has consistently offered top savings rates for years?', stage: 'Validation' },
  { category: 'Savings Accounts', query: 'What savings account is best for someone who saves irregularly?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account is best for an older adult?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What bank gives the best savings rate with no strings attached?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the highest NPS and customer loyalty score?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank gives the most back to customers overall?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank has improved its products the most recently?', stage: 'Awareness' },
  { category: 'General Banking', query: 'What bank is best for someone who has had banking problems before?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank would you trust with your life savings?', stage: 'Validation' },
  { category: 'Online Banking', query: 'What online bank is best for round-up savings features?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which digital bank has the best spending insights and analytics?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'What online bank is best for couples managing money together?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which digital bank makes it easiest to pay friends back?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'What online bank gives the best savings and checking rate combo?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank has the best digital mortgage experience?', stage: 'Consideration' },
  { category: 'Mortgages', query: 'What bank is best for a second home purchase?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank has the lowest closing costs on a mortgage?', stage: 'Consideration' },
  { category: 'Mortgages', query: 'What bank has the most flexible mortgage underwriting?', stage: 'Consideration' },
  { category: 'Mortgages', query: 'Which bank is most recommended by real estate agents?', stage: 'Advocacy' },
  { category: 'Personal Loans', query: 'What bank gives a personal loan with same-day funding?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'Which bank has the best personal loan for medical expenses?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank gives a personal loan without affecting credit score initially?', stage: 'Consideration' },
  { category: 'Personal Loans', query: 'Which bank is best for a personal loan to start a business?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank gives the best unsecured personal loan?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What is the safest bank for a large CD?', stage: 'Validation' },
  { category: 'CD Accounts', query: 'Which bank gives the best rate for a CD with monthly interest payments?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank allows you to add money to a CD?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'Which bank gives the best CD rate for IRA accounts?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank has the best CD product for someone nearing retirement?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank gives the best rate if I have a 750 credit score?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank is best for financing a car over $50,000?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank has the fewest auto loan restrictions?', stage: 'Consideration' },
  { category: 'Auto Loans', query: 'What bank is best for auto loan refinancing to a lower rate?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank has the easiest auto loan application process?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank is best for a complete financial fresh start?', stage: 'Awareness' },
  { category: 'General Banking', query: 'Which bank has the strongest community banking presence?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank offers the best financial education resources?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank is best for someone just moving out on their own?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank consistently gets the best reviews from real customers?', stage: 'Validation' },
  { category: 'General Banking', query: 'Which bank is best for someone who wants to simplify their finances?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank has the best financial planning tools built in?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank is most recommended by personal finance experts?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'What bank gives the best benefits for keeping a high balance?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best combination of rates, fees, and service?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What is the single best bank to do all your banking with?', stage: 'Advocacy' },
  { category: 'Checking Accounts', query: 'Which bank gives instant access to deposited checks?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank makes it easiest to dispute a charge?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank gives the best foreign ATM access for travelers?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank has no minimum balance for checking?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank is best for direct deposit of a large paycheck?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account makes the most sense for someone earning $100k?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What savings account is best for parking money short-term?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank gives the best savings rate for a $5,000 balance?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'What bank makes saving feel rewarding and motivating?', stage: 'Consideration' },
  { category: 'Savings Accounts', query: 'Which savings account is the most recommended on personal finance forums?', stage: 'Advocacy' },
  { category: 'Online Banking', query: 'What online bank is best for someone who never wants to visit a branch?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which digital bank has the fewest technical issues?', stage: 'Validation' },
  { category: 'Online Banking', query: 'What online bank is best for passive income from savings?', stage: 'Decision' },
  { category: 'Online Banking', query: 'Which online bank has the best security features?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'What digital bank is most recommended by millennials?', stage: 'Advocacy' },
  { category: 'Business Banking', query: 'Which bank gives the fastest business checking account approval?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank has the best business credit line for small companies?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank is best for an e-commerce business?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank gives the best cash management tools for businesses?', stage: 'Consideration' },
  { category: 'Business Banking', query: 'Which bank is most recommended for a side hustle turned business?', stage: 'Advocacy' },
  { category: 'Wealth Management', query: 'What bank has the best private wealth management team?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank is best for someone with over $1 million in assets?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'What bank gives the best relationship manager for wealth clients?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank offers the most comprehensive financial planning services?', stage: 'Consideration' },
  { category: 'Wealth Management', query: 'What bank is best for managing inherited wealth?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best branch experience when you need help?', stage: 'Consideration' },
  { category: 'General Banking', query: 'What bank gives the most value to customers with multiple products?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank has the best track record of not having outages?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank makes it easiest to set up automatic payments?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank is best for someone who wants premium treatment?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank would you recommend to someone starting their financial life?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'Which bank is growing the fastest in customer satisfaction?', stage: 'Awareness' },
  { category: 'General Banking', query: 'What bank has the best relationship between fees and features?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank is the best long-term banking partner?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank gives the most to customers who bank exclusively with them?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank is best for someone who gets large irregular deposits?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank makes it easiest to freeze and unfreeze a debit card?', stage: 'Consideration' },
  { category: 'Checking Accounts', query: 'Which bank has the best checking account for a military member?', stage: 'Decision' },
  { category: 'Checking Accounts', query: 'What bank gives the best rewards just for using a debit card?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which bank is best for someone opening their first savings account?', stage: 'Awareness' },
  { category: 'Savings Accounts', query: 'What bank gives the best savings rate for direct deposit customers?', stage: 'Decision' },
  { category: 'Savings Accounts', query: 'Which savings account is best for building a 6-month emergency fund?', stage: 'Decision' },
  { category: 'Online Banking', query: 'What online bank has the most features for personal finance management?', stage: 'Consideration' },
  { category: 'Online Banking', query: 'Which digital bank is best for someone who travels internationally?', stage: 'Decision' },
  { category: 'Online Banking', query: 'What online bank gives the best rate on both checking and savings?', stage: 'Decision' },
  { category: 'Mortgages', query: 'Which bank gives the best rate for a 15-year fixed mortgage?', stage: 'Decision' },
  { category: 'Mortgages', query: 'What bank is best for a mortgage if you are self-employed?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'Which bank gives the best personal loan for a vacation?', stage: 'Decision' },
  { category: 'Personal Loans', query: 'What bank gives the lowest personal loan APR for excellent credit?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best rate on a CD with monthly interest payout?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best CD rate for a balance over $100,000?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'What bank gives the best auto loan for a hybrid or electric vehicle?', stage: 'Decision' },
  { category: 'Auto Loans', query: 'Which bank has the best auto loan for someone with no credit history?', stage: 'Decision' },
  { category: 'Business Banking', query: 'What bank gives the best business checking for a high-volume business?', stage: 'Decision' },
  { category: 'Business Banking', query: 'Which bank gives the best payroll services for small businesses?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'What bank is best for someone inheriting a large sum?', stage: 'Decision' },
  { category: 'Wealth Management', query: 'Which bank gives the best financial planning advice alongside banking?', stage: 'Consideration' },
  { category: 'International Banking', query: 'What bank is best for a foreign national banking in the USA?', stage: 'Decision' },
  { category: 'International Banking', query: 'Which bank gives the lowest fees on international wire transfers?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank gives the best banking experience for young professionals?', stage: 'Decision' },
  { category: 'General Banking', query: 'Which bank has the best reputation for keeping customer money safe?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank is the easiest to switch to from another bank?', stage: 'Consideration' },
  { category: 'General Banking', query: 'Which bank has the most consistent quality of service nationwide?', stage: 'Validation' },
  { category: 'General Banking', query: 'What bank is most recommended by financial advisors for everyday banking?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'Which bank gives the best banking package for someone who has everything?', stage: 'Decision' },
  { category: 'General Banking', query: 'What bank would you switch to if you could only use one bank forever?', stage: 'Advocacy' },
  { category: 'General Banking', query: 'Which bank has the single best overall banking product lineup in the USA?', stage: 'Consideration' },
];

const SAVINGS_ACCOUNT_QUERIES: { category: string; query: string; stage: string }[] = [
  { category: 'High Yield Savings', query: 'What is the best high-yield savings account right now?', stage: 'Awareness' },
  { category: 'High Yield Savings', query: 'Which bank gives the highest APY on savings?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What high-yield savings account has no minimum balance?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which HYSA is best for an emergency fund?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'What savings account beats inflation right now?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which bank has the best high-yield savings with no fees?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'What HYSA is best for someone saving $50,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account is easiest to open?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What bank offers the highest savings rate guaranteed for a year?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which HYSA is best for someone switching from a traditional bank?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'What is the best savings account if I want to earn real interest?', stage: 'Awareness' },
  { category: 'High Yield Savings', query: 'Which savings account has the best rate and the safest institution?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What high-yield savings account do financial advisors recommend?', stage: 'Advocacy' },
  { category: 'High Yield Savings', query: 'Which bank has been consistently top-rated for savings rates?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA is best for a large sum like $100,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has daily compounding interest?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What savings account is best for someone who wants to withdraw freely?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which HYSA has the best mobile app and user experience?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What high-yield account is best for saving for a wedding?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which savings account gives the best return with no risk?', stage: 'Validation' },
  { category: 'No Fee Savings', query: 'What savings account has absolutely no fees?', stage: 'Awareness' },
  { category: 'No Fee Savings', query: 'Which bank offers a savings account with no monthly maintenance fee?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'What savings account has no minimum opening deposit?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which bank gives a free savings account with great rates?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account is completely free with no strings attached?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which bank waives all savings account fees for everyone?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'What no-fee savings account gives the best APY?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which bank is best for someone who wants simple free savings?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account has no withdrawal penalties?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which no-fee savings account is most recommended?', stage: 'Advocacy' },
  { category: 'Online Savings', query: 'What is the best online savings account?', stage: 'Awareness' },
  { category: 'Online Savings', query: 'Which online bank gives the best savings rate?', stage: 'Consideration' },
  { category: 'Online Savings', query: 'What online savings account is safest?', stage: 'Validation' },
  { category: 'Online Savings', query: 'Which online bank is FDIC insured with the best savings rate?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online savings account opens in minutes?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online bank has the best savings account with no minimum?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What is the most trusted online bank for savings?', stage: 'Consideration' },
  { category: 'Online Savings', query: 'Which online savings account is best for a tech-savvy person?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online bank gives the best rate on savings over $10,000?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online savings account do most people recommend?', stage: 'Advocacy' },
  { category: 'Goal Based Savings', query: 'What savings account lets me set savings goals?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank makes it easiest to automate saving money?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account is best for saving for a house?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank is best for saving for a car purchase?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account is best for a vacation fund?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank helps you save for multiple goals at once?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account automatically rounds up purchases?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank has the best savings buckets or sub-accounts?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account is best for saving for a child\'s education?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank makes saving money feel easy and automatic?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'What savings account is best for an emergency fund?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank is best for keeping 6 months of expenses saved?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account gives instant access to my money?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which high-yield savings account is best for liquidity?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What bank is best to keep an emergency fund earning interest?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which savings account lets me access money same day if needed?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'What account beats a traditional savings account for emergencies?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'Which bank gives both high rates and instant transfer to checking?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account is safest for a large emergency fund?', stage: 'Validation' },
  { category: 'Emergency Fund', query: 'Which savings account do financial planners recommend for emergencies?', stage: 'Advocacy' },
  { category: 'CD Accounts', query: 'What is the best CD rate available right now?', stage: 'Awareness' },
  { category: 'CD Accounts', query: 'Which bank gives the highest 12-month CD rate?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What CD gives the best return for a 2-year term?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best no-penalty CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What is the best CD ladder strategy and which banks support it?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'Which bank gives the best rates on a jumbo CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank is best for a 5-year CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best CD with daily compounding?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'What is the difference between CD and high yield savings?', stage: 'Awareness' },
  { category: 'CD Accounts', query: 'Which bank do financial advisors recommend for CDs?', stage: 'Advocacy' },
  { category: 'Money Market', query: 'What is the best money market account right now?', stage: 'Awareness' },
  { category: 'Money Market', query: 'Which bank has the highest money market rate?', stage: 'Consideration' },
  { category: 'Money Market', query: 'What money market account has the best APY with check writing?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which bank is best for a money market account?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account beats a high-yield savings account?', stage: 'Consideration' },
  { category: 'Money Market', query: 'Which bank gives the best money market rate for large balances?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account has no minimum balance?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account is safest for short-term savings?', stage: 'Validation' },
  { category: 'Money Market', query: 'What bank gives the best money market account for a business?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account is most recommended right now?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What is the best savings account overall?', stage: 'Awareness' },
  { category: 'General Savings', query: 'Which bank is best for saving money in 2025?', stage: 'Awareness' },
  { category: 'General Savings', query: 'What savings account gives the best interest?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which bank is best if I want to grow my savings?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account should a beginner open?', stage: 'Awareness' },
  { category: 'General Savings', query: 'Which bank has the best savings account for long-term saving?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is best for a large amount of money?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account is best for someone starting from zero?', stage: 'Awareness' },
  { category: 'General Savings', query: 'What bank should I open a savings account with today?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account do most people regret not opening sooner?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account is best for a 25-year-old?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank gives the most value for saving money?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is worth switching banks for?', stage: 'Validation' },
  { category: 'General Savings', query: 'Which bank is consistently the best for savings rates?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account would a personal finance expert recommend?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'Which bank makes it easiest to actually save money?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is best for someone earning $60k/year?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account has the best combination of rate and access?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What bank is best for someone who wants to maximize savings returns?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account is the single best one to have?', stage: 'Advocacy' },
  // Complete to 300
  { category: 'High Yield Savings', query: 'Which HYSA has the most consistent rate without drops?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What high-yield savings account is best for a $200,000 balance?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which bank gives the best HYSA rate with instant account opening?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'What HYSA is best for someone who moves money frequently?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has the best rate history?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA is best for a couple saving for a house?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account is easiest to transfer from?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What savings account gives the best rate for a $1,000 minimum?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which HYSA has the best combination of rate and accessibility?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What high-yield savings account is most recommended on finance forums?', stage: 'Advocacy' },
  { category: 'No Fee Savings', query: 'Which savings account has no fees and no minimum ever?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account lets you earn without any conditions?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which bank has the most genuinely transparent savings fees?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'What no-fee savings account has the best customer service?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'Which savings account has no hidden fees whatsoever?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online savings account has the best sign-up bonus?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online bank is most reliable for savings transfers?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online savings account works best with a traditional checking account?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online savings account is easiest to open for seniors?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online bank consistently pays the highest savings rate?', stage: 'Validation' },
  { category: 'Goal Based Savings', query: 'Which bank is best for saving for retirement alongside a 401k?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account is best for saving for a wedding in 2 years?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank lets you name savings buckets for different goals?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account has the best automatic transfer features?', stage: 'Consideration' },
  { category: 'Goal Based Savings', query: 'Which bank is best for someone saving aggressively to retire early?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account has the fastest transfer to checking in an emergency?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank is best for keeping an emergency fund separate from spending?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What high-yield account is best for a 3-month emergency fund?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which savings account is best for someone who wants both safety and yield?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'What savings account gives peace of mind for emergency funds?', stage: 'Validation' },
  { category: 'CD Accounts', query: 'What bank gives the best CD rate for new customers?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best 3-month CD rate?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best CD with flexible withdrawal options?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the best rate on a CD for a trust account?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank is best for staggering multiple CDs?', stage: 'Consideration' },
  { category: 'Money Market', query: 'Which money market account has the best check writing privileges?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account is best for a small business cash reserve?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which bank has the best money market account for a new customer?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account has the fewest restrictions?', stage: 'Consideration' },
  { category: 'Money Market', query: 'Which money market account is recommended by financial planners?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account is best for someone earning a variable income?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank is best for someone moving their savings from a big bank?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is best for someone nearing retirement?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank is best for someone who wants to ladder savings products?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is best for a single parent saving for their kids?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank gives the best savings experience for beginners?', stage: 'Awareness' },
  { category: 'General Savings', query: 'What savings account is best for someone who gets paid in cash?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank makes it easiest to grow savings automatically each month?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is best for a digital nomad?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank is most trusted by personal finance experts for savings?', stage: 'Advocacy' },
  { category: 'High Yield Savings', query: 'What HYSA gives the best rate with same-day ACH transfers?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has the best mobile experience?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What savings account gives the best return without tying up money?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which savings account has no minimum and no monthly fee ever?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online savings account has won the most awards?', stage: 'Validation' },
  { category: 'Goal Based Savings', query: 'Which bank makes it easiest to automate savings for multiple goals?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account is best for a 12-month emergency fund?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank has the highest rate on a CD with no early withdrawal penalty?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account is best for parking a large sum temporarily?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is best if you want the highest possible return with zero risk?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account would you recommend to someone who has never saved before?', stage: 'Advocacy' },
  { category: 'High Yield Savings', query: 'Which HYSA is best for a couple with a joint savings goal?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account gives real earnings with absolutely zero fees?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online savings bank has the best reputation for security?', stage: 'Validation' },
  { category: 'Goal Based Savings', query: 'What bank helps you build savings habits through smart features?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'Which bank is the safest place to keep an emergency fund?', stage: 'Validation' },
  { category: 'CD Accounts', query: 'Which bank gives the best return on a CD for under $10,000?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account has the best rate for a balance over $25,000?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account consistently ranks #1 in independent reviews?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account is best for someone who wants to set and forget?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank gives you the most for doing nothing but saving?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is the best kept secret in personal finance?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'Which savings account has the best combination of rate, safety, and access?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What HYSA is best for someone moving from a 0.01% APY account?', stage: 'Awareness' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has no promo rate bait and switch?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA gives the best rate for balances under $1,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which savings account beats most money market funds in yield?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What high-yield savings account is best for a side hustle fund?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'Which savings account gives real yield with zero strings attached?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account has no fees and no fine print?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'Which bank is most transparent about savings account terms?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online bank has the best customer reviews for savings?', stage: 'Validation' },
  { category: 'Online Savings', query: 'Which online savings account is easiest to link to a checking account?', stage: 'Consideration' },
  { category: 'Online Savings', query: 'What online bank has the most intuitive savings features?', stage: 'Consideration' },
  { category: 'Goal Based Savings', query: 'Which bank lets you set up recurring transfers to savings automatically?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account is best for someone saving $500 a month?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank makes it easiest to stay disciplined about saving?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'What is the best savings account to keep separate for emergencies only?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank gives the best yield on an emergency fund with no lock-in?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account is best if I might need the money at any moment?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'What bank has the best bump-up CD that lets you increase the rate?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank gives the best rate on a 9-month CD?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank is best for someone building a CD ladder for the first time?', stage: 'Awareness' },
  { category: 'Money Market', query: 'What money market account is best for parking proceeds from a home sale?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account has no minimum balance to earn interest?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account earns the most with daily liquidity?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account is recommended most by first-time savers?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account gives the most in a rising interest rate environment?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which bank has the best overall savings ecosystem?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is best for someone building wealth from scratch?', stage: 'Awareness' },
  { category: 'General Savings', query: 'Which savings account is most recommended by certified financial planners?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What bank consistently delivers the best savings rates year after year?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA gives the best rate for a balance of $10,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has the fewest transfer restrictions?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What HYSA is most recommended by Reddit personal finance?', stage: 'Advocacy' },
  { category: 'No Fee Savings', query: 'Which no-fee savings account has the best overall rating?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online savings account has the best ACH transfer speed?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank makes goal-based saving most rewarding and motivating?', stage: 'Consideration' },
  { category: 'Emergency Fund', query: 'Which savings account has the fastest ACH transfer for emergencies?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best CD rate for a trust or estate account?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account is best for an older adult managing cash?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account would you recommend to your own family?', stage: 'Advocacy' },
  { category: 'High Yield Savings', query: 'Which HYSA has the fewest technical issues and best uptime?', stage: 'Validation' },
  { category: 'No Fee Savings', query: 'What savings account has no fees and still competitive rates?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online savings account has the best rate guarantee period?', stage: 'Validation' },
  { category: 'Goal Based Savings', query: 'What bank has the best savings challenge or goal-tracking features?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank is safest for an emergency fund over $50,000?', stage: 'Validation' },
  { category: 'CD Accounts', query: 'What bank has the best overall CD product lineup?', stage: 'Consideration' },
  { category: 'Money Market', query: 'Which money market account is best for a retiree managing income?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings product gives the best return for a 2-year horizon?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which savings account has the best combination of features and yield?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'What high-yield savings account do most personal finance experts have?', stage: 'Advocacy' },
  { category: 'No Fee Savings', query: 'Which savings account gives the most value with literally zero cost?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online savings account is best for someone skeptical of online banks?', stage: 'Consideration' },
  { category: 'Goal Based Savings', query: 'Which bank makes it hardest to accidentally spend your savings?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account gives both high yield and instant access?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank gives the best early withdrawal terms if you need to break a CD?', stage: 'Consideration' },
  { category: 'Money Market', query: 'What money market account is most recommended for cash management?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'Which savings account is the smartest financial decision for most people?', stage: 'Validation' },
  { category: 'General Savings', query: 'What bank makes saving money feel effortless and rewarding?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which savings account has the most five-star reviews from real customers?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account is best to open before the next rate cut?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account gives you the most confidence your money is working?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA is best for a balance between $5,000 and $25,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings has the best rate with no teaser period?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA is best for someone switching from a traditional bank?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which high-yield savings account has the best long-term rate history?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'What HYSA is recommended by the most independent financial websites?', stage: 'Advocacy' },
  { category: 'No Fee Savings', query: 'Which savings account has absolutely no conditions to earn the rate?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account is the most straightforward with no catches?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'Which bank offers savings with no fees and competitive APY combined?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online savings account is best for someone in a rural area?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online bank has won the most customer satisfaction awards?', stage: 'Validation' },
  { category: 'Online Savings', query: 'What online savings account has the best ATM reimbursement policy?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which bank is best for saving toward multiple goals simultaneously?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'What savings account makes it easiest to stay on track with goals?', stage: 'Consideration' },
  { category: 'Goal Based Savings', query: 'Which bank gives savings motivation features like progress tracking?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account is best if you might need the money within 24 hours?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank has the most reliable transfer speeds for emergency access?', stage: 'Validation' },
  { category: 'Emergency Fund', query: 'What savings account do financial planners prefer for emergency funds?', stage: 'Advocacy' },
  { category: 'CD Accounts', query: 'Which bank has the best CD for someone nearing retirement?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'What bank gives the best rate on a short-term CD under 6 months?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank has the most flexible CD terms?', stage: 'Consideration' },
  { category: 'Money Market', query: 'What money market account is best for a corporate cash reserve?', stage: 'Decision' },
  { category: 'Money Market', query: 'Which money market account earns the most without minimum balance?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account is most recommended by wealth advisors?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'Which savings account has the best track record of paying high rates?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account is the most trusted in the USA?', stage: 'Validation' },
  { category: 'General Savings', query: 'Which bank makes saving feel like the smartest thing you can do?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account gives the best return relative to risk?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which savings account is the top choice of personal finance professionals?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account has the best combination of safety and yield?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which savings account is best for someone who checks rates obsessively?', stage: 'Consideration' },
  { category: 'General Savings', query: 'What savings account is most recommended after a windfall?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank has the best savings account for a tech-savvy saver?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account gives you the most peace of mind?', stage: 'Validation' },
  { category: 'High Yield Savings', query: 'Which HYSA has the fastest account opening process?', stage: 'Decision' },
  { category: 'Online Savings', query: 'What online savings account has the best customer support?', stage: 'Consideration' },
  { category: 'CD Accounts', query: 'Which bank gives the best CD for a 401k rollover?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market is best for parking a large inheritance temporarily?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account would a wealth manager use for their own cash?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'What savings account gives the highest yield with daily compounding?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank is considered the gold standard for savings in the USA?', stage: 'Awareness' },
  { category: 'General Savings', query: 'What savings account is best for someone who wants maximum simplicity?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account consistently gets 5-star reviews from customers?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account is best for someone saving their first $10,000?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'Which HYSA is best for someone with a fluctuating balance?', stage: 'Decision' },
  { category: 'No Fee Savings', query: 'What savings account has zero fees and top-quartile APY?', stage: 'Decision' },
  { category: 'Goal Based Savings', query: 'Which savings account is best for someone following a 50/30/20 budget?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'What savings account is best for a first responder building an emergency fund?', stage: 'Decision' },
  { category: 'CD Accounts', query: 'Which bank gives the best CD for college savings?', stage: 'Decision' },
  { category: 'Money Market', query: 'What money market account is best if I need to write checks occasionally?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account is best for someone who prioritises simplicity over everything?', stage: 'Decision' },
  { category: 'High Yield Savings', query: 'What HYSA is best for someone who checks rates every week?', stage: 'Consideration' },
  { category: 'High Yield Savings', query: 'Which HYSA gives the best combination of yield and service?', stage: 'Consideration' },
  { category: 'No Fee Savings', query: 'What savings account has no fees and earns real interest daily?', stage: 'Decision' },
  { category: 'Online Savings', query: 'Which online savings bank has the most five-star reviews?', stage: 'Validation' },
  { category: 'Goal Based Savings', query: 'What savings account is best for someone on a strict budget?', stage: 'Decision' },
  { category: 'Emergency Fund', query: 'Which bank is best for someone who needs emergency fund peace of mind?', stage: 'Validation' },
  { category: 'CD Accounts', query: 'What bank gives the best CD rate for a first-time CD buyer?', stage: 'Awareness' },
  { category: 'Money Market', query: 'Which money market account gives daily liquidity and competitive yield?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is best for maximising returns on idle cash?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which bank is best for someone who wants a set-and-forget savings strategy?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is most recommended for building long-term wealth?', stage: 'Advocacy' },
  { category: 'General Savings', query: 'Which savings account gives the best return on a $20,000 balance?', stage: 'Decision' },
  { category: 'General Savings', query: 'What savings account is best for someone who moves money frequently?', stage: 'Consideration' },
  { category: 'General Savings', query: 'Which savings account has earned the most loyalty from long-term customers?', stage: 'Validation' },
  { category: 'General Savings', query: 'What savings account is the smartest place to park extra cash right now?', stage: 'Decision' },
  { category: 'General Savings', query: 'Which savings account is the definitive best choice for most Americans?', stage: 'Advocacy' },
];

// ─── QUERY ROUTING ────────────────────────────────────────────────────────────
// Core industries get curated queries — consistent, tested, comparable run-over-run.
// All other industries get AI-generated queries — dynamic, specific to the URL.

// ─── PRODUCT CATEGORY DETECTION ───────────────────────────────────────────────
// Detects both the broad industry AND the specific product category within it.
// This lets us weight queries toward what the brand actually competes on.
//
// Example:
//   citi.com/credit-cards         → industry=credit_cards, product=general
//   citi.com/credit-cards/double-cash → industry=credit_cards, product=cash_back
//   amex.com/credit-cards/platinum   → industry=credit_cards, product=premium
//   ally.com/bank/savings            → industry=savings, product=high_yield
//   chase.com                        → industry=retail_banking, product=general

type IndustryType = 'credit_cards' | 'retail_banking' | 'savings' | 'other';
type ProductCategory = 'cash_back' | 'travel' | 'premium' | 'balance_transfer' | 'no_annual_fee' | 'business' | 'student' | 'credit_building' | 'high_yield' | 'checking' | 'cd' | 'money_market' | 'general';

function detectIndustry(industryKey: string, lob: string, urlPath: string): { industry: IndustryType; product: ProductCategory } {
  const k = (industryKey + ' ' + lob + ' ' + urlPath).toLowerCase();

  // Detect broad industry
  let industry: IndustryType = 'other';
  if (k.includes('credit_card') || k.includes('credit card') || k.includes('credit-card')) industry = 'credit_cards';
  else if (k.includes('savings') || k.includes('hysa') || k.includes('high-yield') || k.includes('high yield') || k.includes('money market') || k.includes('money-market') || k.includes('cd ') || k.includes('certificate')) industry = 'savings';
  else if (k.includes('retail_bank') || k.includes('retail bank') || k.includes('checking') || k.includes('banking') || k.includes('current account')) industry = 'retail_banking';

  // Detect specific product category within credit cards
  let product: ProductCategory = 'general';
  if (industry === 'credit_cards') {
    if (k.includes('cash back') || k.includes('cashback') || k.includes('cash-back') || k.includes('double cash') || k.includes('freedom')) product = 'cash_back';
    else if (k.includes('travel') || k.includes('miles') || k.includes('airline') || k.includes('sapphire') || k.includes('venture') || k.includes('platinum') && k.includes('travel')) product = 'travel';
    else if (k.includes('platinum') || k.includes('luxury') || k.includes('premium') || k.includes('centurion') || k.includes('reserve') || k.includes('infinite')) product = 'premium';
    else if (k.includes('balance transfer') || k.includes('0% apr') || k.includes('zero apr') || k.includes('0 apr')) product = 'balance_transfer';
    else if (k.includes('no annual fee') || k.includes('no-annual-fee') || k.includes('no fee')) product = 'no_annual_fee';
    else if (k.includes('business') || k.includes('corporate') || k.includes('ink ') || k.includes('spark')) product = 'business';
    else if (k.includes('student') || k.includes('college') || k.includes('university')) product = 'student';
    else if (k.includes('secured') || k.includes('credit builder') || k.includes('credit-builder') || k.includes('rebuild')) product = 'credit_building';
  } else if (industry === 'savings') {
    if (k.includes('high yield') || k.includes('high-yield') || k.includes('hysa')) product = 'high_yield';
    else if (k.includes('cd') || k.includes('certificate')) product = 'cd';
    else if (k.includes('money market') || k.includes('money-market')) product = 'money_market';
  } else if (industry === 'retail_banking') {
    if (k.includes('checking') || k.includes('current account')) product = 'checking';
  }

  return { industry, product };
}

// ─── PRODUCT-AWARE CURATED QUERY SELECTION ─────────────────────────────────────
// When a specific product is detected, we weight queries toward that category.
// This ensures Citi Double Cash is scored on cash back queries, not travel queries.
//
// WEIGHTING:
//   Specific product detected → 60% product-specific + 40% general industry
//   No specific product       → 100% from full curated bank (all categories)
//
// This is defensible to clients: "We scored you on the queries consumers actually
// ask when researching your specific product, plus general brand awareness queries."

function getCuratedQueries(
  industry: IndustryType,
  product: ProductCategory,
  total: number
): { category: string; query: string; stage: string; persona: string }[] {

  const bank = industry === 'credit_cards' ? CREDIT_CARD_QUERIES
    : industry === 'retail_banking' ? RETAIL_BANKING_QUERIES
    : SAVINGS_ACCOUNT_QUERIES;

  const PRODUCT_TO_CATEGORY: Partial<Record<ProductCategory, string[]>> = {
    cash_back        : ['Cash Back'],
    travel           : ['Travel Rewards'],
    premium          : ['Premium Cards'],
    balance_transfer : ['Balance Transfer'],
    no_annual_fee    : ['No Annual Fee'],
    business         : ['Business Cards'],
    student          : ['Student Cards'],
    credit_building  : ['Credit Building'],
    high_yield       : ['High Yield Savings'],
    cd               : ['CD Accounts'],
    money_market     : ['Money Market'],
    checking         : ['Checking Accounts'],
  };

  const targetCats = PRODUCT_TO_CATEGORY[product] || [];

  // Enrich curated queries with pain point context based on journey stage
  // This gives GPT context so it answers specifically, not generically
  const STAGE_PAIN_POINTS: Record<string, string> = {
    Awareness    : 'Consumer is just discovering options and does not know where to start',
    Consideration: 'Consumer is comparing 2-4 options and struggling to identify the key differences',
    Decision     : 'Consumer is ready to choose and wants one clear specific recommendation',
    Validation   : 'Consumer has almost decided and wants confirmation they are making the right choice',
    Advocacy     : 'Consumer wants to recommend the single best option to someone they care about',
  };

  if (product === 'general' || targetCats.length === 0) {
    return bank.slice(0, total).map(q => ({
      ...q,
      persona: 'general consumer',
      context: STAGE_PAIN_POINTS[q.stage] || '',
    }));
  }

  const productQueries = bank.filter(q => targetCats.includes(q.category));
  const out: typeof productQueries = [];
  while (out.length < total && productQueries.length > 0) {
    productQueries.forEach(q => { if (out.length < total) out.push(q); });
  }

  return out.slice(0, total).map(q => ({
    ...q,
    persona: 'general consumer',
    context: STAGE_PAIN_POINTS[q.stage] || '',
  }));
}

// Stage × Pain Point query generation for non-core industries.
// No personas. Maps the universal buyer journey for any product.
//
// JOURNEY STAGES × PAIN POINTS:
// Awareness     — consumer doesn't know what's available or what to look for
// Consideration — comparing options, evaluating trade-offs
// Decision      — ready to choose, needs specific recommendation
// Validation    — questioning their choice, looking for reassurance
// Advocacy      — wants to recommend or maximise what they have
//
// Pain points are generated by AI for the specific product — no hardcoding.
// Queries are generated from pain points — specific, high-intent, brand-inviting.

async function genAIQueries(lob: string, industry: string, cats: string[], total: number): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  const prod = lob || industry || 'product';

  // Step 1: Generate pain points per stage — AI discovers what consumers struggle with
  const painPointsRaw = await ai([{ role: 'user', content:
`You are a consumer research expert. For someone researching ${prod}, list the key pain points and questions at each stage of their buying journey.

Return ONLY valid JSON:
{
  "Awareness": ["5 pain points — what they don't know yet, what confuses them"],
  "Consideration": ["5 pain points — what makes comparison hard, trade-offs they struggle with"],
  "Decision": ["5 pain points — specific blockers to choosing, what they need to know"],
  "Validation": ["4 pain points — doubts after choosing, what makes them second-guess"],
  "Advocacy": ["3 pain points — what stops them recommending, what they wish they knew sooner"]
}` }], 0.4, 1000);

  const painPoints = parseJSON(painPointsRaw) || {
    Awareness: ['I do not know what types exist', 'I do not know what to look for', 'I am not sure where to start', 'I do not know what is best overall', 'I am confused by all the options'],
    Consideration: ['I cannot tell which option is better for me', 'I am not sure if premium is worth it', 'I do not know which features matter most', 'I am overwhelmed by the number of options', 'I do not know what trade-offs I am making'],
    Decision: ['I have narrowed it down but cannot choose', 'I want the single best recommendation', 'I need to know which one for my exact situation', 'I want to know what experts pick', 'I need to justify my choice'],
    Validation: ['I am not sure I made the right choice', 'I wonder if I am missing benefits', 'I want to confirm others are happy with this choice', 'I am not getting enough value'],
    Advocacy: ['I want to recommend the right thing to someone else', 'I wish someone had told me this sooner', 'I want to help others avoid my mistakes'],
  };

  // Step 2: Generate queries from pain points — all parallel by stage
  const stageJobs = Object.entries(painPoints).map(async ([stage, points]) => {
    const stagePoints = (points as string[]).join('\n');
    const stageTotal = stage === 'Consideration' || stage === 'Decision' ? Math.ceil(total * 0.28) :
                       stage === 'Awareness' ? Math.ceil(total * 0.20) :
                       stage === 'Validation' ? Math.ceil(total * 0.14) :
                       Math.ceil(total * 0.10);
    const chunks = Math.ceil(stageTotal / QUERY_BATCH);
    const chunkJobs = Array.from({ length: chunks }, (_, ci) => {
      const count = Math.min(QUERY_BATCH, stageTotal - ci * QUERY_BATCH);
      const catFocus = cats.slice((ci * 3) % Math.max(cats.length, 1), (ci * 3) % Math.max(cats.length, 1) + 4).join(', ') || 'General';
      return ai([{ role: 'user', content:
`Write ${count} questions someone types into ChatGPT about ${prod}.

Journey stage: ${stage}
Consumer pain points at this stage:
${stagePoints}

Categories to cover: ${catFocus}

Rules:
- No brand names in questions
- Each question must naturally lead to brand recommendations in the answer
- Questions should reflect the pain points above — be specific to this stage
- Vary the question structure and specificity
- Natural conversational language

Return JSON only:
[{"category":"category name","query":"question text","stage":"${stage}","persona":"general consumer"}]
Exactly ${count} items.` }], 0.5, Math.max(1500, count * 110), 2);
    });
    const results = await Promise.all(chunkJobs);
    return results.flatMap(raw => {
      const p = parseJSON(raw);
      return Array.isArray(p) ? p.filter((x: any) => x?.query?.length > 8) : [];
    });
  });

  const allByStage = await Promise.all(stageJobs);
  const all = allByStage.flat();

  // Deduplicate
  const seen = new Set<string>();
  const unique = all.filter(q => {
    const k = q.query.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Pad if needed
  if (unique.length < total) {
    const prod2 = prod;
    const stages = ['Awareness','Consideration','Decision','Validation','Advocacy'];
    let fi = 0;
    while (unique.length < total) {
      const cat = cats[fi % Math.max(cats.length, 1)] || 'General';
      const stage = stages[fi % stages.length];
      unique.push({ category: cat, query: `What is the best ${prod2} for ${cat.toLowerCase()}?`, stage, persona: 'general consumer' });
      fi++;
    }
  }

  return unique.slice(0, total);
}

// ─── SCORING ──────────────────────────────────────────────────────────────────
// VISIBILITY  = mentions / total × 100              — how often brand appears (0-100)
// PROMINENCE  = rank1 / mentions × 100              — when it appears, how often first (0-100)
// SENTIMENT   = positive_mentions / mentions × 100  — tone quality of its mentions (0-100)
// CITATION    = sum(1/pos) / mentions × 100         — position quality of mentions (0-100)
// SOV         = brand_responses / any_brand × 100   — share of all brand conversations (0-100)
// GEO         = Vis×0.30 + Sen×0.20 + Prom×0.20 + Cit×0.15 + SOV×0.15
//
// Visibility and SOV relative to total — measure frequency.
// Prominence, Sentiment, Citation relative to OWN mentions — measure quality.
// A brand appearing 60% of the time with great quality will score GEO ~65.
// A brand appearing 0% scores 0. No inflation, no deflation.
function score(brand: string, als: string[], qa: any[], comps: string[]) {
  const answered     = qa.filter(r => r && (r.a || '').trim().length > 10);
  const total        = answered.length || 1;
  const compAls      = comps.map(c => aliases(c));

  // VISIBILITY — frequency: how often across all queries
  const mentioned    = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
  const mentionCount = mentioned.length;
  const visibility   = Math.round((mentionCount / total) * 100);

  if (mentionCount === 0) {
    // Brand never appeared — all quality metrics are 0
    const top8z = comps.slice(0, 8);
    const anySetZ = new Set<number>();
    answered.forEach((r, i) => { top8z.forEach(c => { if (hasAlias((r.a||'').toLowerCase(), aliases(c))) anySetZ.add(i); }); });
    const sovZ = Math.round((0 / Math.max(anySetZ.size, 1)) * 100);
    return { visibility: 0, prominence: 0, sentiment: 0, citationShare: 0, shareOfVoice: sovZ, geo: 0, avgPos: 0, mentionCount: 0, totalCount: answered.length };
  }

  // POSITIONS — where is brand named in each response where it appears?
  const positions  = mentioned.map(r => position(r.a || '', als, compAls)).filter(p => p > 0);
  const avgPos     = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;
  const rank1Count = positions.filter(p => p === 1).length;

  // PROMINENCE — quality: of its own mentions, how often named first?
  const rawProminence = Math.round((rank1Count / mentionCount) * 100);

  // SENTIMENT — quality: of its own mentions, how often positive or neutral tone?
  const POS = ['best','top','recommended','leading','excellent','great','trusted','popular',
    'ideal','perfect','outstanding','superior','preferred','reliable','strong','impressive',
    'generous','competitive','solid','standout','exceptional','renowned'];
  const NEG = ['worst','poor','bad','avoid','expensive','weak','limited','disappointing',
    'inferior','mediocre','unreliable','overpriced','problematic','lacking','outdated',
    'complicated','confusing','frustrating','complaints'];
  let posMentions = 0;
  mentioned.forEach(r => {
    const sents = (r.a || '').toLowerCase().split(/[.!?]+/)
      .filter((s: string) => hasAlias(s, als) && s.length > 10);
    const hasNeg = sents.some((s: string) => NEG.some(w => s.includes(w)));
    if (!hasNeg) posMentions++;
  });
  const rawSentiment = Math.round((posMentions / mentionCount) * 100);

  // CITATION — position quality across own mentions
  const citWeight     = positions.reduce((s, p) => s + 1 / p, 0);
  const rawCitation   = Math.round((citWeight / mentionCount) * 100);

  // SOV — frequency: share of all brand-mentioning responses (top 10 competitors)
  const top10    = comps.slice(0, 10);
  const brandSet = new Set<number>(), anySet = new Set<number>();
  answered.forEach((r, i) => {
    const t = (r.a || '').toLowerCase();
    if (hasAlias(t, als)) { brandSet.add(i); anySet.add(i); }
    top10.forEach(c => { if (hasAlias(t, aliases(c))) anySet.add(i); });
  });
  const shareOfVoice = Math.round((brandSet.size / Math.max(anySet.size, 1)) * 100);

  // Blend quality scores with visibility
  // A brand with very few mentions has unreliable quality scores.
  // We blend raw quality toward neutral (50) weighted by mention rate.
  // mentionRate=0.8 (80%) → blend = 0.8×raw + 0.2×50 → quality mostly trusted
  // mentionRate=0.05 (5%) → blend = 0.05×raw + 0.95×50 → mostly neutral
  // This is a statistical blending principle — no hardcoded threshold
  const mentionRate   = mentionCount / total;
  const blend = (raw: number) => Math.round(mentionRate * raw + (1 - mentionRate) * 50);
  const prominence    = blend(rawProminence);
  const sentiment     = blend(rawSentiment);
  const citationShare = blend(rawCitation);

  // GEO — weighted composite
  const geo = Math.round(
    visibility     * 0.30 +
    sentiment      * 0.20 +
    prominence     * 0.20 +
    citationShare  * 0.15 +
    shareOfVoice   * 0.15
  );

  return { visibility, prominence, sentiment, citationShare, shareOfVoice, geo, avgPos, mentionCount, totalCount: answered.length };
}

function scoreComp(name: string, url: string, qa: any[], allComps: string[]) {
  const als = aliases(name);
  const s   = score(name, als, qa, allComps.filter(c => c !== name));
  return { Brand: name, URL: url || `${name.toLowerCase().replace(/\s+/g, '')}.com`, GEO: s.geo, Vis: s.visibility, Cit: s.citationShare, Sen: s.sentiment, Sov: s.shareOfVoice, Prom: s.prominence, avgPos: s.avgPos };
}

function buildClusters(qa: any[], als: string[], comps: string[]) {
  const cats = [...new Set(qa.filter(Boolean).map(r => r.category).filter(Boolean))] as string[];
  return cats.map(cat => {
    const rows = qa.filter(r => r && r.category === cat);
    const answered = rows.filter(r => (r.a || '').trim().length > 10);
    const hits = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
    const winRate = answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0;
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

const SOURCES: Record<string, string> = { nerdwallet: 'Earned Media', bankrate: 'Earned Media', creditkarma: 'Earned Media', thepointsguy: 'Earned Media', wallethub: 'Earned Media', investopedia: 'Earned Media', consumerreports: 'Institution', forbes: 'Earned Media', cnbc: 'Earned Media', businessinsider: 'Earned Media', motleyfool: 'Earned Media', wsj: 'Earned Media', marketwatch: 'Earned Media', bloomberg: 'Earned Media', reddit: 'Social', twitter: 'Social', youtube: 'Social', linkedin: 'Social', wikipedia: 'Institution', fdic: 'Institution', consumerfinance: 'Institution', experian: 'Institution', lendingtree: 'Earned Media' };

function extractCitations(qa: any[], domain: string, brand: string) {
  const counts: Record<string, number> = {};
  const clean = domain.replace('www.', '');
  const re = new RegExp(`(?<![a-z0-9])${brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i');
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

    const page = await fetchPage(url);
    if (!page.ok) return NextResponse.json({ error: page.error }, { status: 400 });

    const d = await discover(page, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = d;
    const als = aliases(brand);

    // Route to curated or AI-generated queries
    const { industry: industryType, product: productType } = detectIndustry(industryKey, lob, page.urlPath || '');
    const [queries, citRaw, trendRaw] = await Promise.all([
      industryType !== 'other'
        ? Promise.resolve(getCuratedQueries(industryType, productType, MAX))
        : genAIQueries(lob, industry, categories, MAX),
      ai([{ role: 'user', content: `List 10 domains AI models cite for ${lob || industry} questions in the USA. Brand: ${brand} (domain: ${page.domain})\nReturn ONLY valid JSON:\n[{"rank":1,"domain":"nerdwallet.com","category":"Earned Media","citation_share":12,"top_pages":[]}]\nInclude ${page.domain} as rank 1 (Owned Media). Exactly 10 items.` }], 0.1, 1000),
      ai([{ role: 'user', content: `List 10 trending questions consumers ask AI about ${lob || industry} in USA. No brand names. Short natural questions.\nReturn ONLY valid JSON:\n[{"query":"best credit card for groceries","trend":"Rising","opportunity":"High","category":"Cash Back","estimated_daily_searches":8200}]\nExactly 10 items.` }], 0.3, 900),
    ]);

    const allQA: any[] = new Array(queries.length).fill(null);
    const batches = Array.from({ length: Math.ceil(queries.length / ANSWER_BATCH) }, (_, i) => queries.slice(i * ANSWER_BATCH, (i + 1) * ANSWER_BATCH));

    const STAGE_GUIDANCE: Record<string, string> = {
      Awareness    : 'Name 3-4 leading brands, what each is best known for, and which is the overall top pick.',
      Consideration: 'Name 2-4 brands, compare them for this specific need, and state clearly which wins and why.',
      Decision     : 'Name 2-3 brands that fit, explain which is the single best for exactly what is asked.',
      Validation   : 'Name 2-3 brands and confirm which genuinely leads in this specific area.',
      Advocacy     : 'Name 2-3 brands and give a clear confident recommendation with the key reason.',
    };

    await Promise.all(batches.map(async (batch, bi) => {
      const ql = batch.map((q, j) => {
        const guidance = STAGE_GUIDANCE[q.stage] || STAGE_GUIDANCE['Consideration'];
        return `Q${j + 1} [${q.category} — ${q.stage}]: ${q.query}\nGuidance: ${guidance}`;
      }).join('\n\n');
      const lbs = batch.map((_, j) => `A${j + 1}:`).join('\n');
      const raw = await ai([
        { role: 'system', content: `You are a senior consumer finance expert. For every question, name 2-4 specific real brands. Always mention the major players in this space — for credit cards that means Chase, American Express, Capital One, Citi, Discover, and others as relevant. Name the brands that genuinely fit the question best, but ensure you are always recommending real named brands, never vague descriptions. 2-3 sentences per answer.` },
        { role: 'user', content: `Answer each question. Follow the Guidance for depth. Always name 2-4 specific real brands per answer.\n\n${ql}\n\nFormat:\n${lbs}` },
      ], 0.4, 4000, 2);
      const answers = parseAnswers(raw, batch.length);
      batch.forEach((q, j) => { allQA[bi * ANSWER_BATCH + j] = { category: q.category, stage: q.stage, persona: q.persona, q: q.query, a: answers[j] || '' }; });
    }));

    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = { category: queries[i]?.category || '', stage: queries[i]?.stage || '', persona: queries[i]?.persona || '', q: queries[i]?.query || '', a: '' };
    }

    const scores = score(brand, als, allQA, competitors);

    // REAL COMPETITORS — extracted from actual AI responses, not guessed from discovery
    // These are the brands GPT actually mentions when answering consumer questions
    // Much more accurate than a predefined list
    const mentionCounts: Record<string, number> = {};
    const domainMap: Record<string, string> = {};
    allQA.filter(Boolean).forEach(r => {
      const t = (r.a || '').toLowerCase();
      competitors.forEach(c => {
        const ca = aliases(c);
        if (hasAlias(t, ca)) {
          const key = c.toLowerCase();
          mentionCounts[key] = (mentionCounts[key] || 0) + 1;
          domainMap[key] = competitorUrls[c] || `${c.toLowerCase().replace(/\s+/g,'')}.com`;
        }
      });
    });

    // COMPETITORS — only brands GPT actually mentioned, sorted by GEO score
    const realCompetitors = Object.entries(mentionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => competitors.find(c => c.toLowerCase() === key) || key)
      .filter(c => c.toLowerCase() !== brand.toLowerCase());

    const competitorScoresRaw = realCompetitors
      .map(c => scoreComp(c, domainMap[c.toLowerCase()] || competitorUrls[c] || '', allQA, realCompetitors))
      .sort((a, b) => b.GEO - a.GEO);

    // Assign ranks by GEO score order
    const allBrandScores = [
      { name: brand, geo: scores.geo },
      ...competitorScoresRaw.map(c => ({ name: c.Brand, geo: c.GEO })),
    ].sort((a, b) => b.geo - a.geo);

    const rankMap: Record<string, string> = {};
    allBrandScores.forEach((b, i) => { rankMap[b.name.toLowerCase()] = b.geo > 0 ? `#${i + 1}` : 'N/A'; });
    const myAvgRank = rankMap[brand.toLowerCase()] || 'N/A';
    const competitorScores = competitorScoresRaw.map(c => ({ ...c, Rank: rankMap[c.Brand.toLowerCase()] || 'N/A' }));

    const compAlsForDetail = competitors.map(c => aliases(c));
    const responsesDetail = allQA.filter(Boolean).map(r => {
      const t = (r.a || '').toLowerCase();
      const isMentioned = hasAlias(t, als);
      const brandPos = isMentioned ? position(r.a || '', als, compAlsForDetail) : 0;
      let winner = '', winPos = Infinity;
      competitors.slice(0, 12).forEach(c => {
        const ca = aliases(c);
        const pos = position(r.a || '', ca, compAlsForDetail.filter(x => x !== ca));
        if (pos > 0 && pos < winPos && (brandPos === 0 || pos < brandPos)) { winPos = pos; winner = c; }
      });
      return { category: r.category, stage: r.stage, persona: r.persona, query: r.q, mentioned: isMentioned, response_preview: r.a || '', position: brandPos, winner_brand: winner || null };
    });

    const queryClusters = buildClusters(allQA, als, competitors);
    const stageNames = ['Awareness', 'Consideration', 'Decision', 'Validation', 'Advocacy'];
    const stageWinRates = stageNames.map(s => {
      const rows = allQA.filter(r => r && r.stage === s);
      const answered = rows.filter(r => (r.a || '').trim().length > 10);
      const hits = answered.filter(r => hasAlias((r.a || '').toLowerCase(), als));
      return { stage: s, winRate: answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0, total: answered.length };
    });

    const citationSources = (() => { const p = parseJSON(citRaw); return Array.isArray(p) && p.length > 0 ? p : extractCitations(allQA, page.domain, brand); })();
    const trendingQueries = (() => { const p = parseJSON(trendRaw); return Array.isArray(p) ? p : []; })();

    const topCats    = [...queryClusters].sort((a, b) => b.winRate - a.winRate).slice(0, 3).map(c => c.category);
    const missCats   = queryClusters.filter(c => c.winRate === 0).slice(0, 3).map(c => c.category);
    const topComp    = competitorScores[0]?.Brand || 'competitors';
    const bestStage  = [...stageWinRates].sort((a, b) => b.winRate - a.winRate)[0];
    const worstStage = [...stageWinRates].sort((a, b) => a.winRate - b.winRate)[0];

    const [insightsRaw, targetedClusters] = await Promise.all([
      ai([{ role: 'user', content: `GEO strategist. Return ONLY valid JSON.\nBrand:${brand} Product:${lob||industry} GEO:${scores.geo} Vis:${scores.visibility}%(${scores.mentionCount}/${scores.totalCount}) Prom:${scores.prominence}(${myAvgRank}) Sen:${scores.sentiment} Cit:${scores.citationShare} SOV:${scores.shareOfVoice}%\nBestStage:${bestStage?.stage} ${bestStage?.winRate}% WorstStage:${worstStage?.stage} ${worstStage?.winRate}%\nTopCats:${topCats.join(',')||'none'} Missing:${missCats.join(',')||'none'} TopComp:${topComp}\nReturn:{"strengths":["3 specific data-backed strengths"],"improvements":["5 specific gaps"],"actions":[{"priority":"High","action":"action"},{"priority":"High","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Low","action":"action"}]}` }], 0.2, 1200),
      (async (): Promise<any[]> => {
        try {
          const fRaw = await ai([{ role: 'user', content: `What specific products/features is "${brand}" genuinely known for in ${lob||industry}? Only real established reputation.\nReturn ONLY valid JSON:\n{"knownFor":[{"product":"name","queries":["10 short brand-inviting questions, NO brand names"]}]}\nMax 3 products.` }], 0.2, 1200);
          const fame = parseJSON(fRaw);
          const knownFor: { product: string; queries: string[] }[] = fame?.knownFor || [];
          if (!knownFor.length) return [];
          const bl = brand.toLowerCase(), bw = bl.split(/\s+/).filter(w => w.length > 4);
          const ok = (q: string) => { const ql = q.toLowerCase(); return !ql.includes(bl) && !bw.some(w => ql.includes(w)); };
          const flat: { product: string; query: string }[] = [];
          knownFor.forEach(k => k.queries.slice(0, 10).filter(ok).forEach(q => flat.push({ product: k.product, query: q })));
          const tBatches = Array.from({ length: Math.ceil(flat.length / 10) }, (_, i) => flat.slice(i * 10, (i + 1) * 10));
          const tQA: any[] = [];
          await Promise.all(tBatches.map(async batch => {
            const ql = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
            const lbs = batch.map((_, j) => `A${j + 1}:`).join('\n');
            const r2 = await ai([{ role: 'user', content: `Answer naming real brands. Be balanced.\n\n${ql}\n\nFormat:\n${lbs}` }], 0.3, 2000, 2);
            const answers = parseAnswers(r2, batch.length);
            batch.forEach((item, j) => {
              const ans = answers[j] || '';
              tQA.push({ product: item.product, query: item.query, ans, mentioned: hasAlias(ans.toLowerCase(), als), position: position(ans, als, competitors.map(c => aliases(c))) });
            });
          }));
          const pMap: Record<string, any[]> = {};
          tQA.forEach(r => { (pMap[r.product] = pMap[r.product] || []).push(r); });
          return Object.entries(pMap).map(([product, rows]) => {
            const total2 = rows.length, hits2 = rows.filter(r => r.mentioned).length;
            const posArr = rows.filter(r => r.mentioned && r.position > 0).map(r => r.position);
            const avgP2 = posArr.length > 0 ? posArr.reduce((a: number, b: number) => a + b, 0) / posArr.length : 3;
            const rank1c = posArr.filter(p => p === 1).length;
            const cc: Record<string, number> = {};
            rows.forEach(r => { const t = (r.ans||'').toLowerCase(); competitors.forEach(c => { if (hasAlias(t, aliases(c)) && c.toLowerCase() !== bl) cc[c] = (cc[c]||0)+1; }); });
            return { product, total: total2, mentioned: hits2, winRate: total2 > 0 ? Math.round((hits2/total2)*100) : 0, prominence: total2 > 0 ? Math.round((rank1c/total2)*100) : 0, avgRank: `#${Math.round(avgP2)}`, topCompetitor: Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'', responses: rows.map(r => ({ query: r.query, mentioned: r.mentioned, position: r.position, response_preview: r.ans })) };
          }).sort((a, b) => b.winRate - a.winRate);
        } catch { return []; }
      })(),
    ]);

    const insights = parseJSON(insightsRaw) || { strengths: [], improvements: [], actions: [] };

    return NextResponse.json({
      brand_name: brand, industry, ind_key: industryKey, lob, ind_label: industry,
      query_type: industryType, product_type: productType,
      visibility: scores.visibility, sentiment: scores.sentiment, prominence: scores.prominence,
      citation_share: scores.citationShare, share_of_voice: scores.shareOfVoice,
      overall_geo_score: scores.geo, avg_rank: myAvgRank,
      responses_with_brand: scores.mentionCount, total_responses: scores.totalCount,
      personas, stage_win_rates: stageWinRates,
      responses_detail: responsesDetail, query_clusters: queryClusters,
      targeted_clusters: targetedClusters, competitors: competitorScores,
      citation_sources: citationSources, trending_queries: trendingQueries,
      strengths_list: insights.strengths||[], improvements_list: insights.improvements||[],
      actions: insights.actions||[],
      internal_links: page.internalLinks||[], domain: page.domain||'', page_url: url,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
