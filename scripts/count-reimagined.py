#!/usr/bin/env python3
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'products.json')
OUT = os.path.join(ROOT, 'tools', 'reimaginados-review', 'remaining-reimagined.json')

with open(DATA,'r',encoding='utf-8') as f:
    products = json.load(f)

rx = re.compile(r'reimagin', re.I)

remaining = []
for p in products:
    cols = ' '.join(p.get('collections') or [])
    tags = ' '.join(p.get('tags') or [])
    if rx.search(cols) or rx.search(tags) or p.get('megadethSection')=='reimagined_fmd' or p.get('megadethDesignType')=='original_fmd':
        remaining.append({'id':p.get('id'),'name':p.get('name'),'collections':p.get('collections'),'tags':p.get('tags'),'megadethSection':p.get('megadethSection')})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT,'w',encoding='utf-8') as o:
    json.dump(remaining,o,ensure_ascii=False,indent=2)

print(len(remaining),'products matched as reimagined and written to',OUT)
