import json, os

data = json.load(open('data/products.json', encoding='utf-8'))
rotos = []

for p in data:
    imgs = [p.get('img', '')]
    for v in (p.get('variants') or []):
        imgs.append(v.get('img', ''))
    for img in imgs:
        if img and not os.path.exists(img):
            rotos.append('ID ' + str(p['id']) + ' | ' + p['name'] + ' -> ' + img)

print('TOTAL ROTOS: ' + str(len(rotos)))
for r in rotos:
    print(r)
