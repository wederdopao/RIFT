"""Gera src/data/cards.json a partir do corpus do rulekit (texto com errata mais recente)."""
import json, re, sys
src = sys.argv[1] if len(sys.argv) > 1 else 'ref/riftbound/cards.json'
items = json.load(open(src))['items']
out = {}
for c in items:
    m = re.search(r'([A-Z]{3})-(\d{3}[a-z]?)', c.get('png_uri', ''))
    if not m:
        continue
    code = f"{m.group(1)}-{m.group(2)}"
    s = c.get('stats', {})
    t = c.get('text', {}) or {}
    text = (t.get('card_text') or '')
    # remove o cabeçalho de errata (o texto já é o corrigido)
    text = re.sub(r'^[^\n]*(Errata|𝗘𝗿𝗿𝗮𝘁𝗮)[^\n]*:\s*\n', '', text)
    # cabeçalho de errata em negrito matemático na mesma linha (ex.: Wraith of Echoes)
    text = re.sub(r'^[\U0001D400-\U0001D7FF\s–\-:]+', '', text)
    out[code] = {
        'code': code, 'name': c['name'], 'type': c.get('type_line'), 'rarity': c.get('rarity'),
        'set': c.get('set_name'), 'domains': s.get('colors') or [], 'energy': s.get('energy') or 0,
        'power': s.get('power') or 0, 'might': s.get('might') or 0, 'mightBonus': s.get('might_bonus') or 0,
        'tags': c.get('tags') or [], 'text': text.strip(), 'effectText': (t.get('effect_text') or '').strip(),
        'errata': bool(re.search(r'Errata|𝗘𝗿𝗿𝗮𝘁𝗮', t.get('card_text') or '')),
    }
# Radiance: a corpus ainda não tem o set; dados da galeria oficial em ref/riftbound/radiance-gallery.py
import importlib.util
_spec = importlib.util.spec_from_file_location('radg', 'ref/riftbound/radiance-gallery.py')
_radg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_radg)
for code, rec in _radg.records().items():
    out.setdefault(code, rec)
# correções de dados conferidas pela arte/catálogo oficial (o corpus às vezes perde ícones ou números)
ov = json.load(open('src/data/overrides.json'))
for code, fix in ov.items():
    if code in out:
        out[code].update(fix)
# lendas sem o nome do campeão (VEN/RAD vêm só com o título): "Riven, The Exile", como nas listas de deck
champs = {c['name'].split(',')[0] for c in out.values() if 'Champion' in (c['type'] or '')}
for c in out.values():
    if c['type'] == 'Legend' and ',' not in c['name']:
        t = next((t for t in c['tags'] if t in champs), None)
        if t:
            c['name'] = f"{t}, {c['name']}"
json.dump(out, open('src/data/cards.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'cards')
