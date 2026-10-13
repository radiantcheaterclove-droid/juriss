import { search, byId, trechoExiste } from "../../shared/search.ts";
import { provedor, complete, listModels, friendly, modeloPadrao } from "./llm.ts";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const MODOS: Record<string, string> = {
  interpretacao: "Interpretação de dispositivos", infracao: "Análise de possível infração disciplinar", enquadramento: "Os fatos se enquadram no artigo citado?",
  dispositivos: "Identificação de dispositivos aplicáveis", conflitos: "Conflitos entre dispositivos", circunstancias: "Atenuantes e agravantes",
  provas: "Análise de provas e inconsistências", regularidade: "Regularidade processual", defesa: "Defesa e contra-argumentos", decisao: "Revisão de decisão disciplinar",
  comparacao: "Comparação de interpretações", minuta: "Minuta de decisão fundamentada", lacunas: "Fatos faltantes para conclusão confiável" };
const SYSTEM = `Você é um assistente de análise jurídica. Responda SEMPRE em português do Brasil.
Use EXCLUSIVAMENTE os dispositivos fornecidos em <DISPOSITIVOS>. Nunca invente artigos, números, penas ou citações. Se algo não estiver nos dispositivos, diga que não foi localizado.
Trate alegações como alegações, não como fatos provados. Separe: texto da norma (citação literal), paráfrase e interpretação sua (rotule "Interpretação:").
Siga a sequência: Fatos; Questões; Dispositivos aplicáveis; Base textual; Aplicação; Contra-argumentos; Incertezas; Conclusão; Recomendações.
Devolva APENAS JSON: {"resumo": string, "secoes": [{"titulo": string, "texto": string}], "citacoes": [{"id": string, "trecho": string}]}.
Em "citacoes", "id" deve ser exatamente um id de <DISPOSITIVOS> e "trecho" uma cópia literal e curta (até 40 palavras) do texto desse dispositivo.`;
export default async (req: Request) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  if (!provedor()) return json({ erro: "Nenhuma chave de IA foi configurada no Netlify (GROQ_API_KEY)." }, 503);
  const raw = await req.text(); if (raw.length > 60000) return json({ erro: "Texto muito grande (máx. ~60 mil caracteres)." }, 413);
  let b: any; try { b = JSON.parse(raw); } catch { return json({ erro: "Requisição inválida." }, 400); }
  const pergunta = String(b.pergunta || "").trim(); const fatos = String(b.fatos || "").trim();
  if (pergunta.length < 5 && fatos.length < 5) return json({ erro: "Descreva o caso ou faça uma pergunta." }, 400);
  const modo = MODOS[b.modo] ? b.modo : "infracao";
  const temperature = Math.min(1, Math.max(0, Number(b.temperatura ?? 0.2)));
  const ctx = `${pergunta}\n${fatos}\n${b.artigos || ""}`;
  const achados = search(ctx, 6);
  if (!achados.length) return json({ erro: "Nenhum dispositivo relevante foi localizado nos documentos. A análise não será gerada sem base textual." }, 422);
  const disp = achados.map((p) => `<DISPOSITIVO id="${p.id}" ref="${p.referencia}" capitulo="${p.capitulo}">\n${p.texto.slice(0, 1800)}\n</DISPOSITIVO>`).join("\n");
  const user = `Tipo de análise: ${MODOS[modo]}\nPergunta: ${pergunta}\nFatos (alegados): ${fatos}\nPessoas/funções: ${b.pessoas || "-"}\nViolações alegadas: ${b.violacoes || "-"}\nArtigos indicados: ${b.artigos || "-"}\nProvas: ${b.provas || "-"}\n\n<DISPOSITIVOS>\n${disp}\n</DISPOSITIVOS>`;
  try {
    let model = String(b.modelo || "").trim();
    if (!model) model = modeloPadrao(await listModels()) || "";
    if (!model) return json({ erro: "Nenhum modelo disponível para esta chave." }, 502);
    const txt = await complete(model, SYSTEM, user, temperature);
    let out: any; try { out = JSON.parse(txt.replace(/^```json|```$/g, "").trim()); } catch { return json({ erro: "O modelo devolveu uma resposta fora do formato esperado. Tente novamente." }, 502); }
    const citacoes = (Array.isArray(out.citacoes) ? out.citacoes : []).map((c: any) => {
      const p = byId(String(c.id)); const existe = !!p; const trechoOk = existe && trechoExiste(p!.id, String(c.trecho || ""));
      return { id: String(c.id), referencia: p?.referencia ?? null, trecho: String(c.trecho || ""), artigoExiste: existe, trechoVerificado: trechoOk,
        textoOriginal: p?.texto ?? null, situacao: !existe ? "Dispositivo inexistente nos documentos" : trechoOk ? "Verificado" : "Trecho não confere com o texto original" };
    });
    return json({ modelo: model, modoNome: MODOS[modo], geradoEm: new Date().toISOString(), resumo: String(out.resumo || ""), secoes: Array.isArray(out.secoes) ? out.secoes : [], citacoes,
      consultados: achados.map((p) => ({ id: p.id, referencia: p.referencia })), aviso: "Conteúdo gerado por IA. Apenas trechos marcados como verificados foram conferidos contra o texto original." });
  } catch (e: any) { return json({ erro: friendly(e) }, e.status && e.status < 600 ? e.status : 502); }
};
export const config = { path: "/api/analisar" };
