'use strict';

const assert = require('node:assert/strict');

const EXPECTED = {
    'cd-megadeth-rust-in-peace--rust-in-peace': {
        name: 'Rust in Peace',
        fronts: 1,
        backs: 2
    },
    'cd-megadeth-rust-in-peace--rust-in-peace-fmd': {
        name: 'Rust in Peace - Edición FMD',
        fronts: 1,
        backs: 0
    },
    'cd-megadeth-rust-in-peace--alternate': {
        name: 'Rust in Peace - Edición circular',
        fronts: 1,
        backs: 1
    },
    'cd-megadeth-rust-in-peace--lineup-v2': {
        name: 'Rust in Peace - Formación clásica',
        fronts: 1,
        backs: 2
    },
    'cd-megadeth-rust-in-peace--rust-in-peace-3d': {
        name: 'Rust in Peace - Edición 3D',
        fronts: 1,
        backs: 1
    },
    'cd-megadeth-rust-in-peace--holy-wars': {
        name: 'Holy Wars',
        fronts: 1,
        backs: 0
    },
    'cd-megadeth-rust-in-peace--edicion-azul': {
        name: 'Rust in Peace - Edición azul',
        fronts: 2,
        backs: 1
    }
};

async function main() {
    const pages = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'Chrome CDP no disponible');

    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });

    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (!pending.has(message.id)) return;
        const handlers = pending.get(message.id);
        pending.delete(message.id);
        message.error ? handlers.reject(new Error(message.error.message)) : handlers.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };

    try {
        await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true
        });
        await send('Page.navigate', { url: 'http://127.0.0.1:5500/megadeth/' });
        for (let attempt = 0; attempt < 100; attempt++) {
            const ready = await evaluate("document.readyState === 'complete' && typeof selectBandLandingCollection === 'function' && document.querySelectorAll('.catalog-design-card').length > 0");
            if (ready) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await evaluate(`(async () => {
            selectBandLandingCollection('rust');
            await new Promise(resolve => setTimeout(resolve, 150));
            const expected = ${JSON.stringify(EXPECTED)};
            const ids = Object.keys(expected);
            const designs = Object.fromEntries(ids.map(id => {
                const design = catalogDesignById.get(id);
                return [id, design ? {
                    name: design.publicName,
                    fronts: design.previewsByGarment.remera.length,
                    backs: design.backOptions.length
                } : null];
            }));
            const cards = Object.fromEntries(ids.map(id => {
                const card = document.querySelector('.catalog-design-card[data-design-id="' + id + '"]');
                return [id, card ? {
                    name: card.querySelector('.catalog-design-copy strong')?.textContent.trim(),
                    image: card.querySelector('img')?.getAttribute('src')
                } : null];
            }));
            const imageUrls = Object.values(cards).map(card => card?.image).filter(Boolean);
            const broken = (await Promise.all(imageUrls.map(async image => ({
                image,
                ok: (await fetch(new URL(image, location.href))).ok
            })))).filter(item => !item.ok);
            const hangar = catalogDesigns.find(design => design.publicName === 'Hangar 18');
            const hangarImageOk = hangar ? (await fetch(new URL(hangar.front.image, location.href))).ok : false;
            openCatalogDesign('cd-megadeth-rust-in-peace--edicion-azul');
            selectPrintMode('double');
            await new Promise(resolve => setTimeout(resolve, 50));
            const modal = {
                open: document.getElementById('modal').classList.contains('active'),
                frontSlides: currentModalImages.length,
                recommendedBacks: document.querySelectorAll('#dorsoVariantsGrid .catalog-design-dorso-recommended .catalog-design-dorso').length,
                selectedDesign: currentCatalogDesign?.designId
            };
            return {
                designs,
                cards,
                broken,
                hangar: hangar ? { image: hangar.front.image, imageOk: hangarImageOk } : null,
                modal,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                viewport: document.documentElement.clientWidth
            };
        })()`);

        assert.deepEqual(result.designs, EXPECTED, JSON.stringify(result, null, 2));
        assert(Object.values(result.cards).every(Boolean), JSON.stringify(result.cards, null, 2));
        assert.equal(result.cards['cd-megadeth-rust-in-peace--rust-in-peace-3d'].image, '/images/fmd-edition-3d/rust/rust_in_peace_3d_edition_doble_estampa.jpg');
        assert.equal(result.broken.length, 0, JSON.stringify(result.broken));
        assert(result.hangar?.imageOk, JSON.stringify(result.hangar));
        assert.deepEqual(result.modal, {
            open: true,
            frontSlides: 2,
            recommendedBacks: 1,
            selectedDesign: 'cd-megadeth-rust-in-peace--edicion-azul'
        });
        assert.equal(result.overflow, false, `Overflow horizontal en viewport ${result.viewport}px`);
        console.log('Megadeth Rust in Peace: 7 diseños, dorsos asociados, Hangar 18 y mobile OK');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
