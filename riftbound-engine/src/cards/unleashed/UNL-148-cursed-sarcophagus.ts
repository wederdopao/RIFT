import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Gear. Quando você joga isto, bana todas as unidades do seu descarte. [Tap]: jogue uma unidade banida por isto. (Você
// tem de pagar os custos dela.)
// - As duas habilidades são ligadas (395, 397): a ativada só alcança unidades banidas pela 1ª habilidade DESTE objeto
//   (guardadas pelo id e pela versão de zona; se a carta sair do banimento e voltar, é outro objeto). Se o Sarcophagus
//   sair e voltar, é outro objeto e o vínculo recomeça.
// - Banir todas: sem escolha (355.10.d); unidades = cartas de unidade (inclusive campeões).
// - [Tap]: habilidade ativada sem Action/Reaction (fase principal do seu turno). A zona de banidas não está entre as
//   públicas de 355.10.a.1, então a unidade não é alvo: é escolhida na resolução, entre as que dá para pagar (custo
//   impresso + adicionais, 419.3.b). Sem nenhuma, nada acontece. Local: sua base ou um campo que você controla.
type Link = { ver: number; ids: [string, number][] };
const linked = (self: Obj): Link | undefined => (self.data?.sarc?.ver === self.zoneVersion ? self.data.sarc : undefined);
registerCard({
  code: 'UNL-148',
  onPlay: [
    {
      label: 'Banir todas as unidades do seu descarte',
      resolve: function* (c) {
        const g = c.g;
        const us = g.pl[c.p].trash.map((id) => g.objs[id]).filter((o) => g.isUnit(o));
        const prev = linked(c.self)?.ids || [];
        const ids: [string, number][] = [...prev];
        for (const u of us) {
          g.banishObj(u);
          ids.push([u.id, u.zoneVersion]);
        }
        if (c.self.zone === 'board') c.self.data = { ...(c.self.data || {}), sarc: { ver: c.self.zoneVersion, ids } };
        if (!us.length) g.say('Cursed Sarcophagus: não há unidades no seu descarte.', c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Exaurir: jogar uma unidade banida por isto (pagando o custo)',
      exhaustSelf: true,
      resolve: function* (c) {
        const g = c.g;
        // c.self pode ter saído do tabuleiro depois de ativar: o vínculo é o que a fonte tinha (dados guardados na ativação)
        const link: Link | undefined = c.data.link ?? linked(c.self);
        const cands = (link?.ids || []).map(([id, v]) => g.objs[id]).filter((o, k) => o && o.zone === 'banish' && o.zoneVersion === link!.ids[k][1]);
        const payable = cands.filter((o) => g.canPay(c.p, g.cheapestCost(c.p, o, { base: g.printedCost(o), add: { energy: 0, power: [] }, plain: [], post: [] })) && !g.playBlocked(c.p, o, 'effect'));
        if (!payable.length) return g.say('Cursed Sarcophagus: nenhuma unidade banida por ele que dê para jogar.', c.p);
        const [u] = yield* g.chooseObj(c.p, 'Cursed Sarcophagus: jogar qual unidade banida (pagando o custo)?', payable);
        if (u) yield* g.playFromEffect(c.p, u, g.printedCost(u));
      },
      prepare: function* (c) {
        c.data.link = linked(c.self); // ao ativar, antes de exaurir (o vínculo não muda com isso)
        return true;
      },
    },
  ],
});
