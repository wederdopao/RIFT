# Brief: revisão independente do Vendetta e do Radiance (VEN-001..VEN-166, RAD-001..RAD-167)

Você é um revisor que **não escreveu** estas cartas. O dono do projeto exige que toda carta funcione
**exatamente** como o texto oficial (com errata) e as Core Rules mandam, sem simplificação. Seu trabalho é achar e
corrigir o que estiver errado — não confirmar o que já existe.

Leia antes: `docs/BRIEF-CARTAS.md`, `docs/BRIEF-EXATIDAO.md`, `docs/BRIEF-VEN-RAD.md`, `docs/BRIEF-VEN-RAD-FIX.md`,
`README.md` (seção de ganchos), `CONTINUAR.md` (seção "Vendetta e Radiance") e `src/engine/script.ts`.

## Fontes
- Texto oficial e errata: `ref/riftbound/cards.json`, `errata.json`, `patch-notes.json`; dados em
  `src/data/cards.json` e `src/data/overrides.json`. O Radiance não está no corpus: o texto vem da galeria oficial
  (`ref/riftbound/radiance-gallery.py`). Textos de equipamento ficam no campo `effectText`.
- A arte de cada carta está em `assets/art/<CÓDIGO>.webp` (abra com Read): confira custo, Might, tipo e texto pela arte
  quando o dado parecer incompleto ou estranho (a galeria erra domínio, tipo e tags).
- Core Rules: `ref/riftbound/rules.json`.
- Rulings: RiftJudge (`app.riftjudge.com`, via WebSearch/WebFetch) e FAQ oficial do Vendetta/Radiance.

## Para cada carta do seu intervalo
1. Compare, frase por frase, o texto oficial com o script: custo, domínio, Might, tags, palavras-chave, cada gatilho,
   condição, alvo, "você pode", "até", "outro", "aliado/inimigo", "aqui", duração ("neste turno"), quem escolhe e
   **quando** escolhe (ao pôr na pilha × na resolução), o que acontece se o alvo ficar inválido.
2. Confira a interação com as mecânicas novas que a carta toca: Empower/Empowered (habilidade ativada de verdade,
   `CardScript.empower`), Deploy (só em campo de batalha; morre quando o oponente segura o campo), Disarm, Flow,
   Bomb/TOK-BOMB, Show Off, unit gear (`isUnitGear`/`makeUnitGear`: conta como unidade e como gear), lendas extras
   (Neeko, `legendsOf`), descontos com power (`CostMod`, `powerLess`), recursos restritos (`pool.only`, `asPayFor`),
   `becomeCopy`, `blockMove`, `replaceChosen`, `mightReach`. E as gerais: Equip/Weaponmaster/Quick-Draw, Hidden, Repeat,
   Accelerate, Deflect, Tank, Assault/Shield, Legion, showdown, conquista/hold, mortes simultâneas, Burn Out.
3. Procure ruling para toda carta não trivial.
4. Escreva um teste de cenário para cada erro que achar (em `tests/venrad-revisao-<lote>.test.ts`), corrija e cite a
   fonte num comentário curto.
5. Nada de `notes` nem comentários de "simplificação".

Se precisar mudar o motor, faça de forma genérica, sem quebrar os outros sets, e reutilize os ganchos existentes;
nunca crie uma segunda implementação de algo que já existe.

## Casos sem ruling decididos na escrita (confirme ou corrija, com fonte)
- Piltovan Forge: uma Gold usada no pagamento automático conta como "primeira habilidade de gear".
- Nasus (VEN-145) × Equip: usa o equipCost impresso (não o custo que depende da unidade).
- Endless Riches: a substituição também bane a própria Endless Riches quando ela morre.
- Gangplank, Naval: o +3 de Might da substituição fica enquanto ele estiver no tabuleiro (texto sem duração).
- Gear que vira unidade por efeito e morre não é visto como "unidade" por gatilhos de morte (o impresso é).
- Unit gear não pode ser anexado/equipado a outra unidade.
- Last Caress: ficha de unidade jogada conta como "a próxima unidade".
- RAD-007/084 "occupied enemy battlefield" = controlado pelo oponente e com unidades (como OGN-161/SFD-093).

## Verificação
`npx tsc --noEmit -p .`, `npm test` (tudo verde), `npx tsx tests/fuzz.ts --codes <seu intervalo> --games 80` com 3
seeds, e `--all --games 60`. Use uma subpasta própria em /tmp para logs.

## Relatório
Commit na sua branch e push. Relatório no fim da sessão: lista dos erros achados e corrigidos (carta → o que estava
errado → fonte), mudanças no motor, casos sem ruling e como decidiu.

## Lições do projeto (não repita os erros já achados)
- Palavra-chave lida do texto só vale para fichas; carta com script declara as próprias (`keywords`).
- Em efeitos atrasados (`Delayed`) e closures guardadas no motor, guarde ids, nunca `Obj` (a IA simula numa cópia).
- Temporary é gatilho na pilha; conquista resolve dentro do combate; gatilho recusado não conta como escolha.
- Efeito de equipamento vai em `equipped`, nunca em `triggers` do gear.
- Fichas de unidade sempre por `playTokenG`/`playTokensG`.
- Muitas respostas do RiftJudge têm texto gerado; prefira as marcadas como verificadas e as mais recentes, e o FAQ oficial.
