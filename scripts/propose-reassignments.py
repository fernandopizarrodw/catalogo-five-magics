#!/usr/bin/env python3
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'products.json')
OUT = os.path.join(ROOT, 'tools', 'reimaginados-review', 'proposals.json')

labels = [
    'Vic Bandera Blanco',
    'Vic Celeste y Blanco',
    'Vic Tour 2026 v3',
    'Dave Final Show',
    'marty_dave',
    'Realista',
    'Argentina V1',
    'Killing Time',
    'Life in Hell',
    'Night Stalkers',
    '1992 V1',
    '92 Live',
    '92 Live Black',
    'Double Neck Jackson',
    'Hangar 18',
    'BN 90s',
    'Dave 90s RIP Live',
    'Dave and Vic Live',
    'Dave So Far Era V2',
    'Vic Sells v1',
    'peace_sells_live'
]

heur_album = {
    'hangar': 'Rust in Peace',
    'rust': 'Rust in Peace',
    'peace': 'Peace Sells',
    'killing': 'Killing Is My Business',
}

with open(DATA, 'r', encoding='utf-8') as f:
    products = json.load(f)

proposals = []
for label in labels:
    l = label.lower()
    matches = []
    for p in products:
        # search in name
        if p.get('name') and l in p.get('name','').lower():
            matches.append(p)
            continue
        # variants
        for v in p.get('variants') or []:
            if v.get('name') and l in v.get('name','').lower():
                matches.append(p); break
        # tags and collections
        if any(l == (c.lower()) or l in c.lower() for c in (p.get('collections') or [])):
            matches.append(p); continue
        if any(l in (t.lower()) for t in (p.get('tags') or [])):
            matches.append(p); continue
    # dedupe
    unique = {m.get('id'): m for m in matches}.values()
    recs = []
    for m in unique:
        recs.append({'id': m.get('id'), 'name': m.get('name'), 'band': m.get('band'), 'collections': m.get('collections')})
    # propose target
    proposal = None
    reason = ''
    if 'vic' in l:
        proposal = 'Vic Legacy / Vic Rattlehead'
        reason = 'contains "vic"'
    elif 'dave' in l:
        proposal = 'Dave Mustaine / Dave spotlight'
        reason = 'contains "dave"'
    else:
        for k,vv in heur_album.items():
            if k in l:
                proposal = f'Album: {vv}'
                reason = f'heuristic match "{k}"'
                break
    if not proposal:
        # if single match and band present
        if len(recs)==1:
            band = recs[0].get('band')
            if band:
                proposal = f'Band: {band}'
                reason = f'only one matching product with band {band}'
    proposals.append({'label': label, 'matches': recs, 'proposal': proposal or 'ASK', 'reason': reason})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT,'w',encoding='utf-8') as o:
    json.dump(proposals,o,ensure_ascii=False,indent=2)
print('Wrote', OUT)
print(json.dumps(proposals,ensure_ascii=False,indent=2))
