import { useEffect, useState } from "react";
import { docsInfo, search, provisions, type Provision } from "../shared/search";

type Citacao = { id: string; referencia: string | null; trecho: string; situacao: string; trechoVerificado: boolean; textoOriginal: string | null };
type Relatorio = { id: string; titulo: string; geradoEm: string; modelo: string; modoNome: string; resumo: string; secoes: { titulo: string; texto: string }[]; citacoes: Citacao[]; consultados: { id: string; referencia: string }[] };
const MODOS: [string, string][] = [["infracao", "Possível infração disciplinar"], ["interpretacao", "Interpretação de dispositivos"], ["enquadramento", "Enquadramento dos fatos em um artigo"], ["dispositivos", "Dispositivos aplicáveis"], ["conflitos", "Conflitos entre dispositivos"], ["circunstancias", "Atenuantes e agravantes"], ["provas", "Provas e inconsistências"], ["regularidade", "Regularidade processual"], ["defesa", "Defesa e contra-argumentos"], ["decisao", "Revisão de decisão"], ["comparacao", "Comparar interpretações"], ["minuta", "Minuta de decisão fundamentada"], ["lacunas", "Fatos que faltam"]];
const KEY = "juris.relatorios";
const load = (): Relatorio[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (r: Relatorio[]) => localStorage.setItem(KEY, JSON.stringify(r));
const toMd = (r: Relatorio) => `# ${r.titulo}\n\nGerado em ${new Date(r.geradoEm).toLocaleString("pt-BR")} · Modelo ${r.modelo}\n\n## Resumo executivo\n\n${r.resumo}\n\n${r.secoes.map((s) => `## ${s.titulo}\n\n${s.texto}`).join("\n\n")}\n\n## Fontes consultadas\n\n${r.consultados.map((c) => `- ${c.referencia}`).join("\n")}\n\n## Verificação de citações\n\n${r.citacoes.map((c) => `- ${c.referencia ?? c.id}: ${c.situacao}`).join("\n")}\n\n> Conteúdo gerado por IA; não substitui a análise de um profissional.\n`;
function baixar(nome: string, txt: string, tipo: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: tipo + ";charset=utf-8" })); a.download = nome; a.click(); URL.revokeObjectURL(a.href); }

export default function App() {
  const [aba, setAba] = useState("painel");
  const [rels, setRels] = useState<Relatorio[]>(load);
  const [aberto, setAberto] = useState<Relatorio | null>(null);
  const [st, setSt] = useState<{ configurada: boolean; modelos: string[]; mensagem: string } | null>(null);
  const testar = () => { setSt(null); fetch("/api/status").then((r) => r.json()).then(setSt).catch(() => setSt({ configurada: false, modelos: [], mensagem: "Não foi possível alcançar o servidor (as funções só existem no Netlify ou com 'netlify dev')." })); };
  useEffect(testar, []);
  const guardar = (r: Relatorio) => { const n = [r, ...rels.filter((x) => x.id !== r.id)]; setRels(n); save(n); setAberto(r); setAba("relatorio"); };
  const abas: [string, string][] = [["painel", "Painel"], ["nova", "Nova análise"], ["relatorio", "Relatório"], ["docs", "Documentos"], ["dispositivos", "Dispositivos"], ["historico", "Histórico"], ["api", "Configuração de IA"]];
  return (<div className="app"><aside><h1>JURIS</h1><nav>{abas.map(([k, t]) => <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>{t}</button>)}</nav></aside>
    <main>
      {aba === "painel" && <Painel st={st} rels={rels} ir={setAba} abrir={(r) => { setAberto(r); setAba("relatorio"); }} />}
      {aba === "nova" && <Nova modelos={st?.modelos ?? []} pronto={!!st?.configurada} onOk={guardar} />}
      {aba === "relatorio" && <Rel r={aberto} onChange={guardar} />}
      {aba === "docs" && <Docs />}
      {aba === "dispositivos" && <Disp />}
      {aba === "historico" && <Hist rels={rels} abrir={(r) => { setAberto(r); setAba("relatorio"); }} apagar={(id) => { const n = rels.filter((x) => x.id !== id); setRels(n); save(n); }} />}
      {aba === "api" && <Api st={st} testar={testar} />}
    </main></div>);
}
const Painel = ({ st, rels, ir, abrir }: { st: any; rels: Relatorio[]; ir: (a: string) => void; abrir: (r: Relatorio) => void }) => (<section><h2>Painel</h2>
  <div className="grid"><div className="card"><h3>Documentos</h3>{docsInfo.length ? docsInfo.map((d) => <p key={d.key}>{d.arquivo}: {d.artigos} artigos {d.avisos.length ? "⚠" : "✔"}</p>) : <p className="err">Nenhum documento indexado.</p>}</div>
    <div className="card"><h3>IA (Gemini)</h3><p className={st?.configurada && st.modelos.length ? "ok" : "err"}>{st ? st.mensagem : "Verificando…"}</p></div></div>
  <button className="primary" onClick={() => ir("nova")}>Iniciar nova análise</button>
  <h3>Relatórios recentes</h3>{rels.length ? rels.slice(0, 5).map((r) => <p key={r.id}><a href="#" onClick={(e) => { e.preventDefault(); abrir(r); }}>{r.titulo}</a> <small>{new Date(r.geradoEm).toLocaleString("pt-BR")}</small></p>) : <p className="muted">Nenhum relatório ainda. Comece uma nova análise.</p>}</section>);

