'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9333';
const SITE_URL = 'http://127.0.0.1:5500/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'reports', 'catalog-customer-flow-2026-07-13');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('Chrome local no tiene una página disponible.');

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
        return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            socket.send(JSON.stringify({ id, method, params }));
        });
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

    async function navigate() {
        await send('Page.navigate', { url: SITE_URL });
        for (let attempt = 0; attempt < 60; attempt += 1) {
            await delay(120);
            const ready = await evaluate(`document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0`);
            if (ready) return;
        }
        throw new Error('Timeout cargando el catálogo local.');
    }

    return { socket, send, evaluate, navigate };
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function setViewport(cdp, width, height, mobile) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
    });
    await cdp.navigate();
}

async function scrollToCatalog(cdp) {
    await delay(500);
    await cdp.evaluate(`(() => {
        const section = document.getElementById('catalogoPrincipal');
        window.scrollTo({ top: Math.max(0, section.offsetTop - 70), behavior: 'auto' });
    })()`);
    await delay(250);
}

async function capture(cdp, filename) {
    await delay(300);
    const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(result.data, 'base64'));
}

async function showInitialDirectory(cdp) {
    await cdp.evaluate(`showFullCatalog()`);
    await scrollToCatalog(cdp);
    return cdp.evaluate(`(() => ({
        quickFilters: getComputedStyle(document.querySelector('.catalog-quick-filters')).display,
        bandFilters: getComputedStyle(document.querySelector('.band-filters')).display,
        mainBands: document.querySelectorAll('[data-directory-section="primary"] .catalog-band-card').length,
        newBands: document.querySelectorAll('[data-directory-section="current"] .catalog-band-card').length,
        moreButton: document.getElementById('catalogMoreBandsToggle')?.textContent.trim(),
        moreGridHidden: document.getElementById('catalogMoreBandsGrid')?.hidden
    }))()`);
}

async function showMetallica(cdp) {
    await cdp.evaluate(`openBandAccess('Metallica')`);
    await scrollToCatalog(cdp);
    return cdp.evaluate(`(() => ({
        quickFilters: getComputedStyle(document.querySelector('.catalog-quick-filters')).display,
        bandFilters: getComputedStyle(document.querySelector('.band-filters')).display,
        heading: document.getElementById('productsCount').textContent.trim(),
        cards: document.querySelectorAll('.catalog-design-card').length,
        scrollY: window.scrollY,
        firstCards: [...document.querySelectorAll('.catalog-design-card')].slice(0, 4).map(card => ({
            band: card.querySelector('.catalog-design-band')?.textContent.trim(),
            name: card.querySelector('.catalog-design-copy strong')?.textContent.trim(),
            price: card.querySelector('.catalog-design-price')?.textContent.trim()
        }))
    }))()`);
}

