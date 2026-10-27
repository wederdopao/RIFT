// Monta cenários de teste: começa uma partida, pula o mulligan e permite montar o tabuleiro à mão.
import '../src/cards';
import { Game } from '../src/engine/game';
import { JINX_PRECON, LEE_SIN_PRECON } from '../src/decks/origins';
import type { Loc, Obj, P } from '../src/engine/types';
import type { Engine } from '../src/engine/engine';

export class Scenario {
  g: Game;
  constructor(seed = 1) {
    this.g = new Game({
      seed,
      decks: [JINX_PRECON, LEE_SIN_PRECON],
      names: ['A', 'B'],
      firstPlayer: 0,
      battlefieldMode: 'random',
    });
    // mulligans: nenhum
    while (this.g.current?.kind === 'mulligan') this.ok([]);
    // limpa mãos e runas para montar o cenário; troca os campos por campos vazios
    const e = this.e;
    e.bfs[0].objId = e.newObj('TOK-BFA', 0, 'battlefieldZone').id;
    e.bfs[1].objId = e.newObj('TOK-BFB', 1, 'battlefieldZone').id;
    for (const p of [0, 1] as P[]) {
      for (const id of [...e.pl[p].hand]) e.toZone(e.objs[id], 'mainDeck', { bottom: true });
      for (const r of e.runesOf(p)) e.toZone(r, 'runeDeck', { bottom: true });
    }
  }
  /** Depois de montar o cenário, recalcula as opções da decisão atual. */
  go() {
    this.g.refresh();
    return this;
  }
  get e(): Engine {
    return this.g.engine;
  }
  get d() {
    return this.g.current!;
  }
  ok(ans: string[]) {
    const r = this.g.answer(ans);
    if (!r) throw new Error('resposta recusada: ' + this.g.error + ' | decisão: ' + this.d.prompt + ' ' + JSON.stringify(this.d.options));
    // "Como pagar?": por padrão os testes aceitam o plano automático (1ª opção); `payChoice` escolhe outro
    while (this.autoPay && this.g.current && /^Como pagar \d/.test(this.g.current.prompt)) {
      const want = this.payChoice ? this.g.current.options.find((o) => o.label.includes(this.payChoice!)) : undefined;
      this.payChoice = undefined;
      this.g.answer([(want ?? this.g.current.options[0]).id]);
    }
  }
  /** Responder sozinho às perguntas "Como pagar?" (padrão: sim). */
  autoPay = true;
  /** Texto da opção de pagamento a escolher na próxima pergunta "Como pagar?". */
  payChoice?: string;
  /** Coloca uma carta (nova) numa zona. */
  put(p: P, code: string, where: 'hand' | Loc | 'trash' | 'deckTop', opts: { ready?: boolean } = {}): Obj {
    const e = this.e;
    const o = e.newObj(code, p, 'setAside');
    if (where === 'hand') e.toZone(o, 'hand');
    else if (where === 'trash') e.toZone(o, 'trash');
    else if (where === 'deckTop') e.toZone(o, 'mainDeck');
    else {
      e.putOnBoard(o, where, opts.ready ?? true);
      if (where.t === 'bf') {
        const b = e.bfs[where.i];
        if (b.controller === null) b.controller = p;
      }
    }
    return o;
  }
  /** Dá runas prontas ao jogador. */
  runes(p: P, codes: string[]) {
    for (const c of codes) this.put(p, c, { t: 'base', p }, { ready: true });
  }
  /** Responde escolhendo a opção cujo rótulo contém o texto. */
  pick(text: string | RegExp, who?: P) {
    const d = this.d;
    if (who !== undefined && d.player !== who) throw new Error(`esperava decisão de ${who}, veio de ${d.player}: ${d.prompt}`);
    const o = d.options.find((x) => (typeof text === 'string' ? x.label.includes(text) || x.id === text : text.test(x.label)));
    if (!o) throw new Error(`opção "${text}" não encontrada em: ${d.prompt} → ${d.options.map((x) => x.label).join(' | ')}`);
    this.ok([o.id]);
  }
  pickObj(o: Obj) {
    const opt = this.d.options.find((x) => x.obj === o.id || x.id === o.id);
    if (!opt) throw new Error(`objeto ${this.e.name(o)} não está nas opções de: ${this.d.prompt} → ${this.d.options.map((x) => x.label).join(' | ')}`);
    this.ok([opt.id]);
  }
  /** Escolhe o objeto se ele estiver sendo perguntado (com um só candidato a escolha é automática). */
  maybeObj(o: Obj) {
    if (!this.d.root && this.d.options.some((x) => x.obj === o.id || x.id === o.id)) this.pickObj(o);
  }
  /** Passa enquanto a decisão for de passar (pilha/showdown). */
  passAll(max = 20) {
    for (let i = 0; i < max && this.g.current; i++) {
      if (this.d.kind === 'priority' || this.d.kind === 'focus') this.pick('Passar');
      else if (this.d.prompt.startsWith('Distribuir dano')) this.ok([this.d.options[0].id]);
      else break;
    }
  }
  log(n = 15) {
    return this.e.log.slice(-n).map((l) => l.text).join('\n');
  }
}

export const RUNE = { fury: 'OGN-007', calm: 'OGN-042', body: 'OGN-126', chaos: 'OGN-166' };
