'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9333';
const SITE_URL = 'http://127.0.0.1:5500/index.html';
const ROOT_DIR = path.resolve(__dirname, '..');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectCdp() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No se encontró una página Chrome para CDP.');

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
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
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

    async function navigate(url = SITE_URL) {
        await send('Page.navigate', { url });
        for (let attempt = 0; attempt < 50; attempt += 1) {
            await delay(120);
            const ready = await evaluate(`document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0`);
            if (ready) return;
        }
        throw new Error(`Timeout cargando ${url}`);
    }

    return { socket, send, evaluate, navigate };
}

function assert(condition, message, failures) {
    if (!condition) failures.push(message);
}

async function main() {
    const failures = [];
    const results = {};
    const cdp = await connectCdp();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false
    });
    await cdp.navigate();

    results.bootstrap = await cdp.evaluate(`({
        products: db.length,
        designs: catalogDesigns.length,
        duplicateDesignIds: catalogDesigns.length - new Set(catalogDesigns.map(item => item.designId)).size,
        validationErrors: FMDCatalogDesign.validateCatalogDesigns(catalogDesigns).length
    })`);
    assert(results.bootstrap.products === 319, `Se esperaban 319 productos; hay ${results.bootstrap.products}.`, failures);
    assert(results.bootstrap.designs > 250, `CatalogDesign produjo muy pocas entradas: ${results.bootstrap.designs}.`, failures);
    assert(results.bootstrap.duplicateDesignIds === 0, 'Hay designId duplicados.', failures);
    assert(results.bootstrap.validationErrors === 0, `Hay ${results.bootstrap.validationErrors} errores CatalogDesign.`, failures);

    results.publicData = await cdp.evaluate(`({
        names: catalogDesigns.map(item => item.publicName),
        imagePaths: [...new Set(db.flatMap(product => {
            const variants = Array.isArray(product.variants) && product.variants.length
                ? product.variants
                : [{ img: product.img }];
            return variants.map(variant => variant.img || product.img).filter(Boolean);
        }))]
    })`);
    const internalNames = results.publicData.names.filter(name => /dise(?:n|ñ)os sugeridos|hoodies sugeridos|remeras sugeridas|buzos sugeridos/i.test(name));
    const brokenNames = results.publicData.names.filter(name => /Ã|Â|\uFFFD/.test(name));
    const missingImagePaths = results.publicData.imagePaths.filter(imagePath => {
        const normalizedPath = String(imagePath).replace(/^\/+/, '').replace(/\//g, path.sep);
        return !fs.existsSync(path.join(ROOT_DIR, normalizedPath));
    });
    results.publicData = {
        totalNames: results.publicData.names.length,
        internalNames,
        brokenNames,
        totalImagePaths: results.publicData.imagePaths.length,
        missingImagePaths
    };
    assert(internalNames.length === 0, `Quedan nombres internos: ${internalNames.join(', ')}`, failures);
    assert(brokenNames.length === 0, `Quedan nombres con codificación dañada: ${brokenNames.join(', ')}`, failures);
    assert(missingImagePaths.length === 0, `Faltan imágenes: ${missingImagePaths.join(', ')}`, failures);

    const bands = ['Megadeth', 'Slayer', 'Iron Maiden', 'Metallica', 'Epica', 'Rhapsody', 'HammerFall', 'King Diamond', 'Personalizados'];
    results.bands = {};
    for (const band of bands) {
        const state = await cdp.evaluate(`(() => {
            openBandAccess(${JSON.stringify(band)});
            const cards = [...document.querySelectorAll('.catalog-design-card')];
            return {
                count: cards.length,
                names: cards.map(card => card.querySelector('.catalog-design-copy > strong')?.textContent.trim()),
                prices: cards.map(card => card.querySelector('.catalog-design-price')?.textContent.trim()),
                buttons: cards.map(card => card.querySelector('.catalog-design-cta')?.textContent.trim()),
                brokenImages: cards.filter(card => { const img=card.querySelector('img'); return !img || !img.getAttribute('src') || img.classList.contains('is-fallback'); }).length
            };
        })()`);
        results.bands[band] = state;
        assert(state.count > 0, `${band}: no muestra diseños.`, failures);
        assert(state.prices.every(price => /^Desde \$/.test(price)), `${band}: hay cards sin precio Desde.`, failures);
        assert(state.buttons.every(label => label === 'VER DISEÑO'), `${band}: CTA incorrecto.`, failures);
        assert(state.brokenImages === 0, `${band}: ${state.brokenImages} imágenes rotas.`, failures);
    }
    assert(!results.bands.Slayer.names.includes('Slayer FMD Originals'), 'Slayer mantiene la card contenedora FMD Originals.', failures);
    assert(!results.bands['Iron Maiden'].names.some(name => / - (Remera|Hoodie|Buzo)/i.test(name)), 'Iron Maiden duplica el nombre por prenda.', failures);

    results.modal = await cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'iron maiden' && normalizeText(item.publicName).includes('eddie gaucho'));
        if (!design) return { error: 'No se encontró Eddie Gaucho' };
        openCatalogDesign(design.designId);
        const initialCode = document.getElementById('displayCode').textContent.trim();
        const garmentLabels = [...document.querySelectorAll('#modalGarmentSelector button')].map(button => button.textContent.trim());
        selectModalGarment('hoodie');
        selectPrintMode('simple');
        const hoodieSimple = document.getElementById('modalPrice').textContent.trim();
        const codeAfterGarment = document.getElementById('displayCode').textContent.trim();
        selectPrintMode('double');
        const hoodieDouble = document.getElementById('modalPrice').textContent.trim();
        const lastSlide = Math.max(0, getModalImages().length - 1);
        goToSlide(lastSlide, false);
        const codeAfterSlide = document.getElementById('displayCode').textContent.trim();
        selectSize('L');
        selectColor('negro');
        selectDeliveryMethod('taller');
        const message = buildModalOrderWhatsappMessage();
        const order = ['modalGarmentGroup','printModeSelector','upsellDorso','sizeGroup','colorGroup','modalDeliveryBox','modalPrice']
            .map(id => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top || 0 }));
        return {
            designId: design.designId,
            name: document.getElementById('modalName').textContent.trim(),
            initialCode,
            codeAfterGarment,
            codeAfterSlide,
            garmentLabels,
            hoodieSimple,
            hoodieDouble,
            message,
            order,
            modalActive: document.getElementById('modal').classList.contains('active')
        };
    })()`);
    assert(!results.modal.error, results.modal.error || 'Error modal.', failures);
    assert(results.modal.modalActive, 'El modal no quedó abierto.', failures);
    assert(results.modal.name.includes('Eddie Gaucho'), 'Nombre incorrecto en modal.', failures);
    assert(results.modal.initialCode === results.modal.codeAfterGarment && results.modal.initialCode === results.modal.codeAfterSlide, 'El código cambia con prenda o imagen.', failures);
    assert(['Clásica unisex','Corte mujer','Oversize unisex','Hoodie','Buzo'].every(label => results.modal.garmentLabels.includes(label)), 'Faltan prendas en el modal.', failures);
    assert(results.modal.hoodieSimple.includes('$52.000'), `Precio hoodie frontal incorrecto: ${results.modal.hoodieSimple}`, failures);
    assert(results.modal.hoodieDouble.includes('$59.000'), `Precio hoodie doble incorrecto: ${results.modal.hoodieDouble}`, failures);
    assert(results.modal.message.includes('Prenda: Hoodie'), 'WhatsApp no informa Hoodie.', failures);
    assert(results.modal.message.includes('Precio del producto: $59.000'), 'WhatsApp tiene precio incorrecto.', failures);
    assert(results.modal.message.includes('Retiro sin cargo en Villa Martelli'), 'WhatsApp no informa la entrega.', failures);
    assert(!results.modal.message.includes('Código postal:'), 'Retiro en taller no debe incluir código postal.', failures);
    const orderedTops = results.modal.order.map(item => item.top);
    assert(orderedTops.every((top, index) => index === 0 || top >= orderedTops[index - 1]), `Orden visual incorrecto: ${JSON.stringify(results.modal.order)}`, failures);

    results.eddieSmoke = await cdp.evaluate(`(async () => {
        closeModal();
        openBandAccess('Iron Maiden');
        await new Promise(resolve => setTimeout(resolve, 650));
        const cards = [...document.querySelectorAll('.catalog-design-card')];
        const matchingCards = cards.filter(card => normalizeText(card.querySelector('.catalog-design-copy > strong')?.textContent) === 'eddie gaucho argentino');
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'iron maiden' && normalizeText(item.publicName) === 'eddie gaucho argentino');
        if (!design) return { error: 'Eddie Gaucho no encontrado' };

        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.setProperty('scroll-behavior', 'auto', 'important');
        window.scrollTo(0, Math.min(root.scrollHeight - window.innerHeight, document.getElementById('catalogoPrincipal').offsetTop + 520));
        if (previousBehavior) root.style.scrollBehavior = previousBehavior;
        else root.style.removeProperty('scroll-behavior');
        const scrollBefore = window.scrollY;

        openCatalogDesign(design.designId);
        const initialCode = document.getElementById('displayCode').textContent.trim();
        const snapshot = garment => {
            selectModalGarment(garment);
            const preview = currentModalSourceRefs[currentSlide] || null;
            selectPrintMode('simple');
            const simple = document.getElementById('modalPrice').textContent.trim();
            selectPrintMode('double');
            return {
                garment,
                previewGarment: preview?.garment || '',
                previewImage: getModalImages()[currentSlide]?.img || '',
                simple,
                double: document.getElementById('modalPrice').textContent.trim(),
                code: document.getElementById('displayCode').textContent.trim()
            };
        };
        const remera = snapshot('remera_clasica');
        const hoodie = snapshot('hoodie');
        const buzo = snapshot('buzo');
        selectSize('L');
        selectColor('negro');
        selectDeliveryMethod('taller');
        const message = buildModalOrderWhatsappMessage();
        closeModal();
        await new Promise(resolve => setTimeout(resolve, 120));
        return {
            designId: design.designId,
            matchingCards: matchingCards.length,
            initialCode,
            remera,
            hoodie,
            buzo,
            message,
            scrollBefore,
            scrollAfter: window.scrollY,
            categoryAfter: currentCategory,
            modalActiveAfter: document.getElementById('modal').classList.contains('active')
        };
    })()`);
    assert(!results.eddieSmoke.error, results.eddieSmoke.error || 'Error smoke Eddie Gaucho.', failures);
    assert(results.eddieSmoke.matchingCards === 1, `Eddie Gaucho aparece en ${results.eddieSmoke.matchingCards} cards.`, failures);
    assert([results.eddieSmoke.remera, results.eddieSmoke.hoodie, results.eddieSmoke.buzo].every(item => item.code === results.eddieSmoke.initialCode), 'Eddie Gaucho cambia de codigo con la prenda.', failures);
    assert(results.eddieSmoke.remera.previewGarment === 'remera', `Preview remera incorrecto: ${results.eddieSmoke.remera.previewGarment}`, failures);
    assert(results.eddieSmoke.hoodie.previewGarment === 'hoodie', `Preview hoodie incorrecto: ${results.eddieSmoke.hoodie.previewGarment}`, failures);
    assert(results.eddieSmoke.buzo.previewGarment === 'buzo_cuello_redondo', `Preview buzo incorrecto: ${results.eddieSmoke.buzo.previewGarment}`, failures);
    assert(new Set([results.eddieSmoke.remera.previewImage, results.eddieSmoke.hoodie.previewImage, results.eddieSmoke.buzo.previewImage]).size === 3, 'Eddie Gaucho no muestra tres previews diferentes.', failures);
    assert(results.eddieSmoke.remera.simple.includes('$37.000') && results.eddieSmoke.remera.double.includes('$44.000'), 'Precios de remera Eddie Gaucho incorrectos.', failures);
    assert(results.eddieSmoke.hoodie.simple.includes('$52.000') && results.eddieSmoke.hoodie.double.includes('$59.000'), 'Precios de hoodie Eddie Gaucho incorrectos.', failures);
    assert(results.eddieSmoke.buzo.simple.includes('$50.000') && results.eddieSmoke.buzo.double.includes('$55.000'), 'Precios de buzo Eddie Gaucho incorrectos.', failures);
    assert(results.eddieSmoke.message.includes('Prenda: Buzo cuello redondo'), 'WhatsApp Eddie Gaucho no informa buzo.', failures);
    assert(results.eddieSmoke.message.includes('Talle: L'), 'WhatsApp Eddie Gaucho no informa talle.', failures);
    assert(results.eddieSmoke.message.includes('Color: Negra'), 'WhatsApp Eddie Gaucho no informa color.', failures);
    assert(results.eddieSmoke.message.includes('Estampa: Doble estampa'), 'WhatsApp Eddie Gaucho no informa estampa.', failures);
    assert(results.eddieSmoke.message.includes('Precio del producto: $55.000'), 'WhatsApp Eddie Gaucho tiene precio incorrecto.', failures);
    assert(results.eddieSmoke.message.includes('Retiro sin cargo en Villa Martelli'), 'WhatsApp Eddie Gaucho no informa entrega.', failures);
    assert(results.eddieSmoke.categoryAfter === 'Iron Maiden', `Se perdio Iron Maiden al cerrar: ${results.eddieSmoke.categoryAfter}`, failures);
    assert(results.eddieSmoke.scrollAfter === results.eddieSmoke.scrollBefore, `Eddie Gaucho no regreso al mismo punto: ${results.eddieSmoke.scrollBefore}/${results.eddieSmoke.scrollAfter}`, failures);
    assert(!results.eddieSmoke.modalActiveAfter, 'El modal Eddie Gaucho sigue abierto despues de cerrar.', failures);

    results.referenceView = await cdp.evaluate(`(() => {
        closeModal();
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'hammerfall' && normalizeText(item.publicName) === 'crimson');
        openCatalogDesign(design.designId);
        selectModalGarment('remera_clasica');
        selectPrintMode('simple');
        return {
            note: document.querySelector('.modal-adaptable-note').textContent.trim(),
            price: document.getElementById('modalPrice').textContent.trim(),
            codeBefore: document.getElementById('displayCode').textContent.trim(),
            image: getModalImages()[currentSlide]?.img
        };
    })()`);
    assert(results.referenceView.note.includes('Vista de referencia'), 'No se aclara la ausencia de mock para HammerFall en remera.', failures);
    assert(results.referenceView.price.includes('$37.000'), 'La remera de referencia no toma precio de remera.', failures);

    results.personalized = await cdp.evaluate(`(() => {
        closeModal();
        openBandAccess('Personalizados');
        const design = catalogDesigns.find(item => normalizeText(item.publicName) === 'diego maradona');
        openCatalogDesign(design.designId);
        selectModalGarment('hoodie');
        selectPrintMode('double');
        return {
            code: document.getElementById('displayCode').textContent.trim(),
            price: document.getElementById('modalPrice').textContent.trim()
        };
    })()`);
    assert(results.personalized.code === 'DM-5121', `Código personalizado inestable: ${results.personalized.code}`, failures);
    assert(results.personalized.price.includes('$64.000'), `Recargo personalizado hoodie incorrecto: ${results.personalized.price}`, failures);

    results.returnState = await cdp.evaluate(`(() => {
        closeModal();
        return {
            hash: location.hash,
            category: currentCategory,
            modalActive: document.getElementById('modal').classList.contains('active')
        };
    })()`);
    assert(!/^#(?:producto|diseno)-/i.test(results.returnState.hash), `Hash de producto activo al cerrar: ${results.returnState.hash}`, failures);
    assert(results.returnState.category === 'Personalizados', `Se perdió el filtro al cerrar: ${results.returnState.category}`, failures);
    assert(!results.returnState.modalActive, 'El modal sigue activo al cerrar.', failures);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await cdp.navigate();
    results.mobile = await cdp.evaluate(`(() => {
        openBandAccess('Metallica');
        const cards = document.querySelectorAll('.catalog-design-card');
        return {
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            cards: cards.length,
            columns: getComputedStyle(document.getElementById('productsGrid')).gridTemplateColumns,
            firstCardWidth: cards[0]?.getBoundingClientRect().width || 0
        };
    })()`);
    assert(results.mobile.cards > 0, 'Mobile no muestra Metallica.', failures);
    assert(results.mobile.scrollWidth <= results.mobile.innerWidth + 1, `Hay scroll horizontal mobile: ${results.mobile.scrollWidth}/${results.mobile.innerWidth}.`, failures);

    cdp.socket.close();
    console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', failures, results }, null, 2));
    if (failures.length) process.exitCode = 1;
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
