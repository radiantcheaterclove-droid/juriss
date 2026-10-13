const BASE = "https://api.groq.com/openai/v1";
export const keyOk = () => !!process.env.GROQ_API_KEY;
async function call(path: string, init: RequestInit = {}, ms = 22000, tries = 2): Promise<any> {
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(BASE + path, { ...init, signal: ctl.signal, headers: { "content-type": "application/json", authorization: "Bearer " + (process.env.GROQ_API_KEY || "") } });
      if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await new Promise((s) => setTimeout(s, 2000)); continue; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j?.error?.message || "Erro do provedor"), { status: r.status });
      return j;
    } catch (e: any) { if (e.name === "AbortError") throw Object.assign(new Error("Tempo esgotado ao consultar o Groq."), { status: 504 }); throw e; }
    finally { clearTimeout(t); }
  }
}
export async function listModels(): Promise<string[]> {
  const j = await call("/models");
  return (j.data || []).map((m: any) => String(m.id)).filter((id: string) => !/whisper|guard|tts|orpheus|playai|safeguard|embed/i.test(id)).sort();
}
export async function generate(model: string, system: string, user: string, temperature: number, maxTokens = 3000): Promise<string> {
  const j = await call("/chat/completions", { method: "POST", body: JSON.stringify({ model, temperature, max_tokens: maxTokens,
    messages: [{ role: "system", content: system }, { role: "user", content: user }] }) }, 22000, 1);
  return j?.choices?.[0]?.message?.content || "";
}
export const friendly = (e: any) => e.status === 401 || e.status === 403 ? "Chave do Groq inválida. Confira a variável GROQ_API_KEY no Netlify."
  : e.status === 413 || /too large|tokens per minute/i.test(e.message || "") ? "O pedido excedeu o limite por minuto do plano gratuito, mesmo reduzido. Aguarde 1 minuto e tente de novo, ou escolha outro modelo na lista. Detalhe do Groq: " + String(e.message || "").slice(0, 220)
  : e.status === 429 ? "Limite do plano gratuito atingido. Aguarde alguns minutos e tente de novo. Detalhe do Groq: " + String(e.message || "").slice(0, 220) : e.message || "Falha ao consultar o Groq.";
