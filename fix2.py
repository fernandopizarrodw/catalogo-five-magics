# -*- coding: utf-8 -*-
def fix_file(path, replacements):
    with open(path, encoding='utf-8', errors='surrogateescape') as f:
        text = f.read()
    for old, new in replacements:
        count = text.count(old)
        text = text.replace(old, new)
        status = 'OK' if count > 0 else 'NO ENCONTRADO'
        print(f'{status} ({count}): {repr(old[:70])}')
    with open(path, 'w', encoding='utf-8', errors='surrogateescape') as f:
        f.write(text)

fix_file('js/app.js', [
    (
        'Hola FMD, quiero reservar esta prenda para el show final de Megadeth del 30/04.',
        'Hola FMD! Quiero encargar esta prenda'
    ),
    (
        '\\n\\nQuiero coordinar retiro en zona Tecn\u00f3polis (plazo: jueves 30/04 hasta las 16hs).',
        '\\n\\nPor favor confirm\u00e1me precio, disponibilidad y opciones de env\u00edo.'
    ),
    (
        'Hola FMD, quiero reservar mi remera para el show final de Megadeth del 30/04.',
        'Hola FMD! Quiero encargar una remera de la colecci\u00f3n Megadeth'
    ),
    (
        '\\n\\nSi se puede, quiero coordinar retiro en zona Tecn\u00f3polis antes del show.',
        '\\n\\nPor favor confirm\u00e1me precio y disponibilidad.'
    ),
    (
        'Hola FMD, quiero ayuda para reservar ${currentProduct.name} para el show final de Megadeth del 30/04.',
        'Hola FMD! Quiero encargar ${currentProduct.name}'
    ),
    (
        '\\n\\nNecesito confirmar talle, color y entrega.',
        '\\n\\nNecesito confirmar talle, color y opciones de env\u00edo.'
    ),
])
print('--- app.js guardado ---')

fix_file('index.html', [
    ('>RESERVAR POR WHATSAPP</a>', '>ENCARGAR POR WHATSAPP</a>'),
])
print('--- index.html guardado ---')
