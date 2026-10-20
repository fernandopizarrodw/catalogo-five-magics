'use strict';

const assert = require('node:assert/strict');

async function main() {
    const pages = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
    const socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
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
    try {
        for (const width of [390, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
            await send('Page.navigate', { url: 'http://127.0.0.1:5500/iron-maiden/' });
            await new Promise(resolve => setTimeout(resolve, 1800));
            const result = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
                const production = document.querySelector('.production-tracking-strip');
                return { urgentNotice: Boolean(document.querySelector('.band-show-week-notice, .shipping-show-alert, .modal-show-delivery-note')),
                    production: production.innerText,
                    note: document.querySelector('.band-campaign-feature-note').innerText,
                    overflow: document.documentElement.scrollWidth > innerWidth };
            })()` });
            assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
            const state = result.result.value;
            assert.equal(state.urgentNotice, false, JSON.stringify(state));
            assert.match(state.production, /48 A 72 HORAS HÁBILES/);
            assert.match(state.production, /exclusivamente a pedido/);
            assert.match(state.production, /Villa Martelli o envíos a todo el país/);
            assert.match(state.note, /Disponibles con estampa frontal/);
            assert(!state.overflow, JSON.stringify(state));
            console.log(`PASS ${width}px: comunicación normal, producción y ancho`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
