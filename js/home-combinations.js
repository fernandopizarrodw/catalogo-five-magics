(function initHomeCombinations(root) {
    'use strict';
    const cards = [
    {
        "file": "doble con fecha en arg.jpg",
        "product": 7123,
        "front": 0,
        "backProduct": 7106,
        "back": 5,
        "preview": 34,
        "designId": "cd-slayer-fmd-originals--angel-of-death",
        "name": "Angel of Death · Buenos Aires",
        "band": "Slayer"
    },
    {
        "file": "EDDIARG4-5 IG DOBLE.jpg",
        "product": 7305,
        "front": 0,
        "backProduct": 7305,
        "back": 1,
        "preview": 4,
        "designId": "iron-maiden-eddie-argentina-estadio-huracan-fmd",
        "name": "Eddie Argentina · Estadio Huracán",
        "band": "Iron Maiden"
    },
    {
        "file": "DARRELL 4-5 IG DOBLE.jpg",
        "product": 46,
        "front": 0,
        "backProduct": 46,
        "back": 1,
        "preview": 2,
        "designId": "cd-pantera-dimebag-darrell-bn--p46",
        "name": "Dimebag Darrell",
        "band": "Pantera"
    },
    {
        "file": "EPICA - 4-5 IG DOBLE.jpg",
        "product": 5016,
        "front": 8,
        "backProduct": 5016,
        "back": 14,
        "preview": 26,
        "designId": "cd-epica-the-phantom-agony--p5016",
        "name": "The Phantom Agony",
        "band": "Epica"
    },
    {
        "file": "IRON DOBLE 1.jpg",
        "product": 7312,
        "front": 0,
        "backProduct": 7312,
        "back": 3,
        "preview": 6,
        "designId": "iron-maiden-buenos-aires-2026-aniversario-fmd",
        "name": "Run For Argentina · 50 Years",
        "band": "Iron Maiden"
    },
    {
        "file": "KEEPER 1 4-5 IG DOBLE.jpg",
        "product": 5009,
        "front": 21,
        "backProduct": 5009,
        "back": 22,
        "preview": 133,
        "designId": "helloween-keeper-of-the-seven-keys-part-i",
        "name": "Keeper of the Seven Keys Part I",
        "band": "Helloween"
    },
    {
        "file": "KREATOR 4-5 IG DOBLE.jpg",
        "product": 5091,
        "front": 6,
        "backProduct": 5091,
        "back": 12,
        "preview": 13,
        "designId": "cd-kreator-pleasure--p5091",
        "name": "Pleasure to Kill",
        "band": "Kreator"
    },
    {
        "file": "TESTAMENT 4-5 IG DOBLE.jpg",
        "product": 5123,
        "front": 3,
        "backProduct": 5123,
        "back": 4,
        "preview": 5,
        "designId": "cd-testament-brotherhood-of-the-snake--p5123",
        "name": "Brotherhood of the Snake",
        "band": "Testament"
    },
    {
        "file": "SONATA - 4-5 IG DOBLE.jpg",
        "product": 5092,
        "front": 0,
        "backProduct": 5092,
        "back": 22,
        "preview": 23,
        "designId": "sonata-arctica-ecliptica",
        "name": "Ecliptica",
        "band": "Sonata Arctica"
    },
    {
        "file": "DOWN OF VIC-4-5 IG DOBLE.jpg",
        "product": 5083,
        "front": 0,
        "backProduct": 5083,
        "back": 20,
        "preview": 21,
        "designId": "cd-rhapsody-dawn-of-victory--p5083",
        "name": "Dawn of Victory",
        "band": "Rhapsody"
    },
    {
        "file": "goat 4-5 IG DOBLE.jpg",
        "product": 7101,
        "front": 7,
        "backProduct": 7101,
        "back": 8,
        "preview": 9,
        "designId": "cd-slayer-reign-in-blood--p7101",
        "name": "Reign in Blood · Goat",
        "band": "Slayer"
    },
    {
        "file": "FOTD DOBLE FECHAS.jpg",
        "product": 7315,
        "front": 0,
        "backProduct": 7315,
        "back": 2,
        "preview": 4,
        "designId": "iron-maiden-fear-of-the-dark-halloween-2026-original-fmd",
        "name": "Fear of the Dark · FMD",
        "band": "Iron Maiden"
    },
    {
        "file": "1(1).jpg",
        "product": 7258,
        "front": 0,
        "backProduct": 7258,
        "back": 2,
        "preview": 3,
        "designId": "iron-maiden-eddie-tanguero-original-fmd",
        "name": "Eddie Tanguero",
        "band": "Iron Maiden"
    },
    {
        "file": "Frente + dorso juntos.jpg",
        "product": 7265,
        "front": 0,
        "backProduct": 7265,
        "back": 2,
        "preview": 4,
        "designId": "iron-maiden-eddie-huracan-original-fmd",
        "name": "Eddie en Huracán",
        "band": "Iron Maiden"
    },
    {
        "file": "mock frente y dorso eddie gaucho tempestad.jpg",
        "product": 7299,
        "front": 0,
        "backProduct": 7299,
        "back": 1,
        "preview": 2,
        "designId": "iron-maiden-eddie-gaucho-tempestad-original-fmd",
        "name": "Eddie Gaucho Tempestad",
        "band": "Iron Maiden"
    },
    {
        "file": "OTRA ALTERNATIVA PARA LA DOBLE POST.jpg",
        "product": 7304,
        "front": 0,
        "backProduct": 7304,
        "back": 1,
        "preview": 3,
        "designId": "iron-maiden-eddie-cuatro-jinetes-del-apocalipsis-original-fmd",
        "name": "Los 4 Jinetes del Apocalipsis",
        "band": "Iron Maiden"
    },
    {
        "file": "frente y dorso 4-5 IG DOBLE.jpg",
        "product": 7255,
        "front": 0,
        "backProduct": 7255,
        "back": 4,
        "preview": 5,
        "designId": "iron-maiden-the-trooper-classic",
        "name": "The Trooper",
        "band": "Iron Maiden"
    },
    {
        "file": "DOBLE NEW ZEALAND.jpg",
        "product": 7345,
        "front": 0,
        "backProduct": 7345,
        "back": 1,
        "preview": 0,
        "designId": "iron-maiden-new-zealand-tour-2026",
        "name": "New Zealand Tour 2026",
        "band": "Iron Maiden"
    }
];
    if (typeof module === 'object' && module.exports) module.exports = cards;
    if (!root.document) return;

    function open(card) {
        const design = catalogDesignById.get(card.designId);
        const product = db.find(item => item.id === card.product);
        if (!design || !product) {
            showNotification('Estamos cargando los diseños. Probá de nuevo en un momento.', 2200);
            return;
        }
        openCatalogDesignPreview(card.designId, 'remera_clasica', 'double', product.variants[card.preview].img);
        selectColor('negro');
        const back = getCatalogDesignBackChoices().find(ref => ref.productId === card.backProduct && ref.variantIndex === card.back);
        if (!back) return;
        if (selectedCatalogBackRef?.productId !== back.productId || selectedCatalogBackRef?.variantIndex !== back.variantIndex) {
            selectCatalogDesignBack(back.productId, back.variantIndex);
        }
        selectPrintMode('double');
        const flow = document.getElementById('modalPurchaseFlow');
        if (flow) {
            flow.dataset.combination = 'true';
            flow.dataset.purchaseRoute = 'combination';
            flow.dataset.entrySource = 'home_combinations';
            setModalPurchaseStep(1, false);
        }
        trackCatalogEvent('combination_select', { design_id: card.designId, entry_source: 'home_combinations' });
    }

    function makeCard(card) {
        const link = document.createElement('a');
        link.className = 'home-sleeveless-card';
        link.href = '#diseno-' + card.designId;
        link.dataset.combinationId = card.designId;
        const image = document.createElement('img');
        image.src = 'images/doble más vendidos/' + card.file;
        image.alt = card.band + ' · ' + card.name + ' · Frente y dorso';
        image.width = 1080; image.height = 1350;
        image.loading = 'lazy'; image.decoding = 'async';
        const band = document.createElement('small'); band.textContent = card.band;
        const title = document.createElement('h3'); title.textContent = card.name;
        const cta = document.createElement('span'); cta.textContent = 'ELEGIR ESTA COMBINACIÓN';
        link.append(image, band, title, cta);
        link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            open(card);
        });
        return link;
    }

    function render() {
        const grid = document.getElementById('homeCombinationsGrid');
        if (!grid || grid.dataset.ready || !catalogDesigns.length) return;
        grid.dataset.ready = 'true';
        grid.replaceChildren(...cards.slice(0, 4).map(makeCard));
        const toggle = document.getElementById('homeCombinationsMore');
        toggle.hidden = false;
        toggle.textContent = 'VER LAS ' + cards.length + ' COMBINACIONES';
        toggle.onclick = () => {
            const expand = toggle.getAttribute('aria-expanded') !== 'true';
            if (expand && grid.children.length === 4) grid.append(...cards.slice(4).map(makeCard));
            [...grid.children].slice(4).forEach(card => { card.hidden = !expand; });
            toggle.setAttribute('aria-expanded', String(expand));
            toggle.textContent = expand ? 'VER MENOS' : 'VER LAS ' + cards.length + ' COMBINACIONES';
            if (!expand) document.getElementById('doble-estampa').scrollIntoView({behavior:'smooth'});
        };
    }
    root.FMDHomeCombinations = { render };
    if (typeof catalogDesigns !== 'undefined' && catalogDesigns.length) render();
})(typeof globalThis !== 'undefined' ? globalThis : this);

