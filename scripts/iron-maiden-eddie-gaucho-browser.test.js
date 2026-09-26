'use strict';

const assert = require('node:assert/strict');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';
const FRONT_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_frente.jpg';
const DATED_FRONT_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_con_fecha.jpg';
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
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
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
            const card = document.querySelector('.catalog-design-card[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]');
            const feature = document.getElementById('bandCampaignFeature');
            feature.querySelector('.band-campaign-feature-cta')?.click();
            const featureOpenedDesign = currentCatalogDesign?.designId || '';
            selectPrintMode('double');
            const modalImages = getModalImages().map(item => item.img || '');
            const backSelectorImages = [...document.querySelectorAll('#dorsoVariantsGrid img')]
                .map(image => image.getAttribute('src') || '');
            const featureImages = [...feature.querySelectorAll('.band-campaign-feature-card img')]
                .map(image => image.getAttribute('src') || '');
            const paths = [...featureImages, design.front.image, design.backOptions[0]?.image].filter(Boolean);
            const responses = await Promise.all(paths.map(path => fetch(new URL(path, location.href)).then(response => response.ok)));
            return {
                featureIsFirst: document.querySelector('main > section') === feature,
                featureImages,
                featureCardCount: feature.querySelectorAll('.band-campaign-feature-card').length,
                featureCtaLabel: feature.querySelector('.band-campaign-feature-cta')?.textContent.trim() || '',
                featureOpenedDesign,
                horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                catalogCardCount: document.querySelectorAll('.catalog-design-card[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]').length,
                cardImage: card?.querySelector('img')?.getAttribute('src') || '',
                code: document.getElementById('displayCode')?.textContent.trim() || '',
                front: design.front.image,
                remeraFronts: design.previewsByGarment.remera.map(item => ({ image: item.image, label: item.selectionLabel })),
                backs: design.backOptions.map(item => item.image),
                modalImages,
                backSelectorImages,
                imagesLoad: responses.every(Boolean)
            };
        })()`);

        assert(!result.error, result.error);
        assert(result.featureIsFirst, 'La campaña Eddie Gaucho no aparece primero');
        assert.equal(result.featureCardCount, 3);
        assert.deepEqual(result.featureImages, [FRONT_IMAGE, DATED_FRONT_IMAGE, BACK_IMAGE]);
        assert.equal(result.featureCtaLabel, 'ELEGIR VERSIÓN');
        assert.equal(result.featureOpenedDesign, 'cd-iron-maiden-eddie-gaucho-argentino--p7040');
        assert.equal(result.horizontalOverflow, false, 'La sección genera desborde horizontal en mobile');
        assert.equal(result.catalogCardCount, 1, 'Eddie Gaucho se duplicó en el catálogo');
        assert.equal(result.front, FRONT_IMAGE);
        assert.deepEqual(result.remeraFronts, [
            { image: FRONT_IMAGE, label: 'Frente clásico' },
            { image: DATED_FRONT_IMAGE, label: 'Frente Buenos Aires 2026' }
        ]);
        assert.deepEqual(result.backs, [BACK_IMAGE]);
        assert(result.cardImage.includes(FRONT_IMAGE));
        assert.equal(result.code, 'IMEGAF-7040.V1');
        assert(result.modalImages.some(path => path.includes(FRONT_IMAGE)));
        assert(result.modalImages.some(path => path.includes(DATED_FRONT_IMAGE)));
        assert(result.backSelectorImages.some(path => path.includes(BACK_IMAGE)));
        assert(result.imagesLoad, 'Alguna imagen de Eddie Gaucho no carga');
        const entryFlow = await evaluate(`(() => {
            const feature = document.getElementById('bandCampaignFeature');
            const featureCards = [...feature.querySelectorAll('.band-campaign-feature-card')];
            const snapshot = () => ({
                designId: currentCatalogDesign?.designId || '',
                printMode: selectedPrintMode,
                back: selectedCatalogBackRef?.label || '',
                front: selectedCatalogFrontRef?.selectionLabel || '',
                slide: getModalImages()[currentSlide]?.img || '',
                price: document.getElementById('modalPrice')?.textContent.trim() || '',
                summary: document.getElementById('modalOrderSummary')?.textContent.replace(/\\s+/g, ' ').trim() || ''
            });

            closeModal();
            featureCards[0].click();
            const classicFront = snapshot();
            selectPrintMode('double');
            const classicWithBack = snapshot();

            closeModal();
            featureCards[1].click();
            const datedFront = snapshot();

            closeModal();
            featureCards[2].click();
            const back = snapshot();

            closeModal();
            feature.querySelector('.band-campaign-feature-cta').click();
            const cta = snapshot();

            closeModal();
            document.querySelector('[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"] .catalog-design-card-main').click();
            const catalogCard = snapshot();

            return { classicFront, classicWithBack, datedFront, back, cta, catalogCard };
        })()`);

        assert.equal(entryFlow.classicFront.printMode, 'simple');
        assert.equal(entryFlow.classicFront.back, '');
        assert.equal(entryFlow.classicFront.front, 'Frente clásico');
        assert(entryFlow.classicFront.slide.includes(FRONT_IMAGE));
        assert(entryFlow.classicFront.price.includes('$37.000'));
        assert.equal(entryFlow.classicWithBack.printMode, 'double');
        assert.equal(entryFlow.classicWithBack.back, 'Dorso Buenos Aires 2026');
        assert(entryFlow.classicWithBack.price.includes('$44.000'));
        assert.equal(entryFlow.datedFront.printMode, 'simple');
        assert.equal(entryFlow.datedFront.back, '');
        assert.equal(entryFlow.datedFront.front, 'Frente Buenos Aires 2026');
        assert(entryFlow.datedFront.slide.includes(DATED_FRONT_IMAGE));
        assert(entryFlow.datedFront.price.includes('$37.000'));
        assert.equal(entryFlow.back.printMode, 'double');
        assert.equal(entryFlow.back.back, 'Dorso Buenos Aires 2026');
        assert.equal(entryFlow.cta.printMode, 'simple');
        assert.equal(entryFlow.cta.back, '');
        assert(entryFlow.cta.slide.includes(FRONT_IMAGE));
        assert.equal(entryFlow.catalogCard.printMode, 'simple');
        assert.equal(entryFlow.catalogCard.back, '');
        assert.equal(entryFlow.catalogCard.front, 'Frente clásico');
        assert(entryFlow.catalogCard.slide.includes(FRONT_IMAGE));
        assert(entryFlow.catalogCard.price.includes('$37.000'));

        const cartFlow = await evaluate(`(() => {
            cart.clearCart();
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            selectPrintMode('double');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            cart.clearCart();
            return { added, backName: item?.backName || '', summary };
        })()`);
        assert(cartFlow.added, 'No se pudo agregar Eddie Gaucho con frente y dorso');
        assert.equal(cartFlow.backName, 'Dorso Buenos Aires 2026');
        assert(cartFlow.summary.includes('Frente: clásico'));
        assert(cartFlow.summary.includes('Dorso: Dorso Buenos Aires 2026'));
        assert(cartFlow.summary.includes('$44.000'));
        assert(!cartFlow.summary.includes('Dorso a definir'));

        const datedCartFlow = await evaluate(`(() => {
            closeModal();
            cart.clearCart();
            document.querySelectorAll('#bandCampaignFeature .band-campaign-feature-card')[1].click();
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            cart.clearCart();
            return { added, frontName: item?.frontName || '', isDouble: item?.isDouble === true, summary };
        })()`);
        assert(datedCartFlow.added, 'No se pudo agregar el frente Buenos Aires 2026');
        assert.equal(datedCartFlow.frontName, 'Frente Buenos Aires 2026');
        assert.equal(datedCartFlow.isDouble, false);
        assert(datedCartFlow.summary.includes('Frente: Buenos Aires 2026'));
        assert(datedCartFlow.summary.includes('Solo frente'));
        assert(datedCartFlow.summary.includes('$37.000'));
        console.log(`Eddie Gaucho: dos frentes y dorso identificados correctamente, ${result.code}`);

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
