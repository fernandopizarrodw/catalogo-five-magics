'use strict';

const assert = require('node:assert/strict');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/';

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
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Page.navigate', { url: PAGE_URL });
        for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate("document.readyState === 'complete' && typeof cart !== 'undefined' && typeof calculateCartTotal === 'function'")) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await evaluate(`(() => {
            const makeItem = (overrides = {}) => ({
                id: 7040,
                code: 'TEST-001',
                frontCode: 'TEST-001',
                productName: 'Producto de prueba',
                category: 'Iron Maiden',
                variantIndex: 0,
                frontName: 'Producto de prueba',
                isDouble: false,
                age: 'adulto',
                size: 'M',
                cut: 'clasica',
                color: 'negro',
                ...overrides
            });
            const samples = {
                classicSimple: makeItem(),
                classicDouble: makeItem({ isDouble: true }),
                oversizeSimple: makeItem({ cut: 'oversize' }),
                oversizeDouble: makeItem({ cut: 'oversize', isDouble: true }),
                kidsSimple: makeItem({ age: 'chico', size: '10' }),
                kidsDouble: makeItem({ age: 'chico', size: '10', isDouble: true }),
                hoodieSimple: makeItem({ category: 'Hoodies Otras Bandas' }),
                hoodieDouble: makeItem({ category: 'Hoodies Otras Bandas', isDouble: true }),
                buzoSimple: makeItem({ category: 'Buzo Cuello Redondo' }),
                buzoDouble: makeItem({ category: 'Buzo Cuello Redondo', isDouble: true })
            };
            const prices = Object.fromEntries(Object.entries(samples).map(([key, item]) => [key, calculateItemBasePrice(item)]));

            selectedDeliveryMethod = 'domicilio';
            cart.cart = [samples.classicSimple];
            const oneTotals = calculateCartTotal();
            const oneSummary = cart.generateSummary();
            let whatsappUrl = '';
            const originalOpen = window.open;
            window.open = url => { whatsappUrl = String(url || ''); };
            sendViaWhatsapp('1890', { name: 'Cliente Prueba', postalCode: '1890', locality: 'Gutierrez', province: 'Buenos Aires', address: 'Calle 123' });
            window.open = originalOpen;
            const whatsappMessage = new URL(whatsappUrl).searchParams.get('text') || '';

            cart.cart = [samples.classicSimple, samples.oversizeDouble];
            const twoTotals = calculateCartTotal();
            const twoSummary = cart.generateSummary();

            cart.cart = [samples.classicSimple, samples.oversizeDouble, samples.kidsDouble];
            const threeTotals = calculateCartTotal();
            const threeSummary = cart.generateSummary();
            cart.clearCart();

            return {
                constants: { PRECIOS, PRECIOS_OVERSIZE, PRECIOS_CHICOS, PRECIOS_HOODIES, PRECIOS_BUZO_REDONDO },
                prices,
                oneTotals,
                oneSummary,
                twoTotals,
                twoSummary,
                threeTotals,
                threeSummary,
                whatsappMessage
            };
        })()`);

        assert.deepEqual(result.constants.PRECIOS, { simple: 38000, doble: 45000, simple_personalizado: 43000, doble_personalizado: 50000 });
        assert.deepEqual(result.constants.PRECIOS_OVERSIZE, { simple: 41000, doble: 48000, simple_personalizado: 46000, doble_personalizado: 53000 });
        assert.deepEqual(result.constants.PRECIOS_CHICOS, { simple: 33000, doble: 36000 });
        assert.deepEqual(result.constants.PRECIOS_HOODIES, { simple: 53000, doble: 60000 });
        assert.deepEqual(result.constants.PRECIOS_BUZO_REDONDO, { simple: 51000, doble: 56000, simple_personalizado: 56000, doble_personalizado: 61000 });
        assert.deepEqual(result.prices, {
            classicSimple: 38000,
            classicDouble: 45000,
            oversizeSimple: 41000,
            oversizeDouble: 48000,
            kidsSimple: 33000,
            kidsDouble: 36000,
            hoodieSimple: 53000,
            hoodieDouble: 60000,
            buzoSimple: 51000,
            buzoDouble: 56000
        });
        assert.deepEqual(result.oneTotals, { subtotal: 38000, envio: 8000, envioGratis: false, envioGratisPuntoAndreani: false, descuento: 0, total: 46000, cantidad: 1, promotion: result.oneTotals.promotion });
        assert(result.oneSummary.includes('Subtotal: $38.000'));
        assert(result.oneSummary.includes('Envío a domicilio: $8.000'));
        assert(result.oneSummary.includes('Total: $46.000'));
        assert.equal(result.twoTotals.subtotal, 86000);
        assert.equal(result.twoTotals.envio, 5000);
        assert.equal(result.twoTotals.total, 91000);
        assert(result.twoSummary.includes('Total: $91.000'));
        assert.equal(result.threeTotals.subtotal, 122000);
        assert.equal(result.threeTotals.descuento, 12200);
        assert.equal(result.threeTotals.envio, 0);
        assert.equal(result.threeTotals.total, 109800);
        assert(result.threeSummary.includes('10% OFF: -$12.200'));
        assert(result.threeSummary.includes('Total: $109.800'));
        assert(result.whatsappMessage.includes('Solo frente · $38.000'));
        assert(result.whatsappMessage.includes('Envío a domicilio: $8.000'));
        assert(result.whatsappMessage.includes('Total: $46.000'));
        console.log('Precios, promociones, carrito y WhatsApp validados correctamente.');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
