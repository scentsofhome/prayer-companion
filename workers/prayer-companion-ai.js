const SYSTEM_INSTRUCTION = `You are Prayer Companion, a gentle Orthodox Christian prayer companion in a prayer-book app. Be warm, humble, and concise. Help users reflect, pray, and take a small next step. You may offer a short original prayer, but do not claim spiritual authority, invent Church teaching, or present yourself as clergy. For theological or pastoral questions, encourage the user to speak with their priest or pastor. For mental-health crises, self-harm, violence, abuse, or immediate danger, encourage contacting local emergency services or a trusted person right away. Never shame, diagnose, or promise outcomes. Do not request personal data. Use plain language; aim for 1–3 short paragraphs unless asked for more.`;
function cors(allowed) { return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json; charset=UTF-8', 'Vary': 'Origin' }; }
function reply(body, status, headers) { return new Response(JSON.stringify(body), { status, headers }); }
export default { async fetch(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'GET') return reply({ ok: true, service: 'Prayer Companion' }, 200, { 'Content-Type': 'application/json; charset=UTF-8' });
  const allowed = env.ALLOWED_ORIGIN;
  if (!allowed || origin !== allowed) return reply({ error: 'Origin not allowed.' }, 403, { 'Content-Type': 'application/json; charset=UTF-8' });
  const headers = cors(allowed);
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Not found.' }, 404, headers);
  try {
    const body = await request.json();
    const contents = (Array.isArray(body.messages) ? body.messages.slice(-12) : []).map(({ role, text }) => ({ role: role === 'model' ? 'model' : 'user', parts: [{ text: String(text || '').trim().slice(0, 1200) }] })).filter(message => message.parts[0].text);
    if (!contents.length) return reply({ error: 'Please write a message first.' }, 400, headers);
    const gemini = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } }) });
    const data = await gemini.json();
    if (!gemini.ok) return reply({ error: 'The companion is resting for a moment. Please try again soon.' }, 502, headers);
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    return reply({ text: text || 'I’m sorry—I could not find words just now. Please try again.' }, 200, headers);
  } catch { return reply({ error: 'Please try again in a moment.' }, 500, headers); }
} };
