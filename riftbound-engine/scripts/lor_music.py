# Baixa as músicas do Legends of Runeterra (wiki do League of Legends, página "Music (Legends of Runeterra)"): o tema
# de cada tabuleiro (a faixa do começo da partida, que toca em loop), o tema do menu/deckbuilder, a abertura e as de
# vitória e derrota. Grava assets/music/<id>.m4a (AAC 48 kbps) e assets/music/index.json.
# Uso (na pasta riftbound-engine): python3 scripts/lor_music.py
# Projeto de fã sem fins comerciais (política "Legal Jibber Jabber" da Riot); a música é da Riot Games.
import html, json, os, re, shutil, subprocess, urllib.request

WIKI = 'https://wiki.leagueoflegends.com'
OUT = 'assets/music'
# faixas fixas (fora dos tabuleiros)
FIXED = {'menu': ('LoR_SFX_069', 'Menu e deckbuilder'), 'start': ('LoR_SFX_068', 'Começo da partida'),
         'victory': ('LoR_SFX_064', 'Vitória'), 'defeat': ('LoR_SFX_057', 'Derrota')}
# tabuleiros com músicas licenciadas de outros artistas (K/DA) ficam de fora
SKIP = {'K/DA'}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'riftbound-mesa (fan project)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

page = get(f'{WIKI}/en-us/Music_(Legends_of_Runeterra)').decode('utf-8', 'replace')
sec = page[page.index('id="Board_Theme"'):page.index('id="Card_Theme"')]
parts = re.split(r'(<audio[^>]*data-mwtitle="LoR_SFX_\d+\.ogg"[^>]*>)', sec)
# cada faixa: (arquivo, título); o nome do próximo tabuleiro vem no fim do texto da faixa anterior ("... X Board Theme")
boards = {}
board = None
for k in range(1, len(parts), 2):
    f = re.search(r'data-mwtitle="(LoR_SFX_\d+)\.ogg"', parts[k]).group(1)
    after = re.sub(r'.*?</audio>', '', parts[k + 1], count=1, flags=re.S)
    text = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', after))).strip()
    heads = list(re.finditer(r'(?:^|\s)((?:\d+ )?[A-Z][\w\'/ .-]*?) Board Theme', text))
    title = text[:heads[0].start()].strip() if heads else text
    if board and board not in SKIP:
        boards.setdefault(board, []).append((f, title))
    if heads:
        # o trecho capturado começa com o fim do título da faixa ("Close to End", "Tie Theme"...) e às vezes um número
        board = heads[-1].group(1)
        board = re.sub(r'^(?:(?:Close to End|Tie Theme|Match Theme|Beginning|Middle|\d+)\s+)+', '', board).strip()

def fetch(fn, dst):
    if os.path.exists(dst):
        return True
    try:
        data = get(f'{WIKI}/en-us/images/{fn}.ogg')
    except Exception:
        return False
    tmp = dst + '.ogg'
    open(tmp, 'wb').write(data)
    ok = shutil.which('ffmpeg') and subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:a', 'aac', '-b:a', '48k', dst]).returncode == 0
    os.remove(tmp)
    return bool(ok)

os.makedirs(OUT, exist_ok=True)
index = {'fixed': {}, 'boards': []}
for key, (fn, name) in FIXED.items():
    if fetch(fn, f'{OUT}/{key}.m4a'):
        index['fixed'][key] = {'name': name, 'src': f'music/{key}.m4a'}
for name, tracks in boards.items():
    # a faixa do começo da partida (ou a primeira)
    fn = next((f for f, t in tracks if 'Beginning' in t), tracks[0][0])
    sid = slug(name)
    if fetch(fn, f'{OUT}/{sid}.m4a'):
        index['boards'].append({'id': sid, 'name': name, 'src': f'music/{sid}.m4a'})
json.dump(index, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
print(f"{len(index['boards'])} tabuleiros: {', '.join(b['name'] for b in index['boards'])}")
