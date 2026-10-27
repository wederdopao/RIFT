# Continuar o projeto Riftbound Mesa numa conversa nova

Cole este arquivo (ou peça para ler) junto com o zip do projeto. Ele resume tudo o que uma sessão nova precisa.

## Quem pede e como quer
- Weder, médico e dev indie, fala português do Brasil. Responder em português, direto ao que foi perguntado, sem
  ressalvas não pedidas; quando explicar, contar com contexto e encadeamento.
- Padrão de qualidade inegociável: **toda carta funciona exatamente como o texto oficial (com errata) e as Core Rules
  mandam — nada simplificado**. Pode gastar o tempo que for. Nenhum campo `notes` / "Simplificação" nas cartas.
- O jogo é privado, para jogar com amigos (projeto de fã, não comercial — política "Legal Jibber Jabber" da Riot).

## Repositório (GitHub wederdopao/RIFT)
- `riftbound-engine/`: o código (este arquivo, README, src, tests, scripts, docs). Prints de testes em `docs/prints/`.
- `riftbound-mesa-site/site/`: o site pronto que o Weder arrasta no Netlify Drop para jogar online.
- `riftbound-mesa.html`: a versão offline. As duas saem de `npm run publicar` — rode depois de mudar a interface
  ou o motor, senão o site publicado fica na versão antiga.

## O que é
Motor de regras de Riftbound (1x1) em TypeScript + interface de navegador: partida completa, IA adversária, online,
deckbuilder com contas locais, registro clicável e artes oficiais. Detalhes de tudo no `README.md`.

- **Sets**: Origins (OGN), Proving Grounds (OGS), Spiritforged (SFD-001..SFD-221) e Unleashed (UNL-001..UNL-219)
  completos; Vendetta (VEN-001..166) e Radiance (RAD-001..167) completos (seção "Vendetta e Radiance").
- **Publicado**: artifact "Riftbound Mesa" no claude.ai — https://claude.ai/artifact/RYdL1cUq4zJLfVKp1Lo1q7
  (capability `room` com o tópico `mesa` aberto a "interact"; ao republicar, NÃO passe `capabilities`, para manter;
  as artes estão publicadas como arquivos `art/*.json` — só reenvie se mudarem). Também há o HTML offline
  (`dist/riftbound-mesa.html`) e o site estático (`dist/site/`, que o Weder sobe no Netlify Drop).

## Como rodar
```bash
npm install
npx tsc --noEmit -p .                     # tipos
npm test                                  # ~930 testes de regra
npx tsx tests/fuzz.ts --all --games 60    # decks aleatórios com todas as cartas (--codes SFD-001..SFD-030, --ai, --seed N)
npm run sim                               # partidas aleatórias checando invariantes
npm run build                             # dist/index.html (artifact) + dist/art/ + dist/riftbound-mesa.html + dist/site/
npm run publicar                          # build + copia dist/site para ../riftbound-mesa-site/site e o offline para ../riftbound-mesa.html
node scripts/uiplay.mjs <pasta> 3000      # joga uma partida clicando na interface (playwright; PW_EXE = chromium)
node scripts/mqttbroker.cjs 8888 & node scripts/onlinetest.mjs   # teste online (MODE=room simula o app do Claude)
```
Fontes de regra (dados da Riot, uso não comercial): `ref/riftbound/` — `cards.json`, `errata.json`,
`patch-notes.json`, `rules.json` (Core Rules). Rulings: RiftJudge (`app.riftjudge.com`) e FAQs oficiais.

## Arquitetura (o essencial)
- `src/engine/engine.ts`: o motor. Coroutines geradoras (`Gen<T>`) que param em decisões; `game.ts` refaz a partida
  a partir das respostas (desfazer, salvar e online são replay determinístico).
- `src/engine/script.ts`: a interface das cartas (`registerCard`). Ganchos principais: `onPlay`, `triggers`
  (eventos: play, move, conquer, hold, attack, defend, die, leave, damage, recycle, recycleRune, ready, cardPlayed,
  combatWin, attach, detach, activate, mighty, chosen...), `activated`, `auras`, `deathReplacements`, `choose`,
  `alwaysResolve`, `repeat`, `equipCost/equipFor/equipExtra/equipTiming`, `equipped` (texto de efeito do equipamento —
  nunca em `triggers` do gear), `adds` (fontes de [Add] no pagamento), `selfCostMod`, `spellCostMod`...
  Funções do motor a usar sempre: `g.killG` (mortes simultâneas), `g.payG`, `g.recycleCards`, `g.attach/g.detach`,
  `g.revealTop`, `g.playTokenG`, `g.dealDamage`, `g.ready`. Nunca criar uma segunda implementação de gancho existente.
- `src/cards/<set>/<CÓDIGO>-<nome>.ts`, um por carta, importados nos índices `_<lote>.ts` de cada set.
- `src/ui/`: `main.ts` (mesa e setup), `deckbuilder.ts`, `account.ts` (contas locais, códigos de deck Piltover
  Archive), `online.ts` (sala: `room` dentro do claude.ai; fora, MQTT público em `wss://broker.emqx.io:8084/mqtt` e
  `wss://broker.hivemq.com:8884/mqtt` ao mesmo tempo; anfitrião autoritativo com seq, resync e batimento), `art.ts`.
- `docs/BRIEF-*.md`: os briefs usados para escrever e revisar cartas (padrão de exatidão, como testar).

