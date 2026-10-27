# Brief: Unleashed (UNL)

Agora o projeto ganha o terceiro set, **Unleashed** (códigos `UNL-001` a `UNL-219`). Padrão de sempre: **todas as
cartas exatamente como o texto oficial (com errata) e as Core Rules mandam, sem nenhuma simplificação**.

Leia, nesta ordem:
1. `docs/BRIEF-CARTAS.md` — como o projeto funciona, convenções, como escrever uma carta, verificação.
2. `docs/BRIEF-EXATIDAO.md` — o padrão de exatidão (fontes, rulings do RiftJudge, escolhas na hora certa, sem `notes`).
3. `docs/BRIEF-SFD.md` — como foi o set anterior (o Unleashed segue o mesmo caminho).
4. `README.md` e `src/engine/script.ts` — os ganchos atuais. Reaproveite o que existe antes de criar algo novo.
5. `CONTINUAR.md` — o estado do projeto e as lições recentes (ex.: palavras-chave do texto só valem para fichas; em
   `Delayed` guarde ids, nunca `Obj`, por causa da cópia da IA; Temporary é gatilho).

## Diferenças para os sets anteriores
- Arquivos em `src/cards/unleashed/<CÓDIGO>-<nome>.ts`, importados **só** no índice do seu lote
  (`src/cards/unleashed/_<lote>.ts`). Não mexa em `index.ts`.
- Já existem 5 cartas: UNL-002 Inferna, UNL-036 Mutated Mouser, UNL-042 Back Off, UNL-150 Vex, Apathetic,
  UNL-176 Vi, Peacekeeper. Elas ficam onde estão; o lote do intervalo delas as revisa (pode corrigir o arquivo).
- O Unleashed é o set de **XP**: ganhar/gastar XP, **Hunt**, **Level** (palavra-chave dependente, com [>]), **Ambush**
  (Action/Reaction condicionais), Legion atualizado, efeitos de **cópia**, objetos **substituídos** (vão para onde vão
  as banidas), **nomear** carta/tipo/tag, backers de Predict/Stun/Buff. Leia as seções do Unleashed em
  `ref/riftbound/patch-notes.json` e as regras correspondentes em `rules.json`.
- O núcleo dessas mecânicas no motor é do **lote motor**. Os outros lotes não reescrevem o núcleo: se precisarem de
  algo dele, façam a carta pelos ganchos existentes e escrevam no relatório exatamente o que falta; o coordenador junta.
- Fuzz: `npx tsx tests/fuzz.ts --codes UNL-xxx..UNL-yyy --games 80` (monta decks com OGN/OGS/SFD/UNL juntos).
- Testes novos em `tests/unl-<lote>.test.ts`.
- Rulings: RiftJudge (`app.riftjudge.com`) e o FAQ oficial do Unleashed; cite a fonte no comentário.
