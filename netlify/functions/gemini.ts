const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const keyOk = () => !!process.env.GEMINI_API_KEY;
async function call(path: string, init: RequestInit = {}, ms = 22000, tries = 2): Promise<any> {
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(BASE + path, { ...init, signal: ctl.signal, headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" } });
      if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await new Promise((s) => setTimeout(s, 1200)); continue; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j?.error?.message || "Erro do provedor"), { status: r.status });
      return j;
    } catch (e: any) { if (e.name === "AbortError") throw Object.assign(new Error("Tempo esgotado ao consultar o Gemini."), { status: 504 }); throw e; }
    finally { clearTimeout(t); }
  }
}
export async function listModels(): Promise<string[]> {
  const j = await call("/models?pageSize=100");
  return (j.models || []).filter((m: any) => m.supportedGenerationMethods?.includes("generateContent")).map((m: any) => String(m.name).replace("models/", "")).sort();
}
export const generate = (model: string, system: string, user: string, temperature: number) =>
  call(`/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", body: JSON.stringify({
    systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature, responseMimeType: "application/json" } }) });
export const friendly = (e: any) => e.status === 400 || e.status === 403 ? "Chave de API inválida ou sem permissão. Confira a variável GEMINI_API_KEY no Netlify."
  : e.status === 429 ? "Limite de uso do plano gratuito atingido. Aguarde alguns minutos e tente de novo." : e.message || "Falha ao consultar o Gemini.";
