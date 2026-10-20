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
        const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
        return response.result.value;
    };
    try {
        for (const width of [390, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
            await send('Page.navigate', { url: 'http://127.0.0.1:5500/iron-maiden/' });
            await new Promise(resolve => setTimeout(resolve, 1200));
            const state = await evaluate(`(() => {
                const pre = document.querySelector('.band-landing-pre-show');
                const post = document.querySelector('.maiden-post-show-hero');
                document.documentElement.classList.add('fmd-post-show-active');
                post.setAttribute('aria-hidden', 'false');
                pre.setAttribute('aria-hidden', 'true');
                return {
                    preDisplay: getComputedStyle(pre).display,
                    postDisplay: getComputedStyle(post).display,
                    title: post.querySelector('h1').innerText,
                    subtitle: post.querySelector('h2').innerText,
                    ctas: [...post.querySelectorAll('a')].map(link => link.innerText),
                    overflow: document.documentElement.scrollWidth > innerWidth
                };
            })()`);
            assert.equal(state.preDisplay, 'none', JSON.stringify(state));
            assert.equal(state.postDisplay, 'grid', JSON.stringify(state));
            assert.match(state.title, /IRON MAIDEN · BUENOS AIRES 2026/);
            assert.match(state.subtitle, /LA PRIMERA NOCHE YA ES HISTORIA/);
            assert.deepEqual(state.ctas, ['VER EDDIES ARGENTINOS', 'VER COLECCIÓN COMPLETA']);
            assert.equal(state.overflow, false, JSON.stringify(state));
            console.log(`PASS ${width}px: hero post-show Maiden`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
