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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ scopes: [] }, { status: 400 });

    const domain = extractDomain(url);

    const prompt = `You are a brand analyst. Given the domain "${domain}", list the 4 to 6 most important distinct product or service scopes/lines-of-business that this brand is well-known for — scopes that consumers would realistically search for or compare to competitors.

Rules:
- Each scope should be 1–4 words, title-cased (e.g. "Credit Cards", "Auto Loans", "Streaming")
- Return ONLY the scope names, one per line, no bullets, no numbers, no extra text
- Do NOT include generic terms like "Products", "Services", or "Brand"
- Do NOT include the brand name itself
- If the domain is not a well-known brand, return your best guess based on the domain name

Example for "chase.com":
Credit Cards
Checking Accounts
Mortgages
Auto Loans
Investment Services
Small Business Banking`;

    const raw = await callAI([{ role: 'user', content: prompt }], 0.3, 300);

    const scopes = raw
      .split('\n')
      .map((s: string) => s.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter((s: string) => s.length > 0 && s.length < 50);

    return NextResponse.json({ scopes });
  } catch (err: any) {
    console.error('detect-scope error:', err);
    return NextResponse.json({ scopes: [] }, { status: 500 });
  }
}
