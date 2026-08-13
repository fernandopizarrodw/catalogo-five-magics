#!/usr/bin/env python3
"""
Lista imágenes bajo images/fmd-edition-3d y las asocia con productos en data/products.json
Salida: tools/reimaginados-review/reimagined-images.json
"""
import os
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMAGES_DIR = os.path.join(ROOT, 'images', 'fmd-edition-3d')
DATA_FILE = os.path.join(ROOT, 'data', 'products.json')
OUT_FILE = os.path.join(ROOT, 'tools', 'reimaginados-review', 'reimagined-images.json')

if not os.path.exists(IMAGES_DIR):
    print('No existe', IMAGES_DIR)
    exit(1)

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    products = json.load(f)

# build map image -> products
img_map = {}
for p in products:
    # top-level img
    for key in ('img',):
        val = p.get(key)
        if val:
            img_map.setdefault(val.replace('\\','/'), []).append(p)
    # variants
    for v in p.get('variants') or []:
        vimg = v.get('img')
        if vimg:
            img_map.setdefault(vimg.replace('\\','/'), []).append(p)

out = []
for root, dirs, files in os.walk(IMAGES_DIR):
    for fn in files:
        rel = os.path.relpath(os.path.join(root, fn), ROOT).replace('\\','/')
        entry = {'image': rel, 'matches': []}
        matches = img_map.get(rel) or []
        for m in matches:
            entry['matches'].append({'id': m.get('id'), 'name': m.get('name'), 'collections': m.get('collections')})
        out.append(entry)

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f'Escritas {len(out)} imágenes en {OUT_FILE}')
