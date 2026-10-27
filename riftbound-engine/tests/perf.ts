import { playRandom } from './sim';
const r = playRandom(7);
const t0 = performance.now();
r.g.undo();
const t1 = performance.now();
console.log('respostas', r.g.answers.length, 'turnos', r.turns, 'desfazer leva', (t1 - t0).toFixed(0), 'ms');
