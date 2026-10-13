import * as groq from "./groq.ts";
import * as gem from "./gemini.ts";
export const provedor = (): "groq" | "gemini" | null => (groq.keyOk() ? "groq" : gem.keyOk() ? "gemini" : null);
export const nomeProvedor = () => (provedor() === "groq" ? "Groq" : provedor() === "gemini" ? "Google Gemini" : "nenhum");
export const listModels = () => (provedor() === "groq" ? groq.listModels() : gem.listModels());
export const friendly = (e: any) => (provedor() === "groq" ? groq.friendly(e) : gem.friendly(e));
export async function complete(model: string, system: string, user: string, temperature: number): Promise<string> {
  if (provedor() === "groq") return groq.generate(model, system, user, temperature);
  const r = await gem.generate(model, system, user, temperature);
  return r?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
}
export function modeloPadrao(ms: string[]): string | undefined {
  if (provedor() === "groq") return ms.find((m) => m === "llama-3.3-70b-versatile") || ms.find((m) => /llama/.test(m)) || ms[0];
  return ms.find((m) => /flash/.test(m) && !/(lite|preview|exp|image|tts)/.test(m)) || ms[0];
}
