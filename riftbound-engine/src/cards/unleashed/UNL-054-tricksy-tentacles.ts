import { registerCard, type Ctx, type TargetSpec } from '../../engine/script';
import type { Loc, Obj } from '../../engine/types';

// Mova qualquer número de unidades inimigas com o mesmo controlador e Might total 8 ou menos para um único local.
// - As unidades são alvos, escolhidas ao jogar (355.7), em qualquer número, inclusive zero (355.13). "Mesmo controlador"
//   e "Might total 8 ou menos" são restrições do grupo (355.11): a escolha é feita uma a uma, oferecendo só o que mantém
//   o grupo válido (355.16).
// - O local único é o destino do movimento, escolhido ao jogar (355.4): um campo ou a base do controlador delas (é o
//   único lugar de base onde elas podem estar, 355.4.a); tem de ser outro que o local de pelo menos uma delas.
// - Na resolução, se o grupo que continua válido não cumpre mais a restrição (Might aumentou, controle mudou), o
//   controlador do spell escolhe um subconjunto que cumpra (355.11.b).
const MAX = 8;
const chosenSoFar = (c: Ctx) => c.targets.flat();
const groupOk = (c: Ctx, o: Obj) => {
  const prev = chosenSoFar(c);
  if (c.targets.length && !c.targets[c.targets.length - 1].length) return false; // parou de escolher
  if (prev.some((x) => x.id === o.id)) return false;
  if (prev.length && prev[0].controller !== o.controller) return false;
  return prev.reduce((s, x) => s + c.g.might(x), 0) + c.g.might(o) <= MAX;
};
const spec = (k: number): TargetSpec => ({
  prompt: k === 0 ? 'Tricksy Tentacles: mover qual unidade inimiga? (qualquer número; nenhuma para parar)' : 'Tricksy Tentacles: mais uma unidade inimiga? (nenhuma para parar)',
  min: 0,
  max: 1,
  // na resolução (c.item existe) cada alvo só precisa continuar sendo unidade inimiga; o grupo é conferido no resolve
  filter: (c, o) => o.controller !== c.p && (!!c.item || groupOk(c, o)),
});
registerCard({
  code: 'UNL-054',
  spell: {
    label: 'Tricksy Tentacles',
    targets: (c) => {
      const n = c.item ? c.item.targetIds.length : c.g.units().filter((u) => u.controller !== c.p).length;
      return Array.from({ length: Math.max(1, n) }, (_, k) => spec(k));
    },
    choose: function* (c, ids) {
      const g = c.g;
      const us = ids.flat().map((id) => g.objs[id]).filter(Boolean);
      if (!us.length) return true;
      const ctrl = us[0].controller;
      const locs: Loc[] = [{ t: 'base', p: ctrl }, ...g.bfs.map((_, i) => ({ t: 'bf', i }) as Loc)];
      const dests = locs.filter((l) => us.some((u) => !g.locEq(u.loc, l)));
      const [k] = yield* g.ask(
        c.p,
        'choose',
        'Tricksy Tentacles: para qual local mover essas unidades?',
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      let us = c.targets.flat().filter((u) => u.zone === 'board');
      if (!to || !us.length) return;
      const total = (xs: Obj[]) => xs.reduce((s, x) => s + g.might(x), 0);
      if (new Set(us.map((u) => u.controller)).size > 1 || total(us) > MAX) {
        // 355.11.b: subconjunto que cumpra a restrição, escolhido uma a uma
        const keep: Obj[] = [];
        for (;;) {
          const cands = us.filter((u) => !keep.includes(u) && (!keep.length || keep[0].controller === u.controller) && total(keep) + g.might(u) <= MAX);
          if (!cands.length) break;
          const [pick] = yield* g.chooseObj(c.p, `Tricksy Tentacles: o grupo passou de ${MAX} de Might — qual unidade continua sendo movida? (nenhuma para parar)`, cands, 0, 1);
          if (!pick) break;
          keep.push(pick);
        }
        us = keep;
      }
      if (!us.length) return;
      const ctrl = us[0].controller;
      const dest: Loc = to.t === 'base' ? { t: 'base', p: ctrl } : to;
      // custo aplicado ao movimento (Mageseeker Investigator): quem move escolhe pagar; sem pagar, não move (204.4.b-c)
      yield* g.moveUnitsG(us, dest, c.p);
    },
  },
});
