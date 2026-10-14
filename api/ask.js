// Optional LLM backend for the Ops Copilot (Vercel serverless function).
// Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables to enable it.
// Without a key this returns 501 and the copilot stays in its grounded explainer mode.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'LLM not configured' });
  const { question, context } = req.body || {};
  if (!question || typeof question !== 'string' || question.length > 800) return res.status(400).json({ error: 'Bad question' });
  const system = [
    'You are the Ops Copilot inside an air operations planning console (SIH 2026 prototype, simulated data).',
    'Answer only from the JSON context provided. Be brief (max 120 words), concrete and use mission/aircraft IDs.',
    'You advise; the Air Commander decides. Never claim to have changed the plan. If the context lacks the answer, say so.',
  ].join(' ');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: `Context:\n${JSON.stringify(context).slice(0, 12000)}\n\nQuestion: ${question}` }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'LLM error' });
    const j = await r.json();
    const answer = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    return res.status(200).json({ answer });
  } catch {
    return res.status(502).json({ error: 'LLM unreachable' });
  }
}
