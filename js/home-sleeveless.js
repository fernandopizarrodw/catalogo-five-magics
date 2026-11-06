(function initHomeSleeveless(root) {
    'use strict';

    const cards = [
        { product: 7305, variant: 2, file: 'remera_eddie_arg_doble_sin_mangas.jpg', band: 'Iron Maiden', name: 'Eddie Argentina · Estadio Huracán', backProduct: 7305, backVariant: 1 },
        { product: 7101, variant: 3, file: 'remera_reign_in_blood_doble_sin_mangas.jpg', band: 'Slayer', name: 'Reign in Blood', backProduct: 7101, backVariant: 2 },
        { product: 4, variant: 0, file: 'remera_rust_in_peace_doble_sin_mangas.jpg', band: 'Megadeth', name: 'Rust in Peace', backName: 'Dorso Rust in Peace · Canciones' },
        { product: 46, variant: 0, file: 'remera_pantera_doble_sin_mangas.jpg', band: 'Pantera', name: 'Dimebag Darrell · Blanco y negro', backName: 'Dorso Dimebag Darrell · Firma y Pantera' },
        { product: 18, newFront: true, designId: 'megadeth-hidden-treasures-clasico', file: 'megadeth_hidden_sin_mangas.jpg', band: 'Megadeth', name: 'Hidden Treasures · Arte clásico', backName: 'Dorso Hidden Treasures · Canciones' },
        { product: 1061, variant: 2, file: 'remera_master_doble_sin_mangas.jpg', band: 'Metallica', name: 'Master of Puppets · Realista', backProduct: 1061, backVariant: 3 },
        { product: 5009, variant: 21, file: 'remera_helloween_doble_sin_mangas.jpg', band: 'Helloween', name: 'Keeper of the Seven Keys Part I', backProduct: 5009, backVariant: 22 },
        { product: 5016, variant: 8, file: 'remera_epica_doble_sin_mangas.jpg', band: 'Epica', name: 'The Phantom Agony', backName: 'Dorso The Phantom Agony · Logo Epica' },
        { product: 7045, variant: 0, file: 'remera_hermetica_doble_sin_mangas.jpg', band: 'Hermética', name: 'Víctimas del Vaciamiento', backName: 'Dorso Hermética · Logo rojo' },
        { product: 7046, variant: 0, file: 'remera_iorio_doble_sin_mangas.jpg', band: 'Ricardo Iorio', name: 'V8 · Hermética · Almafuerte · Iorio', backName: 'Dorso Ricardo Iorio · Homenaje' },
        { product: 5012, variant: 0, file: 'remera_once_doble_sin_mangas.jpg', band: 'Nightwish', name: 'Once', backName: 'Dorso Once · Canciones' },
        { product: 5083, variant: 1, file: 'remera_rhapsody_doble_sin_mangas.jpg', band: 'Rhapsody', name: 'Legendary Tales', backName: 'Dorso Legendary Tales · Dragón' }
    ];
    if (typeof module === 'object' && module.exports) module.exports = cards;
    if (!root.document) return;

    function getDesign(card) {
        return catalogDesigns.find(design => design.designId === card.designId || (
            !card.newFront && Object.values(design.previewsByGarment || {}).flat().some(ref => (
                ref.productId === card.product && ref.variantIndex === card.variant
            ))
        ));
    }

    function open(card) {
        const design = getDesign(card);
        if (!design) return;
        openCatalogDesign(design.designId, 'sin_mangas');
        const image = `images/remeras sin mangas/${card.file}`;
        const index = currentModalSourceRefs.findIndex(ref => isSameAssetPath(ref.image, image));
        if (index >= 0) goToSlide(index, false);
        selectColor('negro');
        const back = getCatalogDesignBackChoices().find(ref => card.backName
            ? ref.label === card.backName
            : ref.productId === card.backProduct && ref.variantIndex === card.backVariant);
        if (back && (selectedCatalogBackRef?.productId !== back.productId || selectedCatalogBackRef?.variantIndex !== back.variantIndex)) {
            selectCatalogDesignBack(back.productId, back.variantIndex);
        }
        selectPrintMode('double');
    }

    function render() {
        const grid = document.getElementById('homeSleevelessGrid');
        if (!grid || !catalogDesigns.length) return;
        grid.replaceChildren(...cards.map((card, index) => {
            const design = getDesign(card);
            if (!design) return null;
            const link = document.createElement('a');
            link.className = 'home-sleeveless-card';
            link.href = `#diseno-${design.designId}`;
            link.hidden = index >= 4;
            link.dataset.sleevelessIndex = index;
            const image = document.createElement('img');
            image.src = `images/remeras sin mangas/${card.file}`;
            image.alt = `${card.band} · ${card.name} · Sin mangas, frente y dorso`;
            image.width = 1080; image.height = 1350;
            image.loading = 'lazy'; image.decoding = 'async';
            const band = document.createElement('small'); band.textContent = card.band;
            const title = document.createElement('h3'); title.textContent = card.name;
            const cta = document.createElement('span'); cta.textContent = 'ELEGIR TALLE Y ESTAMPA';
            link.append(image, band, title, cta);
            link.addEventListener('click', event => { event.preventDefault(); open(card); });
            return link;
        }).filter(Boolean));
        const toggle = document.getElementById('homeSleevelessMore');
        const extras = [...grid.children].slice(4);
        toggle.hidden = !extras.length;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = `VER MÁS SIN MANGAS (${extras.length})`;
        toggle.onclick = () => {
            const expand = toggle.getAttribute('aria-expanded') !== 'true';
            extras.forEach(card => { card.hidden = !expand; });
            toggle.setAttribute('aria-expanded', String(expand));
            toggle.textContent = expand ? 'VER MENOS' : `VER MÁS SIN MANGAS (${extras.length})`;
        };
    }

    root.FMDHomeSleeveless = { render };
    if (typeof catalogDesigns !== 'undefined' && catalogDesigns.length) render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
