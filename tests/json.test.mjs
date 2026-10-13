import test from "node:test"; import assert from "node:assert"; import { parseJson } from "../shared/json.ts";
test("JSON com cerca e texto extra", () => assert.equal(parseJson('Aqui:\n```json\n{"a":1}\n```').a, 1));
test("quebra de linha crua dentro de string", () => assert.equal(parseJson('{"t":"linha1\nlinha2"}').t, "linha1\nlinha2"));
test("lixo retorna null", () => assert.equal(parseJson("sem json"), null));
