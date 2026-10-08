'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = process.env.PAGE_URL || 'http://127.0.0.1:5500/iron-maiden/';

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
    const navigate = async (width, height, mobile) => {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
        const separator = PAGE_URL.includes('?') ? '&' : '?';
        await send('Page.navigate', { url: `${PAGE_URL}${separator}audit=${Date.now()}` });
        await new Promise(resolve => setTimeout(resolve, 500));
        for (let attempt = 0; attempt < 100; attempt += 1) {
            const ready = await evaluate(`document.readyState === 'complete'
                && document.querySelectorAll('#bandCuratedSelection [data-design-id]').length === 16
                && document.querySelectorAll('#productsGrid .catalog-design-card').length === 16`);
            if (ready) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const state = await evaluate(`({
            readyState: document.readyState,
            curated: document.querySelectorAll('#bandCuratedSelection [data-design-id]').length,
            cards: document.querySelectorAll('#productsGrid .catalog-design-card').length,
            heading: document.getElementById('productsCount')?.textContent || '',
            bodyText: document.body?.innerText.slice(0, 200) || '',
            url: location.href
        })`);
        throw new Error(`La landing de Iron Maiden no terminó de cargar: ${JSON.stringify(state)}`);
    };
    const captureSection = async (selector, filename) => {
        const clip = await evaluate(`(() => {
            const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
            return { x: 0, y: rect.top + window.scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
        })()`);
        const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip });
        const output = path.resolve(__dirname, '..', 'reports', filename);
        fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
        return output;
    };

    try {
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await navigate(390, 844, true);
        await evaluate(`Promise.all([...document.querySelectorAll('#bandCuratedSelection img, .band-real-product-proof-item:not([hidden]) img')].map(image => {
            image.loading = 'eager';
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
        }))`);

        const mobile = await evaluate(`(() => {
            const mainChildren = [...document.querySelector('main').children];
            const discovery = document.querySelector('.band-discovery-nav');
            const curated = document.getElementById('bandCuratedSelection');
            const catalog = document.getElementById('catalogoPrincipal');
            const proof = document.getElementById('realProductProof');
            const promo = document.querySelector('.purchase-volume-promo');
            const production = document.querySelector('.production-tracking-strip');
            const garmentSelector = document.querySelector('.band-garment-selector');
            const proofGrid = proof.querySelector('.band-real-product-proof-grid');
            const primaryFilters = [...document.querySelectorAll('#bandLandingCollections [data-band-landing-collection]')];
            const albumFilters = [...document.querySelectorAll('.band-landing-album-filters [data-band-landing-collection]')];
            const curatedCards = [...curated.querySelectorAll('[data-design-id]')];
            return {
                discoveryLinks: discovery.querySelectorAll('button').length,
                discoveryColumns: getComputedStyle(discovery.querySelector('.band-discovery-nav-grid')).gridTemplateColumns.split(' ').length,
                curatedCards: curatedCards.length,
                curatedOrder: curatedCards.map(card => card.dataset.designId),
                curatedColumns: getComputedStyle(curated.querySelector('.band-curated-selection-grid')).gridTemplateColumns.split(' ').length,
                curatedLoaded: curatedCards.every(card => card.querySelector('img').complete && card.querySelector('img').naturalWidth > 0),
                primaryFilters: primaryFilters.map(button => button.textContent.trim()),
                albumFilters: albumFilters.length,
                initialCards: document.querySelectorAll('#productsGrid .catalog-design-card').length,
                totalHeading: document.getElementById('productsCount').textContent.trim(),
                initialOrder: [...document.querySelectorAll('#productsGrid .catalog-design-card')].slice(0, 4).map(card => card.dataset.designId),
                proofCards: proofGrid.children.length,
                proofVisible: proofGrid.querySelectorAll('.band-real-product-proof-item:not([hidden])').length,
                proofToggle: proof.querySelector('.band-real-product-proof-toggle')?.textContent.replace(/\s+/g, ' ').trim() || '',
                proofCounter: proof.querySelector('[data-proof-counter]')?.textContent.trim() || '',
                proofControls: proof.querySelectorAll('.band-real-product-proof-controls button').length,
                proofOverflow: proofGrid.scrollWidth > proofGrid.clientWidth,
                catalogBeforeProof: mainChildren.indexOf(catalog) < mainChildren.indexOf(proof),
                proofBeforePromo: mainChildren.indexOf(proof) < mainChildren.indexOf(promo),
                promoBeforeProduction: mainChildren.indexOf(promo) < mainChildren.indexOf(production),
                garmentSelectorBeforeCatalog: mainChildren.indexOf(garmentSelector) < mainChildren.indexOf(catalog),
                oldCampaignRemoved: !document.getElementById('bandCampaignFeature'),
                oldShowcaseRemoved: !document.getElementById('bandDesignShowcase'),
                oldSinglesRemoved: !document.getElementById('bandSinglesCollection'),
                oldSomewhereRemoved: !document.getElementById('bandFeaturedCollectionTitle'),
                pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                designCountCopy: [...document.querySelectorAll('[data-band-design-count-number]')].map(node => node.textContent.trim()),
                publicDesigns: catalogDesigns.filter(isCatalogDesignInScope).length,
                unorderedDesignIds: catalogDesigns.filter(isCatalogDesignInScope).filter(design => !BAND_LANDING_DESIGN_ORDER_INDEX.has(design.designId)).map(design => design.designId),
                staleOrderIds: BAND_LANDING_DESIGN_ORDER.filter(id => !catalogDesignById.has(id))
            };
        })()`);

        assert.equal(mobile.discoveryLinks, 5);
        assert.equal(mobile.discoveryColumns, 2);
        assert.equal(mobile.curatedCards, 16);
        assert.deepEqual(mobile.curatedOrder.slice(0, 13), [
            'cd-iron-maiden-eddie-gaucho-argentino--p7040',
            'iron-maiden-eddie-tanguero-original-fmd',
            'iron-maiden-eddie-huracan-original-fmd',
            'iron-maiden-run-for-your-lives-fmd-2026',
            'iron-maiden-1980-run-for-your-lives',
            'iron-maiden-killers-1981-run-for-your-lives',
            'iron-maiden-number-of-the-beast-1982-run-for-your-lives',
            'iron-maiden-piece-of-mind-1983-run-for-your-lives',
            'iron-maiden-powerslave-1984-run-for-your-lives',
            'iron-maiden-somewhere-in-time-1986-run-for-your-lives',
            'iron-maiden-seventh-son-1988-run-for-your-lives',
            'iron-maiden-no-prayer-1990-run-for-your-lives',
            'iron-maiden-fear-of-the-dark-1992-run-for-your-lives'
        ]);
        assert.equal(mobile.curatedColumns, 2);
        assert.equal(mobile.curatedLoaded, true);
        assert.equal(mobile.primaryFilters.length, 7);
        assert.equal(mobile.albumFilters, 9);
        assert.equal(mobile.initialCards, 16);
        assert.equal(mobile.totalHeading, '96 DISEÑOS · REMERAS IRON MAIDEN');
        assert.deepEqual(mobile.initialOrder, [
            'cd-iron-maiden-eddie-gaucho-argentino--p7040',
            'iron-maiden-eddie-gaucho-argentino-con-fechas',
            'iron-maiden-eddie-huracan-original-fmd',
            'iron-maiden-eddie-tanguero-original-fmd'
        ]);
        assert.equal(mobile.proofCards, 11);
        assert.equal(mobile.proofVisible, 11);
        assert.equal(mobile.proofToggle, '');
        assert.equal(mobile.proofCounter, '1 / 11');
        assert.equal(mobile.proofControls, 2);
        assert.equal(mobile.proofOverflow, true);
        assert.equal(mobile.catalogBeforeProof, true);
        assert.equal(mobile.proofBeforePromo, true);
        assert.equal(mobile.promoBeforeProduction, true);
        assert.equal(mobile.garmentSelectorBeforeCatalog, true);
        assert.equal(mobile.oldCampaignRemoved, true);
        assert.equal(mobile.oldShowcaseRemoved, true);
        assert.equal(mobile.oldSinglesRemoved, true);
        assert.equal(mobile.oldSomewhereRemoved, true);
        assert.equal(mobile.pageOverflow, false);
        assert.equal(
            mobile.designCountCopy.every(count => count === String(mobile.publicDesigns)),
            true,
            JSON.stringify({ designCountCopy: mobile.designCountCopy, publicDesigns: mobile.publicDesigns })
        );

        const imageAudit = await evaluate(`(async () => {
            const paths = [...new Set(catalogDesigns
                .filter(isCatalogDesignInScope)
                .flatMap(design => [
                    design.front?.image,
                    ...Object.values(design.previewsByGarment || {}).flat().map(ref => ref.image),
                    ...(design.backOptions || []).map(ref => ref.image)
                ])
                .filter(Boolean))];
            const results = await Promise.all(paths.map(async path => ({
                path,
                ok: (await fetch(path)).ok
            })));
            return {
                checked: results.length,
                broken: results.filter(result => !result.ok).map(result => result.path)
            };
        })()`);
        assert.equal(imageAudit.broken.length, 0, `Hay imágenes rotas: ${imageAudit.broken.join(', ')}`);

        const proofCarousel = await evaluate(`(async () => {
            const section = document.getElementById('realProductProof');
            section.scrollIntoView({ block: 'center' });
            section.querySelector('[data-proof-next]').click();
            await new Promise(resolve => setTimeout(resolve, 650));
            const state = {
                counter: section.querySelector('[data-proof-counter]').textContent.trim(),
                scrollLeft: section.querySelector('[data-proof-carousel]').scrollLeft
            };
            section.querySelector('[data-proof-prev]').click();
            return state;
        })()`);
        assert.equal(proofCarousel.counter, '2 / 11');
        assert(proofCarousel.scrollLeft > 0);

        const heroEddiesFilter = await evaluate(`(async () => {
            document.querySelector('.band-landing-secondary-cta').click();
            await new Promise(resolve => setTimeout(resolve, 100));
            return {
                active: document.querySelector('[data-band-landing-collection="eddies-argentinos"]').classList.contains('active'),
                heading: document.getElementById('productsCount').textContent.trim()
            };
        })()`);
        assert.equal(heroEddiesFilter.active, true);
        assert(heroEddiesFilter.heading.startsWith('7 DISEÑOS'));
        await evaluate(`selectBandLandingCollection('')`);

        const garmentAvailability = await evaluate(`(async () => {
            const inspect = async garment => {
                selectBandLandingGarment(garment);
                await new Promise(resolve => setTimeout(resolve, 100));
                const expected = catalogDesigns
                    .filter(isCatalogDesignInScope)
                    .filter(design => (design.availableGarments || []).includes(garment));
                const results = getCatalogDesignResults() || [];
                return {
                    heading: document.getElementById('productsCount').textContent.trim(),
                    cards: document.querySelectorAll('#productsGrid .catalog-design-card').length,
                    expected: expected.length,
                    results: results.length,
                    unavailableShown: results.filter(design => !(design.availableGarments || []).includes(garment)).map(design => design.designId),
                    missing: expected.filter(design => !results.some(result => result.designId === design.designId)).map(design => design.designId)
                };
            };
            const hoodie = await inspect('hoodie');
            const buzo = await inspect('buzo_cuello_redondo');
            const remera = await inspect('remera');
            return { hoodie, buzo, remera };
        })()`);
        assert(garmentAvailability.hoodie.heading.startsWith(`${garmentAvailability.hoodie.expected} `) && garmentAvailability.hoodie.heading.includes('HOODIES'), JSON.stringify(garmentAvailability));
        assert.equal(garmentAvailability.hoodie.cards, Math.min(16, garmentAvailability.hoodie.expected));
        assert.equal(garmentAvailability.hoodie.results, garmentAvailability.hoodie.expected);
        assert.deepEqual(garmentAvailability.hoodie.unavailableShown, []);
        assert.deepEqual(garmentAvailability.hoodie.missing, []);
        assert(garmentAvailability.buzo.heading.startsWith(`${garmentAvailability.buzo.expected} `) && garmentAvailability.buzo.heading.includes('BUZOS'));
        assert.equal(garmentAvailability.buzo.cards, Math.min(16, garmentAvailability.buzo.expected));
        assert.equal(garmentAvailability.buzo.results, garmentAvailability.buzo.expected);
        assert.deepEqual(garmentAvailability.buzo.unavailableShown, []);
        assert.deepEqual(garmentAvailability.buzo.missing, []);
        assert(garmentAvailability.remera.heading.startsWith('96 ') && garmentAvailability.remera.heading.includes('REMERAS'));
        assert.equal(garmentAvailability.remera.cards, 16);

        const collectionCounts = await evaluate(`(async () => {
            const inspect = async collection => {
                selectBandLandingCollection(collection);
                await new Promise(resolve => setTimeout(resolve, 100));
                return document.getElementById('productsCount').textContent.trim();
            };
            const singles = await inspect('singles');
            const originals = await inspect('fmd-originals');
            selectBandLandingCollection('');
            return { singles, originals };
        })()`);
        assert(collectionCounts.singles.startsWith('16 '));
        assert(collectionCounts.originals.startsWith('21 '));

        const fmdFilterVariant = await evaluate(`(() => {
            selectBandLandingGarment('remera');
            selectBandLandingCollection('fmd-originals');
            openCatalogDesign('iron-maiden-aces-high-singles', 'remera');
            const state = {
                collection: bandLandingCollection,
                selectedImage: selectedCatalogFrontRef?.image || '',
                modalImage: getModalImages()[currentSlide]?.img || ''
            };
            closeModal();
            selectBandLandingCollection('');
            return state;
        })()`);
        assert.equal(fmdFilterVariant.collection, 'fmd-originals');
        assert(fmdFilterVariant.selectedImage.includes('FMD ACES'), JSON.stringify(fmdFilterVariant));
        assert(fmdFilterVariant.modalImage.includes('FMD ACES'), JSON.stringify(fmdFilterVariant));

        const latestDesigns = await evaluate(`(() => {
            const inspect = id => {
                openCatalogDesign(id, 'remera');
                const state = {
                    designId: currentCatalogDesign?.designId || '',
                    images: getModalImages().map(item => item.img || ''),
                    backs: (currentCatalogDesign?.backOptions || []).map(item => item.image || '')
                };
                closeModal();
                return state;
            };
            return {
                piece: inspect('iron-maiden-piece-of-mind-1983-run-for-your-lives'),
                killers: inspect('iron-maiden-killers-1981-run-for-your-lives'),
                trooper: inspect('iron-maiden-the-trooper-classic'),
                powerslave: inspect('iron-maiden-powerslave-1984-run-for-your-lives'),
                legacy: inspect('iron-maiden-legacy-of-the-beast-grid'),
                runFmd: inspect('iron-maiden-run-for-your-lives-fmd-2026'),
                pilot: inspect('iron-maiden-eddie-piloto-ed-force-one'),
                argentina: inspect('iron-maiden-eddie-argentina-seleccion-fmd')
            };
        })()`);
        assert(latestDesigns.piece.images.some(image => image.endsWith('iron_maiden_eddie_piece_of_mind.jpg')));
        assert(latestDesigns.piece.images.some(image => image.endsWith('iron_maiden_eddie_piece_of_mind_v2_fmd.jpg')));
        assert(latestDesigns.killers.images.some(image => image.endsWith('iron_maiden_killers_v1.jpg')));
        assert(latestDesigns.killers.images.some(image => image.endsWith('iron_maiden_killers_v2.jpg')));
        assert(latestDesigns.trooper.backs.some(image => image.endsWith('iron_maiden_the_trooper_dorso_classic.jpg')));
        assert(latestDesigns.trooper.backs.some(image => image.endsWith('iron_maiden_the_trooper_dorso_fmd.jpg')));
        assert.equal(latestDesigns.powerslave.images.filter(image => image.includes('iron_maiden_eddie_powerslave')).length, 3);
        for (let version = 3; version <= 7; version += 1) {
            assert(latestDesigns.powerslave.images.some(image => image.endsWith(`Powerslave_v${version}.jpg`)));
        }
        assert(latestDesigns.legacy.images.some(image => image.endsWith('iron_maiden_legacy.jpg')));
        assert(latestDesigns.runFmd.backs.some(image => image.endsWith('iron_maiden_i_saw_eddie_dorso.jpg')));
        assert.equal(latestDesigns.pilot.designId, 'iron-maiden-eddie-piloto-ed-force-one');
        assert.equal(latestDesigns.argentina.designId, 'iron-maiden-eddie-argentina-seleccion-fmd');

        const pieceFmdVariant = await evaluate(`(() => {
            selectBandLandingCollection('fmd-originals');
            openCatalogDesign('iron-maiden-piece-of-mind-1983-run-for-your-lives', 'remera');
            const selectedImage = selectedCatalogFrontRef?.image || '';
            closeModal();
            selectBandLandingCollection('');
            return selectedImage;
        })()`);
        assert(pieceFmdVariant.endsWith('iron_maiden_eddie_piece_of_mind_v2_fmd.jpg'));

        const filterResult = await evaluate(`(async () => {
            selectBandLandingCollection('tour-argentina');
            await new Promise(resolve => setTimeout(resolve, 100));
            return {
                active: document.querySelector('[data-band-landing-collection="tour-argentina"]').classList.contains('active'),
                heading: document.getElementById('productsCount').textContent.trim(),
                cards: document.querySelectorAll('#productsGrid .catalog-design-card').length
            };
        })()`);
        assert.equal(filterResult.active, true);
        assert(filterResult.cards > 0 && filterResult.cards <= 19);
        assert(Number.parseInt(filterResult.heading, 10) >= filterResult.cards);
        await evaluate(`selectBandLandingCollection('')`);

        const gauchoModal = await evaluate(`(() => {
            document.querySelector('#bandCuratedSelection [data-design-id="cd-iron-maiden-eddie-gaucho-argentino--p7040"]').click();
            return {
                active: document.getElementById('modal').classList.contains('active'),
                designId: currentCatalogDesign?.designId || '',
                garments: currentCatalogDesign?.availableGarments || [],
                name: currentCatalogDesign?.publicName || ''
            };
        })()`);
        assert.equal(gauchoModal.active, true);
        assert.equal(gauchoModal.designId, 'cd-iron-maiden-eddie-gaucho-argentino--p7040');
        assert.equal(gauchoModal.name, 'Eddie Gaucho Argentino');
        assert(gauchoModal.garments.includes('remera'));
        assert(gauchoModal.garments.includes('hoodie'));
        assert(gauchoModal.garments.includes('buzo_cuello_redondo'));
        await evaluate(`closeModal()`);

        const fmdVariant = await evaluate(`(() => {
            document.querySelector('#bandCuratedSelection [data-design-id="iron-maiden-aces-high-singles"]').click();
            return {
                designId: currentCatalogDesign?.designId || '',
                selectedImage: selectedCatalogFrontRef?.image || '',
                modalImage: getModalImages()[currentSlide]?.img || ''
            };
        })()`);
        assert.equal(fmdVariant.designId, 'iron-maiden-aces-high-singles');
        assert(fmdVariant.selectedImage.includes('FMD ACES'));
        assert(fmdVariant.modalImage.includes('FMD ACES'));
        const fmdGarmentChange = await evaluate(`(() => {
            selectModalGarment('hoodie');
            return {
                garment: selectedModalGarment,
                selectedImage: selectedCatalogFrontRef?.image || '',
                note: document.querySelector('.modal-preview-reference-note')?.textContent.trim() || '',
                previewRefs: (currentCatalogDesign?.previewsByGarment?.hoodie || []).map(ref => ({ productId: ref.productId, variantIndex: ref.variantIndex, image: ref.image })),
                variantButtons: document.querySelectorAll('#carouselDots .carousel-variant-tab').length,
                arrowsVisible: !document.getElementById('carouselPrev').classList.contains('is-hidden')
                    && !document.getElementById('carouselNext').classList.contains('is-hidden')
            };
        })()`);
        assert.equal(fmdGarmentChange.garment, 'hoodie');
        assert(fmdGarmentChange.selectedImage.includes('FMD ACES'));
        assert(fmdGarmentChange.note.includes('DISPONIBLE EN HOODIE'), JSON.stringify(fmdGarmentChange));
        assert(fmdGarmentChange.variantButtons > 1);
        assert.equal(fmdGarmentChange.arrowsVisible, true);
        await evaluate(`closeModal()`);

        const gauchoBacks = await evaluate(`(() => {
            openCatalogDesign('cd-iron-maiden-eddie-gaucho-argentino--p7040', 'remera');
            selectPrintMode('double');
            const details = document.querySelector('.catalog-design-dorso-all');
            const initial = {
                exists: Boolean(details),
                open: details?.open || false,
                recommended: document.querySelectorAll('.catalog-design-dorso-recommended .catalog-design-dorso-choice').length,
                extra: details?.querySelectorAll('.catalog-design-dorso-choice').length || 0
            };
            if (details) details.open = true;
            const expanded = details?.open || false;
            closeModal();
            return { initial, expanded };
        })()`);
        assert.equal(gauchoBacks.initial.exists, true);
        assert.equal(gauchoBacks.initial.open, false);
        assert(gauchoBacks.initial.recommended > 0);
        assert(gauchoBacks.initial.extra > 0);
        assert.equal(gauchoBacks.expanded, true);

        const homeCustomer = await evaluate(`(() => {
            selectedDeliveryMethod = 'domicilio';
            return buildCustomerDataForWhatsapp({
                nombre: 'Ana', apellido: 'Prueba', telefono: '1122334455', cp: '1425',
                provincia: 'Buenos Aires', localidad: 'CABA', direccion: 'Calle 123'
            });
        })()`);
        assert(homeCustomer.includes('1122334455'));

        const emptySearch = await evaluate(`(async () => {
            const input = document.getElementById('searchInput');
            input.value = 'zzz-sin-resultados-zzz';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            const state = {
                message: document.querySelector('.catalog-empty-state')?.textContent.replace(/\s+/g, ' ').trim() || '',
                button: document.querySelector('.catalog-empty-state button')?.textContent.trim() || ''
            };
            clearCatalogSearch();
            return state;
        })()`);
        assert(emptySearch.message.toUpperCase().includes('NO ENCONTRAMOS'), JSON.stringify(emptySearch));
        assert(emptySearch.button.startsWith('VER TODA LA COLECCI'));

        const est1975 = await evaluate(`(() => {
            const inspect = id => {
                closeModal();
                openCatalogDesign(id, 'remera');
                return {
                    images: getModalImages().map(item => item.img || ''),
                    current: getModalImages()[currentSlide]?.img || ''
                };
            };
            return {
                classic: inspect('iron-maiden-est-1975'),
                piece: inspect('iron-maiden-est-1975-piece-of-mind')
            };
        })()`);
        assert.equal(est1975.classic.images.length, 2);
        assert(est1975.classic.current.includes('remera_iron_maiden_est_1975_frente.jpg'));
        assert(est1975.classic.images.some(image => image.endsWith('remera_iron_maiden_est_1975.jpg')));
        assert.equal(est1975.piece.images.length, 2);
        assert(est1975.piece.current.includes('remera_iron_maiden_est_1975_piece_of_mind_frente.jpg'));
        assert(est1975.piece.images.some(image => image.endsWith('remera_iron_maiden_est_1975_piece_of_mind.jpg')));
        await evaluate(`closeModal()`);

        const est1975Order = await evaluate(`(() => {
            cart.clearCart();
            openCatalogDesign('iron-maiden-est-1975', 'remera');
            const initialMode = selectedPrintMode;
            goToSlide(1, false);
            const combinedMode = selectedPrintMode;
            selectRemeraVariant('hombre_clasica', false);
            selectSize('M');
            selectColor('negro');
            const added = addToCartFromModal();
            const item = cart.getCart().at(-1) || null;
            const summary = cart.generateSummary();
            closeModal();
            cart.clearCart();
            return {
                initialMode,
                combinedMode,
                added,
                isDouble: item?.isDouble,
                usesShownComposition: item?.usesShownComposition,
                hasDoubleCopy: summary.includes('Frente y dorso'),
                hasUndefinedBack: summary.includes('Dorso a definir')
            };
        })()`);
        assert.equal(est1975Order.initialMode, 'simple');
        assert.equal(est1975Order.combinedMode, 'double');
        assert.equal(est1975Order.added, true);
        assert.equal(est1975Order.isDouble, true);
        assert.equal(est1975Order.usesShownComposition, true);
        assert.equal(est1975Order.hasDoubleCopy, true);
        assert.equal(est1975Order.hasUndefinedBack, false);

        const cartScrollReturn = await evaluate(`(async () => {
            selectBandLandingCollection('singles');
            const input = document.getElementById('searchInput');
            input.value = 'aces high';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            window.scrollTo(0, 900);
            const before = window.scrollY;
            openCatalogDesign('iron-maiden-aces-high-singles', 'remera');
            selectRemeraVariant('hombre_clasica');
            selectPrintMode('simple');
            selectSize('M');
            selectColor('negro');
            addToOrderAndOpenCart();
            closeCartPreview();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const state = {
                before,
                after: window.scrollY,
                collection: bandLandingCollection,
                search: document.getElementById('searchInput').value,
                cards: document.querySelectorAll('#productsGrid .catalog-design-card').length,
                cartItems: cart.getCart().length
            };
            cart.clearCart();
            clearCatalogSearch();
            selectBandLandingCollection('');
            return state;
        })()`);
        assert(Math.abs(cartScrollReturn.after - cartScrollReturn.before) < 3, JSON.stringify(cartScrollReturn));
        assert.equal(cartScrollReturn.collection, 'singles');
        assert.equal(cartScrollReturn.search, 'aces high');
        assert(cartScrollReturn.cards > 0);
        assert.equal(cartScrollReturn.cartItems, 1);

        await evaluate(`(async () => {
            for (const image of document.querySelectorAll('#bandCuratedSelection img, #productsGrid img')) {
                image.scrollIntoView({ block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 35));
            }
            window.scrollTo(0, 0);
        })()`);

        const mobileDiscovery = await captureSection('.band-discovery-nav', 'iron-maiden-discovery-mobile.png');
        const mobileCurated = await captureSection('#bandCuratedSelection', 'iron-maiden-curated-mobile.png');
        const mobileArchive = await captureSection('#catalogoPrincipal', 'iron-maiden-archive-mobile.png');
        const mobileProof = await captureSection('#realProductProof', 'iron-maiden-proof-mobile.png');

        await navigate(1440, 1000, false);
        await evaluate(`(async () => {
            for (const image of document.querySelectorAll('#bandCuratedSelection img, .band-real-product-proof-item:not([hidden]) img')) {
                image.scrollIntoView({ block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await Promise.all([...document.querySelectorAll('#bandCuratedSelection img, .band-real-product-proof-item:not([hidden]) img')].map(image => {
                if (image.complete && image.naturalWidth > 0) return Promise.resolve();
                return new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
            }));
            window.scrollTo(0, 0);
        })()`);
        const desktop = await evaluate(`(() => ({
            discoveryColumns: getComputedStyle(document.querySelector('.band-discovery-nav-grid')).gridTemplateColumns.split(' ').length,
            curatedColumns: getComputedStyle(document.querySelector('.band-curated-selection-grid')).gridTemplateColumns.split(' ').length,
            proofOverflow: document.querySelector('.band-real-product-proof-grid').scrollWidth > document.querySelector('.band-real-product-proof-grid').clientWidth,
            proofVisible: document.querySelectorAll('.band-real-product-proof-item:not([hidden])').length,
            pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            catalogCount: document.getElementById('productsCount').textContent.trim()
        }))()`);
        assert.equal(desktop.discoveryColumns, 5);
        assert.equal(desktop.curatedColumns, 4);
        assert.equal(desktop.proofOverflow, true);
        assert.equal(desktop.proofVisible, 11);
        assert.equal(desktop.pageOverflow, false);
        assert.equal(desktop.catalogCount, '96 DISEÑOS · REMERAS IRON MAIDEN');
        const desktopCurated = await captureSection('#bandCuratedSelection', 'iron-maiden-curated-desktop.png');
        const desktopProof = await captureSection('#realProductProof', 'iron-maiden-proof-desktop.png');

        console.log(JSON.stringify({ mobile, imageAudit, proofCarousel, heroEddiesFilter, filterResult, garmentAvailability, collectionCounts, fmdFilterVariant, latestDesigns, pieceFmdVariant, gauchoModal, fmdVariant, fmdGarmentChange, gauchoBacks, emptySearch, est1975, est1975Order, cartScrollReturn, desktop, screenshots: [mobileDiscovery, mobileCurated, mobileArchive, mobileProof, desktopCurated, desktopProof] }, null, 2));
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
