import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o';

async function callAI(messages: { role: string; content: string }[], temperature = 0.2, max_tokens = 512) {
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
  return data.choices?.[0]?.message?.content ?? '';
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

// Verified canonical URLs for each scope per bank domain.
// Only includes domains + scopes that have been manually confirmed live.
const KNOWN_SCOPE_URLS: Record<string, Partial<Record<string, string>>> = {
  'citi.com':              { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/banking/savings-account' },
  'chase.com':             { 'Credit Cards': '/personal/credit-cards',                            'Savings Accounts': '/personal/savings' },
  'bankofamerica.com':     { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/savings' },
  'americanexpress.com':   { 'Credit Cards': '/us/credit-cards',                                  'Savings Accounts': '/en-us/banking/online-savings/account' },
  'discover.com':          { 'Credit Cards': '/credit-cards' },
  'capitalone.com':        { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/bank/savings-accounts' },
  'wellsfargo.com':        { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/savings-cds' },
  'usaa.com':              { 'Credit Cards': '/banking/credit-cards-public/?akredirect=true',     'Savings Accounts': '/banking/savings' },
  'navyfederal.org':       { 'Credit Cards': '/loans-cards/credit-cards',                         'Savings Accounts': '/checking-savings/savings' },
  'td.com':                { 'Credit Cards': '/us/en/personal-banking/credit-cards',              'Savings Accounts': '/us/en/personal-banking/savings-accounts' },
  'truist.com':            { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/savings' },
  'sofi.com':              { 'Credit Cards': '/credit-card',                                      'Savings Accounts': '/banking' },
  'ally.com':              {                                                                       'Savings Accounts': '/bank/online-savings-account' },
  'marcus.com':            {                                                                       'Savings Accounts': '/us/en/savings' },
  'citizensbank.com':      { 'Credit Cards': '/credit-cards/overview.aspx',                       'Savings Accounts': '/savings/savings-accounts/overview.aspx' },
  'pnc.com':               { 'Credit Cards': '/en/personal-banking/banking/credit-cards.html',    'Savings Accounts': '/en/personal-banking/banking/savings.html' },
  'penfed.org':            { 'Credit Cards': '/credit-cards',                                     'Savings Accounts': '/savings' },
};

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ scopes: [], scopedUrls: {} }, { status: 400 });

    const domain = extractDomain(url);

    // Return hardcoded URLs if we have them; AI fills in scope names for unknown domains.
    const knownUrls = KNOWN_SCOPE_URLS[domain] ?? {};

    const prompt = `You are a brand analyst. Given the domain "${domain}", list the 4 to 6 most important distinct product or service scopes/lines-of-business that this brand is well-known for — scopes that consumers would realistically search for or compare to competitors.

Rules:
- Each scope should be 1–4 words, title-cased (e.g. "Credit Cards", "Auto Loans", "Streaming")
- For each scope, also return its most likely canonical URL path on ${domain} (e.g. "/credit-cards", "/personal/savings")
- Return ONLY valid JSON, no markdown:
  {"scopes":["Credit Cards","Savings Accounts"],"scopedUrls":{"Credit Cards":"/credit-cards","Savings Accounts":"/banking/savings-account"}}
- Do NOT include generic terms like "Products", "Services", or "Brand"
- Do NOT include the brand name itself
- If the domain is not a well-known brand, return your best guess based on the domain name

Example for "chase.com":
{"scopes":["Credit Cards","Checking Accounts","Mortgages","Auto Loans","Investment Services","Small Business Banking"],"scopedUrls":{"Credit Cards":"/personal/credit-cards","Checking Accounts":"/personal/checking","Mortgages":"/personal/mortgage","Auto Loans":"/personal/auto","Investment Services":"/personal/investments","Small Business Banking":"/business"}}`;

    const raw = await callAI([{ role: 'user', content: prompt }], 0.3, 500);

    let scopes: string[] = [];
    let aiScopedUrls: Record<string, string> = {};

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.scopes)) {
        scopes = parsed.scopes
          .map((s: string) => String(s).trim())
          .filter((s: string) => s.length > 0 && s.length < 50);
      }
      if (parsed.scopedUrls && typeof parsed.scopedUrls === 'object') {
        aiScopedUrls = parsed.scopedUrls;
      }
    } catch {
      // AI returned non-JSON — fall back to line parsing for scopes, no URLs
      scopes = raw
        .split('\n')
        .map((s: string) => s.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter((s: string) => s.length > 0 && s.length < 50);
    }

    // Hardcoded URLs take priority over AI-generated ones
    const knownUrlsStrict: Record<string, string> = Object.fromEntries(
      Object.entries(knownUrls).filter((e): e is [string, string] => e[1] !== undefined)
    );
    const scopedUrls: Record<string, string> = { ...aiScopedUrls, ...knownUrlsStrict };

    return NextResponse.json({ scopes, scopedUrls });
  } catch (err: any) {
    console.error('detect-scope error:', err);
    return NextResponse.json({ scopes: [], scopedUrls: {} }, { status: 500 });
  }
}
