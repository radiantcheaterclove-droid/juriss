// Lê JSON vindo de um modelo de IA, tolerando cercas de código e quebras de linha cruas dentro de strings.
export function parseJson(txt: string): any | null {
  let s = txt.replace(/```json|```/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { /* tenta reparar */ }
  let out = "", inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) { esc = false; out += ch; }
      else if (ch === "\\") { esc = true; out += ch; }
      else if (ch === '"') { inStr = false; out += ch; }
      else if (ch === "\n") out += "\\n"; else if (ch === "\r") out += "\\r"; else if (ch === "\t") out += "\\t";
      else out += ch;
    } else { if (ch === '"') inStr = true; out += ch; }
  }
  try { return JSON.parse(out); } catch { return null; }
}
