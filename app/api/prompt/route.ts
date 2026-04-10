import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const isJsonRequest = prompt.includes('Return ONLY a valid JSON array') ||
                          prompt.includes('Return ONLY valid JSON') ||
                          prompt.includes('no markdown, no backticks');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://perceptageo.com',
        'X-Title': 'Percepta',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.4',
        messages: [
          {
            role: 'system',
            content: isJsonRequest
              ? 'You are a GEO strategist. Return ONLY raw valid JSON with no markdown, no backticks, no explanation. Never wrap output in ```json``` blocks.'
              : `You are a sharp, opinionated AI advisor who writes exactly like ChatGPT — rich, visual, and easy to scan.

ALWAYS follow this formatting style:
- Start with a 1-2 sentence overview
- Use ## for main section headings (e.g. ## 🏆 Top Picks, ## 📊 Detailed Breakdown, ## ✅ Final Recommendation)
- Use ### for sub-headings within sections
- Use numbered lists (1. 2. 3.) for rankings — always lead the item title with a relevant emoji
- Use bullet points with emoji indicators for features/details:
  • ✅ for pros or positives
  • ❌ for cons or negatives  
  • 💰 for cost/fees
  • 🎁 for rewards/bonuses
  • ✈️ for travel perks
  • 🔒 for security features
  • ⭐ for standout features
- **Bold** all brand names, card names, and key terms on first mention
- End every response with a ## ✅ Final Recommendation section that gives a direct answer
- Be specific, name real products, give real numbers
- Use emojis generously throughout to make responses visually rich and scannable`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: isJsonRequest ? 0.1 : 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
