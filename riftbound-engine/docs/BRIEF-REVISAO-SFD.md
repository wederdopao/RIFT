# Brief: revisão independente do Spiritforged

Você é um revisor que **não escreveu** estas cartas. O dono do projeto exige que toda carta funcione
**exatamente** como o texto oficial (com errata) e as Core Rules mandam, sem simplificação. Seu trabalho é achar e
corrigir o que estiver errado — não confirmar o que já existe.

Leia antes: `docs/BRIEF-CARTAS.md`, `docs/BRIEF-EXATIDAO.md`, `docs/BRIEF-SFD.md`, `README.md` (seção de ganchos) e
`src/engine/script.ts`.

## Fontes
- Texto oficial e errata: `ref/riftbound/cards.json`, `errata.json`, `patch-notes.json`.
- Core Rules: `ref/riftbound/rules.json`.
- Rulings: RiftJudge (`app.riftjudge.com`, via WebSearch/WebFetch) e FAQ oficial do Spiritforged.

## Para cada carta do seu intervalo
1. Compare, frase por frase, o texto oficial com o script: custo, domínio, Might, tags, palavras-chave, cada gatilho,
   condição, alvo, "você pode", "até", "outro", "aliado/inimigo", "aqui", duração ("neste turno"), quem escolhe e
   **quando** escolhe (ao pôr na pilha × na resolução), o que acontece se o alvo ficar inválido.
2. Confira a interação com as regras gerais que a carta toca (equipamentos: 718/135.4, Equip, Weaponmaster,
   Quick-Draw, Hidden, Repeat, Accelerate, Deflect, Tank, Assault/Shield, Legion, showdown, conquista/hold, Burn Out...).
3. Procure ruling para toda carta não trivial.
4. Escreva/ajuste um teste de cenário para cada erro que achar (em `tests/sfd-revisao-<lote>.test.ts`), corrija e cite a
   fonte num comentário curto.
5. Nada de `notes` nem comentários de "simplificação".

Se precisar mudar o motor, faça de forma genérica, sem quebrar Origins, e reutilize os ganchos existentes; nunca crie
uma segunda implementação de algo que já existe.

## Verificação
`npx tsc --noEmit -p .`, `npm test` (tudo verde), `npx tsx tests/fuzz.ts --codes <seu intervalo> --games 80` com 3
seeds, e `--all --games 60`. Use uma subpasta própria no scratchpad para logs.

## Relatório
`git add -A && git commit` na sua branch. Relatório: lista dos erros achados e corrigidos (carta → o que estava errado
→ fonte), mudanças no motor, casos sem ruling e como decidiu.
