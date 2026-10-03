'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';

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
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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
        if (String(page.url || '').startsWith(PAGE_URL)) {
            await send('Page.reload', { ignoreCache: true });
        } else {
            await send('Page.navigate', { url: PAGE_URL });
        }
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (await evaluate(`document.readyState === 'complete'
                && document.querySelectorAll('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length === 10`)) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await evaluate(`Promise.all([...document.querySelectorAll('#bandCampaignFeature img, #bandTourCollection img, .band-real-product-proof-grid img')].map(image => {
            image.loading = 'eager';
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
        }))`);

        const result = await evaluate(`(() => {
            const showcase = document.getElementById('bandDesignShowcase');
            const showcaseTrack = document.getElementById('bandDesignShowcaseTrack');
            const proof = document.querySelector('.band-real-product-proof-grid');
            const proofCards = [...proof.children];
            const proofStyle = getComputedStyle(proof);
            const mainSections = [...document.querySelector('main').children];
            const catalog = document.querySelector('.band-landing-catalog');
            const campaignFeature = document.getElementById('bandCampaignFeature');
            const campaignCards = [...campaignFeature.querySelectorAll('.band-campaign-feature-card')];
            const campaignGrid = campaignFeature.querySelector('.band-campaign-feature-gallery');
            const tourCollection = document.getElementById('bandTourCollection');
            const somewhere = document.querySelector('.band-featured-collection:not(.band-tour-collection)');
            const garmentSelector = document.querySelector('.band-landing-garment-selector');
            proofCards[0].click();
            const proofLightboxWorks = document.getElementById('imageModal').classList.contains('active')
                && document.getElementById('imageModalImg').getAttribute('src') === proofCards[0].querySelector('img').getAttribute('src');
            closeImageModal();
            return {
                showcaseCards: showcase.querySelectorAll('.band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length,
                showcaseCopies: showcase.querySelectorAll('.band-design-showcase-card').length,
                showcaseAnimation: getComputedStyle(showcaseTrack).animationName,
                showcaseDuration: getComputedStyle(showcaseTrack).animationDuration,
                showcaseViewportOverflow: getComputedStyle(document.getElementById('bandDesignShowcaseViewport')).overflowX,
                proofCards: proofCards.length,
                proofLabels: proofCards.map(card => card.querySelector('span')?.textContent.trim()),
                proofImagesLoaded: proofCards.every(card => {
                    const image = card.querySelector('img');
                    return image.complete && image.naturalWidth > 0;
                }),
                proofLightboxWorks,
                proofColumns: proofStyle.gridTemplateColumns.split(' ').length,
                firstProofSpansBoth: getComputedStyle(proofCards[0]).gridColumnEnd === '-1',
                proofOverflow: proof.scrollWidth > proof.clientWidth,
                promoCentered: [...document.querySelectorAll('.shipping-promo-options > span')].every(card => {
                    const style = getComputedStyle(card);
                    return style.textAlign === 'center' && style.justifyItems === 'center';
                }),
                promoRowsFillWidth: (() => {
                    const options = document.querySelector('.shipping-promo-options');
                    const rows = [...options.children];
                    const optionsWidth = options.getBoundingClientRect().width;
                    return rows.every(row => Math.abs(row.getBoundingClientRect().width - optionsWidth) < 2);
                })(),
                promoPanelCentered: (() => {
                    const panel = document.querySelector('.july-shipping-promo');
                    const rect = panel.getBoundingClientRect();
                    const viewportWidth = document.documentElement.clientWidth;
                    return Math.abs(rect.left - (viewportWidth - rect.right)) < 2;
                })(),
                tourCollectionHidden: tourCollection === null,
                campaignBeforeShowcase: mainSections.indexOf(campaignFeature) < mainSections.indexOf(showcase),
                campaignCards: campaignCards.length,
                campaignColumns: getComputedStyle(campaignGrid).gridTemplateColumns.split(' ').length,
                campaignPrimarySpansBoth: getComputedStyle(campaignCards[0]).gridColumnEnd === '-1',
                campaignImagesLoaded: campaignCards.every(card => {
                    const image = card.querySelector('img');
                    return image.complete && image.naturalWidth > 0;
                }),
                catalogOrder: [...document.querySelectorAll('.catalog-design-card[data-design-id]')]
                    .slice(0, 8)
                    .map(card => card.dataset.designId),
                catalogBeforeSomewhere: mainSections.indexOf(catalog) < mainSections.indexOf(somewhere),
                somewhereBeforeGarments: mainSections.indexOf(somewhere) < mainSections.indexOf(garmentSelector),
                catalogOwnsAnchor: catalog?.id === 'catalogoPrincipal' && !garmentSelector?.id,
                pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        })()`);

        assert.equal(result.showcaseCards, 10);
        assert.equal(result.showcaseCopies, 20);
        assert.equal(result.showcaseAnimation, 'band-showcase-scroll');
        assert.equal(result.showcaseDuration, '48s');
        assert.equal(result.showcaseViewportOverflow, 'hidden');
        assert.equal(result.proofCards, 17);
        assert.equal(result.proofLabels.length, 17);
        assert.equal(result.proofLabels[0], 'Eddie Gaucho Argentino · Frente');
        assert.equal(result.proofLabels.at(-1), 'Detalle de impresión DTG');
        assert.equal(result.proofImagesLoaded, true);
        assert.equal(result.proofLightboxWorks, true);
        assert.equal(result.proofColumns, 2);
        assert.equal(result.firstProofSpansBoth, true);
        assert.equal(result.proofOverflow, false);
        assert.equal(result.promoCentered, true);
        assert.equal(result.promoRowsFillWidth, true);
        assert.equal(result.promoPanelCentered, true);
        assert.equal(result.tourCollectionHidden, true);
        assert.equal(result.campaignBeforeShowcase, true);
        assert.equal(result.campaignCards, 3);
        assert.equal(result.campaignColumns, 2);
        assert.equal(result.campaignPrimarySpansBoth, true);
        assert.equal(result.campaignImagesLoaded, true);
        assert.deepEqual(result.catalogOrder.slice(0, 3), [
            'iron-maiden-1980-run-for-your-lives',
            'iron-maiden-burning-ambition-edicion-fmd',
            'iron-maiden-killers-1981-run-for-your-lives'
        ]);
        assert.equal(result.catalogBeforeSomewhere, true);
        assert.equal(result.somewhereBeforeGarments, true);
        assert.equal(result.catalogOwnsAnchor, true);
        assert.equal(result.pageOverflow, false);

        const somewhereFeature = await evaluate(`(() => {
            const cards = [...document.querySelectorAll('.band-featured-collection:not(.band-tour-collection) .band-featured-collection-card')];
            const doubleCard = cards.find(card => card.querySelector('img')?.src.includes('iron_maiden_somewhere_fmd_doble.jpg'));
            doubleCard?.click();
            return {
                cardCount: cards.length,
                hasDoubleCard: Boolean(doubleCard),
                modalActive: document.getElementById('modal').classList.contains('active'),
                designId: currentCatalogDesign?.designId || '',
                printMode: selectedPrintMode,
                front: selectedCatalogFrontRef?.previewLabel || selectedCatalogFrontRef?.label || '',
                back: selectedCatalogBackRef?.selectionLabel || selectedCatalogBackRef?.label || '',
                slide: getModalImages()[currentSlide]?.img || '',
                price: document.getElementById('modalPrice')?.textContent.trim() || ''
            };
        })()`);
        assert.equal(somewhereFeature.cardCount, 5);
        assert.equal(somewhereFeature.hasDoubleCard, true);
        assert.equal(somewhereFeature.modalActive, true);
        assert.equal(somewhereFeature.designId, 'iron-maiden-somewhere-in-time-40th-fmd');
        assert.equal(somewhereFeature.printMode, 'double');
        assert.equal(somewhereFeature.front, 'Frente + dorso Eddie cósmico');
        assert.equal(somewhereFeature.back, 'Dorso Eddie cósmico');
        assert(somewhereFeature.slide.includes('iron_maiden_somewhere_fmd_doble.jpg'));
        assert(somewhereFeature.price.includes('$45.000'));
        await evaluate(`closeModal()`);

        const showcaseFeature = await evaluate(`(() => {
            const card = document.querySelector('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) [data-design-id="iron-maiden-run-for-your-lives-2026-oficial"]');
            card?.click();
            return {
                modalActive: document.getElementById('modal').classList.contains('active'),
                designId: currentCatalogDesign?.designId || '',
                slide: getModalImages()[currentSlide]?.img || ''
            };
        })()`);
        assert.equal(showcaseFeature.modalActive, true);
        assert.equal(showcaseFeature.designId, 'iron-maiden-run-for-your-lives-2026-oficial');
        assert(showcaseFeature.slide.includes('eddie_run_for_your_lives_tour/remera_iron_maiden_run_oficial.jpg'));
        await evaluate(`closeModal()`);

        const campaignRect = await evaluate(`(() => {
            const section = document.getElementById('bandCampaignFeature');
            const rect = section.getBoundingClientRect();
            return { x: 0, y: rect.top + window.scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
        })()`);
        const campaignScreenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: true,
            clip: campaignRect
        });
        const campaignOutput = path.resolve(__dirname, '..', 'reports', 'iron-maiden-eddies-argentinos-mobile.png');
        fs.writeFileSync(campaignOutput, Buffer.from(campaignScreenshot.data, 'base64'));

        await evaluate(`document.getElementById('bandDesignShowcase').scrollIntoView({ block: 'start' })`);
        await new Promise(resolve => setTimeout(resolve, 1800));
        const showcaseMotionStart = await evaluate(`getComputedStyle(document.getElementById('bandDesignShowcaseTrack')).transform`);
        await new Promise(resolve => setTimeout(resolve, 600));
        const showcaseMotionEnd = await evaluate(`getComputedStyle(document.getElementById('bandDesignShowcaseTrack')).transform`);
        const showcasePlayback = await evaluate(`getComputedStyle(document.getElementById('bandDesignShowcaseTrack')).animationPlayState`);
        assert.notEqual(showcaseMotionStart, showcaseMotionEnd);
        assert.equal(showcasePlayback, 'running');
        const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: false
        });
        const output = path.resolve(__dirname, '..', 'reports', 'iron-maiden-grid-mobile.png');
        fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));

        await evaluate(`Promise.all([...document.querySelectorAll('.band-real-product-proof-grid img')].map(image => {
            image.loading = 'eager';
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
        }))`);
        const proofRect = await evaluate(`(() => {
            const section = document.getElementById('realProductProof');
            const rect = section.getBoundingClientRect();
            return { x: 0, y: rect.top + window.scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
        })()`);
        const proofScreenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: true,
            clip: proofRect
        });
        const proofOutput = path.resolve(__dirname, '..', 'reports', 'iron-maiden-proof-grid-mobile.png');
        fs.writeFileSync(proofOutput, Buffer.from(proofScreenshot.data, 'base64'));

        await send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: false
        });
        await send('Page.navigate', { url: PAGE_URL });
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (await evaluate(`document.readyState === 'complete'
                && document.querySelectorAll('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length === 10`)) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const desktop = await evaluate(`(() => {
            const showcase = document.getElementById('bandDesignShowcase');
            const set = showcase.querySelector('.band-design-showcase-set');
            const proof = document.querySelector('.band-real-product-proof-grid');
            const campaignFeature = document.getElementById('bandCampaignFeature');
            return {
                showcaseCards: set.querySelectorAll('.band-design-showcase-card').length,
                showcaseAnimation: getComputedStyle(showcase.querySelector('.band-design-showcase-track')).animationName,
                proofColumns: getComputedStyle(proof).gridTemplateColumns.split(' ').length,
                tourCollectionHidden: document.getElementById('bandTourCollection') === null,
                campaignCards: campaignFeature.querySelectorAll('.band-campaign-feature-card').length,
                campaignColumns: getComputedStyle(campaignFeature.querySelector('.band-campaign-feature-gallery')).gridTemplateColumns.split(' ').length,
                pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        })()`);
        const desktopCampaignRect = await evaluate(`(() => {
            const section = document.getElementById('bandCampaignFeature');
            const rect = section.getBoundingClientRect();
            return { x: 0, y: rect.top + window.scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
        })()`);
        const desktopCampaignScreenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: true,
            clip: desktopCampaignRect
        });
        const desktopCampaignOutput = path.resolve(__dirname, '..', 'reports', 'iron-maiden-eddies-argentinos-desktop.png');
        fs.writeFileSync(desktopCampaignOutput, Buffer.from(desktopCampaignScreenshot.data, 'base64'));
        assert.equal(desktop.showcaseCards, 10);
        assert.equal(desktop.showcaseAnimation, 'band-showcase-scroll');
        assert.equal(desktop.proofColumns, 3);
        assert.equal(desktop.tourCollectionHidden, true);
        assert.equal(desktop.campaignCards, 3);
        assert.equal(desktop.campaignColumns, 3);
        assert.equal(desktop.pageOverflow, false);
        console.log(JSON.stringify({ mobile: result, desktop, showcaseMotion: { start: showcaseMotionStart, end: showcaseMotionEnd, playback: showcasePlayback }, screenshots: [campaignOutput, desktopCampaignOutput, output, proofOutput] }, null, 2));
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
