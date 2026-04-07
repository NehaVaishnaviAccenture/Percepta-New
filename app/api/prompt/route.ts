import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const isJsonRequest = prompt.includes('Return ONLY a valid JSON array');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://perceptageo.com',
        'X-Title': 'Percepta',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: isJsonRequest
              ? 'You are a GEO strategist. Return ONLY raw valid JSON with no markdown, no backticks, no explanation. Never wrap output in ```json``` blocks.'
              : 'You are a sharp AI advisor. Use markdown formatting: **bold** for key terms, ## for section headers, numbered lists for options, bullet points for details. Structure responses as: brief overview, then detailed breakdown, then final recommendation. Be specific and actionable.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: isJsonRequest ? 0.1 : 0.2,
        max_tokens: 1500,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
