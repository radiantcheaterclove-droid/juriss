import { provedor, nomeProvedor, listModels, friendly } from "./llm.ts";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
export default async () => {
  if (!provedor()) return json({ configurada: false, provedor: "nenhum", modelos: [], mensagem: "Nenhuma chave de IA configurada. Defina GROQ_API_KEY no Netlify." });
  try { return json({ configurada: true, provedor: nomeProvedor(), modelos: await listModels(), mensagem: `Conexão com ${nomeProvedor()} funcionando.` }); }
  catch (e: any) { return json({ configurada: true, provedor: nomeProvedor(), modelos: [], mensagem: friendly(e) }); }
};
export const config = { path: "/api/status" };
