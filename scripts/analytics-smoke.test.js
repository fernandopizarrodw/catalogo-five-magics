'use strict';

const CDP_URL = 'http://127.0.0.1:9333';
const SITE_URL = 'http://127.0.0.1:5500/nightwish/?utm_source=instagram&utm_medium=social&utm_campaign=analytics_smoke&ga_debug=1';
const EXPECTED_EVENTS = [
    'archive_view',
    'design_open',
    'garment_select',
    'add_to_cart',
    'cart_open',
    'whatsapp_click'
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connectCdp() {
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
    const listeners = new Set();
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (!message.id) {
            listeners.forEach(listener => listener(message));
            return;
        }
        if (!pending.has(message.id)) return;
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

    return {
        socket,
        send,
        evaluate,
        onEvent(listener) { listeners.add(listener); }
    };
}

function parseAnalyticsRequest(request) {
    if (!/google-analytics\.com\/g\/collect/.test(request.url)) return null;
    const url = new URL(request.url);
    const body = new URLSearchParams(request.postData || '');
    const read = key => body.get(key) || url.searchParams.get(key) || '';
    const eventName = read('en');
    if (!eventName) return null;

    return {
        eventName,
        band: read('ep.band'),
        archive: read('ep.archive'),
        designId: read('ep.design_id'),
        designName: read('ep.design_name'),
        garment: read('ep.garment'),
        utmSource: read('ep.utm_source'),
        utmMedium: read('ep.utm_medium'),
        utmCampaign: read('ep.utm_campaign'),
        debug: read('_dbg') || read('ep.debug_mode'),
        requestId: request.requestId,
        status: null
    };
}

async function main() {
    const cdp = await connectCdp();
    const events = [];
    const byRequestId = new Map();
    const analyticsRequests = [];

    cdp.onEvent(message => {
        if (message.method === 'Network.requestWillBeSent') {
            if (/googletagmanager\.com|google-analytics\.com|\/collect(?:\?|$)/.test(message.params.request.url)) {
                analyticsRequests.push({
                    url: message.params.request.url,
                    postData: message.params.request.postData || ''
                });
            }
            const parsed = parseAnalyticsRequest({
                ...message.params.request,
                requestId: message.params.requestId
            });
            if (parsed && EXPECTED_EVENTS.includes(parsed.eventName)) {
                events.push(parsed);
                byRequestId.set(parsed.requestId, parsed);
            }
        }
        if (message.method === 'Network.responseReceived') {
            const event = byRequestId.get(message.params.requestId);
            if (event) event.status = message.params.response.status;
        }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.open = (...args) => { window.__analyticsTestWindowOpen = args; return null; };`
    });
    await cdp.send('Page.navigate', { url: SITE_URL });

    for (let attempt = 0; attempt < 80; attempt += 1) {
        await delay(150);
        const ready = await cdp.evaluate(`document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0`);
        if (ready) break;
        if (attempt === 79) throw new Error('Timeout cargando la landing Nightwish.');
    }

    await delay(1200);
    const design = await cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item => item.band === 'Nightwish' && item.previewsByGarment?.hoodie?.length);
        if (!design) return null;
        openCatalogDesign(design.designId, 'hoodie');
        return { id: design.designId, name: design.publicName };
    })()`);
    if (!design) throw new Error('No se encontró un diseño Nightwish con hoodie.');

    await delay(350);
    await cdp.evaluate(`selectModalGarment('buzo')`);
    await cdp.evaluate(`selectDeliveryMethod('taller')`);
    await delay(250);
    const added = await cdp.evaluate(`(() => {
        selectSize('S');
        selectColor('negro');
        return addToCartFromModal();
    })()`);
    if (!added) throw new Error('No se pudo agregar el diseño al carrito.');

    await delay(250);
    await cdp.evaluate(`openCartPreview()`);
    await delay(250);
    await cdp.evaluate(`confirmAndSendWhatsapp()`);
    await delay(2500);

    const browserState = await cdp.evaluate(`({
        gtagType: typeof gtag,
        googleTagManagerKeys: Object.keys(window.google_tag_manager || {}),
        googleTagDataKeys: Object.keys(window.google_tag_data || {}),
        analyticsResources: performance.getEntriesByType('resource')
            .filter(item => /googletagmanager|google-analytics|collect/.test(item.name))
            .map(item => ({ name: item.name, duration: item.duration, transferSize: item.transferSize })),
        dataLayerLength: Array.isArray(window.dataLayer) ? window.dataLayer.length : -1,
        dataLayer: Array.isArray(window.dataLayer)
            ? window.dataLayer.map(item => Array.from(item || []))
            : []
    })`);

    const failures = [];
    for (const expected of EXPECTED_EVENTS) {
        const matches = events.filter(event => event.eventName === expected);
        if (matches.length !== 1) failures.push(`${expected}: se esperó 1 evento y llegaron ${matches.length}.`);
    }

    for (const event of events) {
        if (event.status !== 204) failures.push(`${event.eventName}: respuesta GA4 ${event.status ?? 'sin respuesta'}.`);
        if (!event.archive) failures.push(`${event.eventName}: falta archive.`);
        if (event.utmSource !== 'instagram' || event.utmMedium !== 'social' || event.utmCampaign !== 'analytics_smoke') {
            failures.push(`${event.eventName}: UTM incompletos.`);
        }
        if (!event.debug) failures.push(`${event.eventName}: no está marcado para DebugView.`);
    }

    for (const eventName of ['design_open', 'garment_select', 'add_to_cart', 'whatsapp_click']) {
        const event = events.find(item => item.eventName === eventName);
        if (!event?.band) failures.push(`${eventName}: falta band.`);
        if (!event?.designId) failures.push(`${eventName}: falta design_id.`);
        if (!event?.designName) failures.push(`${eventName}: falta design_name.`);
    }

    for (const eventName of ['garment_select', 'add_to_cart', 'whatsapp_click']) {
        const event = events.find(item => item.eventName === eventName);
        if (!event?.garment) failures.push(`${eventName}: falta garment.`);
    }

    console.log(JSON.stringify({ siteUrl: SITE_URL, design, browserState, analyticsRequests, events, failures }, null, 2));
    cdp.socket.close();
    if (failures.length) process.exitCode = 1;
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
