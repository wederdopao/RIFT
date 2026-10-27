# Brief: Spiritforged (SFD)

Agora o projeto ganha o segundo set, **Spiritforged** (códigos `SFD-001` a `SFD-221`). O dono quer o mesmo padrão
do Origins: **todas as cartas exatamente como o texto oficial (com errata) e as Core Rules mandam, sem nenhuma
simplificação**.

Leia, nesta ordem:
1. `docs/BRIEF-CARTAS.md` — como o projeto funciona, convenções, como escrever uma carta, verificação.
2. `docs/BRIEF-EXATIDAO.md` — o padrão de exatidão (fontes de regra, rulings do RiftJudge, escolhas na hora certa,
   proibição de `notes`).
3. `README.md` e `src/engine/script.ts` (os ganchos atuais; muitos foram criados na revisão do Origins: `choose`,
   `alwaysResolve`, `deathReplacements`, `killG`, `payG`, `recycleCards`, `dealSplit`, `costModMin`, `adds`,
   `ignoreHidden`, `cands`, eventos `leave`/`damage`/`recycle`/`ready`/`cardPlayed`...). Reaproveite o que existe
   antes de criar algo novo.

## Diferenças para o Origins

- Os arquivos ficam em `src/cards/spiritforged/<CÓDIGO>-<nome>.ts` e são importados só no índice do seu lote:
  `src/cards/spiritforged/_<lote>.ts`.
- O Spiritforged é o set de **equipamentos**: Equip, Weaponmaster, Quick-Draw, gear com Hidden, "Signature Gear".
  O núcleo dessas mecânicas no motor (equipar, desequipar, o que acontece com o gear quando a unidade sai, troca de
  controle, Weaponmaster e Quick-Draw) é de **uma pessoa só** (lote `motor`). Os outros lotes não reescrevem esse
  núcleo: se precisarem de algo dele, façam a carta pelos ganchos existentes, avisem no relatório e, quando o
  coordenador avisar que o núcleo novo chegou na master, rodem `git merge master` e ajustem.
- Fuzz: `npx tsx tests/fuzz.ts --codes SFD-xxx..SFD-yyy --games 80` (o fuzz já monta decks com cartas do
  Origins e do Spiritforged juntos). Rode também `--all`.
- Testes novos em `tests/sfd-<lote>.test.ts`.
- Rulings: pesquise no RiftJudge (`app.riftjudge.com`) pelo nome de cada carta não trivial; cite a fonte.

## Ao terminar

`git add -A && git commit` na sua branch e o relatório do brief de exatidão (cartas, mudanças no motor, decisões de
regra com fonte, pendências — que devem ser quase nenhuma).
