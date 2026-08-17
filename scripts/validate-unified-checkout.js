'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9334';
const SITE_URL = process.env.SITE_URL || 'http://127.0.0.1:8765/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'reports', 'unified-checkout-preview');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

async function connect() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No se encontró una página de Chrome para validar.');

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

    async function navigate(url = SITE_URL) {
        await send('Page.navigate', { url });
        for (let attempt = 0; attempt < 80; attempt += 1) {
            await wait(100);
            const ready = await evaluate("document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0");
            if (ready) return;
        }
        throw new Error('Timeout cargando el catálogo local.');
    }

    return { socket, send, evaluate, navigate };
}

async function setViewport(cdp, width, height, mobile) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
    });
}

async function screenshot(cdp, filename) {
    const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(result.data, 'base64'));
}

const resetExpression = `(() => {
    cart.clearCart();
    localStorage.removeItem('fmd_shipping_form_v1');
    localStorage.removeItem('fmd_order_checkout_v1');
    selectedDeliveryMethod = '';
    window.__checkoutWhatsappUrls = [];
    window.open = url => { window.__checkoutWhatsappUrls.push(url); return null; };
    closeCartPreview();
    if (document.getElementById('modal')?.classList.contains('active')) closeModal(false, false);
    return true;
})()`;

const configureProductExpression = `(() => {
    const design = catalogDesigns.find(item => normalizeText(item.band) === 'metallica') || catalogDesigns[0];
    openCatalogDesign(design.designId);
    selectModalGarmentType('remera');
    selectRemeraVariant('hombre_clasica');
    selectPrintMode('simple');
    selectSize('L');
    selectColor('negro');
    return {
        designId: design.designId,
        modalName: document.getElementById('modalName')?.textContent.trim(),
        primary: document.getElementById('btnBuyNow')?.textContent.trim(),
        secondary: document.getElementById('btnAddCart')?.textContent.trim(),
        deliveryInModal: Boolean(document.getElementById('modalDeliveryBox')),
        summary: document.getElementById('modalOrderSummaryText')?.textContent.trim()
    };
})()`;

function fillCustomerExpression(method, overrides = {}) {
    const defaults = {
        nombre: 'Ana',
        apellido: 'Prueba',
        telefono: '11 5555 1234',
        direccion: 'Av. Siempre Viva 123',
        cp: '1678',
        localidad: 'San Martín',
        provincia: 'Buenos Aires',
        ...overrides
    };
    return `(() => {
        selectDeliveryMethod(${JSON.stringify(method)});
        const values = ${JSON.stringify(defaults)};
        const ids = { nombre:'inputNombre', apellido:'inputApellido', telefono:'inputTelefono', direccion:'inputDireccion', cp:'inputCP', localidad:'inputLocalidad', provincia:'inputProvincia' };
        Object.entries(ids).forEach(([key, id]) => {
            const input = document.getElementById(id);
            if (!input) return;
            input.value = values[key] || '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return { method: selectedDeliveryMethod, fields: Object.values(ids).filter(id => document.getElementById(id)) };
    })()`;
}

function decodeWhatsappUrl(url) {
    const parsed = new URL(url);
    return parsed.searchParams.get('text') || '';
}

async function createOneItem(cdp) {
    const configured = await cdp.evaluate(configureProductExpression);
    assert(configured.primary === 'AGREGAR AL PEDIDO', 'El CTA principal del modal es incorrecto.');
    assert(configured.secondary === 'CONSULTAR ESTE DISEÑO', 'El CTA secundario del modal es incorrecto.');
    assert(!configured.deliveryInModal, 'La entrega sigue apareciendo dentro del modal de producto.');
    await cdp.evaluate('addToOrderAndOpenCart()');
    const count = await cdp.evaluate('cart.getCart().length');
    assert(count === 1, 'El producto no se agregó al pedido.');
    return configured;
}

