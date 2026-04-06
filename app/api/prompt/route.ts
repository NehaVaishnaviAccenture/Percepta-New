import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
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
          { role: 'system', content: 'You are a sharp AI advisor. Name real brands, use bold for key terms, give specific actionable advice.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });
    const data = await res.json();
    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}