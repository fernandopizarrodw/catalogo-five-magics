#!/usr/bin/env python3
"""
Genera tools/reimaginados-review/reimagined.json con candidatos a "Reimagined".
Uso: python scripts/generate-reimagined-json.py
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_FILE = os.path.join(ROOT, 'data', 'products.json')
OUT_FILE = os.path.join(ROOT, 'tools', 'reimaginados-review', 'reimagined.json')

KEYWORDS = [re.compile(r'reimagin', re.I), re.compile(r'reimagined', re.I)]

def looks_reimagined(p):
    # Heurística: busca keywords en name, desc, tags, collections, or megadethSection
    text_sources = []
    for k in ('name', 'desc'):
        if p.get(k):
            text_sources.append(str(p.get(k)))
    for arr_key in ('tags', 'collections'):
        if isinstance(p.get(arr_key), list):
            text_sources.extend([str(x) for x in p.get(arr_key)])
    if p.get('megadethSection'):
        text_sources.append(str(p.get('megadethSection')))
    hay = ' '.join(text_sources)
    for rx in KEYWORDS:
        if rx.search(hay):
            return True
    return False


def main():
    if not os.path.exists(DATA_FILE):
        print('No se encontró', DATA_FILE)
        return
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)
    candidates = []
    for p in products:
        if looks_reimagined(p):
            candidates.append({
                'id': p.get('id'),
                'name': p.get('name'),
                'band': p.get('band'),
                'collections': p.get('collections'),
                'tags': p.get('tags'),
                'img': p.get('img'),
                'megadethSection': p.get('megadethSection'),
                'desc': p.get('desc')
            })
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as out:
        json.dump(candidates, out, ensure_ascii=False, indent=2)
    print(f'Escritos {len(candidates)} candidatos en {OUT_FILE}')

if __name__ == '__main__':
    main()
