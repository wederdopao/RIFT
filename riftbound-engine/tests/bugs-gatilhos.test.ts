// Caça de bugs de gatilhos, durações e momento das coisas (interações menos comuns).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}

test('combate: gatilhos de conquista resolvem antes de o combate acabar (Assault ainda vale para Yone)', () => {
  // 466.5-466.7: os itens da pilha vindos de estabelecer o controle resolvem antes de "o combate acaba" (designações
  // e efeitos "neste combate"); RiftJudge #8706: o bônus de Assault continua quando os gatilhos de conquista resolvem.
  // A e B chegaram juntos a um campo sem controlador (combate encenado, A disputou o campo)
  const s = new Scenario();
  const y = s.put(0, 'SFD-116', BF0); // Yone 5
  s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  s.e.bfs[0].controller = null;
  s.e.bfs[0].contestedBy = 0;
  const foe = s.put(1, 'OGN-142', base(1)); // Mountain Drake 10, na base de B
  s.put(0, 'SFD-003', 'hand'); // Blood Rush
  s.runes(0, [RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Blood Rush');
  s.maybeObj(y);
  if (s.d.prompt.includes('Repeat')) s.pick('Não');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0, s.log(20));
  assert.equal(foe.damage, 7, 'Yone ainda é atacante (5 + Assault 2) quando a conquista resolve\n' + s.log(20));
});

test('combate aberto: o atacante põe os gatilhos na pilha primeiro, mesmo fora do turno dele (464.2.e.1)', () => {
  // B disputou um campo de A no turno de A (ex.: moveu com Relentless Pursuit no showdown de outro campo): B ataca.
  // Os gatilhos de ataque de B vão para a pilha antes dos de defesa de A, então os de A resolvem primeiro.
  const s = new Scenario();
  s.put(0, 'SFD-110', BF0); // Fiora, Peerless de A (defende)
  s.put(1, 'SFD-110', BF0); // Fiora, Peerless de B (ataca)
  s.e.bfs[0].controller = 0;
  s.e.bfs[0].contestedBy = 1;
  s.put(0, 'SFD-003', 'hand'); // Blood Rush: só para haver uma ação e a limpeza abrir o combate
  s.put(0, 'OGN-087', base(0));
  s.runes(0, [RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Blood Rush');
  s.pick('Lecturing Yordle');
  if (s.d.prompt.includes('Repeat')) s.pick('Não');
  s.passAll();
  const placed = s.e.log.filter((l) => l.text.startsWith('Na pilha: Fiora')).map((l) => l.player);
  assert.deepEqual(placed, [1, 0], 'B (atacante) põe primeiro; A (defensor) por cima\n' + s.log(15));
});

test('Temporary é gatilho (816.1): dá para responder antes de a unidade morrer (Deathgrip no Sprite)', () => {
  // "No início da Beginning Phase do controlador, antes de pontuar, mate isto" vai para a pilha junto com os outros
  // gatilhos de início de turno; enquanto está na pilha, o Sprite ainda está em jogo
  const s = new Scenario();
  const sprite = s.e.createToken('TOK-SPRITE', 0, base(0), true);
  const yordle = s.put(0, 'OGN-087', base(0)); // Lecturing Yordle 2
  s.put(0, 'SFD-163', 'hand'); // Deathgrip
  s.runes(0, ['OGN-214', 'OGN-214']); // Order
  s.go();
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.e.turn < 3; i++) {
    if (s.d.kind === 'action') s.pick('Encerrar o turno');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(s.e.turn, 3);
  // o Temporary e o gatilho da lenda (Jinx, Loose Cannon) disparam juntos: A escolhe a ordem (383.3.d)
  assert.match(s.d.prompt, /Vários efeitos/);
  s.pick('Jinx');
  assert.equal(sprite.zone, 'board', 'o Sprite ainda está em jogo com o Temporary na pilha\n' + s.log(10));
  assert.ok(s.e.chain.some((it) => it.sourceId === sprite.id), 'o Temporary está na pilha');
  s.pick('Jogar Deathgrip');
  s.maybeObj(sprite);
  s.maybeObj(yordle);
  s.passAll();
  assert.equal(sprite.zone === 'board', false);
  assert.equal(s.e.might(yordle), 2 + 3, 'o Yordle recebe o Might do Sprite\n' + s.log(15));
});

test('showdown sem combate: quem ficou sozinho no campo estabelece o controle, mesmo sem ter disputado (348.2.a)', () => {
  // A entra num campo vazio (showdown, A disputa). No showdown, B mata a unidade de A e move uma unidade dele para lá.
  // No fim do showdown só B tem unidades: B estabelece o controle e conquista.
  const s = new Scenario();
  const y = s.put(0, 'OGN-087', base(0)); // Lecturing Yordle 2
  const pup = s.put(1, 'OGN-136', base(1)); // Pit Rookie de B
  s.put(1, 'OGN-024', 'hand'); // Void Seeker
  s.put(1, 'SFD-184', 'hand'); // Relentless Pursuit
  s.runes(1, Array(10).fill(RUNE.fury));
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  if (s.d.player === 0 && s.d.kind === 'focus') s.pick('Passar'); // A passa o Focus
  s.pick('Jogar Void Seeker', 1);
  s.maybeObj(y);
  for (let i = 0; i < 4 && s.d.kind === 'priority'; i++) s.pick('Passar');
  assert.equal(y.zone, 'trash', s.log(10));
  if (s.d.player === 0 && s.d.kind === 'focus') s.pick('Passar');
  s.pick('Jogar Relentless Pursuit', 1);
  s.maybeObj(pup);
  for (let i = 0; i < 4 && s.d.kind === 'choose'; i++) {
    if (s.d.prompt.includes('para onde')) s.pick('Campo Vazio A');
    else s.ok([]);
  }
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 1, 'B estabelece o controle\n' + s.log(15));
  assert.equal(s.e.pl[1].points, 1, 'e conquista');
  // no fim do mesmo showdown, sem abrir outro (que daria a A mais uma janela de Focus)
  assert.equal(s.e.log.filter((l) => l.text.startsWith('Showdown em')).length, 1, s.log(15));
});

test('unidade que sai do tabuleiro e volta no mesmo combate é outro objeto: ganha a designação e dispara "ataca" de novo', () => {
  // 383.4.e.2.a (uma vez por combate) vale para o mesmo objeto; voltar do tabuleiro para a mão faz um objeto novo (124,
  // 359.3.e.4). Rengar, Pouncing entra no campo que A ataca, volta para a mão (Retreat) e entra de novo.
  const s = new Scenario();
  const ahri = s.e.newObj('OGN-255', 1, 'legend'); // B: quando uma unidade inimiga ataca um campo seu, -1 de Might
  s.e.pl[1].legend = ahri.id;
  s.put(1, 'OGN-142', BF0); // Mountain Drake de B: B controla o campo
  const y = s.put(0, 'OGN-087', base(0));
  s.put(0, 'SFD-025', 'hand'); // Rengar, Pouncing
  s.put(0, 'OGN-104', 'hand'); // Retreat
  s.runes(0, [...Array(10).fill(RUNE.fury), ...Array(2).fill('OGN-089')]);
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  const actA = (label: string) => {
    for (let i = 0; i < 10 && !(s.d.player === 0 && s.d.options.some((o) => o.label.includes(label))); i++) {
      if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
      else s.ok([s.d.options[0].id]);
    }
    s.pick(label, 0);
  };
  actA('Jogar Rengar');
  if (s.d.prompt.includes('onde')) s.pick('Campo Vazio A');
  const rengar = s.e.units().find((u) => u.code === 'SFD-025')!;
  actA('Jogar Retreat');
  s.maybeObj(rengar);
  for (let i = 0; i < 4 && s.d.kind === 'priority'; i++) s.pick('Passar');
  assert.equal(rengar.zone, 'hand', s.log(15));
  actA('Jogar Rengar');
  if (s.d.prompt.includes('onde')) s.pick('Campo Vazio A');
  for (let i = 0; i < 4 && s.d.kind === 'priority'; i++) s.pick('Passar');
  const ahriTriggers = s.e.log.filter((l) => l.text.startsWith('Na pilha: Ahri')).length;
  assert.equal(ahriTriggers, 3, 'Yordle, Rengar e o Rengar que voltou\n' + s.log(25));
});

test('gatilhos do despertar resolvem no despertar, antes dos gatilhos do início da Beginning Phase (319.2, 335)', () => {
  // Irelia, Fervent exaurida é preparada no despertar ("quando você me prepara": +1 de Might). Esse gatilho vai para a
  // pilha e resolve antes de a fase de início começar; não se mistura com o gatilho da lenda (Jinx, Loose Cannon).
  const s = new Scenario();
  const irelia = s.put(0, 'SFD-057', base(0), { ready: false });
  s.go();
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.e.turn < 3; i++) {
    if (s.d.kind === 'action') s.pick('Encerrar o turno');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.doesNotMatch(s.d.prompt, /Vários efeitos/, 'os gatilhos não disparam juntos\n' + s.log(10));
  const t3 = s.e.log.filter((l) => l.turn === 3).map((l) => l.text);
  const ir = t3.findIndex((x) => x.startsWith('Resolve: Irelia'));
  const jx = t3.findIndex((x) => x.startsWith('Na pilha: Jinx'));
  assert.ok(ir >= 0 && jx > ir, 'o +1 da Irelia resolve antes de o gatilho da lenda ir para a pilha\n' + t3.join('\n'));
  assert.equal(s.e.might(irelia), 4 + 1);
});

test('gatilho que não vai para a pilha (Deflect recusado) não conta como escolha (Ezreal, Prodigal Explorer)', () => {
  // 383.3.a.2/383.3.b.1: gatilho não finalizado é removido e considerado não disparado; 383.4.b.2: "escolher" só vale
  // para o spell/habilidade finalizado
  const s = new Scenario();
  const leg = s.e.newObj('SFD-199', 0, 'legend');
  s.e.pl[0].legend = leg.id;
  s.put(1, 'SFD-148', BF0); // Draven, Audacious (Deflect) de B
  s.put(0, 'OGN-149', 'hand'); // Carnivorous Snapvine
  s.runes(0, Array(8).fill(RUNE.body));
  s.go();
  s.pick('Jogar Carnivorous Snapvine');
  for (let i = 0; i < 6 && !s.d.prompt.includes('Deflect'); i++) {
    if (s.d.prompt.includes('Accelerate')) s.pick('Não');
    else if (s.d.prompt.includes('onde')) s.pick('base de A');
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.match(s.d.prompt, /Deflect/);
  s.pick('Não');
  s.passAll();
  const enemies = (s.e.pl[0].chooseLog || []).reduce((n, x) => n + (x.enemies ?? 0), 0);
  assert.equal(enemies, 0, 'a escolha do gatilho recusado não conta\n' + s.log(10));
});

test('gatilho que não vai para a pilha não dispara "quando você me escolhe" (Irelia, Fervent)', () => {
  // Fae Porter: "você pode pagar [Caos] para mover uma unidade sua": a unidade é escolhida ao finalizar, mas sem pagar o
  // custo o gatilho não é finalizado (383.3.b.1) e nada foi escolhido (383.4.b.2)
  const s = new Scenario();
  const porter = s.put(0, 'SFD-125', base(0));
  const irelia = s.put(0, 'SFD-057', base(0));
  s.go();
  moveTo(s, [porter.id], 'Campo Vazio A');
  for (let i = 0; i < 6 && s.d.kind !== 'action'; i++) {
    if (s.d.prompt.includes('Fae Porter') && s.d.prompt.includes('Pagar')) s.pick('Sim');
    else if (s.d.options.some((o) => o.obj === irelia.id)) s.pickObj(irelia);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(s.e.might(irelia), s.e.data(irelia).might, 'Irelia não ganha +1\n' + s.log(10));
});
