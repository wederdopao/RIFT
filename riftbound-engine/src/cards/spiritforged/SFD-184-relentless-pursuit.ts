import { registerCard } from '../../engine/script';
import { moveDestinations } from '../helpers';
import type { Loc } from '../../engine/types';
// Action (com errata). Mova uma unidade aliada. Você pode prender nela até um Equipamento com o mesmo controlador. Neste
// turno, essa unidade tem "Quando eu conquisto, você pode me mover para a minha base."
// - A unidade e o Equipamento (0 ou 1) são alvos escolhidos ao jogar (regra 355.7); o destino do movimento também é
//   escolhido ao jogar (regra 355.4). O Equipamento tem de ter o mesmo controlador da unidade. O "você pode" de
//   prender é decidido na resolução.
// - Prender não é Equip nem movimento (regra 434.4.a). A habilidade concedida vale só neste turno e só para aquele
//   objeto (se a unidade sair do tabuleiro, é outro objeto, regra 124).
registerCard({
  code: 'SFD-184',
  keywords: { action: true },
  spell: {
    label: 'Relentless Pursuit',
    targets: [
      {
        prompt: 'Relentless Pursuit: mover qual unidade aliada?',
        filter: (c, o) => o.controller === c.p && moveDestinations(c, o).length > 0,
      },
      {
        prompt: 'Relentless Pursuit: prender qual Equipamento nela? (até 1)',
        kind: 'gear',
        min: 0,
        max: 1,
        filter: (c, o) => {
          const u = c.targets[0]?.[0];
          return !!u && c.g.data(o).tags.includes('Equipment') && o.controller === u.controller;
        },
      },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const dests = moveDestinations(c, u);
      if (!dests.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Relentless Pursuit: mover ${g.name(u)} para onde?`,
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      if (!u || u.zone !== 'board') return;
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      if (to) g.moveUnits([u], to.t === 'base' ? { t: 'base', p: u.controller } : to, c.p);
      // "você pode prender": o Equipamento é escolhido ao jogar; se prende ou não, na resolução
      const eq = c.targets[1]?.[0];
      if (eq && eq.zone === 'board' && eq.controller === u.controller && eq.attachedTo !== u.id &&
        (yield* g.yesNo(c.p, `Relentless Pursuit: prender ${g.name(eq)} em ${g.name(u)}?`)))
        g.attach(eq, u, c.p);
      const ver = u.zoneVersion;
      const uid = u.id; // id, não o objeto: a cópia da IA reaproveita estas funções (ver Delayed)
      g.say(`Neste turno, ${g.name(u)} tem "Quando eu conquisto, você pode me mover para a minha base".`, c.p);
      g.addDelayed({
        controller: u.controller,
        sourceId: u.id,
        on: 'conquer',
        once: false,
        untilTurn: g.turn,
        cond: (cc, ev) => {
          const u = cc.g.objs[uid];
          return u.zone === 'board' && u.zoneVersion === ver && ev.player === u.controller && (ev.units || []).includes(u.id);
        },
        ability: {
          label: 'Mover-me para a minha base',
          optional: `Mover ${g.name(u)} para a base?`,
          resolve: function* (cc) {
            const u = cc.g.objs[uid];
            if (u.zone !== 'board' || u.zoneVersion !== ver) return;
            cc.g.moveUnits([u], { t: 'base', p: u.controller }, u.controller);
          },
        },
      });
    },
  },
});
