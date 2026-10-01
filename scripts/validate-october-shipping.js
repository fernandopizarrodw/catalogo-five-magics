'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9333';
const SITE_URL = process.env.SITE_URL || 'http://127.0.0.1:5500/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'reports', 'october-shipping-review');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

async function connect() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No se encontro una pagina de Chrome para validar.');

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
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    }

    async function navigate() {
        await send('Page.navigate', { url: SITE_URL });
        for (let attempt = 0; attempt < 80; attempt += 1) {
            await wait(100);
            const ready = await evaluate("document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0");
            if (ready) return;
        }
        throw new Error('Timeout cargando el catalogo local.');
    }

    return { socket, send, evaluate, navigate };
}

async function setViewport(cdp, width, height, mobile) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}

async function captureElement(cdp, selector, filename, padding = 0) {
    const rect = await cdp.evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { x: box.left + scrollX, y: box.top + scrollY, width: box.width, height: box.height };
    })()`);
    assert(rect && rect.width > 0 && rect.height > 0, `No se encontro ${selector} para la captura.`);
    const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
            x: Math.max(0, rect.x - padding),
            y: Math.max(0, rect.y - padding),
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            scale: 1
        }
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(result.data, 'base64'));
}

const resetCart = `(() => {
    cart.clearCart();
    selectedDeliveryMethod = '';
    closeCartPreview();
    if (document.getElementById('modal')?.classList.contains('active')) closeModal(false, false);
    return true;
})()`;

const createBaseItem = `(() => {
    const design = catalogDesigns.find(item => normalizeText(item.band) === 'metallica') || catalogDesigns[0];
    openCatalogDesign(design.designId);
    selectModalGarmentType('remera');
    selectRemeraVariant('hombre_clasica');
    selectPrintMode('simple');
    selectSize('L');
    selectColor('negro');
    addToOrderAndOpenCart();
    return cart.getCart()[0];
})()`;

function setQuantityExpression(quantity) {
    return `(() => {
        const base = { ...cart.getCart()[0] };
        cart.cart = Array.from({ length: ${quantity} }, (_, index) => ({
            ...base,
            timestamp: Date.now() + index
        }));
        cart.saveCart();
        renderCartPreview();
        return calculateCartTotal();
    })()`;
}

async function prepareCheckout(cdp, quantity, deliveryMethod) {
    await cdp.evaluate(resetCart);
    await cdp.evaluate(createBaseItem);
    await cdp.evaluate(setQuantityExpression(quantity));
    await cdp.evaluate(`selectDeliveryMethod(${JSON.stringify(deliveryMethod)})`);
    await wait(120);
    const totals = await cdp.evaluate('calculateCartTotal()');
    await cdp.evaluate(`(() => {
        const overlay = document.getElementById('cartPreviewModal');
        const container = document.querySelector('.cart-preview-container');
        if (overlay) {
            overlay.style.position = 'absolute';
            overlay.style.alignItems = 'flex-start';
            overlay.style.overflow = 'visible';
        }
        if (container) {
            container.style.maxHeight = 'none';
            container.style.height = 'auto';
            container.style.overflow = 'visible';
        }
        document.body.style.overflow = 'visible';
    })()`);
    await wait(2300);
    return totals;
}

function assertTotals(actual, expected, label) {
    for (const [key, value] of Object.entries(expected)) {
        assert(actual[key] === value, `${label}: ${key} esperado ${value}, recibido ${actual[key]}.`);
    }
}

async function runViewport(cdp, label, width, height, mobile) {
    await setViewport(cdp, width, height, mobile);
    await cdp.navigate();
    await cdp.evaluate(`document.querySelector('.july-shipping-promo')?.scrollIntoView({ block: 'center' })`);
    await wait(150);
    await captureElement(cdp, '.july-shipping-promo', `${label}-commercial-shipping.png`, 4);

    const scenarios = [
        { quantity: 1, delivery: 'retiro_andreani' },
        { quantity: 2, delivery: 'retiro_andreani' },
        { quantity: 3, delivery: 'domicilio' }
    ];
    const results = {};
    for (const scenario of scenarios) {
        const totals = await prepareCheckout(cdp, scenario.quantity, scenario.delivery);
        results[scenario.quantity] = totals;
        await captureElement(cdp, '.cart-preview-container', `${label}-checkout-${scenario.quantity}-prendas.png`, 2);
    }
    return results;
}

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const desktop = await runViewport(cdp, 'desktop', 1440, 1100, false);
    const mobile = await runViewport(cdp, 'mobile', 390, 844, true);

    assertTotals(desktop[1], { cantidad: 1, subtotal: 38000, descuento: 0, envio: 5000, total: 43000 }, 'Desktop 1 prenda');
    assertTotals(desktop[2], { cantidad: 2, subtotal: 76000, descuento: 0, envio: 0, total: 76000 }, 'Desktop 2 prendas');
    assertTotals(desktop[3], { cantidad: 3, subtotal: 114000, descuento: 11400, envio: 0, total: 102600 }, 'Desktop 3 prendas');
    assertTotals(mobile[1], { cantidad: 1, subtotal: 38000, descuento: 0, envio: 5000, total: 43000 }, 'Mobile 1 prenda');
    assertTotals(mobile[2], { cantidad: 2, subtotal: 76000, descuento: 0, envio: 0, total: 76000 }, 'Mobile 2 prendas');
    assertTotals(mobile[3], { cantidad: 3, subtotal: 114000, descuento: 11400, envio: 0, total: 102600 }, 'Mobile 3 prendas');

    await setViewport(cdp, 1280, 900, false);
    await cdp.navigate();
    await cdp.evaluate(resetCart);
    await cdp.evaluate(createBaseItem);
    const transitions = await cdp.evaluate(`(() => {
        const base = { ...cart.getCart()[0] };
        const read = method => {
            selectedDeliveryMethod = method;
            return { ...calculateCartTotal() };
        };
        const states = { onePoint: read('retiro_andreani'), oneHome: read('domicilio') };
        cart.cart.push({ ...base, timestamp: Date.now() + 1 });
        states.twoPoint = read('retiro_andreani');
        states.twoHome = read('domicilio');
        cart.cart.push({ ...base, timestamp: Date.now() + 2 });
        states.threePoint = read('retiro_andreani');
        states.threeHome = read('domicilio');
        cart.cart.push({ ...base, timestamp: Date.now() + 3 });
        states.fourPoint = read('retiro_andreani');
        states.fourHome = read('domicilio');
        cart.cart.pop();
        states.backToThree = read('domicilio');
        cart.cart.pop();
        states.backToTwo = read('domicilio');
        cart.cart.pop();
        states.backToOne = read('retiro_andreani');
        return states;
    })()`);

    assertTotals(transitions.onePoint, { cantidad: 1, descuento: 0, envio: 5000, total: 43000 }, '1 prenda punto');
    assertTotals(transitions.oneHome, { cantidad: 1, descuento: 0, envio: 9000, total: 47000 }, '1 prenda domicilio');
    assertTotals(transitions.twoPoint, { cantidad: 2, descuento: 0, envio: 0, total: 76000 }, '2 prendas punto');
    assertTotals(transitions.twoHome, { cantidad: 2, descuento: 0, envio: 9000, total: 85000 }, '2 prendas domicilio');
    assertTotals(transitions.threePoint, { cantidad: 3, descuento: 11400, envio: 0, total: 102600 }, '3 prendas punto');
    assertTotals(transitions.threeHome, { cantidad: 3, descuento: 11400, envio: 0, total: 102600 }, '3 prendas domicilio');
    assertTotals(transitions.fourPoint, { cantidad: 4, descuento: 15200, envio: 0, total: 136800 }, '4 prendas punto');
    assertTotals(transitions.fourHome, { cantidad: 4, descuento: 15200, envio: 0, total: 136800 }, '4 prendas domicilio');
    assertTotals(transitions.backToThree, { cantidad: 3, descuento: 11400, envio: 0, total: 102600 }, 'Quitar de 4 a 3');
    assertTotals(transitions.backToTwo, { cantidad: 2, descuento: 0, envio: 9000, total: 85000 }, 'Quitar de 3 a 2');
    assertTotals(transitions.backToOne, { cantidad: 1, descuento: 0, envio: 5000, total: 43000 }, 'Quitar de 2 a 1');

    const result = {
        status: 'PASS',
        desktop,
        mobile,
        transitions,
        screenshots: fs.readdirSync(OUTPUT_DIR).filter(file => file.endsWith('.png')).sort()
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-results.json'), JSON.stringify(result, null, 2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    cdp.socket.close();
}

main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
});