function Nova({ modelos, pronto, onOk }: { modelos: string[]; pronto: boolean; onOk: (r: Relatorio) => void }) {
  const [f, setF] = useState<any>({ modo: "infracao", temperatura: 0.2 }); const [ciente, setCiente] = useState(false); const [busy, setBusy] = useState(false); const [erro, setErro] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function enviar() {
    setBusy(true); setErro("");
    try { const r = await fetch("/api/analisar", { method: "POST", body: JSON.stringify(f), headers: { "content-type": "application/json" } }); const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Erro inesperado."); onOk({ ...j, id: crypto.randomUUID(), titulo: `${j.modoNome} — ${(f.pergunta || f.fatos || "").slice(0, 60)}` });
    } catch (e: any) { setErro(e.message); } finally { setBusy(false); }
  }
  return (<section><h2>Nova análise</h2>{!pronto && <p className="err">A IA ainda não está configurada. Veja a aba “Configuração de IA”.</p>}
    <label>Tipo de análise<select value={f.modo} onChange={set("modo")}>{MODOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
    <label>Pergunta ou pedido<textarea rows={3} onChange={set("pergunta")} placeholder="Ex.: Faça uma análise completa deste caso e indique os artigos do CPM potencialmente aplicáveis." /></label>
    <label>Fatos relatados<textarea rows={5} onChange={set("fatos")} /></label>
    <label>Pessoas ou funções envolvidas<input onChange={set("pessoas")} /></label>
    <label>Violações alegadas<input onChange={set("violacoes")} /></label>
    <label>Artigos que você já conhece (opcional)<input onChange={set("artigos")} placeholder="Ex.: Art. 36, Art. 38" /></label>
    <label>Provas ou trechos de apoio (opcional)<textarea rows={3} onChange={set("provas")} /></label>
    <div className="row"><label>Modelo<select value={f.modelo || ""} onChange={set("modelo")}><option value="">Automático</option>{modelos.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label>Criatividade ({f.temperatura})<input type="range" min="0" max="1" step="0.1" value={f.temperatura} onChange={(e) => setF({ ...f, temperatura: +e.target.value })} /></label></div>
    <label className="chk"><input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} /> Estou ciente de que o texto acima e os artigos relevantes serão enviados ao Google Gemini para processamento.</label>
    {erro && <p className="err" role="alert">{erro}</p>}
    <button className="primary" disabled={!ciente || busy || !pronto} onClick={enviar}>{busy ? "Analisando…" : "Gerar análise"}</button></section>);
}

function Rel({ r, onChange }: { r: Relatorio | null; onChange: (r: Relatorio) => void }) {
  const [cit, setCit] = useState<Citacao | null>(null);
  if (!r) return <section><h2>Relatório</h2><p className="muted">Nenhum relatório aberto.</p></section>;
  const edit = (i: number, texto: string) => onChange({ ...r, secoes: r.secoes.map((s, j) => (j === i ? { ...s, texto } : s)) });
  return (<section><h2>{r.titulo}</h2><small>{new Date(r.geradoEm).toLocaleString("pt-BR")} · {r.modelo}</small>
    <div className="row"><button onClick={() => navigator.clipboard.writeText(toMd(r))}>Copiar</button><button onClick={() => baixar("relatorio.md", toMd(r), "text/markdown")}>Markdown</button><button onClick={() => baixar("relatorio.txt", toMd(r).replace(/[#>*]/g, ""), "text/plain")}>TXT</button></div>
    <p className="warn">Conteúdo gerado por IA. Apenas as citações marcadas como “Verificado” foram conferidas contra o texto original.</p>
    <h3>Resumo executivo</h3><p>{r.resumo}</p>
    {r.secoes.map((s, i) => <div key={i}><h3>{s.titulo}</h3><textarea rows={Math.min(14, Math.max(4, s.texto.length / 90))} value={s.texto} onChange={(e) => edit(i, e.target.value)} /></div>)}
    <h3>Citações</h3><ul>{r.citacoes.map((c, i) => <li key={i}><button className={c.trechoVerificado ? "ver" : "nao"} onClick={() => setCit(c)}>{c.referencia ?? c.id}</button> — {c.situacao}</li>)}</ul>
    {cit && <div className="card"><h4>{cit.referencia ?? cit.id}</h4><p><b>Trecho citado pela IA:</b> {cit.trecho}</p><p><b>Texto original do dispositivo:</b></p><pre>{cit.textoOriginal ?? "Dispositivo não encontrado nos documentos."}</pre></div>}
    <h3>Fontes consultadas</h3><ul>{r.consultados.map((c) => <li key={c.id}>{c.referencia}</li>)}</ul></section>);
}

const Docs = () => (<section><h2>Biblioteca de documentos</h2>{docsInfo.length === 0 && <p className="err">Nenhum documento encontrado em data/documents.</p>}
  {docsInfo.map((d) => <div className="card" key={d.key}><h3>{d.arquivo}</h3><p>{d.artigos} artigos reconhecidos · {(d.bytes / 1024).toFixed(1)} KB · indexado em {new Date(d.indexadoEm).toLocaleString("pt-BR")}</p>
    {d.avisos.length ? d.avisos.map((a, i) => <p key={i} className="warn">⚠ {a}</p>) : <p className="ok">Sem avisos de análise.</p>}</div>)}
  <p className="muted">Para atualizar: substitua os arquivos em data/documents (no repositório) e faça um novo deploy; o índice é refeito automaticamente.</p></section>);

function Disp() {
  const [q, setQ] = useState(""); const res: Provision[] = q.trim() ? search(q, 15) : provisions.slice(0, 8);
  return (<section><h2>Dispositivos</h2><input placeholder="Buscar por artigo (ex.: art. 38) ou palavra" value={q} onChange={(e) => setQ(e.target.value)} />
    {q && !res.length && <p className="muted">Nada encontrado nos documentos.</p>}
    {res.map((p) => <details key={p.id}><summary>{p.referencia} <small>{p.capitulo}</small></summary><pre>{p.texto}</pre></details>)}</section>);
}
const Hist = ({ rels, abrir, apagar }: { rels: Relatorio[]; abrir: (r: Relatorio) => void; apagar: (id: string) => void }) => {
  const [q, setQ] = useState(""); const l = rels.filter((r) => (r.titulo + r.resumo).toLowerCase().includes(q.toLowerCase()));
  return (<section><h2>Histórico</h2><p className="muted">Os relatórios ficam salvos apenas neste navegador e neste dispositivo.</p><input placeholder="Buscar nos relatórios" value={q} onChange={(e) => setQ(e.target.value)} />
    {l.map((r) => <p key={r.id}><a href="#" onClick={(e) => { e.preventDefault(); abrir(r); }}>{r.titulo}</a> <button onClick={() => confirm("Excluir este relatório?") && apagar(r.id)}>Excluir</button></p>)}{!l.length && <p className="muted">Nenhum relatório.</p>}</section>);
};
const Api = ({ st, testar }: { st: any; testar: () => void }) => (<section><h2>Configuração de IA</h2>
  <p className={st?.configurada && st.modelos.length ? "ok" : "err"}>{st ? st.mensagem : "Verificando…"}</p><button onClick={testar}>Testar conexão</button>
  {st?.modelos?.length > 0 && <><h3>Modelos disponíveis para sua chave</h3><ul>{st.modelos.map((m: string) => <li key={m}>{m}</li>)}</ul></>}
  <h3>Como configurar (uma vez)</h3><ol><li>Acesse <b>aistudio.google.com/apikey</b> e crie uma chave gratuita.</li><li>No Netlify: <b>Site configuration → Environment variables → Add a variable</b>.</li><li>Nome: <code>GEMINI_API_KEY</code>; valor: sua chave. Salve.</li><li>Em <b>Deploys → Trigger deploy</b>, faça um novo deploy e volte aqui para testar.</li></ol>
  <p className="muted">A chave fica apenas no servidor do Netlify. O plano gratuito tem limites de uso que o Google pode alterar.</p></section>);
