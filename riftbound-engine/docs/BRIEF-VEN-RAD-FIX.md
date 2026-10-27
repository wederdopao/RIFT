# Brief — correções do Vendetta/Radiance (rodada 2)

Agora o padrão é o do projeto: **a carta funciona exatamente como o texto oficial** (dados em `src/data/cards.json`,
texto oficial da galeria da Riot; Core Rules em `ref/riftbound/rules.json`). Sem simplificação. Leia `CONTINUAR.md`
(seções de arquitetura e "Vendetta e Radiance") e `docs/BRIEF-VEN-RAD.md` (API). Os scripts atuais estão em
`src/cards/vendetta/` e `src/cards/radiance/`.

Regras de trabalho:
- Uma só implementação de cada gancho no motor; mudanças no motor genéricas (servem a qualquer carta futura), nunca
  `if (o.code === 'VEN-xxx')` dentro do motor.
- Para cada carta corrigida, um teste de cenário curto em `tests/venrad-fix-<frente>.test.ts` provando o comportamento
  (veja `tests/harness.ts` e testes existentes como `tests/unl-revisao-*.test.ts`).
- Verificação: `npx tsc --noEmit -p .`, seus testes, `npm test` (uma vez no fim), fuzz
  `npx tsx tests/fuzz.ts --codes VEN-001..VEN-166,RAD-001..RAD-167 --games 40 --seed 1` (e seed 2) com 0 erros.
- Commit no worktree. Relatório final curto: o que mudou no motor e qualquer coisa que não ficou 100%.