## Revisão independente do Spiritforged (concluída em 23/10/2026)
Sete revisores que não escreveram as cartas leram SFD-001..SFD-221 carta por carta (`docs/BRIEF-REVISAO-SFD.md`).
Testes em `tests/sfd-revisao2-<lote>.test.ts`. O que acharam e foi corrigido:
- **Weaponmaster** (motor): "[A] a menos" tira um power de qualquer domínio — Equip [Fury] sai de graça, o [Order] do
  Blade of the Ruined King sai mas a morte continua (RiftJudge #8841, #10503, #10704). Pagar pelo Weaponmaster não
  ativa o Equip (821.1.c.6), então o [Add] "só para gear" do Ornn não paga esse custo.
- **Quick-Draw** (motor): a unidade é alvo escolhido ao pôr o gatilho na pilha (355.10; RiftJudge #2996, #3886,
  #9963, #10749); dispara "quando você escolhe" (Irelia) e, se ela sair (Gust), o gear fica solto.
- **Hidden** (motor): alvo de jogada a partir de Hidden que sai daquele campo antes de resolver erra o alvo (811.1.d.2).
- **Mortes simultâneas** (motor): substituições recalculadas a cada morte e em sequência ininterrupta (373.2 com o
  exemplo Soraka + Guardian Angel; RiftJudge #10638).
- Rell, Magnetic: anexar é gatilho reflexivo, na pilha abaixo do Quick-Draw. Battering Ram conta jogada anterior do
  próprio Ram. Not So Fast vê a 2ª instância de Repeat. Svellsongur copia a substituição de revelar (Void Hatchling).
  Gearhead + Svellsongur não dobra duas vezes (#8493, #11629). Strike Down escolhe o Equipment ao jogar. Akshan não
  arranca gear preso quando já saiu da mesa (718.5.c). Spirit Wheel e Irelia, Blade Dancer não cobram o [1]/[A] num
  segundo gatilho com a carta já exaurida (383.3.b.1). Arise!: "Then do this" é gatilho reflexivo. Mystic Reversal
  refaz alvos dependentes com as escolhas novas.

## Mesa nova e caça de bugs de interação (23/10/2026, tarde)
- **Interface**: a tela da partida virou uma mesa estilo tabletop (modelo: o table simulator do RiftAtlas), com as regras
  automáticas — código em `src/ui/main.ts` (seção "mesa (tapete)") e CSS `.tt*` no fim de `src/ui/style.css`. Tudo que
  dá para clicar é opção da decisão atual (`optionsFor`, `baseOpt` → `data-zopt` na base como destino). Sobreposições
  no centro: escolha de campo, mulligan, cartas fora da mesa, troca de jogador, fim. Prévia grande em `#tt-peek`.
  Animações em `animateArrivals()`. Celular em pé: gaveta embaixo; deitado: coluna estreita. Prints:
  `node scripts/tableshot.mjs <pasta>` (SIZES=1920x1080,390x844...). `scripts/browser.mjs` acha o Chromium.
- **Bug achado jogando**: Sprite Mother morria como Temporary — o motor lia palavra-chave do texto de cartas com script.
  Agora só fichas (sem script) usam o texto (`baseKeywords`). Fiora, Victorious e Spirit's Refuge tinham o mesmo erro.
- **Caça de bugs** (3 caçadores; testes em `tests/bugs-*.test.ts`):
  - texto×motor: Ava Achiever/Teemo Strategist/Guerilla Warfare contavam "cita [Hidden]" como Hidden; Magma Wurm
    aprontava Gold; Heimerdinger, Inventor não pegava [Tap] concedidas.
  - zona/controle: efeitos atrasados guardavam o objeto real e a simulação da IA mexia na partida de verdade
    (Noxian Guillotine, Relentless Pursuit, Hostile Takeover) — em `Delayed` guarde o id; objeto novo não herda
    noMoveTurn/atacou/defendeu (124.1).
  - gatilhos/tempo: conquista resolve dentro do combate (466.5–466.7); Temporary é gatilho na pilha (816.1.b–c);
    gatilhos do despertar antes da fase de início; atacante põe gatilhos primeiro na abertura do combate (464.2.e.1);
    showdown sem combate estabelece controle de quem ficou sozinho (348.2.a); gatilho recusado (Deflect/custo) não
    conta como escolha.
  - Gold ativável à mão ("Kill this, [Tap]: [Add] [A]", `src/cards/tokens.ts`; o pagamento automático segue pelo
    caminho próprio, `notAutoPay`).
- Suspeitas anotadas e não corrigidas (sem caso que mude o resultado hoje): Deathknell detectado por texto (frágil);
  fonte de gatilho que sai e volta antes de resolver (359.3.e.12); [Add] concedido/emprestado fora do pagamento
  automático; expiração do fim do turno (317.2.f) sem curar dano de novo; Hunt como gatilho (823.1, nenhuma carta usa).

## Unleashed (23/10/2026, tarde) — ESTADO ATUAL, PAROU AQUI
- **Implementado e na master**: as 219 cartas UNL-001..UNL-219 (8 lotes: motor + fury, calm, mind, body, chaos,
  order, legends+campos), `npm test` com 926 testes verdes, sem `notes`. Brief: `docs/BRIEF-UNL.md`.
- Núcleo novo (README, seção "Ganchos do Unleashed"): XP (`gainXp`, `spendXpG`, `xpCost`...), Hunt como gatilho
  (823), Level/Legion dependentes (`levelReached`; Sun Disc não ativa sem Legion, RiftJudge #9805), Ambush
  (`ambushBfs`), cópia (`becomeCopy`), substituir campo (`replaceWith`, TOK-BRUSH, `createBattlefield` TOK-BARONPIT),
  nomear (`nameTagG/nameCardG/nameTypeG`), `asPlayed` (355.1), fichas de unidade SEMPRE por `playTokenG/playTokensG`
  (Zilean), `triggerExtra`, `altCost`, pool `showdownOnly`, `moveCost` (204.4), dano dobrado (Lotus Trap), Elder
  Dragon (`anyDamageLethal`), etc.
- UI: deckbuilder com filtro "Unleashed"; mesa aceita 3 campos; Scuttle Crab mostra as viradas do oponente.
- **Publicado** (23/10/2026, noite): build no artifact + zip. Revisão parcial aplicada (patches de fury, body,
  legends e mind em `docs/revisao-unl-parcial/`, já na master). Verificação enxuta: `npm test` 939 verdes, fuzz
  `--codes UNL-001..UNL-219 --games 100` e `--all --games 60` com 0 erros, `--ai` 10 partidas, sim 30, uiplay e
  online (room) sem erros.
- **Revisão independente concluída** (23/10/2026, noite): os 7 lotes revisados de novo com foco em "efeito que não
  funciona" e interações, mais um caçador de interações UNL × outros sets. Testes em `tests/unl-revisao-*.test.ts` e
  `tests/bugs-unl.test.ts`. Principais correções: Blighted Battaxe Equip [1][Fury]; Dancing Grenade com Repeat;
  Baron Nashor (limpeza de combate uma vez só, 466.1.a); Syndra × Emperor's Divide/Heedless Resurrection (escolhas por
  execução do Repeat); LeBlanc, Everywhere at Once ("my battlefield"); Spectral Centaur (Might 5, Spirit); Diana
  (ordem do gatilho de showdown); Ivern × Poro Herder (tags ganhas); Mageseeker × Tricksy Tentacles/Bard (quem move
  escolhe pagar); cópia da IA não divide o `cfg` (Aspirant's Climb × Brush); Valley of Idols/Star Spring × Baron Nashor
  (`playLoc`); Zilean × Arise!/Guards!; Repeat múltiplo × Piercing Light/Ride the Wind; Svellsongur × Zilean e fichas;
  Miss Fortune, Captain e Sett preparam pelo motor.
- **Correções de dados** ficam em `src/data/overrides.json` (aplicadas por `scripts/build_carddata.py`).
- Microdetalhes fechados (24/10/2026; testes em `tests/bugs-microdetalhes.test.ts`):
  - Gatilho sem alvo possível ou com custo de recursos impagável sai sem perguntar o "você pode" (402.4, 383.3.b.1;
    `finalizeAbility`); "você pode" que não faria nada usa `TriggerDef.possible` (Vex, Mocking já no campo).
  - Ordem: o jogador só escolhe entre gatilhos simultâneos (383.3.d); item de gatilho reflexivo (`Pending.reflexive`)
    vai na ordem de adição (337.1.b, 388.2; FAQ #9917) — Arise! × Weaponmaster e Hwei com Unit Gear mudaram. Entre
    jogadores continua 383.3.d.1 (o do turno primeiro) mesmo para itens não simultâneos (limitação conhecida).
  - Sun Disc × Zilean: correto como estava (só a original entra pronta; 375, RiftJudge #6312). Reckoner's Arena ×
    Red Brambleback: correto (a ativação não é "por conquistar aqui", RiftJudge #10802); com Blue Sentinel o hold do
    campo dispara 2 vezes.
  - Pergunta de ordem dos gatilhos: opções "Carta: efeito" (iguais numerados), `obj` = fonte, `Option.detail` = texto
    da carta (a interface ainda não mostra o `detail`).

## IA com plano de jogo (23/10/2026, noite)
- `src/ai/ai.ts`: `deckPlan` lê o PRÓPRIO deck (ramp / aggro / meio-termo; o do oponente é escondido) e muda os pesos
  (ramp: runas valem 9 enquanto < 12; aggro: pontos valem mais). `permanentValue`: gear vale pelo custo e cartas-motor
  (gatilho de início/fim de turno, ativadas reutilizáveis) ganham o valor que ainda vão render — a IA agora desce a
  Dazzling Aurora em vez da unidade grande (`tests/ai.test.ts`). Contra a IA antiga com os precons: 14×16 (empate
  técnico, esperado); contra aleatório: 10/10.
- Próximos passos possíveis (se a IA ainda parecer fraca): ler o arquétipo do oponente pela lenda; afinar os pesos por
  autojogo; amostrar mãos do oponente e simular o futuro.

## Mesa com qualidade de vida estilo LoR (23/10/2026, noite)
- Pedido do Weder: mover sem passar pela barra (clique na unidade pronta → destino), arrastar cartas, setas de alvo
  da pilha, não depender da coluna da direita, registro com o mais novo em cima, previsão do resultado como no LoR,
  qualidades de vida do LoR sem mudar regra, estética melhor. Também: a lenda não girava ao exaurir (corrigido).
- Como funciona: a interface responde várias decisões seguidas do motor (`exec`/`runSteps` em main.ts); online vai
  como op `batch` (PROTOCOL 4; versões diferentes são recusadas na entrada da sala). Perguntas de alvo/local têm
  `purpose` no Decision (só a interface usa); soltar uma carta só responde essas perguntas, nunca custo nem a raiz.
- Prévia (Olho do Oráculo): `simulateOracle` refaz a partida e passa tudo; não mostra se houve sorteio ou carta
  escondida virando pública. Previsão de combate em `interact.ts` (papel temporário para Assault/Shield).
- Revisão independente feita (2 graves e 6 médios corrigidos). Testes: `scripts/uiinteract.mjs`, `uiplay.mjs`,
  `onlinetest.mjs` (agora também move em lote nos dois lados).
- Microdetalhes: a pré-seleção de alvo múltiplo ao soltar um spell some no online; a previsão assume Tank quando a
  unidade tem Tank e "por último" ao mesmo tempo (o motor pergunta).

## Revisão de clareza estilo LoR (24/10/2026, madrugada)
- Pedido: mesa "100% player friendly igual o LoR", sem dúvida de regra, ordem, reações, pilha.
- Teste de usabilidade independente (jogador novo, prints) + correções:
  - Cancelar agora só desfaz respostas do próprio jogador da decisão (`Game.by`); antes, a pergunta de um gatilho do
    oponente no meio da sua jogada cancelava a SUA jogada.
  - Barra de decisão com altura fixa e cartas dimensionadas pela altura de todas as fileiras (nada coberto em 6 telas;
    `scripts/uioverlap.mjs`); celular em pé com a barra em duas linhas; textos longos em 2 linhas.
  - Motor dá informação para a tela (sem mudar regra): `playBlockReason` (motivo de não poder jogar), `prioPasses`
    (quem já passou na pilha), `LogEntry.meta` (carta e alvos de cada jogada/resolução), `Decision.purpose`.
  - Interface: glossário (`src/ui/glossary.ts`), guia "Como funciona", botão de passar com a consequência, fases,
    origem da pergunta, histórico e avisos do oponente com setas, "+1 ponto", resumo do turno do outro, aviso de turno,
    notas de conquista nos destinos, nomes "Jogador 1/2" no passa-e-joga, registro sem "ponto(s)".
- Ficou para depois: escolher a ordem de gatilhos simultâneos ainda é clicando na carta (sem lista com o texto de cada
  efeito); clique simples numa carta jogável ainda joga direto (o teste sugeriu selecionar primeiro).

## Relatar/replay, rulings, online e IA mais forte (24/10/2026, tarde)
- Relatar problema (arquivo com cfg + respostas + nota) e replay lance a lance (tela inicial → Abrir replay; no fim da
  partida → Ver o replay); continuar jogando de qualquer lance. Teste: `scripts/uireplay.mjs`.
- Avisos de ruling na pergunta (`rulingHint` em main.ts): Ezreal, Prodigy × pagamentos de efeito (RiftJudge #286/#504),
  Deflect. Acrescente casos aí quando aparecer "parece bug mas é regra".
- Ordem de efeitos simultâneos: lista aberta com o texto de cada efeito (`Option.detail`).
- Online (PROTOCOL 5): convidado troca de deck na sala; salas recentes; assistir (role 'watch', não vê nenhuma mão;
  desde o PROTOCOL 9 recebe a visão de espectador, ver "Informação oculta no online"). onlinetest tem espectador.
- IA (643e8d5): mulligan pelo plano do deck; ataques em grupo; oponente simulado escolhe contra ela; campo que dá a
  vitória ao oponente é contestado; guarda Reaction e responde na pilha só quando muda o resultado. Nova × antiga:
  115 × 77 em 192 partidas (`npm run ai:vs`; cópia congelada em tests/ai-old.ts). Teto de 0,8 s por decisão.

## Pendências / casos sem ruling (decididos pela leitura literal)
1. Rell, Magnetic × Quick-Draw: ordem fixa (reflexo do Rell abaixo do Quick-Draw), segundo a sequência de Doowan; a
   alternativa seria o jogador escolher a ordem (383.3.d).
2. Hostile Takeover: "perde o controle e chama de volta no fim do turno" usa a pilha (383.1/390.2), contra a ruling
   não verificada #9592.
3. Fiora: pisos "até um mínimo de N" (Smoke Screen) são recalculados a cada consulta; uma ruling da comunidade diz que
   ficam travados na resolução. Sem regra oficial.
4. Azir, Ascendant: o Equipment a anexar é escolhido na resolução (383.3.a.3).
5. Ornn × Void Hatchling: a substituição vale quando o Ornn revela o gear escolhido.
6. Próximos sets (Unleashed etc.) seguem o mesmo caminho: `docs/BRIEF-SFD.md` como modelo.

## Como o trabalho foi feito (se quiser repetir)
Lotes em paralelo (por domínio: fury, calm, mind, body, chaos, order, legends+campos, e um "motor" para mecânicas
novas), cada um num git worktree próprio, depois merge na master mantendo uma só implementação de cada gancho;
depois uma revisão independente por quem não escreveu. Verificação ao final: tsc, `npm test`, fuzz por intervalo
(3 seeds) e `--all`, `--ai`, sim, `uiplay.mjs`, teste online, build e republicação do artifact no mesmo link.

## Vendetta e Radiance (25/10/2026) — ESTADO ATUAL
- **Dados**: VEN do corpus, conferido contra a galeria oficial da Riot (playriftbound.com/en-us/card-gallery, JSON em
  `__NEXT_DATA__`, campos `text`, `effect`, `mightBonus`, `cardImage.accessibilityText` = tipo certo): só 4 textos
  divergiam (corrigidos em `src/data/overrides.json`). RAD não está no corpus: `ref/riftbound/radiance-gallery.py`
  (mesclado por `scripts/build_carddata.py`). A galeria erra domínio (usar o bloco de numeração), tipo (usar o
  accessibilityText/Might) e tags (omite e erra; tags do RAD lidas da linha de tipo de cada arte — `ART_TAGS`). Textos
  de equipamento vêm no campo `effect` (effectText). RAD-168+ são reimpressões (ignoradas).
- **Artes do RAD**: baixadas pelo navegador do app do Weder (fetch na origem cmsassets.rgpub.io, convertidas para webp
  360×502 / 520×372, um JSON único em Downloads, puxado pela ponte do computador). O CDN é bloqueado no contêiner.
- **Cartas**: VEN-001..166 e RAD-001..167 completas (`src/cards/vendetta`, `src/cards/radiance`). Rodada 1 mínima
  (`docs/BRIEF-VEN-RAD.md`), rodada 2 de correção completa (`docs/BRIEF-VEN-RAD-FIX.md`; testes
  `tests/venrad-fix-*.test.ts`). Ainda **sem a revisão independente** dos outros sets (o Weder pede quando quiser).
- **Motor novo** (ver README, seção de ganchos de custos e recursos): Empower como habilidade ativada de verdade
  (`CardScript.empower`: custo, `{cost, exhaustSelf, extra, max, timing}` ou lista de instâncias); `CostMod` /
  `Aura.abilityCostMod` / `Aura.cardCostMod` / `TempEffect.powerLess` / `Aura.onPaid` (descontos com power);
  `pool.only[]` + `adds.only` + `asPayFor(use)` (recursos restritos; unit gear conta como unidade e gear);
  `Aura.locCost` (Dragon Roost), `Aura.grantOptionalCosts` (Songstress), `Aura.skipPhase/playFromTrash/trashReplace/
  channelLimit/uncounterable/mightGiveMod`; **unit gear** (`isUnitGear`, `makeUnitGear`, `playKind`); **lendas extras**
  (Neeko: `DeckList.extraLegends`, `legendsOf(p)`, `addLegendWhile`; código de deck com sufixo `~L:`; PROTOCOL 6);
  `becomeCopy(…, whileAttached)`; `Aura.blockMove(…, by)`; `CardScript.replaceChosen`; evento `mightReach` +
  `TriggerDef.threshold`; `grantFlow`; `grantActivated`; eventos `exhaust` (`markExhausted`), `banish`, `mightReduce`;
  ficha TOK-BOMB, `playBomb`, `showOff/showedOff`, `empowerObj/disempower/empowerCount`, Deploy só em campo de batalha;
  `playedToBfThisTurn`, `damagedTurn`, `ignoreDeflectCost`. Cartas de "sua lenda" usam `legendsOf`.
- Verificação: `npm test` 1052 verdes; fuzz VEN+RAD 60 jogos × 3 seeds, `--all` 100, `--ai` 12, sim 100, uiplay e
  online (room, com espectador) sem erros.
- **Decisões sem ruling / pontos a olhar na revisão**:
  - Piltovan Forge: uma Gold usada no pagamento automático conta como "primeira habilidade de gear" (leitura literal).
  - Nasus (VEN-145) × Equip: usa o equipCost impresso (não o custo que depende da unidade).
  - Endless Riches: a substituição também bane a própria Endless Riches quando ela morre.
  - Gangplank, Naval: o +3 de Might da substituição fica enquanto ele estiver no tabuleiro (texto sem duração).
  - Gear que vira unidade por efeito e morre não é visto como "unidade" por gatilhos de morte (o impresso é).
  - Unit gear não pode ser anexado/equipado a outra unidade.
  - Last Caress: ficha de unidade jogada conta como "a próxima unidade".
  - RAD-007/084 "occupied enemy battlefield" = controlado pelo oponente e com unidades (como OGN-161/SFD-093).

## Menu inicial e deckbuilder novos (26/10/2026)
- Pedido do Weder: estética melhor e mais intuitivo no menu, em "Meus decks" e no deckbuilder (sem mexer na mesa).
- Identidade: o mesmo feltro azul com grade fina e as cantoneiras douradas do tapete (classe `.mz`); capas de deck com a
  ilustração da lenda recortada + a carta do campeão (`coverArt` em deckbuilder.ts); ícones de domínio recortados da
  arte da runa (`domIcon`). CSS em `style.css`, seções "telas fora da mesa", "tela inicial" e "deckbuilder".
- Tela inicial: modos como botões (`[data-act=mode][data-mode=ai|online|human]`, não há mais `<select id="opponent">`),
  Meus decks e Abrir replay ao lado, assentos "contra" com a capa do deck; "Trocar deck" abre a escolha de deck com capas
  (`[data-act=pickdeck][data-seat]` → `[data-act=setdeck][data-deck]`; deck incompleto aparece desativado com
  "Completar"). Não há mais `<select id="deck0">`. Os scripts de teste foram ajustados para esses seletores.
- Meus decks: grade de capas com situação (primeira pendência), placar V/D, Jogar/Editar e exportar; starters e conta
  embaixo. Deckbuilder: filtros com ícones de domínio, custo, tipo e coleção em botões (Vendetta e Radiance inclusos),
  "Filtros" recolhe no celular; prévia grande ao apontar (`#dbpeek`); botão direito tira uma cópia; tecla "/" busca;
  painel do deck com cabeçalho da lenda, medidores 40/12/3/10, pendências com botão que leva à solução
  (`data-db="fix"`), Jogar/Mão de teste, Exportar (Copiar código / Copiar lista). Formato do localStorage inalterado.
- Prints: `node scripts/menushot.mjs <pasta> [prefixo]` (SIZES=1366x768,1920x1080,390x844).

## Hub de salas, reconexão, chat e pedido de desfazer (26/10/2026; PROTOCOL 8)
- **Hub** (tela inicial → Online; o quadro fica no lugar do adversário, `hubHtml` em main.ts, CSS `.hub-*`): criar sala
  com nome (padrão "Sala de <nome>") e Pública/Privada (rascunho em `localStorage` `rbmesa-roomopts`); lista ao vivo
  das salas públicas com capa da lenda/campeão, anfitrião, situação (esperando → Entrar; começando/em andamento com
  placar e turno/terminou → Assistir; versão diferente aparece desativada); entrar/assistir por código continua
  (privadas só assim). A lista se redesenha sozinha (`updateHub`, só o `#hublist`), sem tirar o foco dos campos.
- **Transporte do hub** (`online.ts`: `lobbyLink`, `LobbyWatch`, `Listing`, `cleanListing`): anfitrião de sala pública
  anuncia a cada 8 s ou quando muda (`Net.announce`, dados de `listingInfo()` em main.ts). Room: sala nomeada
  `rbmesa-lobby`, tópico `mesa` (o único aberto a Contribuidores), anúncio na presença (some quando a página fecha) +
  mensagem `{lb:'ann'|'gone'|'q'}`. MQTT: retida em `rbmesa/v3/lobby/<código>` com testamento (`will`) vazio que apaga o
  anúncio se o anfitrião cair; ao fechar a sala publica vazio. Quem escuta descarta anúncio com mais de 25 s (TTL) ou
  com horário velho (retido de quem caiu sem limpar).
- **Reconexão**: ao abrir a página com uma sala salva, volta sozinho (sem o botão), já no lance salvo; o anfitrião manda
  o estado. Se o anfitrião recarrega, o convidado percebe pela sessão nova (`Net.hostReloaded`) e se apresenta de novo
  na hora (o espectador pede o estado). Sem notícias do outro lado: aviso `.tt-netwarn` na mesa.
- **Chat** (`chat` no protocolo; o anfitrião confere e repassa para a sala toda): botão Chat na barra (`ico-chat`),
  prontas "Boa!", "Pensando...", "Ops", "GG" + texto até 60 caracteres; balões de 5 s na mesa e as últimas mensagens na
  coluna do registro. Espectador só lê.
- **Pedido de desfazer**: o Desfazer online desfaz direto se a última jogada é só sua (como antes); se o oponente já
  agiu, vira pedido (`undoask`/`undoans`). Aceito, o anfitrião aplica `{k:'undo', n}` (volta até a última jogada raiz
  de quem pediu, `undoTarget`); recusado, quem pediu vê "X recusou desfazer". O pedido caduca se a partida andar.
- Teste: `scripts/onlinetest.mjs` (os dois modos) cobre lista, entrar/assistir pela lista, privada por código, sala que
  cai sumindo, chat, os três casos de desfazer, convidado recarregando e anfitrião caindo e voltando; prints
  `hub-desktop.png`, `hub-mobile*.png`, `online-chat.png`, `online-hostcaiu.png`. No modo room cada página tem o
  próprio contexto e o Node repassa as mensagens e a presença.

## Pagamento de runas: cores alternadas e modo manual (26/10/2026)
- Queixa do Weder: o automático exauria tudo de uma cor e travava a energia na hora de reciclar outra cor.
- `planPayment` exaure primeiro as prontas que vão ser recicladas e depois usa `balancedExhaust`: sempre do domínio com
  mais runas prontas sobrando (empate: alterna). Reciclar continua preferindo a exaurida do mesmo domínio.
- Modo manual por jogador (`PlayerState.manualPay`): opção raiz `MANUAL_PAY` ('manualpay') nas decisões de ação,
  pilha e Focus (é resposta: vale no replay, no desfazer e no online; PROTOCOL 7). Ligado, depois do `choosePayPlan`,
  `manualRunesG` pergunta qual runa reciclar (só se houver pronta e exaurida do domínio) e quais exaurir (só se houver
  cores diferentes). A IA tira a opção (`noManualPay` em ai.ts). Mesa: botão "Pagar: auto/manual" nas suas runas
  (`manualPayBtn`, CSS `.tt-mpay`), linha no guia. Testes: `tests/pagamento.test.ts`; onlinetest liga dos dois lados.

## Fora da partida: histórico, estatísticas, capas, deckbuilder (26/10/2026)
- **Histórico** (`src/ui/history.ts`): cada partida terminada (IA, passa-e-joga, online; espectador não) guarda data,
  modo, lado da conta, nomes, decks (com o id do deck salvo achado por impressão digital, `acc.matchDeckChoice`),
  vencedor, pontos, turnos, lances e o replay `{cfg, answers}` compactado (deflate-raw + base64, ~1 KB). Chave própria
  por conta (`riftbound-mesa-historico-v1:<perfil>`), últimas 50, teto ~1,6 MB; sem espaço tira replays antigos, depois
  partidas antigas (`lastNote` avisa), nunca lança erro. Tela: Meus decks/tela inicial → Histórico (`db.view =
  'history'`), "Ver replay" abre no fim (de lá, Jogar daqui / Daqui × IA). `recordIfOver` em main.ts não grava no replay.
- **Estatísticas** (`SavedDeck.stats`, opcional): partidas/vitórias (começam do V/D antigo), turnos, por lenda adversária
  e por carta (`g` partidas com ela, `p` jogadas, `t` soma do turno do jogador, `d` cópias na mão no fim). Conta só o
  lado da conta (passa-e-joga: Jogador 1). Mostradas no editor (seção Estatísticas) e nos cards de Meus decks.
- **Deckbuilder**: filtro por palavra-chave (`KEYWORDS`, tiradas de `[...]` no texto/effectText); lendas mostram
  quantos campeões com a tag existem e quantos estão no deck (+ aviso ao escolher); "sugerir" runas (power por domínio,
  mín. 3 por cor usada, botão Aplicar); Duplicar no editor e "Comparar" (diff com a original via `SavedDeck.origin`
  ou com qualquer deck).
- **Capa** (`SavedDeck.cover = {code, x, y, z}`): janela Capa no editor; recorte em CSS com container units
  (`.cv-art`, vars `--cx/--cy/--cz`, clamp sem borda). Recorte padrão novo das lendas (rosto, sem os ícones impressos).
- **Biblioteca rápida**: a grade desenha 96 cartas e o resto ao rolar (IntersectionObserver, `mountDb`); cliques no
  editor usam `lightRender` (só os tiles que mudaram, painel, abas e janelas). Busca não redesenha a página.
- **Copiar** (`src/ui/copy.ts`): clipboard com 1,5 s de prazo; se falhar, caixa com o texto selecionado.
- Testes: `tests/historico.test.ts`; `scripts/histseed.ts` gera conta+histórico para os prints; `menushot.mjs` agora tira
  as telas novas (7..17) e mede o clique na biblioteca; `uiplay.mjs` confere que a partida entrou no histórico.

## Qualidade de vida dentro da partida (26/10/2026)
- **Confirmar antes de jogar**: clique numa carta jogável (ou "Ativar"/"Equipar"/"Esconder" no menu da carta) só a
  arma (`armed` em main.ts): painel `.tt-arm` com custo, texto, a próxima pergunta (`armNext` simula a ação numa cópia
  da partida) e os alvos/locais possíveis acesos (`.armtgt`, `.armdest`). Confirma com o 2º clique na carta, o botão,
  Enter ou clique direto num alvo aceso (vira `playDrop`); Esc/clique fora cancela. Arrastar continua jogando direto; a
  lista "Opções" e os botões do zoom também (são escolha explícita). No desktop o painel fica sobre a coluna da direita
  (não cobre a mesa); no celular, sobre a sua mão. Corrigido junto: botões de ação do zoom da carta não respondiam
  (o `data-act` do fundo do zoom engolia o clique).
- **Ordem de efeitos simultâneos**: lista ordenável (`trigListHtml`: arrastar a linha ou ↑↓) com `Option.detail`, na
  ordem de resolução (o 1º resolve primeiro); "Confirmar ordem" vira `trigPlan`, respondido sozinho a cada pergunta de
  ordem do motor (as perguntas de alvo de cada gatilho continuam no meio, normalmente). Rótulos casados sem a numeração
  dos iguais (`normTrig`).
- **"Pagar: manual" lembrado na conta** (`Profile.manualPay`, opcional; `acc.manualPayPref/setManualPayPref`): ao
  trocar no botão, fica salvo; ao começar uma partida a mesa responde `manualpay` sozinha na primeira decisão raiz do
  seu lugar (`autoAnswers`; resposta registrada: vale no replay e no online).
- **Previsões com possibilidades**: `interact.ts` calcula um resultado por escolha de Tank × "por último" (e conta
  `ignoreTank`); o placar mostra cada um, caveira clara "☠?" = morre só em alguma. A Prévia (👁) ramifica na primeira
  escolha de atribuição de dano do caminho (`BRANCH_Q`) em vez de chutar. Carta escondida no campo é avisada. Teste:
  `tests/ui-previsao.test.ts`.
- **Avisos de ruling** (`rulingHints`, também no painel de confirmar): Empower (habilidade ativada na pilha), Deploy,
  unit gear, lendas extras da Neeko, Endless Riches, Flow, recursos restritos (pool `only`, Renekton/Mordekaiser).
- **Animações** (`animateArrivals`; nada espera, `prefers-reduced-motion` desliga): brilho persistente de Empowered
  (`.card.empowered`) com estouro ao ficar, Bomb explode onde estava, gear que vira unidade gira, Burn (cartas voando do
  deck para o descarte + "Burn N"), Predict (o deck pisca com "Predict N").
- Scripts de UI ajustados: uiinteract testa armar/confirmar/cancelar/alvo e a lista de ordem; uiplay, uioverlap,
  tableshot e onlinetest confirmam a ordem; onlinetest também joga pelo painel.

## Informação oculta no online (26/10/2026; PROTOCOL 9)
- Antes: as duas telas refaziam a partida pelas respostas (cfg + semente + respostas), então quem abrisse as ferramentas
  do navegador via a mão, o topo do deck e as viradas do outro; o espectador só tinha as mãos escondidas pela mesa.
- Agora o anfitrião roda a partida (autoritativo) e manda a cada um só a **visão filtrada** dele
  (`src/engine/view.ts`, `ViewKeeper`): tudo que é público, a própria mão e as próprias viradas; as cartas escondidas
  do outro viram objetos com o código `HIDDEN_CODE` ('??', em `db.ts`, nome "Carta escondida"); decks só pela contagem.
  Não saem do anfitrião: semente/sorteio, respostas, efeitos atrasados e pendentes (funções), contexto dos itens da
  pilha, listas dos decks do oponente, efeitos em cartas escondidas. A pergunta inteira só vai para quem decide (o outro
  recebe só de quem é a vez e o tipo). Espectador = visão -1 (nenhuma mão, nenhuma virada).
- **Revelar no momento certo**: cartas citadas nas opções da pergunta de quem decide (Predict/Vision, olhar o topo,
  mão do oponente revelada por efeito para escolher) aparecem só para ele e só enquanto a pergunta existe — o topo do
  próprio deck é só do dono. Viradas do oponente com 'seeFacedown' (Scuttle Crab) aparecem. Jogada/revelação pública
  já é pública (pilha, mesa, registro "revela X"). Virada do oponente como alvo vai com apelido e sem o nome no texto.
  Na escolha de campos ("choose") o campo de quem já escolheu fica escondido até os dois escolherem.
- **Registro**: `Engine.sayTo(to, text, pub)` / `LogEntry.to/pub` (não muda regra): linha que só alguns leem; os outros
  leem `pub`. Usado em "olha a carta escondida" (Engine.hide com seeFacedown) e no Scuttle Crab (olhar as viradas): os
  dois jogadores leem os nomes (quem olhou e o dono), o espectador não. Novas linhas que mostram carta escondida a um
  só jogador devem usar `sayTo`. Ids de cartas escondidas no registro viram '?' (cada linha é montada uma vez, com a
  mesa da hora em que apareceu).
- **Ids**: o id de verdade ('o17') diz a posição da carta na lista do deck (os objetos são criados em ordem antes de
  embaralhar), então objeto escondido ganha apelido: mão/viradas um aleatório que fica enquanto ela continua escondida;
  deck por posição ('d1.5'). Referências fora do lugar viram '?'. O convidado responde com o apelido e o anfitrião troca
  de volta (`ViewKeeper.unalias`).
- **Mensagens**: `start`/`state` (visão completa do convidado), `view` (diferença: campos do motor que mudaram, objetos
  que mudaram, registro a partir da 1ª linha diferente; `base` = seq anterior), `wstate`/`wview` (espectadores, para a
  sala toda), `req` (pedido do convidado). Cargas empacotadas por `pack` (deflate + base64) e, entre anfitrião e
  convidado, **cifradas** (ECDH P-256 no `hello`/`welcome` → AES-GCM): a sala é um canal aberto (MQTT público/room) e
  um espectador leria a mão do convidado. Sem WebCrypto (navegador antigo) vai sem cifra. O anfitrião só manda a visão
  do convidado depois do hello (com a chave pronta). Filas `outQ`/`inQ` em main.ts mantêm a ordem (empacotar é
  assíncrono). A mensagem `op` não existe mais.
- **Convidado** (`ViewGame`): mesma cara que `Game` para a mesa (engine, current, answers só com o tamanho, lastRoot,
  canCancel, cfg, serialize) com um `Engine` de leitura montado da visão (`Object.create(Engine.prototype)`, como o
  `cloneAtRoot` da IA): a mesa chama might/kw/playBlockReason/moveDests... sem mudança. A seção "mesa" de main.ts e
  `interact.ts` ficaram iguais, salvo o botão Prévia. Jogada em sequência (arrastar, mover com um clique): o anfitrião
  simula numa cópia como antes; o convidado não tem a partida, então responde um passo, espera a pergunta seguinte e
  segue (`remoteSteps`).
- **Prévia (Olho do Oráculo)**: desligada para o convidado (botão apagado, com o motivo): ela refaz a partida com
  cartas que ele não vê. A previsão de combate sobre o campo continua (só usa a mesa). O anfitrião segue com a prévia.
- **Fim da partida**: a visão passa a levar a partida completa (`fin`, cfg + respostas), porque já não há segredo:
  histórico do convidado com replay, "Ver o replay" e relatório completos. Desfazer depois do fim é recusado no online
  (reabriria uma partida cujo replay já foi entregue).
- **Relatório do convidado no meio da partida**: leva a visão dele e o registro (`partial: true`), sem dar para refazer
  o lance; a janela explica e manda pedir o do anfitrião. Abrir esse arquivo avisa o mesmo.
- **Salvo/reconexão**: o convidado guarda só a visão (`{"view":...}`); partida completa salva por versão antiga não é
  carregada como convidado. Anfitrião recarregou: o convidado se apresenta de novo e recebe a visão completa.
- **Limitação aceita**: a partida inteira fica na memória do anfitrião (é a máquina dele que roda o motor).
- Testes: `tests/visao.test.ts` (partidas aleatórias com desfazer e reconexões: nenhum id/código escondido na visão de
  0, 1 e espectador; o que a pergunta mostra aparece; diferença = visão completa; motor de leitura responde; campos na
  escolha; registro privado; viradas com seeFacedown; apelido nas respostas). `scripts/onlinetest.mjs` agora compara a
  assinatura pública (`__rb.sig()`), tira heap snapshot (CDP) das páginas do convidado e do espectador e confere que não
  há objeto de carta nem JSON com os códigos da mão do anfitrião (e, no espectador, da do convidado) — o mesmo detector
  acha as cartas na memória do anfitrião — e que o histórico do convidado recebe o replay completo no fim.

## Pausado pelo Weder (26/10/2026, tarde) — RETOMAR DAQUI
- **IA** (merge de `worktree-agent-a401b1978ea97933d`, commit "trabalho em andamento"): níveis Fácil/Normal/Difícil
  (`AiLevel`, `PROFILES` em `src/ai/ai.ts`; escolha na tela inicial, `aiLevelHtml`; vai no cfg da partida), avaliação das
  mecânicas VEN/RAD, arquétipo do oponente pela lenda. Parou no meio da fase "verificar a resposta do oponente" do
  planejamento de turno. Medição na pausa (Normal nova × antiga, `npx tsx tests/ai-vs.ts 64 --shard k/4`): 37 × 27
  (58%), decisão média ~300 ms, pior ~2,2 s. Meta original: margem clara em ≥200 partidas. Próximo: terminar a
  verificação da resposta do oponente, afinar pesos com `--tune`, medir Fácil/Difícil.
- **Informação oculta no online** (merge de `worktree-agent-ae631948516979c70`, PROTOCOL 9): anfitrião autoritativo manda
  a cada um a visão filtrada; Prévia (👁) desligada para o convidado; replay completo chega ao convidado no fim.
  Estava terminando quando pausou: `npm test`, uiplay e onlinetest (room e MQTT) passaram depois do merge. O anfitrião
  continua com tudo na memória (limitação aceita).
- ~~`scripts/onlinetest.mjs` instável no clique do pedido de desfazer~~ — resolvido (27/10): o clique usa localizador
  em vez de ElementHandle; 3 rodadas seguidas passaram.

## Retomada (27/10/2026)
- **Mesa**: `touchUi()` agora vai pelo ponteiro (`(hover: none), (pointer: coarse)`), não pela largura — em notebook
  com zoom do Windows (125%/150%) o clique na carta abria o zoom gigante e travava. Zoom no toque: tocar na carta fecha,
  ações e Fechar fixos embaixo (`.zfoot`). Prévia ao apontar também no layout compacto com mouse, sempre com o texto
  da carta legível; cartas das escolhas do centro (mulligan...) maiores.
- **Repositório**: `npm run publicar` atualiza `../riftbound-mesa-site/site` (Netlify) e `../riftbound-mesa.html`.
- **IA, medição** (`npx tsx tests/ai-vs.ts 128 --shard k/4`, Normal nova × antiga): **77 × 51 (60%)**.
  Tentativa: avaliar o fim da conferência da resposta do oponente como começo do meu turno (`turnEnding: false` no
  `evaluate` de `oppTurnValue` — hoje ele avalia como fim do meu turno, o que soa errado). Mediu 69 × 59 (54%), dentro
  do ruído mas não melhor: revertido. Se for tentar de novo, medir com ≥256 partidas.
- **Níveis contra a antiga** (64 partidas cada): Fácil 20 × 44 (31%, decisão média ~35 ms) — mais fraco, como deve;
  Difícil 39 × 25 (61%, média ~250 ms, pior ~1,9 s) — **igual ao Normal**, o tempo a mais não está virando força.
- **Experimentos de 27/10** (128 partidas cada, `--mirror`; "× Normal" = `--old new --level hard --tune` com o hard
  igualado ao normal mudando só o item): sem a conferência da resposta do oponente 57 × 71 (**ela vale ~5 pontos
  percentuais**, é a parte que mais rende); sem o planejamento do turno 61 × 67; Difícil × Normal 64 × 64 (empate);
  conferência mais larga (verifyK 6, 500 ms) 66 × 62; Difícil com verifyK 8 / 900 ms 64 × 64; oponente simulado que
  também divide as unidades entre dois campos 60 × 68 (pior: o mínimo sobre mais linhas fica pessimista demais);
  peso de campo contestado ×1,5 65 × 63, ×0,6 60 × 68. Conclusão: mais tempo/largura de busca não vira força — o limite
  está na avaliação e no modelo do oponente. Por estilo (256 partidas × antiga): a nova vence em todos os confrontos;
  os decks aggro do gerador é que são fracos (aggro × ramp: 22% com a nova pilotando o aggro, 16% com a antiga).
