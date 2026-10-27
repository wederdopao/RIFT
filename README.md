# RIFT — Riftbound Mesa

Mesa de Riftbound (1x1) no navegador: motor de regras completo, IA adversária, online, deckbuilder e replay.
Projeto de fã, sem fins comerciais ("Legal Jibber Jabber" da Riot).

| Pasta / arquivo | O que é |
|---|---|
| `riftbound-engine/` | O código: motor, cartas, interface, testes. Detalhes em `riftbound-engine/README.md`; para retomar o trabalho, `riftbound-engine/CONTINUAR.md`. |
| `riftbound-mesa-site/site/` | O site pronto. Para jogar online, arraste a pasta `site` no [Netlify Drop](https://app.netlify.com/drop). |
| `riftbound-mesa.html` | Versão offline: abre direto no navegador, sem internet. |

Depois de mudar o código, atualize o site e a versão offline:

```bash
cd riftbound-engine
npm install
npm test           # testes de regra
npm run publicar   # build + copia para riftbound-mesa-site/site e riftbound-mesa.html
```
