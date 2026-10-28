# Baixa os tapetes da mesa: as ilustrações de "tela de carregamento" de cada tabuleiro do Legends of Runeterra (wiki
# do League of Legends, página "Board (Legends of Runeterra)"). As capturas 3D dos tabuleiros ficam de fora: trazem a
# interface do LoR (gemas de vida, mana) e não casam com a nossa mesa. Grava assets/mats/<id>.webp (1280 px de largura,
# o fundo vai escurecido atrás da mesa, então a qualidade pode ser baixa) e assets/mats/index.json.
# Uso (na pasta riftbound-engine): python3 scripts/lor_mats.py
# Projeto de fã sem fins comerciais (política "Legal Jibber Jabber" da Riot); a arte é da Riot Games.
import html, io, json, os, re, urllib.parse, urllib.request
from PIL import Image

WIKI = 'https://wiki.leagueoflegends.com'
OUT = 'assets/mats'
SKIP = {'KDA World Tour'}  # tabuleiro de parceria (K/DA), fora como na música

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'riftbound-mesa (fan project)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

page = get(f'{WIKI}/en-us/Board_(Legends_of_Runeterra)').decode('utf-8', 'replace')
files = sorted(set(re.findall(r"LoR_([A-Za-z0-9_%'.-]+?)_Loading_Screen\.png", page)))
os.makedirs(OUT, exist_ok=True)
mats = []
for f in files:
    name = urllib.parse.unquote(f).replace('_', ' ')
    if name in SKIP:
        continue
    # mesmo id da música do tabuleiro (scripts/lor_music.py: "Reckoner's Arena" → reckoner-s-arena)
    mid = slug(name.replace('Reckoners', "Reckoner's"))
    dst = f'{OUT}/{mid}.webp'
    if not os.path.exists(dst):
        try:
            im = Image.open(io.BytesIO(get(f'{WIKI}/en-us/images/LoR_{f}_Loading_Screen.png'))).convert('RGB')
        except Exception as e:
            print('falhou', name, e)
            continue
        im.thumbnail((1280, 1280), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=58, method=6)
    mats.append({'id': mid, 'name': html.unescape(name.replace('Reckoners', "Reckoner's")), 'src': f'mats/{mid}.webp'})
    print(mid, os.path.getsize(dst) // 1024, 'KB')
json.dump({'mats': mats}, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
print(len(mats), 'tapetes')