async function sendScenario(cdp, method, overrides = {}) {
    await cdp.evaluate(resetExpression);
    await createOneItem(cdp);
    await cdp.evaluate(fillCustomerExpression(method, overrides));
    await cdp.evaluate('confirmAndSendWhatsapp()');
    const url = await cdp.evaluate('window.__checkoutWhatsappUrls.at(-1) || ""');
    assert(url, `No se generó WhatsApp para ${method}.`);
    return decodeWhatsappUrl(url);
}

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await setViewport(cdp, 1440, 1000, false);
    await cdp.navigate();

    const results = {};
    await cdp.evaluate(resetExpression);
    results.desktopModal = await cdp.evaluate(configureProductExpression);
    await cdp.evaluate(`document.getElementById('btnBuyNow').scrollIntoView({ block: 'center' })`);
    await wait(250);
    await screenshot(cdp, 'desktop-product-modal.png');
    await cdp.evaluate('addToOrderAndOpenCart()');
    await cdp.evaluate(fillCustomerExpression('retiro_andreani'));
    await cdp.evaluate(`document.getElementById('cartDeliveryGroup').scrollIntoView({ block: 'start' })`);
    await wait(250);
    await screenshot(cdp, 'desktop-cart-checkout.png');

    results.point = await sendScenario(cdp, 'retiro_andreani');
    assert(/Código postal: 1678/.test(results.point), 'El pedido a punto Andreani no incluye CP.');
    assert(/Envío: GRATIS/.test(results.point), 'El pedido a punto Andreani no informa envío gratis.');

    results.home = await sendScenario(cdp, 'domicilio');
    assert(/Dirección: Av\. Siempre Viva 123/.test(results.home), 'El pedido a domicilio no incluye dirección.');
    assert(/Código postal: 1678/.test(results.home), 'El pedido a domicilio no incluye CP.');

    results.pickup = await sendScenario(cdp, 'taller', { cp: '', direccion: '', localidad: '', provincia: '' });
    assert(/Retiro sin cargo en Villa Martelli/.test(results.pickup), 'El retiro en taller no se informa correctamente.');
    assert(!/Código postal:/.test(results.pickup), 'El retiro en taller incluyó CP.');
    assert(/Nombre: Ana/.test(results.pickup) && /Teléfono: 11 5555 1234/.test(results.pickup), 'El retiro en taller no incluye datos del cliente.');

    await cdp.evaluate(resetExpression);
    await createOneItem(cdp);
    await cdp.evaluate(`(() => {
        const base = { ...cart.getCart()[0] };
        cart.cart.push({ ...base, size:'M', color:'blanco', isDouble:true, timestamp:Date.now()+1 });
        cart.cart.push({ ...base, size:'XL', color:'negro', cut:'oversize', publicGarmentLabel:'Remera oversize unisex', timestamp:Date.now()+2 });
        cart.saveCart();
        renderCartPreview();
    })()`);
    await cdp.evaluate(fillCustomerExpression('domicilio'));
    const threeTotals = await cdp.evaluate('calculateCartTotal()');
    assert(threeTotals.cantidad === 3 && threeTotals.descuento > 0, 'La promo de 3 prendas no aplicó 10% OFF.');
    await cdp.evaluate('confirmAndSendWhatsapp()');
    const threeUrl = await cdp.evaluate('window.__checkoutWhatsappUrls.at(-1) || ""');
    results.threeItems = decodeWhatsappUrl(threeUrl);
    assert(/Descuento: -\$/.test(results.threeItems), 'El WhatsApp de 3 prendas no incluye descuento.');
    assert(/Envío: GRATIS/.test(results.threeItems), 'El WhatsApp de 3 prendas no incluye domicilio gratis.');
    assert(/Talle: M/.test(results.threeItems) && /Talle: XL/.test(results.threeItems), 'El WhatsApp perdió opciones diferentes entre productos.');

    await cdp.evaluate(resetExpression);
    await createOneItem(cdp);
    await cdp.evaluate(fillCustomerExpression('retiro_andreani', { cp: '' }));
    await cdp.evaluate('confirmAndSendWhatsapp()');
    await wait(350);
    results.missingPostal = await cdp.evaluate(`({
        whatsappCount: window.__checkoutWhatsappUrls.length,
        modalActive: document.getElementById('cartPreviewModal').classList.contains('active'),
        invalid: document.getElementById('inputCP')?.getAttribute('aria-invalid'),
        focused: document.activeElement?.id
    })`);
    assert(results.missingPostal.whatsappCount === 0, 'Se abrió WhatsApp sin CP para punto Andreani.');
    assert(results.missingPostal.modalActive && results.missingPostal.invalid === 'true', 'El CP faltante no quedó marcado.');
    assert(results.missingPostal.focused === 'inputCP', 'El CP faltante no recibió foco.');

    await cdp.evaluate(fillCustomerExpression('domicilio', { cp: '' }));
    await cdp.evaluate('confirmAndSendWhatsapp()');
    await wait(350);
    results.missingHomePostal = await cdp.evaluate(`({
        whatsappCount: window.__checkoutWhatsappUrls.length,
        invalid: document.getElementById('inputCP')?.getAttribute('aria-invalid'),
        focused: document.activeElement?.id
    })`);
    assert(results.missingHomePostal.whatsappCount === 0, 'Se abrió WhatsApp a domicilio sin CP.');
    assert(results.missingHomePostal.invalid === 'true' && results.missingHomePostal.focused === 'inputCP', 'El CP de domicilio no se validó correctamente.');

    const countBeforeReload = await cdp.evaluate('cart.getCart().length');
    await cdp.navigate();
    const persistence = await cdp.evaluate(`({
        count: cart.getCart().length,
        hasLegacyShipping: cart.getCart().some(item => ['delivery','deliveryMethod','postalCode','cp'].some(key => key in item))
    })`);
    assert(persistence.count === countBeforeReload, 'El carrito no persistió al recargar.');
    assert(!persistence.hasLegacyShipping, 'Persisten datos logísticos dentro de productos.');
    results.persistence = persistence;

    await cdp.evaluate(resetExpression);
    await cdp.evaluate(configureProductExpression);
    await cdp.evaluate('consultCurrentDesign()');
    const consultationUrl = await cdp.evaluate('window.__checkoutWhatsappUrls.at(-1) || ""');
    results.consultation = decodeWhatsappUrl(consultationUrl);
    assert(/Quiero consultar por este diseño/.test(results.consultation), 'La consulta secundaria no se identifica como consulta.');
    assert(/Diseño:/.test(results.consultation) && /Código:/.test(results.consultation) && /Link del diseño:/.test(results.consultation), 'La consulta secundaria está incompleta.');
    assert(!/Talle:|Entrega:|Precio del producto:/.test(results.consultation), 'La consulta secundaria todavía parece un pedido cerrado.');

    results.archives = {};
    for (const slug of ['nightwish', 'slayer', 'megadeth', 'iron-maiden', 'ricardo-iorio', 'hermetica', 'argentina']) {
        await cdp.navigate(`${new URL(SITE_URL).origin}/${slug}/`);
        results.archives[slug] = await cdp.evaluate(`(() => {
            const design = catalogDesigns[0];
            openCatalogDesign(design.designId);
            return {
                primary: document.getElementById('btnBuyNow')?.textContent.trim(),
                secondary: document.getElementById('btnAddCart')?.textContent.trim(),
                deliveryInModal: Boolean(document.getElementById('modalDeliveryBox'))
            };
        })()`);
        assert(results.archives[slug].primary === 'AGREGAR AL PEDIDO', `${slug}: CTA principal incorrecto.`);
        assert(results.archives[slug].secondary === 'CONSULTAR ESTE DISEÑO', `${slug}: CTA secundario incorrecto.`);
        assert(!results.archives[slug].deliveryInModal, `${slug}: la entrega sigue dentro del producto.`);
    }

    await setViewport(cdp, 390, 844, true);
    await cdp.navigate(SITE_URL);
    await cdp.evaluate(resetExpression);
    await cdp.evaluate(configureProductExpression);
    await cdp.evaluate(`document.getElementById('btnBuyNow').scrollIntoView({ block: 'center' })`);
    await wait(250);
    await screenshot(cdp, 'mobile-product-modal.png');
    await cdp.evaluate('addToOrderAndOpenCart()');
    await cdp.evaluate(fillCustomerExpression('retiro_andreani'));
    await cdp.evaluate(`document.getElementById('cartDeliveryGroup').scrollIntoView({ block: 'start' })`);
    await wait(250);
    await screenshot(cdp, 'mobile-cart-checkout.png');
    results.mobile = await cdp.evaluate(`({
        viewport: document.documentElement.clientWidth,
        bodyWidth: document.body.scrollWidth,
        modalWidth: document.querySelector('.cart-preview-container')?.getBoundingClientRect().width,
        primary: document.getElementById('btnBuyNow')?.textContent.trim()
    })`);
    assert(results.mobile.bodyWidth <= results.mobile.viewport + 1, 'Hay scroll horizontal en mobile.');

    const report = {
        status: 'PASS',
        testedAt: new Date().toISOString(),
        screenshots: fs.readdirSync(OUTPUT_DIR).filter(name => name.endsWith('.png')),
        results
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-results.json'), JSON.stringify(report, null, 2));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    cdp.socket.close();
}

main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
});
