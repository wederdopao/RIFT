import { registerCard, type AbilityDef } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Lenda (com errata): quando você conquista ou segura, você pode descartar 1 e me exaurir para jogar uma ficha de unidade
// Reflection pronta lá. Então faça isto: ela se torna uma cópia de outra unidade lá. Dê [Temporary] a ela.
// - "Descartar 1 e me exaurir para" é custo dentro da instrução (355.10.c.1), pago ao pôr o gatilho na pilha; "você pode"
//   decide se ele vai (FAQ oficial do Unleashed). "Lá" = o campo pontuado.
// - "Então faça isto:" é gatilho reflexivo (387-388): vai para a pilha depois que a ficha entrou, e a "outra unidade lá"
//   é alvo escolhido nesse momento (FAQ oficial do Unleashed, Deceiver e Zilean: "copy a unit, chosen during
//   finalization"). "Ela" são as fichas jogadas por esta instrução (com o Zilean, Time Mage, duas — ambas viram cópias).
// - Cópia (núcleo g.becomeCopy): traços impressos do alvo, Might impresso incluído (RiftJudge #10200, #10554); a cópia não
//   foi "jogada", então "quando você me joga" não dispara (#10386). Se o alvo ficou ilegal, a cópia não acontece e a ficha
//   continua uma Reflection 0, mas ganha [Temporary] do mesmo jeito (#10346; 359.3.e.6). [Temporary] dado é permanente.
registerCard({
  code: 'UNL-199',
  triggers: [
    {
      on: ['conquer', 'hold'],
      label: 'Jogar uma Reflection pronta lá',
      optional: 'descartar 1 e exaurir a LeBlanc para jogar uma ficha Reflection pronta neste campo?',
      cond: (c, ev) => ev.player === c.p && ev.bf !== undefined && !c.self.exhausted && c.g.pl[c.p].hand.length > 0,
      extraCost: function* (c) {
        const g = c.g;
        if (c.self.exhausted || !g.pl[c.p].hand.length) return false;
        yield* g.discard(c.p, 1, 'LeBlanc, Deceiver: descarte 1');
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const i = c.ev!.bf as number;
        // todas as fichas jogadas por esta instrução (a substituição do Zilean, Time Mage, joga cópias extras: FAQ oficial)
        const made = (yield* g.playTokensG('TOK-REFLECTION', c.p, { t: 'bf', i }, true))
          .filter((o: Obj) => o.zone === 'board')
          .map((o) => ({ id: o.id, v: o.zoneVersion }));
        if (!made.length) return;
        const ids = made.map((x) => x.id);
        const reflex: AbilityDef = {
          label: 'a Reflection se torna uma cópia de outra unidade lá e ganha [Temporary]',
          alwaysResolve: true,
          targets: [
            {
              prompt: 'LeBlanc, Deceiver: a Reflection se torna uma cópia de qual outra unidade neste campo?',
              filter: (cc, o) => !ids.includes(o.id) && cc.g.bfIndex(o) === i,
            },
          ],
          resolve: function* (cc) {
            const gg = cc.g;
            const src = cc.targets[0]?.[0];
            for (const x of made) {
              const t = gg.objs[x.id];
              if (!t || t.zone !== 'board' || t.zoneVersion !== x.v) continue;
              if (src && src.zone === 'board') gg.becomeCopy(t, src);
              gg.addEffect({ target: t.id, kw: { temporary: true }, until: 'perm' });
              gg.say(`${gg.name(t)} ganha [Temporary].`);
            }
          },
        };
        g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
      },
    },
  ],
});
