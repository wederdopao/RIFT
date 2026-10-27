# Brief — Vendetta (VEN) e Radiance (RAD), versão mínima funcional

Pedido do Weder: as duas coleções **jogáveis agora, com o mínimo de bugs**, gastando pouco. Não é a passada de exatidão
total dos outros sets (essa vem depois). Então:
- Cada carta do seu lote precisa **fazer o que o texto diz no caso normal** (efeito principal, palavras-chave, custos).
  Casos de canto raros podem ficar para depois — mas **nada pode lançar exceção nem travar a partida**.
- Não escreva testes longos. Verificação obrigatória: `npx tsc --noEmit -p .` limpo e o fuzz do seu lote sem erros:
  `npx tsx tests/fuzz.ts --codes <SET>-<ini>..<fim> --games 40 --seed 1` e `--seed 2` (o fuzz mostra quantas vezes
  cada carta foi exercitada). Se quiser, um arquivo pequeno `tests/<set>-<lote>.test.ts` só para cartas complicadas.
- Não rode `npm test` inteiro mais de uma vez (no fim), ele leva ~1 min.
- Sem campo `notes` nas cartas.

## Onde escrever
- Um arquivo por carta: `src/cards/vendetta/VEN-001-baccai-sandspinner.ts` / `src/cards/radiance/RAD-001-....ts`,
  importado no índice do seu lote: `src/cards/<set>/_a.ts` (001..069), `_b.ts` (070..138), `_leg.ts` (139+).
- Texto e números de cada carta: `src/data/cards.json` (chave = código). O texto do VEN no corpus às vezes está bagunçado
  (minúsculas, espaços); interprete pelo sentido. O RAD veio da galeria oficial (`ref/riftbound/radiance-gallery.py`).
- **Não mexa** nos arquivos de outros lotes. Evite mexer no motor (`src/engine/*`); se for indispensável, faça a menor
  mudança aditiva possível e diga no relatório final. Mecânica que só o seu lote usa: helper local no seu próprio arquivo.
- Ao terminar: `git add -A && git commit -m "<lote>: ..."` no seu worktree.

## Como escrever (aprenda pelos exemplos — é o mais barato)
- API: cabeçalho e interfaces de `src/engine/script.ts`, seção "Ganchos" do `README.md`, `src/cards/helpers.ts`.
- Para cada carta, procure uma carta já implementada com texto parecido (`grep -ril "deal 2 to" src/cards` ou pelo
  `cards.json`) e copie o padrão. Há ~760 cartas prontas em `src/cards/{origins,spiritforged,unleashed}`.
- Palavras-chave em script: `keywords: { assault: 2, shield: 3, deflect: 1, tank: true, ganking: true, deploy: true,
  disarm: 1, hidden: true, accelerate..., ambush: true }` (veja `Keywords` em `src/engine/types.ts`). O motor NÃO lê
  palavras-chave do texto de cartas com script: declare todas.
- Já prontos no motor:
  - **Deploy** (`keywords.deploy`): só joga em campo de batalha; morre quando o oponente segura o campo.
  - **Disarm N** (`keywords.disarm`): gatilho de ataque automático.
  - **Flow** (`flow: E(4, 'Fury')`): jogar do descarte pelo custo de Flow e banir.
  - **Empower** com custo de runas/energia: `empower: E(3)` (o motor oferece "Empower" na fase principal; evento
    'empower'). "[Empowered] I have ..." → cheque `self.empowered` em `mightMod`/`kwMod`/auras/cond. Custos de Empower
    que não são runas (Discard 1, [Tap], matar unidade, descartar spell): faça uma habilidade `activated` com
    `condition: (g, self) => !self.empowered` e `resolve` chamando `c.g.empowerObj(c.self, c.p)`.
    "Empower it"/"disempower it" por efeito: `g.empowerObj(o, p)`, `g.disempower(o)`; Kayle (até 3 vezes):
    `g.empowerObj(o, p, 3)` e `g.empowerCount(o)`. "When I become Empowered": trigger `on: 'empower'` com
    `cond: (c, ev) => ev.obj?.id === c.self.id`.
  - **Burn N**: `c.g.burn(p, n)`; **Predict N**: `yield* c.g.predict(p, n)`; **Buff**: `c.g.buff(u, p)`;
    **Stun**: `c.g.stun(u, p)`.
  - Fichas de unidade: `yield* c.g.playTokenG('TOK-RECRUIT' | 'TOK-MECH' | 'TOK-BIRD' | 'TOK-TENTACLE' |
    'TOK-SHADOWCLONE' | 'TOK-SPRITE', p, loc, pronta?)` (local: `chooseTokenLoc` em helpers, ou `{ t: 'base', p }`).
    Fichas de gear: `c.g.createToken('TOK-GOLD', p, loc)` (Gold entra pronta por padrão; "exhausted": passe o 4º
    argumento ou exaura depois — veja como cartas existentes fazem com Gold).
  - **Bomb** (RAD): `yield* playBomb(c)` em helpers (ficha `TOK-BOMB` com Deploy e o gatilho de morte prontos).
  - **Show Off** (RAD): `asPlayed: showOff((g, o) => g.hasTag(o, 'Mech'), 'Show Off a Mech')` e depois
    `showedOff(c)` (null se não mostrou; tem `might`, `energy`, `power`). Em `entersReady(g, self)`:
    `showedOff({ g, self })`.
  - Mortes: `yield* g.killG(objs)`. Dano: `g.dealDamage(u, n, c.self)`. Mover: helpers `chooseDestination`.
    Escolhas na resolução: `g.chooseObj`, `g.yesNo`, `g.ask`.
- Dúvida de regra: `ref/riftbound/rules.json` (Core Rules) — mas não gaste muito; leitura literal do texto basta.

## Relatório final (curto)
Uma linha por carta que ficou com alguma limitação conhecida (código + o que falta), e as mudanças fora do seu lote.
