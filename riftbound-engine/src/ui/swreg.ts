// Só no site: registra o service worker (src/sw.js), que guarda a página, o código, as fontes e as artes para a mesa
// abrir na hora a partir da segunda visita. Quando ele percebe que o site foi atualizado, aparece um aviso pequeno no
// canto ("Nova versão") — sem recarregar sozinho no meio de uma partida.
export function registerSw() {
  const W = window as unknown as { __RB_ART_FILES__?: boolean };
  if (!W.__RB_ART_FILES__ || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.rb !== 'nova-versao' || document.querySelector('.rb-update')) return;
    const bar = document.createElement('div');
    bar.className = 'rb-update';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>Nova versão do site</span><button type="button">Atualizar</button><button type="button" aria-label="Depois">✕</button>';
    const btns = bar.querySelectorAll('button');
    const upd = btns[0];
    const later = btns[1];
    upd.addEventListener('click', () => location.reload());
    later.addEventListener('click', () => bar.remove());
    document.body.appendChild(bar);
  });
  // a página veio do cache? o service worker diz se a conferência na rede achou versão nova
  navigator.serviceWorker.controller?.postMessage({ rb: 'check' });
  const go = () => navigator.serviceWorker.register('sw.js').catch(() => {});
  if (document.readyState === 'complete') setTimeout(go, 1500);
  else addEventListener('load', () => setTimeout(go, 1500), { once: true });
}
