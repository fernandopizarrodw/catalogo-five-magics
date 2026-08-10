'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9333';
const SITE_ORIGIN = 'http://127.0.0.1:5500';
const UTM_QUERY = '?utm_source=instagram&utm_medium=social&utm_campaign=nightwish_landing_test';
const LANDING_URL = `${SITE_ORIGIN}/nightwish/${UTM_QUERY}`;
const ROOT = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connectCdp() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('Chrome local no tiene una pagina disponible.');

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
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
    });

    function send(method, params = {}) {
        const id = ++sequence;
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    }

    async function evaluate(expression) {
        const result = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        }
        return result.result.value;
    }

    async function navigate(url, readyExpression = "document.readyState === 'complete'") {
        await send('Page.navigate', { url });
        for (let attempt = 0; attempt < 70; attempt += 1) {
            await delay(120);
            if (await evaluate(readyExpression)) return;
        }
        throw new Error(`Timeout cargando ${url}`);
    }

    return { socket, send, evaluate, navigate };
}

function assert(condition, message, failures) {
    if (!condition) failures.push(message);
}

async function setViewport(cdp, width, height, mobile) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
    });
}

async function main() {
    const failures = [];
    const results = {};
    const landingHtml = fs.readFileSync(path.join(ROOT, 'nightwish', 'index.html'), 'utf8');
    const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));
    const nightwishProduct = products.find(product => Number(product.id) === 5012);
    const nightwishVariants = nightwishProduct?.variants || [];
    const designSlugs = new Map();
    nightwishVariants.forEach(variant => {
        if (!designSlugs.has(variant.designId)) designSlugs.set(variant.designId, variant.designSlug);
    });
    const missingImages = nightwishVariants
        .filter(variant => !fs.existsSync(path.join(ROOT, variant.img)))
        .map(variant => variant.img);
    const missingAlt = nightwishVariants.filter(variant => !variant.alt?.trim()).length;
    const getGarment = variant => {
        const searchable = `${variant.garmentCategory || ''} ${variant.name || ''} ${variant.img || ''}`.toLowerCase();
        if (searchable.includes('hoodie')) return 'hoodie';
        if (searchable.includes('buzo')) return 'buzo';
        return 'remera';
    };
    const expectedGarmentCounts = Object.fromEntries(['hoodie', 'buzo', 'remera'].map(garment => [
        garment,
        new Set(nightwishVariants.filter(variant => getGarment(variant) === garment).map(variant => variant.designId)).size
    ]));

    results.static = {
        generated: landingHtml.includes('scripts/build-band-landings.js'),
        canonical: /<link rel="canonical" href="https:\/\/catalogo\.fivemagicsdesigns\.com\/nightwish\/">/.test(landingHtml),
        sitemap: sitemap.includes('https://catalogo.fivemagicsdesigns.com/nightwish/'),
        sourceVariants: nightwishVariants.length,
        sourceDesigns: designSlugs.size,
        uniqueSlugs: new Set(designSlugs.values()).size,
        missingImages,
        missingAlt
    };
    assert(results.static.generated, 'nightwish/index.html no esta identificado como salida de la plantilla.', failures);
    assert(results.static.canonical, 'Canonical Nightwish incorrecto.', failures);
    assert(results.static.sitemap, 'Nightwish no aparece en sitemap.xml.', failures);
    assert(results.static.uniqueSlugs === results.static.sourceDesigns, 'Hay slugs Nightwish duplicados entre diseños.', failures);
    assert(results.static.missingImages.length === 0, `Hay imágenes Nightwish faltantes: ${results.static.missingImages.join(', ')}`, failures);
    assert(results.static.missingAlt === 0, `Hay ${results.static.missingAlt} mockups Nightwish sin alt.`, failures);

    const cdp = await connectCdp();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.__landingErrors = [];
            window.addEventListener('error', event => window.__landingErrors.push(String(event.message || event.error)));
            window.addEventListener('unhandledrejection', event => window.__landingErrors.push(String(event.reason)));`
    });

    await setViewport(cdp, 1440, 1000, false);
    await cdp.navigate(
        `${SITE_ORIGIN}/index.html`,
        "document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0"
    );
    results.generalLink = await cdp.evaluate(`(() => {
        showFullCatalog();
        const home = [...document.querySelectorAll('[data-directory-section="featured"] .catalog-band-card')]
            .find(item => item.textContent.toLowerCase().includes('nightwish'));
        const directory = [...document.querySelectorAll('.catalog-band-card')]
            .find(item => item.textContent.toLowerCase().includes('nightwish'));
        return {
            homeHref: home?.getAttribute('href') || '',
            directoryTag: directory?.tagName || '',
            directoryHref: directory?.getAttribute('href') || ''
        };
    })()`);
    assert(results.generalLink.homeHref === '/nightwish/', 'El acceso Nightwish de la home no enlaza la landing.', failures);
    assert(results.generalLink.directoryTag === 'A' && results.generalLink.directoryHref === '/nightwish/', 'El directorio general no enlaza la landing Nightwish.', failures);

    await cdp.navigate(
        LANDING_URL,
        "document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0 && document.querySelectorAll('.catalog-design-card').length > 0"
    );
    await delay(250);

    results.desktop = await cdp.evaluate(`(async () => {
        const cards = [...document.querySelectorAll('.catalog-design-card')];
        const names = cards.map(card => card.querySelector('.catalog-design-copy > strong')?.textContent.trim() || '');
        const bands = cards.map(card => card.querySelector('.catalog-design-band')?.textContent.trim() || '');
        const cardImages = cards.map(card => card.querySelector('img')).filter(Boolean);
        const imageChecks = await Promise.all(cardImages.map(image => new Promise(resolve => {
            const probe = new Image();
            probe.onload = () => resolve({ src: image.src, ok: probe.naturalWidth > 0 });
            probe.onerror = () => resolve({ src: image.src, ok: false });
            probe.src = image.src;
        })));
        const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
        return {
            pageConfig: window.FMD_BAND_LANDING,
            title: document.title,
            canonical,
            ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
            cards: cards.length,
            uniqueCards: new Set(cards.map(card => card.dataset.designId)).size,
            names,
            bands: [...new Set(bands)],
            brokenImages: imageChecks.filter(check => !check.ok).map(check => check.src),
            missingImageAlt: cardImages.filter(image => !image.alt.trim()).length,
            bandSelectors: document.querySelectorAll('.catalog-quick-filters, .catalog-band-directory, [data-band-filter]').length,
            width: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            query: location.search,
            errors: window.__landingErrors || []
        };
    })()`);
    assert(results.desktop.pageConfig?.band === 'Nightwish', 'La landing no inicio en modo Nightwish.', failures);
    assert(results.desktop.cards === expectedGarmentCounts.hoodie, `Se esperaban ${expectedGarmentCounts.hoodie} hoodies Nightwish y se mostraron ${results.desktop.cards}.`, failures);
    assert(results.desktop.uniqueCards === results.desktop.cards, 'Hay diseños Nightwish duplicados.', failures);
    assert(results.desktop.bands.length === 1 && results.desktop.bands[0] === 'Nightwish', `Se mostraron otras bandas: ${results.desktop.bands.join(', ')}`, failures);
    assert(results.desktop.brokenImages.length === 0, `Hay imágenes rotas en cards: ${results.desktop.brokenImages.join(', ')}`, failures);
    assert(results.desktop.missingImageAlt === 0, `Hay ${results.desktop.missingImageAlt} cards sin alt.`, failures);
    assert(results.desktop.bandSelectors === 0, 'La landing muestra selectores de banda.', failures);
    assert(results.desktop.scrollWidth <= results.desktop.width + 1, `Hay scroll horizontal desktop: ${results.desktop.scrollWidth}/${results.desktop.width}.`, failures);
    assert(results.desktop.query === UTM_QUERY, `Los UTM cambiaron al cargar: ${results.desktop.query}`, failures);
    assert(results.desktop.errors.length === 0, `Errores JS al cargar: ${results.desktop.errors.join(' | ')}`, failures);

    results.garmentCategories = await cdp.evaluate(`(async () => {
        const collect = async (garment, imageToken) => {
            selectBandLandingGarment(garment);
            await new Promise(resolve => setTimeout(resolve, 100));
            const cards = [...document.querySelectorAll('.catalog-design-card')];
            return {
                count: cards.length,
                imagesMatch: cards.every(card => (card.querySelector('img')?.getAttribute('src') || '').includes(imageToken)),
                bands: [...new Set(cards.map(card => card.querySelector('.catalog-design-band')?.textContent.trim() || ''))]
            };
        };
        const hoodie = await collect('hoodie', 'hoodie_nightwish_');
        const buzo = await collect('buzo_cuello_redondo', 'buzo_nightwish_');
        const remera = await collect('remera', 'remera_nightwish_');
        await collect('hoodie', 'hoodie_nightwish_');
        return { hoodie, buzo, remera };
    })()`);
    Object.entries(expectedGarmentCounts).forEach(([garment, expected]) => {
        const result = results.garmentCategories[garment];
        assert(result?.count === expected, `${garment} muestra ${result?.count}; se esperaban ${expected}.`, failures);
        assert(result?.imagesMatch, `${garment} muestra previews de otra prenda.`, failures);
        assert(result?.bands.length === 1 && result.bands[0] === 'Nightwish', `${garment} muestra productos de otra banda.`, failures);
    });

    results.scope = await cdp.evaluate(`(async () => {
        const input = document.getElementById('searchInput');
        input.value = 'Metallica';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 80));
        const foreignResults = document.querySelectorAll('.catalog-design-card').length;
        input.value = 'Imaginaerum';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 80));
        const nightwishSearchResults = [...document.querySelectorAll('.catalog-design-card .catalog-design-copy > strong')]
            .map(item => item.textContent.trim());
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 80));
        const restoredResults = document.querySelectorAll('.catalog-design-card').length;
        const metallica = catalogDesigns.find(item => normalizeText(item.band) === 'metallica');
        openCatalogDesign(metallica.designId);
        return {
            foreignResults,
            nightwishSearchResults,
            restoredResults,
            foreignModalBlocked: !document.getElementById('modal').classList.contains('active')
        };
    })()`);
    assert(results.scope.foreignResults === 0, 'La busqueda Nightwish devolvio productos de otra banda.', failures);
    assert(results.scope.nightwishSearchResults.length === 1 && results.scope.nightwishSearchResults[0] === 'Imaginaerum', `La búsqueda de Imaginaerum devolvió: ${results.scope.nightwishSearchResults.join(', ')}`, failures);
    assert(results.scope.restoredResults === expectedGarmentCounts.hoodie, 'La búsqueda no restauró los hoodies Nightwish.', failures);
    assert(results.scope.foreignModalBlocked, 'Se pudo abrir un diseño de otra banda desde la landing.', failures);

    results.flow = await cdp.evaluate(`(async () => {
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'nightwish' && normalizeText(item.publicName) === 'once');
        const root = document.documentElement;
        const oldBehavior = root.style.scrollBehavior;
        root.style.setProperty('scroll-behavior', 'auto', 'important');
        window.scrollTo(0, Math.min(root.scrollHeight - innerHeight, document.getElementById('productsGrid').offsetTop + 260));
        if (oldBehavior) root.style.scrollBehavior = oldBehavior;
        else root.style.removeProperty('scroll-behavior');
        const scrollBefore = window.scrollY;

        cart.clearCart();
        openCatalogDesign(design.designId);
        const codeBefore = document.getElementById('displayCode').textContent.trim();
        selectModalGarment('remera_clasica');
        selectPrintMode('simple');
        const remeraPreview = currentModalSourceRefs[currentSlide]?.garment || '';
        const remeraImage = getModalImages()[currentSlide]?.img || '';
        const remeraPrice = document.getElementById('modalPrice').textContent.trim();
        selectModalGarment('buzo');
        selectPrintMode('double');
        const buzoImage = getModalImages()[currentSlide]?.img || '';
        const buzoPrice = document.getElementById('modalPrice').textContent.trim();
        selectModalGarment('hoodie');
        const hoodieImage = getModalImages()[currentSlide]?.img || '';
        const referenceNote = document.querySelector('.modal-adaptable-note')?.textContent.trim() || '';
        selectPrintMode('double');
        selectSize('L');
        selectColor('blanco');
        selectDeliveryMethod('taller');
        const price = document.getElementById('modalPrice').textContent.trim();
        const message = buildModalOrderWhatsappMessage();
        let whatsappUrl = '';
        const originalWindowOpen = window.open;
        window.open = url => { whatsappUrl = String(url || ''); };
        openWhatsapp(message, 'nightwish_production_test');
        window.open = originalWindowOpen;
        const whatsappParsed = new URL(whatsappUrl);
        const added = addToCartFromModal();
        const cartItem = cart.getCart()[0] || null;
        const codeAfter = document.getElementById('displayCode').textContent.trim();
        const queryInModal = location.search;
        closeModal();
        await new Promise(resolve => setTimeout(resolve, 150));
        const result = {
            designId: design.designId,
            codeBefore,
            codeAfter,
            remeraPreview,
            remeraImage,
            remeraPrice,
            buzoImage,
            buzoPrice,
            hoodieImage,
            referenceNote,
            price,
            message,
            whatsappUrl,
            whatsappNumber: whatsappParsed.pathname,
            whatsappMessage: whatsappParsed.searchParams.get('text'),
            added,
            cartItem,
            scrollBefore,
            scrollAfter: window.scrollY,
            queryInModal,
            queryAfter: location.search,
            hashAfter: location.hash,
            modalClosed: !document.getElementById('modal').classList.contains('active'),
            categoryAfter: currentCategory
        };
        cart.clearCart();
        return result;
    })()`);
    assert(results.flow.remeraPreview === 'remera', `Preview de remera incorrecto: ${results.flow.remeraPreview}`, failures);
    assert(results.flow.remeraImage.includes('nightwish'), `Preview de remera ajeno a Nightwish: ${results.flow.remeraImage}`, failures);
    assert(results.flow.remeraPrice.includes('$37.000'), `Precio remera frontal incorrecto: ${results.flow.remeraPrice}`, failures);
    assert(results.flow.buzoImage.includes('buzo_nightwish_once.jpg'), `No se mostró el mock de buzo Once: ${results.flow.buzoImage}`, failures);
    assert(results.flow.buzoPrice.includes('$55.000'), `Precio buzo doble incorrecto: ${results.flow.buzoPrice}`, failures);
    assert(results.flow.hoodieImage.includes('hoodie_nightwish_once.jpg'), `No se mostró el mock de hoodie Once: ${results.flow.hoodieImage}`, failures);
    assert(results.flow.codeBefore === results.flow.codeAfter, 'El codigo cambio al elegir otra prenda.', failures);
    assert(results.flow.price.includes('$59.000'), `Precio hoodie doble incorrecto: ${results.flow.price}`, failures);
    assert(results.flow.message.includes('Diseño: Once'), 'WhatsApp no identifica el diseño Once.', failures);
    assert(results.flow.message.includes('Prenda: Hoodie'), 'WhatsApp no identifica hoodie.', failures);
    assert(results.flow.message.includes('Talle: L'), 'WhatsApp no identifica talle L.', failures);
    assert(results.flow.message.includes('Color: Blanca'), 'WhatsApp no identifica color blanco.', failures);
    assert(results.flow.message.includes('Estampa: Doble estampa'), 'WhatsApp no identifica doble estampa.', failures);
    assert(results.flow.message.includes('Precio del producto: $59.000'), 'WhatsApp no informa el precio correcto.', failures);
    assert(results.flow.message.includes('Retiro sin cargo en Villa Martelli'), 'WhatsApp no informa la entrega.', failures);
    assert(results.flow.whatsappNumber === '/541169667685', `WhatsApp abrió otro número: ${results.flow.whatsappNumber}`, failures);
    assert(results.flow.whatsappMessage === results.flow.message, 'WhatsApp no recibió todas las elecciones del pedido.', failures);
    assert(results.flow.added && results.flow.cartItem?.productName === 'Once', 'El carrito no guardo el diseño Nightwish.', failures);
    assert(results.flow.scrollAfter === results.flow.scrollBefore, `No regreso al mismo punto: ${results.flow.scrollBefore}/${results.flow.scrollAfter}`, failures);
    assert(results.flow.queryInModal === UTM_QUERY && results.flow.queryAfter === UTM_QUERY, 'Los UTM no se conservaron durante el modal.', failures);
    assert(!/^#(?:producto|diseno)-/.test(results.flow.hashAfter), `Quedo un hash de producto activo: ${results.flow.hashAfter}`, failures);
    assert(results.flow.modalClosed, 'El modal siguio abierto al cerrar.', failures);
    assert(results.flow.categoryAfter === 'Nightwish', `Se perdio el filtro Nightwish: ${results.flow.categoryAfter}`, failures);

    await setViewport(cdp, 390, 844, true);
    await cdp.navigate(
        LANDING_URL,
        "document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && document.querySelectorAll('.catalog-design-card').length > 0"
    );
    await delay(200);
    results.mobile = await cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'nightwish' && normalizeText(item.publicName) === 'once');
        openCatalogDesign(design.designId);
        const modalBox = document.querySelector('#modal .modal')?.getBoundingClientRect();
        const result = {
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            cards: document.querySelectorAll('.catalog-design-card').length,
            columns: getComputedStyle(document.getElementById('productsGrid')).gridTemplateColumns,
            modalWidth: modalBox?.width || 0,
            modalLeft: modalBox?.left || 0,
            modalRight: modalBox?.right || 0,
            garmentButtons: document.querySelectorAll('#modalGarmentSelector button').length,
            errors: window.__landingErrors || []
        };
        closeModal();
        return result;
    })()`);
    assert(results.mobile.cards === expectedGarmentCounts.hoodie, `Mobile muestra ${results.mobile.cards} hoodies Nightwish.`, failures);
    assert(results.mobile.scrollWidth <= results.mobile.width + 1, `Hay scroll horizontal mobile: ${results.mobile.scrollWidth}/${results.mobile.width}.`, failures);
    assert(results.mobile.modalLeft >= -1 && results.mobile.modalRight <= results.mobile.width + 1, `El modal sale del viewport mobile: ${results.mobile.modalLeft}/${results.mobile.modalRight}.`, failures);
    assert(results.mobile.garmentButtons >= 3, 'El modal mobile no ofrece las tres prendas.', failures);
    assert(results.mobile.errors.length === 0, `Errores JS mobile: ${results.mobile.errors.join(' | ')}`, failures);

    cdp.socket.close();
    console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', failures, results }, null, 2));
    if (failures.length) process.exitCode = 1;
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
