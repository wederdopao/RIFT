// Controlador da partida: mantém a corrotina do motor, valida respostas,
// desfaz jogadas (replay determinístico) e reverte ações ilegais.
import { Engine, type GameConfig } from './engine';
import { IllegalAction, type Answer, type Decision } from './types';

export class Game {
  engine!: Engine;
  answers: Answer[] = [];
  current: Decision | null = null;
  error: string | null = null;
  private gen!: Generator<Decision, void, Answer>;
  private rootIdx: number[] = []; // índice (em answers) de cada decisão raiz
  /** Quem deu cada resposta (para "cancelar" só desfazer escolhas do próprio jogador). */
  private by: number[] = [];

  constructor(public cfg: GameConfig) {
    this.rebuild([]);
  }

  /** Recria a partida do zero e reaplica as respostas. */
  private rebuild(answers: Answer[]) {
    this.engine = new Engine(this.cfg);
    this.gen = this.engine.run();
    this.answers = [];
    this.rootIdx = [];
    this.by = [];
    let r = this.gen.next(undefined as any);
    for (const a of answers) {
      if (r.done) break;
      if (r.value.root) this.rootIdx.push(this.answers.length);
      this.by.push(r.value.player);
      this.answers.push(a);
      r = this.gen.next(a);
    }
    this.current = r.done ? null : r.value;
  }

  get over() {
    return this.engine.winner !== null || this.current === null;
  }

  validate(a: Answer): string | null {
    const d = this.current;
    if (!d) return 'A partida acabou.';
    if (a.length < d.min || a.length > d.max) return `Escolha entre ${d.min} e ${d.max} opção(ões).`;
    if (new Set(a).size !== a.length) return 'Opção repetida.';
    for (const id of a) if (!d.options.some((o) => o.id === id)) return `Opção inválida: ${id}`;
    return null;
  }

  answer(a: Answer): boolean {
    this.error = this.validate(a);
    if (this.error) return false;
    const d = this.current!;
    if (d.root) this.rootIdx.push(this.answers.length);
    this.by.push(d.player);
    this.answers.push(a);
    try {
      const r = this.gen.next(a);
      this.current = r.done ? null : r.value;
      return true;
    } catch (e) {
      if (e instanceof IllegalAction) {
        // volta para a última decisão raiz (antes da ação ilegal)
        const msg = e.message;
        const back = this.rootIdx.length ? this.rootIdx[this.rootIdx.length - 1] : 0;
        this.rebuild(this.answers.slice(0, back));
        this.error = `Jogada ilegal: ${msg}`;
        return false;
      }
      throw e;
    }
  }

  /** Recalcula a decisão raiz atual (usado por testes/ferramentas depois de mexer no estado). */
  refresh() {
    if (!this.current?.root) return;
    this.by.push(this.current.player);
    this.answers.push(['__refresh']);
    const r = this.gen.next(['__refresh']);
    this.current = r.done ? null : r.value;
  }

  /** Índice (em answers) onde começa a última ação completa — o ponto para onde "desfazer" volta. */
  get lastRoot(): number | null {
    return this.rootIdx.length ? this.rootIdx[this.rootIdx.length - 1] : null;
  }

  get canCancel() {
    if (!this.current || this.current.root || !this.rootIdx.length) return false;
    // só cancela o que o próprio jogador da decisão respondeu (a pergunta de um gatilho do oponente no meio da sua
    // jogada não pode desfazer a sua jogada)
    const back = this.rootIdx[this.rootIdx.length - 1];
    const who = this.current.player;
    return this.by.slice(back).every((p) => p === who);
  }

  /** Cancela a ação em andamento (volta para a última decisão raiz). */
  cancel() {
    if (!this.canCancel) return;
    const back = this.rootIdx.length ? this.rootIdx[this.rootIdx.length - 1] : 0;
    this.rebuild(this.answers.slice(0, back));
  }

  /** Desfaz a última ação completa. */
  undo() {
    // Se estamos no meio de uma ação, isso a cancela; se estamos numa decisão raiz,
    // volta para a decisão raiz anterior (desfaz a ação anterior inteira).
    if (!this.rootIdx.length) return;
    const back = this.rootIdx[this.rootIdx.length - 1];
    this.rebuild(this.answers.slice(0, back));
  }

  serialize() {
    return JSON.stringify({ cfg: this.cfg, answers: this.answers });
  }

  static load(json: string): Game {
    const { cfg, answers } = JSON.parse(json);
    const g = new Game(cfg);
    g.rebuild(answers);
    return g;
  }
}
