'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const code = source.slice(source.indexOf('function updateCatalogDesignReferenceNote()'), source.indexOf('function selectCatalogDesignPreviewForGarment('));

function render({ dedicated = false, mock = false, color = 'negro', band = 'Iron Maiden' } = {}) {
    const classes = new Set();
    const note = {
        textContent: '',
        children: [],
        classList: {
            add: value => classes.add(value),
            remove: value => classes.delete(value),
            toggle: (value, active) => active ? classes.add(value) : classes.delete(value)
        },
        replaceChildren(...children) { this.children = children; }
    };
    const ref = { productId: 7312, variantIndex: 0, color: 'negro', garment: 'remera', garmentStyle: mock ? 'sin_mangas' : '' };
    const context = {
        document: { getElementById: () => note, querySelector: () => null },
        currentCatalogDesign: { band },
        currentProduct: { carouselPreviewOnly: dedicated },
        selectedModalGarment: 'sin_mangas',
        selectedCatalogFrontRef: ref,
        selectedColor: color,
        selectedPrintMode: 'simple',
        getCatalogDesignGarmentKey: () => 'remera',
        getCatalogDesignFrontRefs: () => [ref],
        normalizeText: value => String(value).toLowerCase()
    };
    vm.runInNewContext(code + '\nupdateCatalogDesignReferenceNote();', context);
    return { note, hidden: classes.has('is-hidden') };
}

for (const dedicated of [false, true]) {
    for (const color of ['negro', 'blanco']) {
        for (const band of ['Iron Maiden', 'Slayer']) {
            const { note, hidden } = render({ dedicated, color, band });
            assert.equal(hidden, false);
            assert.equal(note.textContent, 'Imagen de referencia con mangas. Disponible sin mangas.');
            assert.equal(note.children.length, 0);
        }
    }
    assert.equal(render({ dedicated, mock: true }).hidden, true);
    assert.equal(render({ dedicated, mock: true, color: '' }).hidden, true);
    assert.equal(render({ dedicated, mock: true, color: 'blanco' }).note.textContent, 'Imagen de referencia en negro. Disponible en blanco.');
}
console.log('PASS: aclaracion breve sin titulo ni boton; se oculta si existe el mock correspondiente.');
