# Riftbound Mesa — motor de regras

Motor de regras de Riftbound (1x1) com interface de navegador para jogar no mesmo aparelho (passa-e-joga).
Projeto de fã, sem fins comerciais, feito sob a política "Legal Jibber Jabber" da Riot. A Riot não endossa nem patrocina.

## O que já funciona

- **Partida completa**: preparação (campos sorteados ou escolhidos, quem começa, mão de 4, mulligan de até 2),
  turno inteiro (despertar, início com hold, canalizar 2 runas — 3 no primeiro turno de quem joga em segundo —,
  comprar, fase principal, final), Burn Out e vitória com 8 pontos.
- **Runas e custos**: exaurir dá energia, reciclar dá power do domínio; pagamento automático escolhendo as runas.
- **Pilha (chain) com prioridade**, **showdown com Focus**, **combate** (atacante/defensor, distribuição de dano
  com Tank primeiro e Backline por último, dano excedente, cura, atacantes voltam se o defensor resiste),
  **conquista e hold**, regra do **ponto final**, perda de controle, cartas escondidas descartadas ao perder o campo.
- **Palavras-chave no motor** (valem para qualquer set futuro): Accelerate, Action, Reaction, Ambush, Assault,
  Backline, Deathknell, Deflect (inclusive em habilidades disparadas, com a regra 355.16), Ganking, Hidden, Hunt,
  Legion, Level, Mighty, Shield, Stun, Tank, Temporary, Vision, Equip, Quick-Draw, Weaponmaster, Repeat, Flow,
  Empower/Empowered, Unique (no deck), Deploy e Disarm (Radiance). Ações: Buff, XP, Predict, Burn, Banish,
  Recycle, Counter, Prevent, Recall, Attach, fichas (Recruit, Sprite, Gold, Bird...).
- **Cartas**: o Origins inteiro (OGN), o Proving Grounds (OGS), o Spiritforged inteiro (SFD-001 a SFD-221) e o
  Unleashed inteiro (UNL-001 a UNL-219: XP, Hunt, Level, Ambush, cópias, Brush e Baron Pit). Texto com a errata oficial mais recente.
- **Desafios** ("vença neste turno"; tela inicial → Desafios): mesas montadas com objetivo (vencer, conquistar um
  campo, destruir uma unidade, sobreviver ao turno do oponente), cada uma ensinando uma interação. Dados em
  `src/data/challenges.ts` (para criar um desafio, acrescente um item e um teste em `tests/desafios.test.ts`), tela em
  `src/ui/challenges.ts`, progresso na conta. A mesa montada é `GameConfig.scenario` (`src/engine/scenario.ts`): o
  motor monta tudo no começo de `run()` e começa na fase principal, então desfazer, salvar e replay valem.
- **Decks e conta** (`src/ui/deckbuilder.ts`, `src/ui/account.ts`): biblioteca com filtros (domínio, tipo, custo,
  coleção, raridade, busca), deck principal, side (até 10), runas, campos, validação pelas regras 103 e 601.1.c,
  curva de energia, mão de teste, código de deck no formato do Piltover Archive (importar e copiar), decks salvos por
  conta, várias contas no mesmo aparelho, backup da conta e placar de vitórias por deck.
