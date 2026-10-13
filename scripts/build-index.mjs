// Lê data/documents/*.txt (sem alterá-los) e gera src/generated/index.json
import fs from "node:fs";
import path from "node:path";
const DIR = "data/documents";
const OUT = "src/generated/index.json";
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")) : [];
const docs = [], provisions = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const key = file.replace(/\.txt$/i, "");
  const warnings = [];
  let chapter = "", title = "", cur = null;
  const seen = new Set(), chapters = new Map();
  const flush = () => { if (cur) { cur.texto = cur.texto.trim(); provisions.push(cur); cur = null; } };
  for (const line of raw.split("\n")) {
    const l = line.trim();
    let m;
    if ((m = l.match(/^(CAP[ÍI]TULO\s+[IVXL]+)\s*[-—–]\s*(.+)$/i))) {
      flush(); chapter = l;
      chapters.set(m[1].toUpperCase(), (chapters.get(m[1].toUpperCase()) || 0) + 1); title = ""; continue;
    }
    if (/^T[ÍI]TULO\s+[IVXL]+\s*[-—–]/i.test(l)) { flush(); title = l; continue; }
    if ((m = l.match(/^Art\.?\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?\s*[.\-–]/))) {
      flush();
      const num = m[1] + (m[2] ? "-" + m[2] : "");
      const id = `${key}-art-${num}`;
      if (seen.has(id)) warnings.push(`Artigo ${num} aparece mais de uma vez.`);
      seen.add(id);
      cur = { id, doc: key, arquivo: file, artigo: num, referencia: `${key}, Art. ${num}`, capitulo: chapter, titulo: title, texto: l };
    } else if (cur && l) cur.texto += "\n" + l;
  }
  flush();
  for (const [c, n] of chapters) if (n > 1) warnings.push(`O cabeçalho "${c}" aparece ${n} vezes no documento (numeração de capítulos repetida).`);
  const own = provisions.filter((p) => p.doc === key);
  if (!own.length) warnings.push("Nenhum artigo reconhecido.");
  const nums = own.map((p) => parseInt(p.artigo)); 
  for (let i = 1; i < nums.length; i++) if (nums[i] > nums[i - 1] + 1) warnings.push(`Possível lacuna de numeração entre Art. ${own[i - 1].artigo} e Art. ${own[i].artigo}.`);
  docs.push({ key, arquivo: file, bytes: Buffer.byteLength(raw), artigos: own.length, indexadoEm: new Date().toISOString(), avisos: warnings });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ docs, provisions: provisions.map((p) => ({ ...p, busca: norm(p.texto + " " + p.capitulo + " " + p.titulo) })) }));
console.log(`Indexados ${provisions.length} artigos em ${docs.length} documento(s).`);
for (const d of docs) console.log(` - ${d.arquivo}: ${d.artigos} artigos, ${d.avisos.length} aviso(s)`);
