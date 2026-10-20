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
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };
    try {
        for (const width of [390, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
            await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
            await send('Page.navigate', { url: 'http://127.0.0.1:5500/iron-maiden/' });
            for (let attempt = 0; attempt < 100; attempt++) {
                if (await evaluate('document.querySelectorAll("#productsGrid .catalog-design-card").length > 0')) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            const results = await evaluate(`(async () => {
                const ids = ['tour-argentina', 'eddies-argentinos', 'nine-classics', 'singles', 'backs', ''];
                const results = [];
                for (const [index, id] of ids.entries()) {
                    document.querySelectorAll('.band-discovery-nav-grid button')[index].click();
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    const grid = document.getElementById('productsGrid');
                    results.push({ id, active: document.querySelector('[data-band-landing-collection="' + id + '"]').classList.contains('active'),
                        cards: grid.children.length, top: grid.getBoundingClientRect().top,
                        firstVisible: grid.getBoundingClientRect().top < innerHeight });
                }
                return results;
            })()`);
            for (const result of results) {
                assert(result.active && result.cards > 0 && result.firstVisible, JSON.stringify(result));
                assert(result.top >= 0 && result.top <= 220, JSON.stringify(result));
            }
            console.log(`PASS ${width}px: seis accesos filtran y muestran sus resultados`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