- **Escada contra a IA** (`src/decks/ladder.ts`, `src/ui/ladder.ts`, `src/ui/ladderscreen.ts`): botão "Escada" na
  tela inicial; o jogador escolhe um deck e enfrenta 5 adversários com decks temáticos (Rengar aggro, Ziggs Bombas/
  Deploy, Ambessa Empower, Lux control, Kai'Sa chefe), IA de Fácil a Difícil e um tema de tabuleiro do LoR por degrau;
  3 vidas (sem vidas, recomeça); vencer os 5 põe o deck no hall da conta. Progresso em `Profile.ladder`/`ladderHall`.
- **Torneio entre amigos** (`src/ui/tournament.ts` lógica, `tournamentsync.ts` rede/conta, `tournamentscreen.ts`
  tela): botão "Torneio" na tela inicial; eliminação simples (chave com bye) ou pontos corridos (vitória = 3; desempate
  por confronto direto e saldo de pontos de partida), melhor de 1 ou de 3, deck fixo ou trocável. Entra-se por código
  ou link (`#torneio-XXXXXX`); cada confronto é uma sala online normal e o resultado (com o replay) volta sozinho; o
  organizador é a fonte da verdade, corrige resultados e dá W.O. Fica na conta (`Profile.tournaments`).
- **Mesa de verdade** (`src/ui/main.ts`, seção "mesa"; lógica pura em `src/ui/interact.ts`): tapete com oponente em
  cima e você embaixo, os campos de batalha no meio, mão em leque, runas como cartas (exauridas deitadas; a lenda
  também gira), pilhas com contagem, trilhas de pontos nas laterais e prévia grande da carta ao apontar.
  - **Barra de decisão na mesa** (entre os campos e a sua base): o pedido, os botões que não são cartas, o botão grande
    de passar/encerrar o turno e a pilha. "Opções" abre a lista completa da decisão. A coluna da direita fica só com o
    registro (mais novo em cima; um botão inverte). No celular o registro vira gaveta.
  - **Mover com um clique**: clique na unidade pronta (fica selecionada), clique em outras para levar junto (duplo
    clique: todas daquele lugar) e clique no destino aceso. Carta com mais de uma ação abre um menu nela.
  - **Arrastar e soltar** (mouse e toque): da mão para a base ou um campo (joga ali), spell em cima do alvo, gear na
    unidade (Equip), carta [Hidden] num campo (esconde), unidade pronta para o destino. Soltar na mão ou fora desiste.
    No toque, segurar a carta abre o zoom.
  - **Setas de alvo**: cada item da pilha tem seta até os alvos, que ficam marcados com "ALVO" antes de resolver.
  - **Previsões** (não mudam nada na partida): placar de dano e caveira nas unidades que morrem no combate e ao
    escolher o destino de um movimento; com a pilha aberta, "Prévia" (tecla V) refaz a partida numa cópia, deixa tudo
    resolver com todos passando e mostra o que muda (mortes, Might, dano, pontos, controle). Se o resultado depende de
    carta escondida ou de sorteio, a prévia não aparece.
  - **Explicável como no LoR**: o botão de passar diz o que acontece em seguida ("o outro responde", "resolve o de
    cima", "dano de combate"); a barra explica a situação (pilha, Focus, showdown) e diz de onde vem cada pergunta
    ("Resolvendo: …", "Jogando …"); as fases do turno ficam acesas na coluna; apontar uma carta mostra as palavras-chave
    explicadas e, se não der para jogar, o motivo (o motor diz qual: timing, custo, alvo, condição); um clique numa
    carta apagada mostra o motivo na barra. Destinos de movimento dizem se a conquista dá ponto (e avisam a regra do
    último ponto).
  - **O que o oponente fez**: avisos com a carta e seta até os alvos (mesmo quando a pilha resolveu sem você ter a vez),
    histórico das últimas coisas que resolveram na coluna da esquerda (apontar mostra as setas), aviso de "+1 ponto",
    resumo do turno do outro no começo do seu, aviso grande de troca de turno e a IA com pausa depois de jogar algo.
  - **Como funciona** (botão ou tecla ?): guia curto do turno, da pilha, do showdown/combate, dos pontos e das previsões.
  - Escolha de campo, mulligan e cartas fora da mesa (topo do deck, descarte) aparecem grandes no centro.
- **Relatar problema e replay**: "Relatar problema" (coluna da direita) copia ou baixa um arquivo pequeno com a
  partida inteira (configuração + respostas) e uma nota. Na tela inicial, "Abrir replay" reabre o arquivo no mesmo
  lance; dá para andar lance a lance (botões, barra ou setas ← →), girar a mesa (as duas mãos ficam à vista) e
  continuar jogando dali (passa-e-joga ou contra a IA). No fim da partida, "Ver o replay" revê a partida atual.
- **Avisos de ruling**: interações que parecem bug mas são regra ganham uma linha na própria pergunta (ex.: o desconto
  do Ezreal, Prodigy não vale no pagamento do Draven, Vanquisher — RiftJudge #286).
- **Ordem de efeitos simultâneos**: a lista abre sozinha, com o texto de cada efeito e a explicação da ordem.
- **Registro clicável**: nomes de carta no registro mostram a carta e fazem ela piscar na mesa.
- **Atalhos**: Espaço passa/encerra o turno, Enter confirma, Esc cancela ou fecha, Z desfaz, V liga/desliga a prévia, ? abre o guia.
- **Cancelar** só desfaz as escolhas de quem está decidindo (uma pergunta de gatilho feita ao oponente no meio da sua jogada não desfaz a sua jogada).
- **Banidas**: formato Casual (liberadas) ou Padrão (bloqueia deck com banida), escolhido na tela inicial.
- **IA adversária** (`src/ai/ai.ts`): em cada decisão ela testa as jogadas possíveis numa cópia da partida
  (com os alvos e escolhas que cada uma pede), joga até a mesa assentar e escolhe a que deixa a mesa melhor
  para ela (pontos, controle de campo e risco de perdê-lo, unidades, cartas na mão, runas). Não olha a mão nem o
  deck do oponente. Como usa o próprio motor, funciona com qualquer carta nova sem código extra.
  Três níveis, escolhidos no assento da IA na tela inicial e guardados no cfg da partida (`aiLevel`; replay e relatório
  reproduzem): **Fácil** (busca curta, não olha a ameaça do oponente, às vezes joga a 2ª melhor jogada, encerra cedo ou
  não responde na pilha — erros repetíveis no replay), **Normal** e **Difícil** (mais tempo, oponente simulado mais a
  fundo e planejamento do turno inteiro). Ela pensa em fatias (`decideAsync`), sem travar a mesa. Avalia também as
  mecânicas de Vendetta/Radiance: Empowered vale o que custou, gear com [Deploy] onde o oponente segura vale pouco,
  Bomb, carta com [Flow] no descarte, palavras-chave que ficam, unit gear contado uma vez, Predict recicla o que ainda
  não tem jogada; e lê o arquétipo do oponente pela lenda (e pela curva do que ele já jogou).
- **Artes oficiais** de todas as cartas do banco (934 imagens, em `assets/art/`, reduzidas para 360 px). A página baixa
  só os pacotes das cartas em jogo; a versão `riftbound-mesa.html` já vem com as artes do Origins, do Proving Grounds e do Spiritforged embutidas.
  As imagens vêm da galeria oficial (playriftbound.com), via o pacote público `JeremyCPE/riftbound-vision-assets`.
- **Sons e vozes** (`src/ui/sound.ts`): efeitos gerados no navegador (jogar, mover, combate, dano, morte, ponto,
  conquista, sua vez, vitória/derrota) com volume no botão 🔊 ou na tecla M. No site, os campeões falam com as vozes do
  Legends of Runeterra (81 campeões em `assets/voice/`: jogar, atacar, bloquear, morrer, vitória, derrota), baixadas da
  wiki do League of Legends por `python3 scripts/lor_voices.py` e comprimidas em mono 48 kbps. Áudio da Riot Games.
- **Música** (`src/ui/music.ts`): os temas de tabuleiro do Legends of Runeterra (20 tabuleiros em `assets/music/`,
  `python3 scripts/lor_music.py`, AAC 48 kbps) tocam em loop na partida; o tema do menu fora dela; vitória e derrota no
  fim. Cada deck escolhe a trilha no deckbuilder (linha "Música": sorteada, sem música ou um tabuleiro, com prévia);
  na partida vale a do seu deck. Volume no botão 🎵 (mesa e tela inicial) ou na tecla N. Só no site.
- **Ponto final** (regra 471.1.b.1): o 8º ponto vem de hold, de efeito de carta, ou de uma conquista no turno em que o
  jogador pontuou todos os campos (hold num e conquista no outro também vale). Fora disso a conquista compra 1.
- **Online** (`src/ui/online.ts`): cada um no seu aparelho. Dentro do app do Claude usa o canal "room" da própria
  página (o amigo precisa de acesso de edição à página); fora dele, retransmissores MQTT públicos por WebSocket
  seguro (dois ao mesmo tempo), que funcionam em qualquer rede. Um cria a sala e manda o código ou o link; o outro
  entra e escolhe o deck. O anfitrião roda a partida e manda a cada um só a **visão filtrada** dele
  (`src/engine/view.ts`): a própria mão e o que é público; as cartas escondidas do outro chegam sem código, a ordem dos
  decks e a semente nunca saem do anfitrião, e a visão do convidado vai cifrada (ECDH + AES-GCM). Há numeração,
  batimento e pedido de estado completo quando alguma mensagem se perde. Quem cair ou recarregar volta pela tela
  inicial ("Voltar para a sala"). "Desfazer" online só desfaz a sua última jogada, antes de o oponente agir (depois,
  vira pedido). Limitação aceita: a partida inteira fica na memória do anfitrião (é a máquina dele que joga).
  Na sala, antes da partida, o convidado pode trocar de deck (o anfitrião vê na hora). "Salas recentes" volta a uma
  sala com um clique. **Assistir**: qualquer um com o código entra só para ver (sem ver nenhuma mão); o anfitrião vê
  quantos estão assistindo.
- **Desfazer** e **cancelar ação** (a partida é refeita a partir das respostas, de forma determinística).
- **Tutorial "Aprender a jogar"** (tela inicial; sugerido na primeira visita): partida guiada de ~10 minutos contra um
  oponente roteirizado, com decks em ordem fixa e os dois começando com 4 pontos. Uma caixa explica cada passo e uma
  seta aponta o que usar; só a jogada do passo vale (o resto fica apagado e o clique é explicado). Cobre o objetivo,
  runas (canalizar, exaurir, reciclar), jogar unidade, mover e conquistar, hold, combate, pilha e Reaction, showdown e
  Focus, palavras-chave, o último ponto e encerrar o turno; no fim leva à partida contra a IA (Fácil). Dá para sair e
  continuar depois (progresso na conta local) ou refazer. Roteiro em `src/ui/tutorial-script.ts`, tela em
  `src/ui/tutorial.ts`.
- **Ranking entre amigos e Perfil** (tela inicial, ou o nome da conta no topo): cada conta tem uma pontuação Elo
  (começa em 1000, K = 32) que muda só com partidas **online** contra amigos; a tela Ranking lista os amigos que você
  já enfrentou (pontuação vista por último, vitórias × derrotas, sequência, última partida). O Perfil mostra a
  pontuação partida a partida, taxa de vitória geral, por deck, por lenda e por adversário (amigo ou IA por nível),
  deck mais usado, maior sequência e partidas por modo. Lógica em `src/ui/rating.ts`, telas em `src/ui/profile.ts`.

## Como jogar fora do app

- **Sem instalar nada:** abra `dist/riftbound-mesa.html` no navegador (duplo clique). Funciona contra a IA, no mesmo
  aparelho e online (precisa de internet para o online).
- **Com um link para os amigos:** publique a pasta `dist/site/` em qualquer hospedagem de site estático
  (Netlify Drop, itch.io, GitHub Pages). O link de convite de sala só funciona nessa versão hospedada.

## Comandos

```bash
npm install
npm test          # testes de regra
npm run sim       # 100 partidas aleatórias até o fim, checando invariantes
npx tsx tests/fuzz.ts --all --games 100        # decks aleatórios com todas as cartas (--ai: IA contra IA)
npm run ai        # IA contra um jogador aleatório (placar e tempo por decisão)
npm run build     # gera dist/riftbound-mesa.html (abre direto no navegador), dist/site/ (para hospedar),
                  # dist/index.html e dist/art/ (artifact)
node scripts/mqttbroker.cjs & node scripts/onlinetest.mjs   # online com dois navegadores (MODE=room simula o app do Claude)
node scripts/tableshot.mjs <pasta>                          # prints da mesa em várias telas (SIZES=1920x1080,390x844)
node scripts/uiplay.mjs <pasta>                             # partida inteira clicando na lista de opções (W/H/TOUCH/OPP)
node scripts/uiinteract.mjs <pasta>                         # partida usando a mesa: mover com clique, arrastar, setas
node scripts/uioverlap.mjs                                  # a barra cobre alguma carta? o pedido sai cortado? (6 telas)
node scripts/uireplay.mjs <pasta>                           # relatório baixado → aberto no replay → lances → continuar
node scripts/tutorialplay.mjs <pasta>                       # tutorial inteiro pela mesa, com prints de cada passo
node scripts/laddershot.mjs <pasta>                         # prints da escada contra a IA (SIZES=1920x1080,1366x768,390x844)
node scripts/mqttbroker.cjs 8888 & node scripts/tourtest.mjs <pasta>   # torneio com 3 navegadores (MODE=room também)
node scripts/rankingtest.mjs <pasta>                        # ranking: partida online inteira entre duas contas + prints
```

## Estrutura

```
src/engine/       motor: engine.ts (regras), game.ts (respostas/desfazer), script.ts (interface das cartas),
                  types.ts, db.ts, tokens.ts, deckcheck.ts
src/cards/<set>/  uma carta por arquivo (ex.: OGN-169-gust.ts) + index.ts do set
src/decks/        listas de deck
src/data/         cards.json (todas as cartas, gerado por scripts/build_carddata.py), banlist.ts e challenges.ts (desafios)
src/ai/           IA adversária
src/ui/           interface (TypeScript puro + CSS); art.ts carrega as artes
assets/art/       artes oficiais das cartas (<CÓDIGO>.webp)
tests/            testes de regra, simulador e cenários
```

## Como adicionar uma carta

Crie `src/cards/<set>/<CÓDIGO>-<nome>.ts` e importe no `index.ts` do set. O motor já cuida das palavras-chave;
a carta só descreve o que é dela:

```ts
import { registerCard } from '../../engine/script';
registerCard({
  code: 'OGN-024',                       // Void Seeker
  keywords: { action: true },
  spell: {
    label: 'Void Seeker',
    targets: [{ prompt: '4 de dano em qual unidade?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 4, c.self);
      yield* c.g.draw(c.p, 1);
    },
  },
});
```

Ganchos disponíveis: `onPlay`, `triggers` (eventos: play, move, conquer, hold, attack, defend, die, discard,
combatStart, combatEnd, beginStart, mainStart, turnEnd, buff, stun, returnToHand, empower, draw, chosen, leave),
`activated`, `auras` (Might, palavras-chave, desconto de custo, entrar pronta), `kwMod`, `mightMod`,
`optionalCosts`, `mandatoryCost`, `selfCostMod`, `equipCost`/`equipped`, `repeat`, `flow`, `empower`,
`deathReplacements` (substituições de morte, inclusive "você pode"), `noCombatDamage`.
Equipamento (Spiritforged): `equipCost`/`equipFor`/`equipExtra`/`equipTiming` (o motor faz o Equip, o Weaponmaster e o
Quick-Draw), `equipped` = texto de efeito (palavras-chave, Might, gatilhos, ativadas, auras e substituições que valem
para a unidade equipada; o Might Bonus impresso o motor soma sozinho); para prender/soltar use `g.attach`/`g.detach`
(nunca mexa em `attachedTo`); eventos `attach`, `detach`, `activate`, `mighty`; `g.revealTop` para revelar do topo. Para matar use
`yield* g.killG(...)` (mortes simultâneas e substituições que perguntam); para reciclar várias cartas,
`yield* g.recycleCards(...)`; para pagar, `yield* g.payG(...)`.

### Ganchos do Unleashed (XP, Hunt, Level, Ambush, cópia, substituir, nomear)
- `asPlayed(c)`: escolhas "enquanto você me joga" (355.1: nomear tag, The List; Ivern, Friend to All). Roda antes dos custos e também quando a carta é jogada por efeito ou ignorando todos os custos.

- **XP** (regras 728-733): do jogador, pública, sem limite e **não zera** (só cai quando é gasta). `g.xp(p)`,
  `g.gainXp(p, n, fonte?)` (evento `gainXp`), `g.gainedXpThisTurn(p)`, `g.canSpendXp(p, n)`, `g.spendXp(p, n)` /
  `yield* g.spendXpG(p, n)` (evento `spendXp`). Como custo, em `src/cards/helpers.ts`: `xpCost(n)` (espalhe numa
  habilidade ativada ou gatilho: `{ ...xpCost(2), label, resolve }`), `xpOptionalCost(n, flag)` ("You may spend N XP as
  an additional cost", em `optionalCosts`), `xpEquipExtra(n)` (`equipExtra`: "[Equip] — Spend 1 XP"). Gatilho com custo
  de XP que não pode ser pago não vai para a pilha nem pergunta o "você pode".
- **Hunt** (823): só `keywords: { hunt: N }`. O motor põe na pilha o gatilho "quando eu conquisto ou seguro, meu
  controlador ganha N XP" (instâncias somadas). `g.huntTrigger(u, ev)` = o mesmo gatilho, para "ative os efeitos de
  conquista" (Reckoner's Arena).
- **Level / Legion** (727, 812, 824): texto dependente, inativo até a condição. `g.levelReached(obj, n, p?)` (XP do
  controlador da carta; na mão passe quem joga), `g.level(p, n)`, `g.legion(self, p)`. Passivas: cheque na função
  (`mightMod`, `kwMod`, `entersReady`, `selfCostMod`, auras...). Gatilho: em `cond` (avaliado quando o evento acontece,
  727.1.c.1). Ativada: em `condition` (727.1.c.3). Parte de spell: na resolução.
- **Ambush** (822): `keywords: { ambush: true }`. "I can [Ambush] to ..." = `CardScript.ambushBfs(g, self, p, c?)`
  (chamado de novo depois dos custos com `c`: se o local deixou de valer, a jogada é desfeita, 822.3).
- **Disparar a mais**: `Aura.triggerExtra(g, src, ev, fonte, ctrl)` ("Your conquer effects for conquering here trigger
  an additional time"). **Mover de qualquer lugar**: `Aura.allowMove` (Baron Pit).
- **Cópia** (477.1.b): `g.becomeCopy(o, fonte)` — traços impressos (nome, tipo, tags, custo, domínio, texto, Might
  impresso); buffs, anexos e efeitos não são copiados; cópia de cópia copia o original.
- **Substituir / criar** (438, 439): `g.replaceWith(alvo, 'TOK-BRUSH', p)` (mesmo objeto; a carta vai ao banimento
  como substituída, `g.isReplaced`), `g.replacedCards(ficha)`, `yield* g.swapBackG(p, ficha)`,
  `g.createBattlefield('TOK-BARONPIT', p)`. Fichas `TOK-BRUSH` e `TOK-BARONPIT` já têm script (`src/cards/tokens.ts`).
  Campo com `bfSetup` precisa de `bfTeardown`.
- **Nomear** (759-763): `yield* g.nameTagG(p, prompt, só?)`, `g.nameCardG(p, prompt, filtro?)` (devolve o nome),
  `g.nameTypeG(p, prompt)`. **Tag ganha**: `g.giveTag(obj, tag)`; `g.hasTag` já a vê. `g.buff` devolve se buffou.
- **Outros ganchos (lote legends)**: `CardScript.repeatMore` (várias instâncias impressas de Repeat, Curtain Call);
  `adds.onlyShowdown` (energia "só durante showdowns", `pool.showdownOnly`, Diana); `TempEffect.playCostMod` ("suas
  unidades não-ficha custam [1] a mais neste turno", Vaults of Helia); flag de efeito `cantPlaySpells` (Lilting
  Lullaby); `DeathReplacement.controller` (quem decide a substituição, Altar of Blood); `entersReady(g, self, loc)`
  (Shadow); `g.dealSplit(..., byUnit)` (a unidade divide o dano, sem Bonus Damage: Alpha Strike); `targets` em função é
  recalculado a cada alvo escolhido.
- **Jogar ficha de unidade** (lote mind): sempre `yield* g.playTokenG(...)` (ou `g.playTokensG`, que devolve todas as
  fichas jogadas): é ali que valem as substituições `CardScript.tokenPlayReplace` (Zilean, Time Mage: "jogue a ficha e
  mais uma cópia"). `createToken` direto só para fichas de gear (Gold) ou "criar" (439). Instrução seguinte que fala
  "dela/delas" (Arise!, Guards!) vale para todas as fichas devolvidas por `playTokensG` (regra 375). No texto de efeito
  (Svellsongur) a substituição é outra instância (`EffectText.tokenPlayReplace`, com o próprio "uma vez por turno").
- Outros ganchos do lote mind: evento `showdownStart` (Diana, Lunari); `ev.nth` no evento `draw` (n-ésima compra do
  turno, Frigid Jewel); `TriggerDef.immediate` (gatilho de [Add] resolve ao finalizar, 429.2); `Aura.noTemporary`
  (LeBlanc, Everywhere at Once); `CardScript.altCost` ("you may play me for [C]", Jhin) e `pl[p].bigSpell` (gastou [4]+
  num spell neste turno).

### Ganchos de custos e recursos (Vendetta/Radiance, rodada 2)
- **[Empower]** (827): só `empower:` no script — custo fixo, `{ cost (fixo ou função = texto que altera o custo),
  exhaustSelf, extra: { label, canPay, pay }, max (Kayle), timing }` ou uma lista (várias instâncias, "[1] or [Body]").
  `registerCard` cria a habilidade ativada de verdade (`ActivatedDef.empower`): pilha, evento `activate` (com `energy`,
  `empower`), descontos de habilidade. Nunca escreva a ativada de Empower à mão.
- **Custo de habilidade ativada**: `Aura.abilityCostMod` (CostMod: energyMore/energyLess/energyMin/powerMore/powerLess/
  either; Risen Altar, Piltovan Forge); `g.activationsThisTurn(p, 'gearAbility')`.
- **Power no custo de qualquer carta**: `Aura.cardCostMod` (Mystic Vortex, Orianna, Mechanical Marvel), `TempEffect.powerLess`
  com `nextPlay` (Astral Heron, Boy Who Shattered Time), `Aura.onPaid` (desconto "uma vez por turno").
- **Recursos com restrição de uso**: `adds.only: PayUse[]` ('unit' | 'gear' | 'spell' | 'unitAbility' | 'gearAbility' |
  ...); o pool guarda as partes restritas em `pool.only`; o motor marca o uso do pagamento com `g.asPayFor(use, ...)`.
- **Custos adicionais de outra carta**: `Aura.locCost` (campo que só se usa pagando, Dragon Roost) e
  `Aura.grantOptionalCosts` (Starry-Eyed Songstress).
- **Zonas e fases**: `Aura.skipPhase`, `Aura.playFromTrash` (via 'trash', custo normal), `Aura.trashReplace` (Endless
  Riches), `Aura.channelLimit` (Sandstone Chimera). **Pilha**: `Aura.uncounterable`, `Aura.mightGiveMod` e
  `g.itemChose(item, o)` (Mel, Newly Awakened).

## Fidelidade às regras

Nenhuma carta tem simplificação: todas foram revisadas contra o texto oficial (com errata), as Core Rules e rulings
do RiftJudge, com a fonte citada nos comentários quando a decisão depende dela. O jogador faz todas as escolhas
que a regra dá a ele, inclusive como pagar (quais runas reciclar, Gold, fontes de [Add]) quando faz diferença.

Limitações que não são de regra:
- Online: as duas telas têm a partida inteira na memória (quem abrir as ferramentas do navegador consegue ver a mão
  do outro).
- A IA olha a própria jogada até a mesa assentar e, no Normal e no Difícil, segue as melhores jogadas pelo resto do
  turno (de forma gulosa). Não prevê o que o oponente fará no turno seguinte, além de uma estimativa simples de ameaça
  aos campos.
