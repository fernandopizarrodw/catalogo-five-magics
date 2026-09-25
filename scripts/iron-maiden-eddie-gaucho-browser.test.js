'use strict';

const assert = require('node:assert/strict');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';
const FRONT_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_frente.jpg';
const BACK_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_dorso.jpg';

async function main() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'Navegador CDP no disponible');

    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });

    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const response = JSON.parse(event.data);
        if (!pending.has(response.id)) return;
        const request = pending.get(response.id);
        pending.delete(response.id);
        response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
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
        await send('Page.navigate', { url: PAGE_URL });
        for (let attempt = 0; attempt < 80; attempt++) {
            const ready = await evaluate(`document.readyState === 'complete'
                && Array.isArray(window.catalogDesigns)
                && window.catalogDesigns.some(item => item.designId === 'cd-iron-maiden-eddie-gaucho-argentino--p7040')`);
            if (ready) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await evaluate(`(async () => {
            const design = catalogDesigns.find(item => item.designId === 'cd-iron-maiden-eddie-gaucho-argentino--p7040');
            if (!design) return { error: 'Eddie Gaucho no encontrado' };
            const card = document.querySelector('[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]');
            openCatalogDesign(design.designId, 'remera');
            selectPrintMode('double');
            const modalImages = getModalImages().map(item => item.img || '');
            const backSelectorImages = [...document.querySelectorAll('#dorsoVariantsGrid img')]
                .map(image => image.getAttribute('src') || '');
            const paths = [design.front.image, design.backOptions[0]?.image].filter(Boolean);
            const responses = await Promise.all(paths.map(path => fetch(new URL(path, location.href)).then(response => response.ok)));
            return {
                cardImage: card?.querySelector('img')?.getAttribute('src') || '',
                code: document.getElementById('displayCode')?.textContent.trim() || '',
                front: design.front.image,
                backs: design.backOptions.map(item => item.image),
                modalImages,
                backSelectorImages,
                imagesLoad: responses.every(Boolean)
            };
        })()`);

        assert(!result.error, result.error);
        assert.equal(result.front, FRONT_IMAGE);
        assert.deepEqual(result.backs, [BACK_IMAGE]);
        assert(result.cardImage.includes(FRONT_IMAGE));
        assert.equal(result.code, 'IMEGAF-7040.V1');
        assert(result.modalImages.some(path => path.includes(FRONT_IMAGE)));
        assert(result.backSelectorImages.some(path => path.includes(BACK_IMAGE)));
        assert(result.imagesLoad, 'Alguna imagen de Eddie Gaucho no carga');
        console.log(`Eddie Gaucho: frente y dorso individuales correctos, ${result.code}`);

        const circularFlow = await evaluate(`(() => {
            closeModal();
            cart.clearCart();
            const design = catalogDesigns.find(item => item.designId === 'cd-iron-maiden-eddie-circular-fmd--p7019');
            if (!design) return { error: 'Eddie Circular no encontrado' };
            openCatalogDesign(design.designId, 'remera');
            selectRemeraVariant('mujer_clasica');
            selectSize('M');
            selectColor('negro');
            selectPrintMode('double');
            const panelOpen = document.getElementById('modalAdvancedPanel')?.open === true;
            const primaryChoices = [...document.querySelectorAll('.catalog-design-dorso-recommended .catalog-design-dorso')];
            const blockedWithoutDecision = addToCartFromModal() === false && cart.getCart().length === 0;
            primaryChoices[0]?.click();
            const selectedBack = selectedCatalogBackRef?.label || '';
            const addedWithBack = addToCartFromModal();
            const selectedItem = cart.getCart().at(-1);
            const selectedSummary = cart.generateSummary();
            cart.clearCart();
            deferCatalogDesignBack();
            const addedDeferred = addToCartFromModal();
            const deferredItem = cart.getCart().at(-1);
            const deferredSummary = cart.generateSummary();
            cart.clearCart();
            return {
                panelOpen,
                primaryChoiceCount: primaryChoices.length,
                blockedWithoutDecision,
                selectedBack,
                addedWithBack,
                selectedItemBack: selectedItem?.backName || '',
                selectedSummary,
                addedDeferred,
                deferredItemBack: deferredItem?.backName || '',
                deferredSummary
            };
        })()`);

        assert(!circularFlow.error, circularFlow.error);
        assert(circularFlow.panelOpen, 'La elección de dorso no se abre al seleccionar doble estampa');
        assert(circularFlow.primaryChoiceCount >= 2, 'Eddie Circular no muestra dorsos visibles');
        assert(circularFlow.blockedWithoutDecision, 'El modal permitió agregar doble estampa sin decidir el dorso');
        assert(circularFlow.addedWithBack && circularFlow.selectedBack, 'No se pudo elegir un dorso');
        assert.equal(circularFlow.selectedItemBack, circularFlow.selectedBack);
        assert(circularFlow.selectedSummary.includes(`Dorso: ${circularFlow.selectedBack}`));
        assert(circularFlow.addedDeferred, 'No se pudo dejar el dorso a definir');
        assert.equal(circularFlow.deferredItemBack, 'A definir por WhatsApp');
        assert(circularFlow.deferredSummary.includes('Dorso a definir'));
        console.log('Eddie Circular: selección obligatoria y opción de definir el dorso por WhatsApp correctas');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
