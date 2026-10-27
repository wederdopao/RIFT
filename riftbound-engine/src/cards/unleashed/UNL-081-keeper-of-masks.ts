import { registerCard, type AbilityDef } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Hidden]. [Temporary]. Quando você me joga, jogue duas fichas de unidade Reflection aqui. Então faça isto: elas se
// tornam cópias de mim. (Errata de 03/04/2026: "Then do this".)
// - "Aqui" = o meu local na resolução (jogada a partir de Hidden: aquele campo). Se saí do tabuleiro, não tenho local, a
//   instrução de jogar é ignorada (359.3.e.12) e o "então faça isto" ligado a ela também (359.3.e.14.a).
// - "Então faça isto:" é gatilho reflexivo (387.1, 388): vai para a pilha depois que as fichas entraram, e dá para
//   responder a ele com elas ainda Reflection (FAQ oficial do Unleashed, Zilean + Deceiver: "the copy effect resolves
//   after the Reflection tokens have already resolved"). Guarda só ids (Delayed/cópia da IA).
// - "Me" é conferido quando o reflexivo resolve (359.3.f.2): se eu saí do tabuleiro, a informação é nula e a cópia é
//   ignorada (359.3.e.12; mesmo critério de Mirror Image, RiftJudge #10872) — as fichas ficam Reflection 0.
// - São duas jogadas de ficha: com Zilean, Time Mage (uma vez por turno) sai uma a mais, e as três viram cópias (a ficha
//   a mais herda as modificações seguintes, regra 375; RiftJudge #12467). Por isso playTokensG devolve todas.
// - Cópia (477.1.b): copia os traços copiáveis impressos (nome, tipo, tags, custo, domínio, texto de regras) e o Might
//   base; nada concedido ou acrescentado (buffs, Might temporário, gear) passa (RiftJudge #10591; patch notes do
//   Unleashed, "Copy Effects"). A cópia ganha o meu "Quando você me joga", mas as fichas não foram jogadas como Keeper e
//   não disparam de novo (RiftJudge #12467, #11575). Todas têm [Temporary].
// - Cópia pelo núcleo: g.becomeCopy (traços impressos + Might impresso; se eu for uma cópia, copia o que eu copio,
//   477.1.b.1.b). A ficha continua sendo ficha (185.1.a).
registerCard({
  code: 'UNL-081',
  keywords: { hidden: true, temporary: true },
  onPlay: [
    {
      label: 'Jogar duas Reflection aqui; então elas viram cópias de mim',
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board' || !c.self.loc) return g.say('Keeper of Masks não está mais em jogo: as Reflection não são jogadas.', c.p);
        const loc = c.self.loc;
        const toks: Obj[] = [];
        for (let k = 0; k < 2; k++) toks.push(...(yield* g.playTokensG('TOK-REFLECTION', c.p, loc)));
        const made = toks.filter((t) => t.zone === 'board').map((t) => ({ id: t.id, v: t.zoneVersion }));
        if (!made.length) return;
        const me = { id: c.self.id, v: c.self.zoneVersion };
        const reflex: AbilityDef = {
          label: 'as Reflection se tornam cópias de mim',
          resolve: function* (cc) {
            const gg = cc.g;
            const k = gg.objs[me.id];
            if (!k || k.zone !== 'board' || k.zoneVersion !== me.v) {
              gg.say('Keeper of Masks não está mais no tabuleiro: as Reflection não copiam nada.', cc.p);
              return;
            }
            for (const x of made) {
              const t = gg.objs[x.id];
              if (t && t.zone === 'board' && t.zoneVersion === x.v) gg.becomeCopy(t, k);
            }
          },
        };
        g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
      },
    },
  ],
});
