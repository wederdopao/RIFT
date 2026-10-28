// O CSS da mesa é um arquivo só: uma chave sem fechar (um @media que não termina) faz tudo o que vem depois valer só
// naquela condição — já aconteceu duas vezes (o painel de jogar a carta "gigante" no computador; e na junção dos modos
// novos, o tutorial e a escada sem estilo fora do celular). Este teste pega isso antes de ir para o site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('style.css: toda chave aberta é fechada (nenhum @media vaza para o resto do arquivo)', () => {
  const css = readFileSync(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  // comentários e textos entre aspas não contam
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/'[^'\n]*'|"[^"\n]*"/g, '""');
  let depth = 0;
  let line = 1;
  const open: number[] = [];
  for (const ch of code) {
    if (ch === '\n') line++;
    else if (ch === '{') {
      depth++;
      open.push(line);
    } else if (ch === '}') {
      depth--;
      assert.ok(depth >= 0, `"}" sobrando na linha ${line}`);
      open.pop();
    }
  }
  assert.equal(depth, 0, `chave aberta sem fechar na linha ${open[open.length - 1]}`);
});
