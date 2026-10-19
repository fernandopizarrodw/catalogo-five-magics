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
                const notice = document.querySelector('.band-show-week-notice');
                const warning = document.querySelector('.shipping-show-alert');
                const promo = document.querySelector('.july-shipping-promo');
                const link = notice.querySelector('a');
                return { text: notice.innerText, warning: warning.innerText, adjacent: warning.nextElementSibling === promo,
                    href: link.href, note: document.querySelector('.band-campaign-feature-note').innerText,
                    overflow: document.documentElement.scrollWidth > innerWidth,
                    linkFits: link.getBoundingClientRect().right <= innerWidth };
            })()` });
            assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
            const state = result.result.value;
            assert.match(state.text, /Miércoles 21/);
            assert.match(state.text, /Martes 20/);
            assert.match(state.text, /CONSULTAR DISPONIBILIDAD PARA EL SHOW/);
            assert.match(state.warning, /Andreani ya no es una opción segura/);
            assert(state.adjacent && state.href.startsWith('https://wa.me/'));
            assert.match(state.note, /Disponibles con estampa frontal/);
            assert(!state.overflow && state.linkFits, JSON.stringify(state));
            console.log(`PASS ${width}px: aviso, enlace, promoción y ancho`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
