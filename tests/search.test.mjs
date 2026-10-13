import test from "node:test"; import assert from "node:assert"; import fs from "node:fs";
const idx = JSON.parse(fs.readFileSync("src/generated/index.json", "utf8"));
test("contagem de artigos confere com os arquivos", () => {
  assert.equal(idx.provisions.filter((p) => p.doc === "CPM").length, 51);
  assert.equal(idx.provisions.filter((p) => p.doc === "Legislacao").length, 62);
});
test("ids únicos e texto preservado", () => {
  const ids = idx.provisions.map((p) => p.id); assert.equal(new Set(ids).size, ids.length);
  const raw = fs.readFileSync("data/documents/CPM.txt", "utf8").replace(/\r\n/g, "\n");
  const a38 = idx.provisions.find((p) => p.id === "CPM-art-38"); assert.ok(raw.includes(a38.texto.split("\n")[0]));
});
test("artigos com sufixo reconhecidos", () => assert.ok(idx.provisions.some((p) => p.id === "Legislacao-art-25-A")));
