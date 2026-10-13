import idx from "../src/generated/index.json";
export type Provision = { id: string; doc: string; arquivo: string; artigo: string; referencia: string; capitulo: string; titulo: string; texto: string; busca: string };
export const provisions = idx.provisions as Provision[];
export const docsInfo = idx.docs as { key: string; arquivo: string; bytes: number; artigos: number; indexadoEm: string; avisos: string[] }[];
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const STOP = new Set("de da do das dos a o as os e em um uma que se por para com no na nos nas ao aos ou ser foi sao como mais mas sua seu".split(" "));
export function search(query: string, limit = 10): Provision[] {
  const q = norm(query);
  const nums = [...q.matchAll(/art(?:igo)?s?\.?\s*(\d+)\s*-?\s*([a-z])?/g)].map((m) => m[1] + (m[2] ? "-" + m[2].toUpperCase() : ""));
  const words = [...new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
  return provisions.map((p) => {
    let s = nums.includes(p.artigo) ? 50 : 0;
    for (const w of words) { const c = p.busca.split(w).length - 1; if (c) s += 1 + Math.log(c); }
    return { p, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
}
export const byId = (id: string) => provisions.find((p) => p.id === id);
export const trechoExiste = (id: string, trecho: string) => {
  const p = byId(id); if (!p) return false;
  const t = norm(trecho).replace(/\s+/g, " ").replace(/[.…]+$/, "").trim();
  return t.length >= 8 && norm(p.texto).replace(/\s+/g, " ").includes(t);
};
