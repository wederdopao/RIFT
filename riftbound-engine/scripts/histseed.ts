// Gera um localStorage com uma conta, dois decks (cópias dos starters) e partidas terminadas no histórico — para
// testes e para os prints das telas de Histórico/Estatísticas (scripts/menushot.mjs com HIST_SEED=<arquivo>).
//   npx tsx scripts/histseed.ts <arquivo.json> [partidas]
import fs from 'node:fs';

/** localStorage de mentira (Node), com limite opcional de tamanho para simular falta de espaço. */
export function fakeStorage(limit = Infinity) {
  const m = new Map<string, string>();
  const st = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      let size = 0;
      for (const [k2, v2] of m) if (k2 !== k) size += k2.length + v2.length;
      if (size + k.length + v.length > limit) throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
      m.set(k, String(v));
    },
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    dump: () => Object.fromEntries(m),
  };
  (globalThis as any).localStorage = st;
  return st;
}

/** Joga `n` partidas aleatórias (Jinx × Lee Sin) e grava no histórico da conta, como a interface faz no fim. */
export async function seedHistory(n: number, from = 100) {
  const acc = await import('../src/ui/account');
  const hist = await import('../src/ui/history');
  const { DECKS } = await import('../src/decks/origins');
  const { playRandom } = await import('../tests/sim');
  const mine = DECKS.map((d, i) => {
    const sd = acc.fromDeckList(d, `${d.name.split(' (')[0]} (meu)`);
    acc.saveDeck(sd);
    return { sd, i };
  });
  const byLegend = (legend: string) => mine.find((m) => m.sd.legend === legend)!;
  for (let s = 1; s <= n; s++) {
    const r = playRandom(from + s);
    if (r.winner === null) continue;
    const decks = r.g.cfg.decks;
    const prefer: [string, string] = [`my:${byLegend(decks[0].legend).sd.id}`, `my:${byLegend(decks[1].legend).sd.id}`];
    await new Promise<void>((res) => {
      // online: a conta às vezes é o convidado (lado 1)
      hist.recordGame(r.g, { mode: s % 3 === 0 ? 'online' : s % 4 === 0 ? 'human' : 'ai', seat: s % 3 === 0 ? 1 : 0, prefer }, res);
      setTimeout(res, 3000);
    });
  }
  return { acc, hist, mine };
}

if (process.argv[1]?.endsWith('histseed.ts')) {
  const out = process.argv[2] || '/tmp/histseed.json';
  const st = fakeStorage();
  void (async () => {
    await import('../src/cards');
    await seedHistory(Number(process.argv[3] || 6));
    fs.writeFileSync(out, JSON.stringify(st.dump()));
    console.log('ok', out);
  })();
}
