# Artes em alta das cartas (site): baixa a imagem original de cada carta da galeria oficial da Riot
# (playriftbound.com/en-us/card-gallery, 744×1039) e grava assets/art-hd/<código>.webp. A mesa continua usando as
# leves (assets/art, 360 px) nas cartas pequenas; as em alta só aparecem quando a carta é mostrada grande (ampliada,
# prévia ao passar o mouse, deckbuilder), para o texto da carta ficar legível.
# Carta sem imagem na galeria (fichas etc.): copia a leve, para o endereço art-hd/<código>.webp sempre existir.
# Uso (na pasta riftbound-engine): python3 scripts/art_hd.py
import io, json, os, re, shutil, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

SRC = 'assets/art'
OUT = 'assets/art-hd'
UA = 'Mozilla/5.0 (riftbound-mesa fan project)'
QUALITY = 80

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=90) as r:
        return r.read()

page = get('https://playriftbound.com/en-us/card-gallery/').decode('utf-8', 'replace')
data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S).group(1))
gallery = {}
def walk(o):
    if isinstance(o, dict):
        if 'cardImage' in o and 'publicCode' in o and o['cardImage'].get('url'):
            gallery.setdefault(o['publicCode'].split('/')[0].upper(), o['cardImage']['url'])
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(data)

os.makedirs(OUT, exist_ok=True)
codes = sorted(f[:-5] for f in os.listdir(SRC) if f.endswith('.webp'))

def one(code):
    dst = f'{OUT}/{code}.webp'
    if os.path.exists(dst):
        return 'ok'
    url = gallery.get(code)
    if not url:
        shutil.copy(f'{SRC}/{code}.webp', dst)
        return 'copia'
    try:
        im = Image.open(io.BytesIO(get(url))).convert('RGB')
    except Exception:
        shutil.copy(f'{SRC}/{code}.webp', dst)
        return 'falhou'
    # mesma orientação da leve (campos de batalha ficam deitados)
    small = Image.open(f'{SRC}/{code}.webp')
    if (small.width > small.height) != (im.width > im.height):
        im = im.rotate(90, expand=True)
    if max(im.size) > 1040:
        im.thumbnail((1040, 1040), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return 'hd'

with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(one, codes))
from collections import Counter
print(Counter(res), sum(os.path.getsize(f'{OUT}/{c}.webp') for c in codes) // 2**20, 'MB')
print('sem imagem na galeria:', [c for c, r in zip(codes, res) if r in ('copia', 'falhou')][:40])
