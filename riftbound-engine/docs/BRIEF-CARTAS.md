# Brief: implementar um lote de cartas do Origins

Projeto: motor de regras de Riftbound (TypeScript) para jogar entre amigos, com interface, IA e online.
O objetivo agora é ter **todas as cartas do Origins (OGN) e do Proving Grounds (OGS)** jogando como o texto oficial
manda. O texto em `src/data/cards.json` já tem a errata oficial mais recente.

## Preparar a cópia de trabalho

Você está numa cópia (git worktree) do projeto. Na raiz dela rode:

```bash
ln -s /home/claude/riftbound-engine/node_modules node_modules
```

## Ler antes de começar

- `README.md` — visão geral, como adicionar uma carta, palavras-chave já tratadas pelo motor.
- `src/engine/script.ts` — a interface de carta (`CardScript`, `AbilityDef`, `TriggerDef`, `ActivatedDef`, `Aura`,
  `OptionalCost`, eventos).
- `src/cards/helpers.ts` — atalhos (`E(...)` para custos, `T.*` para alvos, destinos de movimento).
- `src/engine/engine.ts` — o motor. Os métodos públicos que as cartas usam: `dealDamage`, `kill`, `draw`, `discard`,
  `buff`, `spendBuff`, `stun`, `moveUnits`, `returnToHand`, `recall`, `createToken`, `addEffect`, `giveMight`,
  `giveKw`, `addDelayed`, `channel`, `recycleCard`, `predict`, `burn`, `attach`, `ask`, `yesNo`, `chooseObj`,
  `playFromEffect`, `units`, `unitsAtBf`, `board`, `bfIndex`, `bfOf`, `might`, `kw`, `say`, `emit`...
  Leia as assinaturas antes de usar.
- Exemplos de cartas prontas em `src/cards/origins/` (variados): `OGN-043-charm.ts` (alvo + destino),
  `OGN-157-udyr-wildman.ts` (modos), `OGN-053-stand-united.ts` (aura), `OGN-060-mask-of-foresight.ts` (equipamento),
  `OGN-251-jinx-loose-cannon.ts` e `OGN-257-lee-sin-blind-monk.ts` (lendas), `OGN-280...`/`OGN-289...` (campos),
  `OGN-002-brazen-buccaneer.ts` (custo opcional), `OGN-195-rhasa-the-sunderer.ts` (desconto de custo),
  `OGN-182-scrapheap.ts` (gatilho no descarte).
- Testes: `tests/harness.ts` (classe `Scenario` para montar a mesa à mão) e `tests/rules.test.ts` (exemplos).
- Regras: `ref/riftbound/rules.json` (Core Rules), `ref/riftbound/rulings.json`
  (rulings por carta — procure pelo nome da carta), `ref/riftbound/errata.json`.

## Convenções

- Um arquivo por carta: `src/cards/origins/<CÓDIGO>-<nome-em-kebab>.ts` (cartas OGS também ficam nessa pasta).
- Importe cada arquivo novo **só** no índice do seu lote: `src/cards/origins/_<lote>.ts`. Não mexa em `index.ts`.
- Pule runas e fichas (tokens). Cartas que já têm arquivo estão prontas; só mexa se estiverem erradas.
- Unidades "vanilla" (só palavras-chave ou nada) também precisam de arquivo, para a carta constar como implementada.
- Textos que aparecem para o jogador (prompts, rótulos, mensagens do registro) em português do Brasil, no mesmo
  estilo das cartas existentes. Comentários também em português.
- Implemente o texto inteiro. Se algo não der para fazer exatamente, faça o mais próximo possível e explique em
  `notes` (a interface mostra isso como "Simplificação").

## Mudanças no motor

Só quando uma carta realmente precisar. Outras sete pessoas estão mexendo no motor ao mesmo tempo em outras cópias,
então: mudanças pequenas, aditivas e genéricas (que sirvam para cartas futuras), sem mudar comportamento existente,
sem reformatar nem mover código. Coloque o código novo perto do relacionado e marque com um comentário curto.
Não mexa em `src/ui/`, `src/ai/`, `scripts/` nem `src/decks/`.

## Verificação (obrigatória)

1. `npx tsc --noEmit -p .` sem erros.
2. `npm test` passando. Crie `tests/cards-<lote>.test.ts` com testes de cenário para as cartas não triviais
   (alvos, escolhas, condições, auras, substituições, custos especiais). Vanilla não precisa de teste.
3. `npx tsx tests/fuzz.ts --codes <seu intervalo> --games 80` com 0 erros. Rode também com `--seed 200` e
   `--seed 500`. Veja a lista "nunca apareceram no registro" e confira essas cartas com testes.
4. `npx tsx tests/sim.ts 30` sem erros.

## Ao terminar

`git add -A && git commit -m "<lote>: cartas ..."` na sua cópia. No relatório final, liste:
- quantas cartas implementou;
- cada mudança no motor (arquivo, o quê, por quê);
- cada simplificação (`código: nota`);
- dúvidas de regra que ficaram.
