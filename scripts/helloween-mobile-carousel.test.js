'use strict';

const assert = require('node:assert/strict');

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
        const response = JSON.parse(event.data);
        if (!pending.has(response.id)) return;
        const { resolve, reject } = pending.get(response.id);
        pending.delete(response.id);
        response.error ? reject(new Error(response.error.message)) : resolve(response.result);
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
        for (const width of [360, 390]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
            await send('Page.navigate', { url: 'http://127.0.0.1:5500/helloween/' });
            for (let attempt = 0; attempt < 50; attempt++) {
                if (await evaluate("document.readyState === 'complete' && !!document.querySelector('.finished-garments-track.is-carousel')")) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const initial = await evaluate(`(() => {
                const track = document.querySelector('.finished-garments-track');
                const option = document.querySelector('.helloween-featured-option-grid');
                return {
                    viewport: innerWidth,
                    pageWidth: document.documentElement.scrollWidth,
                    galleryOverflow: getComputedStyle(track).overflowX,
                    optionOverflow: getComputedStyle(option).overflowX,
                    galleryCount: track.children.length,
                    optionCount: option.children.length
                };
            })()`);
            assert(initial.galleryCount === 5 && initial.optionCount >= 2, 'Faltan imágenes');
            assert(initial.pageWidth <= initial.viewport, `Desborde horizontal a ${width}px: ${JSON.stringify(initial)}`);
            assert.equal(initial.galleryOverflow, 'hidden');
            assert.equal(initial.optionOverflow, 'hidden');
            const layout = await evaluate(`(() => {
                const top = selector => {
                    const element = document.querySelector(selector);
                    return Math.round(element.getBoundingClientRect().top + scrollY);
                };
                const title = document.getElementById('helloweenPostShowTitle');
                const whatsappIcon = document.querySelector('.band-landing-header .btn-wa-header svg');
                return {
                    firstCard: top('.catalog-design-card'),
                    showcase: top('.band-design-showcase'),
                    hero: top('.helloween-post-show-hero'),
                    featured: top('.helloween-post-show-featured'),
                    selector: top('.band-landing-garment-selector'),
                    titleWidth: title.clientWidth,
                    titleScrollWidth: title.scrollWidth,
                    whatsappIconWidth: whatsappIcon?.getBoundingClientRect().width || 0
                };
            })()`);
            assert(layout.firstCard < 1600, `Primera card demasiado abajo a ${width}px: ${JSON.stringify(layout)}`);
            assert(layout.showcase < layout.hero, 'El carrusel debe abrir la pagina antes del hero');
            assert(layout.firstCard < layout.featured, 'Los productos deben aparecer antes del destacado editorial');
            assert(layout.selector < layout.firstCard, 'El selector de prenda debe estar antes de las cards');
            assert(layout.titleScrollWidth <= layout.titleWidth + 1, `Título recortado: ${JSON.stringify(layout)}`);
            assert(layout.whatsappIconWidth >= 16, 'El acceso a WhatsApp no tiene ícono visible');
            const promo = await evaluate(`(() => {
                const panel = document.querySelector('.july-shipping-promo').getBoundingClientRect();
                const cards = [...document.querySelectorAll('.shipping-promo-options span')].map(card => {
                    const rect = card.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, columns: getComputedStyle(card).gridTemplateColumns.split(' ').length };
                });
                return { panel: { left: panel.left, right: panel.right }, cards };
            })()`);
            assert(promo.cards.every(card => card.columns === 1), `Promo comprimida en columnas a ${width}px: ${JSON.stringify(promo)}`);
            assert(promo.cards.every(card => card.left >= promo.panel.left && card.right <= promo.panel.right), `Promo fuera del panel a ${width}px: ${JSON.stringify(promo)}`);
            if (process.env.FMD_CAPTURE && width === 390) {
                const fs = require('node:fs');
                const os = require('node:os');
                const path = require('node:path');
                await evaluate('scrollTo(0, 0)');
                let shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                fs.writeFileSync(path.join(os.tmpdir(), 'fmd-helloween-showcase-390.png'), Buffer.from(shot.data, 'base64'));
                await evaluate("document.querySelector('.july-shipping-promo').scrollIntoView({block: 'center', behavior: 'instant'})");
                await new Promise(resolve => setTimeout(resolve, 300));
                shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                fs.writeFileSync(path.join(os.tmpdir(), 'fmd-helloween-promo-390.png'), Buffer.from(shot.data, 'base64'));
            }
            const afterNext = await evaluate(`(async () => {
                document.querySelector('[data-finished-next]').click();
                document.querySelector('[data-option-next]').click();
                await new Promise(resolve => setTimeout(resolve, 800));
                return [document.querySelector('[data-finished-counter]').value,
                    document.querySelector('.helloween-featured-option-controls output').value];
            })()`);
            assert.deepEqual(afterNext, ['2 / 5', '2 / 3']);
            const afterSwipe = await evaluate(`(async () => {
                const swipe = element => {
                    const start = new Touch({ identifier: 1, target: element, clientX: 250, clientY: 300 });
                    const end = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 300 });
                    element.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [start], bubbles: true }));
                    element.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end], bubbles: true }));
                };
                swipe(document.querySelector('.finished-garments-track'));
                swipe(document.querySelector('.helloween-featured-option-grid'));
                await new Promise(resolve => setTimeout(resolve, 800));
                document.querySelector('.finished-garments-slide:nth-child(3)').click();
                const opened = document.getElementById('finishedGarmentsLightbox').open;
                document.querySelector('[data-finished-close]').click();
                return [document.querySelector('[data-finished-counter]').value,
                    document.querySelector('.helloween-featured-option-controls output').value,
                    opened, document.getElementById('finishedGarmentsLightbox').open];
            })()`);
            assert.deepEqual(afterSwipe, ['3 / 5', '3 / 3', true, false]);
            console.log(`${width}px: primera card a ${layout.firstCard}px, sin desborde, galería ${afterNext[0]}, opciones Eagle ${afterNext[1]}`);
        }
        const catalogFlow = await evaluate(`(() => {
            const output = [];
            for (const [garment, expectedModal] of [['hoodie', 'hoodie'], ['buzo_cuello_redondo', 'buzo'], ['remera', 'remera_clasica']]) {
                document.querySelector('[data-band-landing-garment="' + garment + '"]').click();
                const firstCard = document.querySelector('.catalog-design-card-main');
                firstCard.click();
                output.push({ garment, selected: selectedModalGarment, cards: document.querySelectorAll('.catalog-design-card').length });
                closeModal();
            }
            document.querySelector('[data-band-landing-collection="show-2026"]').click();
            output.push({ collection: document.getElementById('productsCount').textContent,
                cards: document.querySelectorAll('.catalog-design-card').length });
            return output;
        })()`);
        assert.deepEqual(catalogFlow.slice(0, 3).map(item => item.selected), ['hoodie', 'buzo', 'remera_clasica']);
        assert(catalogFlow.every(item => item.cards > 0), JSON.stringify(catalogFlow));
        assert(catalogFlow[3].collection.includes('DISEÑOS'));
        console.log(`Flujo de compra: filtros remera/hoodie/buzo y modal correctos`);
        const womenSizeGuide = await evaluate(`(() => {
            document.querySelector('[data-band-landing-garment="remera"]').click();
            document.querySelector('.catalog-design-card-main').click();
            selectRemeraVariant('mujer_clasica');
            openSizeGuideForCurrentGarment();
            const result = {
                garmentVariant: getSelectedRemeraVariantId(),
                visible: !document.getElementById('modalSizeGuidePanel').classList.contains('is-hidden'),
                title: document.getElementById('modalSizeGuideTitle').textContent.trim(),
                firstRow: [...document.querySelectorAll('#modalSizeGuideTable tbody tr:first-child td')].map(cell => cell.textContent.trim())
            };
            closeModal();
            return result;
        })()`);
        assert.deepEqual(womenSizeGuide, {
            garmentVariant: 'mujer_clasica',
            visible: true,
            title: 'Remera corte mujer',
            firstRow: ['S', '47', '61']
        });
        console.log('Tabla de medidas de mujer: título y medidas correctos');
        await send('Page.navigate', { url: 'http://127.0.0.1:5500/helloween/?prenda=abrigos#productsGrid' });
        for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate("document.querySelectorAll('.catalog-design-card').length > 0")) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const outerwear = await evaluate(`(async () => {
            const cards = [...document.querySelectorAll('.catalog-design-card')];
            const imageUrls = [...new Set(cards.map(card => card.querySelector('img')?.src).filter(Boolean))];
            const missingImages = (await Promise.all(imageUrls.map(async url => ({ url, ok: (await fetch(url)).ok })))).filter(item => !item.ok);
            return {
                heading: document.getElementById('productsCount').textContent,
                cards: cards.length,
                hoodies: cards.filter(card => card.querySelector('.catalog-design-garments')?.textContent.includes('Hoodie')).length,
                buzos: cards.filter(card => card.querySelector('.catalog-design-garments')?.textContent.includes('Buzo')).length,
                missingImages,
                firstGarment: cards[0]?.querySelector('.catalog-design-card-main')?.getAttribute('onclick')
            };
        })()`);
        assert(outerwear.heading.includes('HOODIES Y BUZOS'), JSON.stringify(outerwear));
        assert(outerwear.hoodies > 0 && outerwear.buzos > 0, JSON.stringify(outerwear));
        assert.equal(outerwear.missingImages.length, 0, JSON.stringify(outerwear));
        assert(outerwear.firstGarment.includes("'hoodie'") || outerwear.firstGarment.includes("'buzo'"));
        const modalGarments = await evaluate(`(() => {
            const cards = [...document.querySelectorAll('.catalog-design-card')];
            const selected = [];
            for (const label of ['Hoodie', 'Buzo']) {
                const card = cards.find(item => item.querySelector('.catalog-design-garments')?.textContent.includes(label));
                card.querySelector('.catalog-design-card-main').click();
                selected.push(selectedModalGarment);
                closeModal();
            }
            return selected;
        })()`);
        assert.deepEqual(modalGarments, ['hoodie', 'buzo']);
        console.log(`Enlace abrigos: ${outerwear.cards} cards, ${outerwear.hoodies} hoodies, ${outerwear.buzos} buzos`);
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
