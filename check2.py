# -*- coding: utf-8 -*-
import re
with open('js/app.js', encoding='utf-8', errors='surrogateescape') as f:
    app = f.read()

for i, line in enumerate(app.split('\n')):
    if 'Hola FMD' in line or 'reservar' in line.lower() or '30/04' in line or 'Tecnopolis' in line or 'Tecn' in line:
        print(f'Line {i+1}:', repr(line[:400]))