async function configureRideModal(cdp) {
    return cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item =>
            normalizeText(item.band) === 'metallica'
            && normalizeText(item.publicName) === 'ride the lightning'
            && item.sourceProductIds.includes(1060)
        );
        if (!design) return { error: 'No se encontró Ride the Lightning' };
        openCatalogDesign(design.designId);
        const codeBefore = document.getElementById('displayCode').textContent.trim();
        selectModalGarment('hoodie');
        selectPrintMode('double');
        const backChoices = getCatalogDesignBackChoices();
        const selectedBack = backChoices.find(item => item.backType === 'Recomendado')
            || backChoices.find(item => Number(item.productId) === Number(design.front.productId))
            || backChoices[0];
        if (selectedBack) selectCatalogDesignBack(selectedBack.productId, selectedBack.variantIndex);
        selectSize('L');
        selectColor('negro');
        selectDeliveryMethod('domicilio');
        const postal = document.getElementById('modalPostalCode');
        postal.value = '1678';
        postal.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.modal-body').scrollTop = 0;
        document.querySelector('.modal-product-info').scrollTop = 0;
        return {
            designId: design.designId,
            name: document.getElementById('modalName').textContent.trim(),
            codeBefore,
            codeAfter: document.getElementById('displayCode').textContent.trim(),
            garment: selectedModalGarment,
            printMode: selectedPrintMode,
            back: selectedCatalogBackRef?.label || 'A definir por WhatsApp',
            size: selectedSize,
            color: selectedColor,
            delivery: selectedDeliveryMethod,
            postalCode: postal.value,
            price: document.getElementById('modalPrice').textContent.trim(),
            message: buildModalOrderWhatsappMessage()
        };
    })()`);
}

async function scrollModalToCheckout(cdp) {
    await cdp.evaluate(`(() => {
        const desktop = window.innerWidth > 800;
        const scroller = desktop ? document.querySelector('.modal-product-info') : document.querySelector('.modal-body');
        const target = document.getElementById('modalDeliveryBox');
        scroller.scrollTop = Math.max(0, target.offsetTop - (desktop ? 190 : 130));
    })()`);
    await delay(250);
}

async function showMessagePreview(cdp, message) {
    await cdp.evaluate(`(() => {
        document.getElementById('customerFlowMessagePreview')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'customerFlowMessagePreview';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:20px;';
        const panel = document.createElement('div');
        panel.style.cssText = 'width:min(680px,100%);max-height:90vh;overflow:auto;background:#101010;border:1px solid rgba(57,255,20,.45);border-radius:18px;padding:22px;box-shadow:0 22px 70px #000;color:#eee;';
        const title = document.createElement('h2');
        title.textContent = 'MENSAJE LISTO PARA WHATSAPP';
        title.style.cssText = 'margin:0 0 14px;color:#39ff14;font:900 22px sans-serif;';
        const pre = document.createElement('pre');
        pre.textContent = ${JSON.stringify(message)};
        pre.style.cssText = 'white-space:pre-wrap;margin:0;font:15px/1.5 sans-serif;color:#f5f5f5;';
        panel.append(title, pre);
        overlay.append(panel);
        document.body.append(overlay);
    })()`);
}

async function removeMessageAndClose(cdp) {
    return cdp.evaluate(`(() => {
        document.getElementById('customerFlowMessagePreview')?.remove();
        closeModal();
        return new Promise(resolve => setTimeout(() => resolve({
            hash: location.hash,
            category: currentCategory,
            scrollY: window.scrollY,
            modalActive: document.getElementById('modal').classList.contains('active'),
            cards: document.querySelectorAll('.catalog-design-card').length
        }), 120));
    })()`);
}

async function runViewport(cdp, label, width, height, mobile) {
    await setViewport(cdp, width, height, mobile);
    const hasReturnFix = await cdp.evaluate(`String(closeModal).includes('returnScrollPosition')`);
    assert(hasReturnFix, `${label}: Chrome no cargó la versión actual de app.js.`);

    const initial = await showInitialDirectory(cdp);
    assert(initial.quickFilters === 'none', `${label}: los chips aparecen en el directorio inicial.`);
    assert(initial.bandFilters === 'none', `${label}: el botón Filtros aparece en el directorio inicial.`);
    assert(initial.mainBands === 4, `${label}: bandas principales incorrectas.`);
    assert(initial.newBands === 5, `${label}: nuevos diseños incorrectos.`);
    assert(initial.moreButton === 'VER TODAS LAS BANDAS', `${label}: falta VER TODAS LAS BANDAS.`);
    assert(initial.moreGridHidden, `${label}: Más bandas debería estar plegado.`);
    await capture(cdp, `01-inicio-${label}.png`);

    const band = await showMetallica(cdp);
    assert(band.quickFilters !== 'none', `${label}: los chips no aparecen al elegir banda.`);
    assert(band.bandFilters !== 'none', `${label}: Filtros no aparece al elegir banda.`);
    assert(band.cards > 0, `${label}: Metallica no muestra diseños.`);
    assert(band.firstCards.every(card => String(card.band).toLowerCase() === 'metallica' && /^Desde \$/.test(card.price)), `${label}: cards públicas incorrectas.`);
    await capture(cdp, `02-banda-metallica-${label}.png`);

    const modal = await configureRideModal(cdp);
    assert(!modal.error, modal.error || `${label}: error abriendo el diseño.`);
    assert(modal.codeBefore === modal.codeAfter, `${label}: el código cambió al configurar.`);
    assert(modal.garment === 'hoodie', `${label}: no seleccionó hoodie.`);
    assert(modal.printMode === 'double', `${label}: no seleccionó doble estampa.`);
    assert(modal.size === 'L' && modal.color === 'negro', `${label}: talle o color incorrectos.`);
    assert(modal.delivery === 'domicilio' && modal.postalCode === '1678', `${label}: entrega incorrecta.`);
    assert(modal.price.includes('$59.000'), `${label}: precio incorrecto: ${modal.price}`);
    assert(modal.message.includes('Prenda: Hoodie'), `${label}: mensaje sin hoodie.`);
    assert(modal.message.includes('Talle: L'), `${label}: mensaje sin talle.`);
    assert(modal.message.includes('Código postal: 1678'), `${label}: mensaje sin CP.`);
    await capture(cdp, `03-modal-configurado-${label}.png`);

    await scrollModalToCheckout(cdp);
    await capture(cdp, `04-entrega-precio-${label}.png`);

    await showMessagePreview(cdp, modal.message);
    await capture(cdp, `05-mensaje-whatsapp-${label}.png`);

    const returned = await removeMessageAndClose(cdp);
    assert(!/^#(?:producto|diseno)-/i.test(returned.hash), `${label}: quedó un hash de producto al cerrar.`);
    assert(returned.category === 'Metallica', `${label}: perdió la banda al cerrar.`);
    assert(!returned.modalActive && returned.cards > 0, `${label}: no regresó a las cards.`);
    assert(
        Math.abs(returned.scrollY - band.scrollY) < 12,
        `${label}: no regresó al mismo punto (${band.scrollY} -> ${returned.scrollY}).`
    );
    await capture(cdp, `06-regreso-${label}.png`);

    const widthState = await cdp.evaluate(`({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth })`);
    assert(widthState.scrollWidth <= widthState.innerWidth + 1, `${label}: hay scroll horizontal.`);

    return { initial, band, modal, returned, widthState };
}

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    const desktop = await runViewport(cdp, 'desktop', 1440, 1000, false);
    const mobile = await runViewport(cdp, 'mobile', 390, 844, true);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'mensaje-whatsapp.txt'), `${desktop.modal.message}\n`, 'utf8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'resultado.json'), JSON.stringify({ status: 'passed', desktop, mobile }, null, 2), 'utf8');

    cdp.socket.close();
    console.log(JSON.stringify({ status: 'passed', outputDir: OUTPUT_DIR }, null, 2));
}

main().catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
