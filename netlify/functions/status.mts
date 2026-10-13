import { keyOk, listModels, friendly } from "./gemini.ts";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
export default async () => {
  if (!keyOk()) return json({ configurada: false, modelos: [], mensagem: "GEMINI_API_KEY não está definida no Netlify." });
  try { return json({ configurada: true, modelos: await listModels(), mensagem: "Conexão com o Gemini funcionando." }); }
  catch (e: any) { return json({ configurada: true, modelos: [], mensagem: friendly(e) }, 200); }
};
export const config = { path: "/api/status" };
