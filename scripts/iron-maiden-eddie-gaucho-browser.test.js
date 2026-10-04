'use strict';

const assert = require('node:assert/strict');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';
const GAUCHO_ID = 'cd-iron-maiden-eddie-gaucho-argentino--p7040';
const DATED_ID = 'iron-maiden-eddie-gaucho-argentino-con-fechas';
const FRONT = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_frente.jpg';
const BACK = '/images/iron_maiden/dorsos opcionales/remera_iron_maiden_eddie_gaucho_argentino_dorso.jpg';
const DOUBLE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino.jpg';

async function main() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'Navegador CDP no disponible');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (!message.id || !pending.has(message.id)) return;
        const request = pending.get(message.id);
        pending.delete(message.id);
        message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };

    try {
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Page.navigate', { url: PAGE_URL });
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt += 1) {
            ready = await evaluate(`document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.some(item => item.designId === '${GAUCHO_ID}')`);
            if (ready) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(ready, 'La página de Iron Maiden no terminó de cargar');

        const modal = await evaluate(`(() => {
            openCatalogDesign('${GAUCHO_ID}', 'remera');
            const design = currentCatalogDesign;
            return {
                id: design?.designId || '',
                garments: design?.availableGarments || [],
                images: getModalImages().map(item => item.img || ''),
                labels: getModalImages().map(item => item.name || ''),
                current: getModalImages()[currentSlide]?.img || '',
                code: document.getElementById('displayCode')?.textContent.trim() || '',
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        })()`);
        assert.equal(modal.id, GAUCHO_ID);
        assert.deepEqual(modal.garments, ['remera', 'hoodie', 'buzo_cuello_redondo']);
        assert.deepEqual(modal.images, [FRONT, BACK, DOUBLE]);
        assert.deepEqual(modal.labels, ['Frente solo', 'Dorso solo', 'Frente y dorso']);
        assert.equal(modal.current, FRONT);
        assert.equal(modal.code, 'IMEGAF-7040.V1');
        assert.equal(modal.overflow, false);

        const order = await evaluate(`(() => {
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            selectPrintMode('double');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            cart.clearCart();
            return { added, frontCode: item?.frontCode || '', frontName: item?.frontName || '', backName: item?.backName || '', frontImage: item?.frontImage || '', backImage: item?.backImage || '', summary };
        })()`);
        assert.equal(order.added, true);
        assert.equal(order.frontCode, 'IMEGAF-7040.V1');
        assert.equal(order.frontName, 'Frente clásico');
        assert.equal(order.backName, 'Dorso Buenos Aires 2026');
        assert.equal(order.frontImage, FRONT);
        assert.equal(order.backImage, BACK);
        assert(order.summary.includes('Frente: clásico'));
        assert(order.summary.includes('Dorso: Dorso Buenos Aires 2026'));
        assert(order.summary.includes('$45.000'));

        const dated = await evaluate(`(() => {
            closeModal();
            openCatalogDesign('${DATED_ID}', 'remera');
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            cart.clearCart();
            return { added, code: item?.frontCode || '', front: item?.frontName || '', double: item?.isDouble === true, summary };
        })()`);
        assert.equal(dated.added, true);
        assert.equal(dated.code, 'IMEGAF-7040.V2');
        assert.equal(dated.front, 'Frente con fechas');
        assert.equal(dated.double, false);
        assert(dated.summary.includes('Solo frente'));

        const related = await evaluate(`(() => {
            const inspect = id => {
                closeModal();
                openCatalogDesign(id, 'remera');
                return { images: getModalImages().map(item => item.img || ''), labels: getModalImages().map(item => item.name || ''), current: getModalImages()[currentSlide]?.img || '' };
            };
            return { tanguero: inspect('iron-maiden-eddie-tanguero-original-fmd'), huracan: inspect('iron-maiden-eddie-huracan-original-fmd') };
        })()`);
        for (const design of [related.tanguero, related.huracan]) {
            assert.equal(design.images.length, 3);
            assert.deepEqual(design.labels, ['Frente solo', 'Dorso solo', 'Frente y dorso']);
            assert.equal(design.current, design.images[0]);
        }

        const backs = await evaluate(`(() => {
            closeModal();
            openCatalogDesign('cd-iron-maiden-eddie-circular-fmd--p7019', 'remera');
            selectPrintMode('double');
            return {
                available: getCatalogDesignBackChoices().length,
                visible: document.querySelectorAll('#dorsoVariantsGrid .catalog-design-dorso').length,
                hiddenGroups: document.querySelectorAll('#dorsoVariantsGrid details').length,
                alternativesOpen: document.querySelector('#dorsoVariantsGrid details')?.open || false,
                whatsapp: document.querySelector('.catalog-design-dorso-whatsapp')?.textContent.trim() || ''
            };
        })()`);
        assert.equal(backs.visible, backs.available);
        assert.equal(backs.hiddenGroups, 1);
        assert.equal(backs.alternativesOpen, false);
        assert.equal(backs.whatsapp, 'ELEGIR OTRO DORSO POR WHATSAPP');
        console.log(JSON.stringify({ modal, order, dated, related, backs }, null, 2));
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
