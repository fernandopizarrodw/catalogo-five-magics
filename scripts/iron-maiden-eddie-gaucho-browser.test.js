'use strict';

const assert = require('node:assert/strict');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';
const FRONT_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_frente.jpg';
const DATED_FRONT_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino_con_fecha.jpg';
const BACK_IMAGE = '/images/iron_maiden/dorsos opcionales/remera_iron_maiden_eddie_gaucho_argentino_dorso.jpg';
const COMBINED_IMAGE = '/images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino.jpg';
const TANGUERO_FRONT_IMAGE = '/images/iron_maiden/iron_maiden_eddie_tanguero.jpg';
const TANGUERO_COMBINED_IMAGE = '/images/iron_maiden/iron_maiden_eddie_tanguero_doble.jpg';
const TANGUERO_BACK_IMAGE = '/images/iron_maiden/dorsos opcionales/iron_maiden_dorso_eddie_tanguero.jpg';

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
    const runtimeErrors = [];
    socket.addEventListener('message', event => {
        const response = JSON.parse(event.data);
        if (response.method === 'Runtime.exceptionThrown') {
            runtimeErrors.push(response.params?.exceptionDetails?.exception?.description || response.params?.exceptionDetails?.text || 'Error de runtime');
        }
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
        if (result.exceptionDetails) {
            const detail = result.exceptionDetails.exception?.description
                || result.exceptionDetails.exception?.value
                || result.exceptionDetails.text;
            throw new Error(detail);
        }
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
        if (String(page.url || '').startsWith(PAGE_URL)) {
            await evaluate(`window.__fmdTestBeforeReload = true`);
            await send('Page.reload', { ignoreCache: true });
        } else {
            await send('Page.navigate', { url: PAGE_URL });
        }
        let pageReady = false;
        for (let attempt = 0; attempt < 80; attempt++) {
            const ready = await evaluate(`document.readyState === 'complete'
                && window.__fmdTestBeforeReload !== true
                && typeof catalogDesigns !== 'undefined'
                && catalogDesigns.some(item => item.designId === 'cd-iron-maiden-eddie-gaucho-argentino--p7040')`);
            if (ready) {
                pageReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(pageReady, `La página no terminó de iniciar: ${runtimeErrors.join(' | ')}`);

        const result = await evaluate(`(() => {
            const design = catalogDesigns.find(item => item.designId === 'cd-iron-maiden-eddie-gaucho-argentino--p7040');
            if (!design) return { error: 'Eddie Gaucho no encontrado' };
            const datedDesign = catalogDesigns.find(item => item.designId === 'iron-maiden-eddie-gaucho-argentino-con-fechas');
            if (!datedDesign) return { error: 'Eddie Gaucho con fechas no encontrado' };
            const tangueroDesign = catalogDesigns.find(item => item.designId === 'iron-maiden-eddie-tanguero-original-fmd');
            if (!tangueroDesign) return { error: 'Eddie Tanguero no encontrado' };
            loadMoreCatalogDesigns();
            loadMoreCatalogDesigns();
            const card = document.querySelector('.catalog-design-card[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]');
            const feature = document.getElementById('bandCampaignFeature');
            feature.querySelector('.band-campaign-feature-cta')?.click();
            const featureOpenedDesign = currentCatalogDesign?.designId || '';
            closeModal();
            feature.querySelector('.band-campaign-feature-card')?.click();
            selectPrintMode('double');
            const modalImages = getModalImages().map(item => item.img || '');
            const backSelectorImages = [...document.querySelectorAll('#dorsoVariantsGrid img')]
                .map(image => image.getAttribute('src') || '');
            const featureImages = [...feature.querySelectorAll('.band-campaign-feature-card img')]
                .map(image => image.getAttribute('src') || '');
            const paths = [...featureImages, design.front.image, design.backOptions[0]?.image, datedDesign.front.image, tangueroDesign.front.image, tangueroDesign.backOptions[0]?.image].filter(Boolean);
            return {
                heroIsFirst: document.querySelector('main > section')?.classList.contains('band-landing-hero') === true,
                featureIsSecond: document.querySelectorAll('main > section')[1] === feature,
                tourCollectionIsThird: document.querySelectorAll('main > section')[2]?.id === 'bandTourCollection',
                tourCollectionCardCount: document.querySelectorAll('#bandTourCollection .band-featured-collection-card').length,
                showcaseFollowsTourCollection: document.querySelectorAll('main > section')[3]?.id === 'bandDesignShowcase',
                showcaseCardCount: document.querySelectorAll('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length,
                featureImages,
                featureCardCount: feature.querySelectorAll('.band-campaign-feature-card').length,
                featureCtaLabel: feature.querySelector('.band-campaign-feature-cta')?.textContent.trim() || '',
                featureOpenedDesign,
                horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                catalogCardCount: document.querySelectorAll('.catalog-design-card[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]').length,
                datedCatalogCardCount: document.querySelectorAll('.catalog-design-card[data-design-id="iron-maiden-eddie-gaucho-argentino-con-fechas"]').length,
                cardImage: card?.querySelector('img')?.getAttribute('src') || '',
                code: document.getElementById('displayCode')?.textContent.trim() || '',
                front: design.front.image,
                remeraFronts: design.previewsByGarment.remera.map(item => ({ image: item.image, label: item.selectionLabel })),
                datedFront: datedDesign.front.image,
                backs: design.backOptions.map(item => item.image),
                modalImages,
                modalLabels: getModalImages().map(item => item.name || ''),
                backSelectorImages,
                availableGarments: design.availableGarments,
                hoodieCatalogDesigns: catalogDesigns.filter(item => item.designId === 'iron-maiden-eddie-gaucho-argentino-hoodie').length,
                buzoCatalogDesigns: catalogDesigns.filter(item => item.designId === 'iron-maiden-eddie-gaucho-argentino-buzo').length,
                imagePaths: paths
            };
        })()`);

        assert(!result.error, result.error);
        assert(result.heroIsFirst, 'El hero de campaña no aparece primero');
        assert(result.featureIsSecond, 'La saga Eddies Argentinos no aparece inmediatamente después del hero');
        assert(result.tourCollectionIsThird, 'La colección de Eddie Tour no aparece después de la saga Eddies Argentinos');
        assert.equal(result.tourCollectionCardCount, 9, 'La colección de Eddie Tour no contiene nueve diseños');
        assert(result.showcaseFollowsTourCollection, 'Los destacados generales no aparecen después de la colección Eddie Tour');
        assert.equal(result.showcaseCardCount, 10, 'La selección de campaña no muestra el tour y los nueve discos');
        assert.equal(result.featureCardCount, 2);
        assert.deepEqual(result.featureImages, [COMBINED_IMAGE, TANGUERO_COMBINED_IMAGE]);
        assert.equal(result.featureCtaLabel, 'DESCUBRIR EDDIE TANGUERO');
        assert.equal(result.featureOpenedDesign, 'iron-maiden-eddie-tanguero-original-fmd');
        assert.equal(result.horizontalOverflow, false, 'La sección genera desborde horizontal en mobile');
        assert.equal(result.catalogCardCount, 1, 'Eddie Gaucho se duplicó en el catálogo');
        assert.equal(result.datedCatalogCardCount, 1, 'El frente con fechas no quedó como card independiente');
        assert.equal(result.front, FRONT_IMAGE);
        assert.deepEqual(result.remeraFronts, [
            { image: FRONT_IMAGE, label: 'Frente clásico' },
            { image: COMBINED_IMAGE, label: 'Frente clásico' }
        ]);
        assert.equal(result.datedFront, DATED_FRONT_IMAGE);
        assert.deepEqual(result.backs, [BACK_IMAGE]);
        assert(result.cardImage.includes(FRONT_IMAGE));
        assert.equal(result.code, 'IMEGAF-7040.V1');
        assert(result.modalImages.some(path => path.includes(FRONT_IMAGE)));
        assert.deepEqual(result.modalImages, [FRONT_IMAGE, BACK_IMAGE, COMBINED_IMAGE]);
        assert.deepEqual(result.modalLabels, ['Frente solo', 'Dorso solo', 'Frente y dorso']);
        assert.deepEqual(result.availableGarments, ['remera']);
        assert.equal(result.hoodieCatalogDesigns, 1, 'El hoodie Gaucho no aparece como ficha independiente');
        assert.equal(result.buzoCatalogDesigns, 1, 'El buzo Gaucho no aparece como ficha independiente');
        assert(!result.modalImages.some(path => path.includes(DATED_FRONT_IMAGE)), 'El frente con fechas aparece dentro del modal destacado');
        assert(result.modalImages.some(path => path.includes(COMBINED_IMAGE)));
        assert(result.backSelectorImages.some(path => path.includes(BACK_IMAGE)));
        const imageResponses = await Promise.all(result.imagePaths.map(async path => ({
            path,
            ok: (await fetch(new URL(path, PAGE_URL))).ok
        })));
        const brokenImages = imageResponses.filter(response => !response.ok).map(response => response.path);
        assert.equal(brokenImages.length, 0, `Alguna imagen de la saga no carga: ${brokenImages.join(', ')}`);
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
                summary: document.getElementById('modalOrderSummary')?.textContent.replace(/\\s+/g, ' ').trim() || '',
                visualVisible: document.getElementById('modalOrderVisualPreview')?.hidden === false,
                visualImages: [...document.querySelectorAll('#modalOrderVisualPreview img')].map(image => image.getAttribute('src') || ''),
                backPreviewButtons: document.querySelectorAll('.catalog-design-dorso-preview').length
            });

            closeModal();
            featureCards[0].click();
            const combined = snapshot();

            closeModal();
            document.querySelector('[data-design-id="iron-maiden-eddie-gaucho-argentino-con-fechas"] .catalog-design-card-main').click();
            const datedFront = snapshot();

            closeModal();
            featureCards[1].click();
            const tangueroDouble = snapshot();

            closeModal();
            feature.querySelector('.band-campaign-feature-cta').click();
            const cta = snapshot();

            closeModal();
            document.querySelector('[data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"] .catalog-design-card-main').click();
            const catalogCard = snapshot();

            return { combined, datedFront, tangueroDouble, cta, catalogCard };
        })()`);

        assert.equal(entryFlow.combined.printMode, 'double');
        assert.equal(entryFlow.combined.back, 'Dorso Buenos Aires 2026');
        assert.equal(entryFlow.combined.front, 'Frente clásico');
        assert(entryFlow.combined.slide.includes(COMBINED_IMAGE));
        assert(entryFlow.combined.price.includes('$45.000'));
        assert.equal(entryFlow.combined.visualVisible, true);
        assert.equal(entryFlow.combined.visualImages.length, 2);
        assert(entryFlow.combined.visualImages.some(path => path.includes(FRONT_IMAGE)));
        assert(entryFlow.combined.visualImages.some(path => path.includes(BACK_IMAGE)));
        assert(entryFlow.combined.backPreviewButtons > 0);
        assert.equal(entryFlow.datedFront.printMode, 'simple');
        assert.equal(entryFlow.datedFront.visualVisible, false);
        assert.equal(entryFlow.datedFront.back, '');
        assert.equal(entryFlow.datedFront.front, 'Frente con fechas');
        assert(entryFlow.datedFront.slide.includes(DATED_FRONT_IMAGE));
        assert(entryFlow.datedFront.price.includes('$38.000'));
        for (const tangueroEntry of [entryFlow.tangueroDouble, entryFlow.cta]) {
            assert.equal(tangueroEntry.designId, 'iron-maiden-eddie-tanguero-original-fmd');
            assert.equal(tangueroEntry.printMode, 'double');
            assert.equal(tangueroEntry.front, 'Frente Eddie Tanguero');
            assert.equal(tangueroEntry.back, 'Dorso Eddie Tanguero · Buenos Aires 2026');
            assert(tangueroEntry.slide.includes(TANGUERO_COMBINED_IMAGE));
            assert(tangueroEntry.price.includes('$45.000'));
            assert.equal(tangueroEntry.visualVisible, true);
            assert(tangueroEntry.visualImages.some(path => path.includes(TANGUERO_FRONT_IMAGE)));
            assert(tangueroEntry.visualImages.some(path => path.includes('iron_maiden_dorso_eddie_tanguero.jpg')));
        }
        assert.equal(entryFlow.catalogCard.printMode, 'simple');
        assert.equal(entryFlow.catalogCard.back, '');
        assert.equal(entryFlow.catalogCard.front, 'Frente clásico');
        assert(entryFlow.catalogCard.slide.includes(FRONT_IMAGE));
        assert(entryFlow.catalogCard.price.includes('$38.000'));

        const tangueroOrder = await evaluate(`(() => {
            closeModal();
            cart.clearCart();
            openCatalogDesignPreview('iron-maiden-eddie-tanguero-original-fmd', 'remera', 'double', '${TANGUERO_COMBINED_IMAGE}');
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            return {
                added,
                code: item?.frontCode || '',
                isDouble: item?.isDouble === true,
                frontName: item?.frontName || '',
                backName: item?.backName || '',
                frontImage: item?.frontImage || '',
                backImage: item?.backImage || ''
            };
        })()`);
        assert.equal(tangueroOrder.added, true);
        assert.equal(tangueroOrder.isDouble, true);
        assert(tangueroOrder.code.includes('7258.V1'));
        assert.equal(tangueroOrder.frontName, 'Frente Eddie Tanguero');
        assert.equal(tangueroOrder.backName, 'Dorso Eddie Tanguero · Buenos Aires 2026');
        assert(tangueroOrder.frontImage.includes(TANGUERO_FRONT_IMAGE));
        assert(tangueroOrder.backImage.includes('iron_maiden_dorso_eddie_tanguero.jpg'));

        const backZoom = await evaluate(`(async () => {
            closeModal();
            openCatalogDesign('cd-iron-maiden-eddie-gaucho-argentino--p7040', 'remera');
            selectPrintMode('double');
            const button = document.querySelector('.catalog-design-dorso-preview');
            button?.click();
            await new Promise(resolve => setTimeout(resolve, 30));
            const result = {
                buttonLabel: button?.textContent.trim() || '',
                active: document.getElementById('zoomOverlay')?.classList.contains('active') === true,
                image: document.getElementById('zoomImg')?.getAttribute('src') || ''
            };
            closeZoom();
            return result;
        })()`);
        assert.equal(backZoom.buttonLabel, 'VER GRANDE');
        assert.equal(backZoom.active, true);
        assert(backZoom.image.includes(BACK_IMAGE));

        const cartFlow = await evaluate(`(() => {
            cart.clearCart();
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            selectPrintMode('double');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            renderCartPreview();
            const reviewImages = [...document.querySelectorAll('.cart-preview-item-visuals img')].map(image => image.getAttribute('src') || '');
            const reviewLabels = [...document.querySelectorAll('.cart-preview-item-visuals span')].map(label => label.textContent.trim());
            const storedFrontImage = item?.frontImage || '';
            const storedBackImage = item?.backImage || '';
            cart.clearCart();
            return { added, frontCode: item?.frontCode || '', backName: item?.backName || '', summary, storedFrontImage, storedBackImage, reviewImages, reviewLabels };
        })()`);
        assert(cartFlow.added, 'No se pudo agregar Eddie Gaucho con frente y dorso');
        assert.equal(cartFlow.frontCode, 'IMEGAF-7040.V1');
        assert.equal(cartFlow.backName, 'Dorso Buenos Aires 2026');
        assert(cartFlow.storedFrontImage.includes(FRONT_IMAGE));
        assert(cartFlow.storedBackImage.includes(BACK_IMAGE));
        assert.equal(cartFlow.reviewImages.length, 2);
        assert.deepEqual(cartFlow.reviewLabels, ['FRENTE', 'DORSO']);
        assert(cartFlow.summary.includes('Frente: clásico'));
        assert(cartFlow.summary.includes('Dorso: Dorso Buenos Aires 2026'));
        assert(cartFlow.summary.includes('$45.000'));
        assert(!cartFlow.summary.includes('Dorso a definir'));

        const datedCartFlow = await evaluate(`(() => {
            closeModal();
            cart.clearCart();
            openCatalogDesign('iron-maiden-eddie-gaucho-argentino-con-fechas', 'remera');
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1);
            const summary = cart.generateSummary();
            cart.clearCart();
            return { added, frontCode: item?.frontCode || '', frontName: item?.frontName || '', isDouble: item?.isDouble === true, summary };
        })()`);
        assert(datedCartFlow.added, 'No se pudo agregar el frente Buenos Aires 2026');
        assert.equal(datedCartFlow.frontCode, 'IMEGAF-7040.V2');
        assert.equal(datedCartFlow.frontName, 'Frente con fechas');
        assert.equal(datedCartFlow.isDouble, false);
        assert(datedCartFlow.summary.includes('Frente: con fechas'));
        assert(datedCartFlow.summary.includes('Solo frente'));
        assert(datedCartFlow.summary.includes('$38.000'));

        const combinedCartFlow = await evaluate(`(() => {
            closeModal();
            cart.clearCart();
            openCatalogDesign('cd-iron-maiden-eddie-gaucho-argentino--p7040', 'remera');
            const combinedSlide = getModalImages().findIndex(item => String(item.img || '').includes('${COMBINED_IMAGE}'));
            goToSlide(combinedSlide, false);
            selectRemeraVariant('hombre_clasica');
            selectSize('M');
            selectColor('negro');
            const state = {
                printMode: selectedPrintMode,
                front: selectedCatalogFrontRef?.selectionLabel || '',
                back: selectedCatalogBackRef?.selectionLabel || selectedCatalogBackRef?.label || '',
                code: document.getElementById('displayCode')?.textContent.trim() || ''
            };
            const added = addToCartFromModal();
            const summary = cart.generateSummary();
            cart.clearCart();
            return { ...state, added, summary };
        })()`);
        assert.equal(combinedCartFlow.printMode, 'double');
        assert.equal(combinedCartFlow.front, 'Frente clásico');
        assert.equal(combinedCartFlow.back, 'Dorso Buenos Aires 2026');
        assert.equal(combinedCartFlow.code, 'IMEGAF-7040.V1');
        assert(combinedCartFlow.added, 'No se pudo agregar el mock combinado de Eddie Gaucho');
        assert(combinedCartFlow.summary.includes('Frente: clásico'));
        assert(combinedCartFlow.summary.includes('Dorso: Dorso Buenos Aires 2026'));
        assert(combinedCartFlow.summary.includes('$45.000'));

        const codeSearchFlow = await evaluate(`(() => {
            closeModal();
            const opened = openExactCodeMatch('IMEGAF-7040.V2');
            return {
                opened,
                front: selectedCatalogFrontRef?.selectionLabel || '',
                code: document.getElementById('displayCode')?.textContent.trim() || ''
            };
        })()`);
        assert.equal(codeSearchFlow.opened, true);
        assert.equal(codeSearchFlow.front, 'Frente con fechas');
        assert.equal(codeSearchFlow.code, 'IMEGAF-7040.V2');
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
            const primaryChoices = [...document.querySelectorAll('.catalog-design-dorso-recommended .catalog-design-dorso')];
            const availableBacks = getCatalogDesignBackChoices();
            const visibleBacks = [...document.querySelectorAll('#dorsoVariantsGrid .catalog-design-dorso')];
            const hiddenBackGroups = document.querySelectorAll('#dorsoVariantsGrid details').length;
            const whatsappBackButton = document.querySelector('.catalog-design-dorso-whatsapp')?.textContent.trim() || '';
            const selectedBack = selectedCatalogBackRef?.label || '';
            const modalImages = getModalImages().map(item => item.img || '');
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
                primaryChoiceCount: primaryChoices.length,
                availableBackCount: availableBacks.length,
                visibleBackCount: visibleBacks.length,
                hiddenBackGroups,
                whatsappBackButton,
                modalImages,
                selectedBack,
                addedWithBack,
                selectedItemCode: selectedItem?.frontCode || '',
                selectedItemBack: selectedItem?.backName || '',
                selectedSummary,
                addedDeferred,
                deferredItemBack: deferredItem?.backName || '',
                deferredSummary
            };
        })()`);

        assert(!circularFlow.error, circularFlow.error);
        assert.equal(circularFlow.primaryChoiceCount, 1, 'Eddie Circular no muestra su dorso recomendado');
        assert.equal(circularFlow.visibleBackCount, circularFlow.availableBackCount, 'No se muestran todos los dorsos disponibles');
        assert.equal(circularFlow.hiddenBackGroups, 0, 'Todavía hay dorsos ocultos en un desplegable');
        assert.equal(circularFlow.whatsappBackButton, 'ELEGIR OTRO DORSO POR WHATSAPP');
        assert(circularFlow.modalImages.some(image => image.includes('remera_iron_maiden_dorso_run_for_your_lives.jpg')));
        assert.equal(circularFlow.selectedBack, 'Dorso Run For Your Lives');
        assert(circularFlow.addedWithBack && circularFlow.selectedBack, 'No se pudo elegir un dorso');
        assert.equal(circularFlow.selectedItemCode, 'IMFECF-7019');
        assert.equal(circularFlow.selectedItemBack, circularFlow.selectedBack);
        assert(circularFlow.selectedSummary.includes(`Dorso: ${circularFlow.selectedBack}`));
        assert(circularFlow.addedDeferred, 'No se pudo dejar el dorso a definir');
        assert.equal(circularFlow.deferredItemBack, 'A definir por WhatsApp');
        assert(circularFlow.deferredSummary.includes('Dorso a definir'));
        const tourSuggestion = await evaluate(`(() => {
            closeModal();
            const design = catalogDesigns.find(item => item.designId === 'iron-maiden-piece-of-mind-1983-run-for-your-lives');
            if (!design) return { error: 'Piece of Mind del tour no encontrado' };
            openCatalogDesign(design.designId, 'remera');
            selectPrintMode('double');
            const recommended = getCatalogDesignBackChoices().filter(item => item.backType === 'Recomendado');
            return {
                count: recommended.length,
                label: recommended[0]?.label || '',
                image: recommended[0]?.image || ''
            };
        })()`);
        assert(!tourSuggestion.error, tourSuggestion.error);
        assert.equal(tourSuggestion.count, 1);
        assert.equal(tourSuggestion.label, 'Dorso Run For Your Lives');
        assert(tourSuggestion.image.includes('remera_iron_maiden_dorso_run_for_your_lives.jpg'));
        console.log('Eddie Circular: dorso en carrusel y recomendación para diseños del tour correctos');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
