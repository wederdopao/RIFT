# Brief: deixar tudo exatamente como a regra

O dono do projeto quer **zero simplificações**: toda carta tem de funcionar exatamente como o texto oficial
(com errata) e as Core Rules mandam. Hoje algumas cartas têm `notes` (mostradas ao jogador como "Simplificação")
e alguns comportamentos foram decididos por interpretação. O seu trabalho é eliminar isso na sua parte.

## Preparar

Você está numa cópia (git worktree) com `node_modules` já ligado. Trabalhe só nela.

## Fontes de regra (nesta ordem de autoridade)

1. Texto da carta em `src/data/cards.json` (já com a errata mais recente) e `ref/riftbound/errata.json`.
2. Core Rules: `ref/riftbound/rules.json` (campos `rule_number`, `content`). Procure por palavra-chave.
3. Rulings oficiais e de juízes: o `rulings.json` local está vazio, então pesquise na web (WebSearch/WebFetch) —
   por exemplo `app.riftjudge.com`, FAQ oficial da Riot, `patch-notes.json` local. Cite a fonte num comentário
   curto no código quando a decisão depender dela.
4. Se depois de pesquisar a regra continuar ambígua, escolha a leitura mais literal do texto e registre a
   dúvida no relatório (não em `notes`).

## O que "exato" quer dizer aqui

- Escolhas são do jogador quando o texto/regra diz que são ("you may", "choose", "up to", ordem de cartas no
  fundo do deck...). Nada de o motor escolher sozinho quando existe escolha real.
- Escolhas são feitas **no momento** que a regra manda (ao jogar = ao pôr na pilha; ao resolver = na resolução).
- Gatilhos disparam no evento certo e na ordem certa; efeitos com "este turno", "a primeira vez", etc. contam
  exatamente o que a regra conta.
- Ao terminar, **nenhuma** carta da sua parte pode ter `notes` (apague o campo). Se algo for genuinamente
  impossível, explique no relatório por quê — isso deve ser exceção rara.

## Convenções

- Textos para o jogador em português do Brasil; comentários também.
- Mudanças no motor: aditivas e localizadas, marcadas com comentário; outras pessoas estão mexendo no motor em
  paralelo (veja a sua divisão de trabalho no pedido). Não reformate nem mova código.
- Não mexa em `src/ui/`, `src/ai/`, `scripts/`, `src/decks/`.

## Verificação (obrigatória)

1. `npx tsc --noEmit -p .` sem erros.
2. `npm test` passando. Para cada comportamento corrigido, um teste de cenário em `tests/` (use `tests/harness.ts`).
3. `npx tsx tests/fuzz.ts --codes <sua parte> --games 80` com 0 erros, seeds 1, 200 e 500; e
   `npx tsx tests/fuzz.ts --all --games 60` com 0 erros.
4. `npx tsx tests/sim.ts 30` sem erros.

## Ao terminar

`git add -A && git commit -m "..."` na sua branch. Relatório: o que mudou em cada carta, mudanças no motor
(arquivo, o quê, por quê), decisões de regra com a fonte, e o que ficou em aberto (deve ser quase nada).
