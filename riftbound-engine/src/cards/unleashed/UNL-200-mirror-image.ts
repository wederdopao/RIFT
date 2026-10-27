import { registerCard, type AbilityDef } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Signature Spell (LeBlanc), com errata: escolha uma unidade. Jogue uma ficha de unidade Reflection pronta na sua base.
// Então faça isto: ela se torna uma cópia daquela unidade. Dê [Temporary] a ela.
// - A unidade é alvo (ao jogar): qualquer unidade, inclusive inimiga ou ficha (RiftJudge #10554).
// - A Reflection é jogada mesmo se o alvo ficou ilegal (instrução independente). "Então faça isto:" é gatilho reflexivo
//   (387-388) sem alvo próprio: copia "aquela unidade" se ela continua no tabuleiro (o mesmo objeto); senão a cópia é
//   ignorada e a ficha fica uma Reflection 0 com [Temporary] (RiftJudge #10872, #11726; 359.3.e.6).
// - Cópia pelo núcleo (g.becomeCopy): traços impressos, Might impresso incluído (RiftJudge #10200).
registerCard({
  code: 'UNL-200',
  spell: {
    label: 'Mirror Image',
    targets: [{ prompt: 'Mirror Image: escolha uma unidade para copiar' }],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const src = c.targets[0]?.[0];
      const srcRef = src && src.zone === 'board' ? { id: src.id, v: src.zoneVersion } : undefined;
      // todas as fichas jogadas por esta instrução (a substituição do Zilean, Time Mage, joga cópias extras: FAQ oficial)
      const made = (yield* g.playTokensG('TOK-REFLECTION', c.p, { t: 'base', p: c.p }, true))
        .filter((o: Obj) => o.zone === 'board')
        .map((o) => ({ id: o.id, v: o.zoneVersion }));
      if (!made.length) return;
      const reflex: AbilityDef = {
        label: 'a Reflection se torna uma cópia daquela unidade e ganha [Temporary]',
        resolve: function* (cc) {
          const gg = cc.g;
          const s = srcRef && gg.objs[srcRef.id];
          const ok = !!s && s.zone === 'board' && s.zoneVersion === srcRef!.v;
          for (const x of made) {
            const t = gg.objs[x.id];
            if (!t || t.zone !== 'board' || t.zoneVersion !== x.v) continue;
            if (ok) gg.becomeCopy(t, s!);
            else gg.say('Mirror Image: aquela unidade não está mais no tabuleiro; a Reflection não copia nada.', cc.p);
            gg.addEffect({ target: t.id, kw: { temporary: true }, until: 'perm' });
            gg.say(`${gg.name(t)} ganha [Temporary].`);
          }
        },
      };
      g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
    },
  },
});
