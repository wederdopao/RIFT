import { registerCard } from '../../engine/script';

// Se uma unidade aliada morreu durante a sua fase de início neste turno, eu entro pronta.
// "Sua fase de início neste turno": só existe no seu turno (a fase de início é do jogador do turno). O motor marca o
// turno em que uma unidade de cada jogador morreu na fase de início (PlayerState.beginDeathTurn; ex.: Temporary).
registerCard({
  code: 'UNL-037',
  entersReady: (g, self) => g.active === self.controller && g.pl[self.controller].beginDeathTurn === g.turn,
});
