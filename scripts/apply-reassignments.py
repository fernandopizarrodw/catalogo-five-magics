#!/usr/bin/env python3
import json, os, shutil, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'products.json')
BACKUP = DATA + '.bak'

# mappings from user
MAPPINGS = {
    'realista': 'Vic Rattlehead',
    'argentina v1': 'Dave Mustaine',
    'vic tour': 'Tours',
    'dave so far': 'Dave Mustaine',
    'vic sells': 'Peace Sells'
}

MATCH_KEYS = ['name']

# load
with open(DATA, 'r', encoding='utf-8') as f:
    products = json.load(f)

# backup
shutil.copyfile(DATA, BACKUP)
print('Backup created at', BACKUP)

changes = []

for label, target in MAPPINGS.items():
    l = label.lower()
    matched = []
    for p in products:
        found = False
        # name
        if p.get('name') and l in p.get('name','').lower():
            found = True
        # variants
        if not found:
            for v in p.get('variants') or []:
                if v.get('name') and l in v.get('name','').lower():
                    found = True; break
        # tags
        if not found and any(l in str(t).lower() for t in (p.get('tags') or [])):
            found = True
        # collections
        if not found and any(l in str(c).lower() for c in (p.get('collections') or [])):
            found = True
        if found:
            matched.append(p)
    for m in matched:
        before = list(m.get('collections') or [])
        cols = before[:]
        # add target if not present
        if target not in cols:
            cols.append(target)
        # remove likely mis-assigned markers 'Reimagined' / 'Reimaginados' terms
        cols = [c for c in cols if not re.search(r'reimagin', c, re.I)]
        # write back
        m['collections'] = cols
        note = m.get('curationNotes','')
        note_add = f"Reassigned suggestion -> {target} (applied by script)"
        if note_add not in note:
            m['curationNotes'] = (note + ' | ' + note_add).strip(' |')
        changes.append({'id': m.get('id'), 'name': m.get('name'), 'before': before, 'after': cols, 'appliedTo': target})

# save
with open(DATA, 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print('Applied changes for', len(changes), 'products')
print(json.dumps(changes, ensure_ascii=False, indent=2))
