import { registerCard } from '../../engine/script';
import { moveDestinations } from '../helpers';
// Action: mova uma unidade aliada e prepare-a.
// O destino é escolhido ao jogar, depois do alvo (regra 355.4), pelo gancho `choose`. Um destino que uma restrição
// impede (Vilemaw's Lair) ainda pode ser escolhido; na resolução o movimento é ignorado e a unidade ainda é preparada
// (exemplo da regra 359.3.e.6).
registerCard({
  code: 'OGN-173',
  keywords: { action: true },
  spell: {
    label: 'Ride the Wind',
    targets: [{ prompt: 'Ride the Wind: mover e preparar qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return false;
      const dests = moveDestinations(c, u); // outro local onde a unidade pode estar (355.4.a)
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Ride the Wind: mover ${g.name(u)} para onde?`,
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      // caça UNL: um destino por execução (c.rep), também com dois ou mais Repeats dados por efeito (820.3)
      c.data[`rtwDest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.moveUnits([u], c.data[`rtwDest${c.rep}`], c.p);
      c.g.ready(u, c.p);
      c.g.say(`${c.g.name(u)} fica pronta.`, c.p);
    },
  },
});
