'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CDP_URL = 'http://127.0.0.1:9333';
const PAGE_URL = 'http://127.0.0.1:5500/iron-maiden/';

async function main() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'Navegador CDP no disponible');

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
        message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        }
        return result.result.value;
    };

    try {
        await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true
        });
        await send('Page.navigate', { url: PAGE_URL });
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (await evaluate(`document.readyState === 'complete'
                && document.querySelectorAll('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length === 10`)) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await evaluate(`(() => {
            const showcase = document.getElementById('bandDesignShowcase');
            const showcaseTrack = document.getElementById('bandDesignShowcaseTrack');
            const proof = document.querySelector('.band-real-product-proof-grid');
            const proofCards = [...proof.children];
            const proofStyle = getComputedStyle(proof);
            return {
                showcaseCards: showcase.querySelectorAll('.band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length,
                showcaseCopies: showcase.querySelectorAll('.band-design-showcase-card').length,
                showcaseAnimation: getComputedStyle(showcaseTrack).animationName,
                showcaseViewportOverflow: getComputedStyle(document.getElementById('bandDesignShowcaseViewport')).overflowX,
                proofCards: proofCards.length,
                proofColumns: proofStyle.gridTemplateColumns.split(' ').length,
                firstProofSpansBoth: getComputedStyle(proofCards[0]).gridColumnEnd === '-1',
                proofOverflow: proof.scrollWidth > proof.clientWidth,
                promoCentered: [...document.querySelectorAll('.shipping-promo-options > span')].every(card => {
                    const style = getComputedStyle(card);
                    return style.textAlign === 'center' && style.justifyItems === 'center';
                }),
                pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        })()`);

        assert.equal(result.showcaseCards, 10);
        assert.equal(result.showcaseCopies, 20);
        assert.equal(result.showcaseAnimation, 'band-showcase-scroll');
        assert.equal(result.showcaseViewportOverflow, 'hidden');
        assert.equal(result.proofCards, 3);
        assert.equal(result.proofColumns, 2);
        assert.equal(result.firstProofSpansBoth, true);
        assert.equal(result.proofOverflow, false);
        assert.equal(result.promoCentered, true);
        assert.equal(result.pageOverflow, false);

        await evaluate(`document.getElementById('bandDesignShowcase').scrollIntoView({ block: 'start' })`);
        await new Promise(resolve => setTimeout(resolve, 250));
        const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: false
        });
        const output = path.resolve(__dirname, '..', 'reports', 'iron-maiden-grid-mobile.png');
        fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));

        await evaluate(`Promise.all([...document.querySelectorAll('.band-real-product-proof-grid img')].map(image => {
            image.loading = 'eager';
            if (image.complete) return Promise.resolve();
            return new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
        }))`);
        const proofRect = await evaluate(`(() => {
            const section = document.getElementById('realProductProof');
            const rect = section.getBoundingClientRect();
            return { x: 0, y: rect.top + window.scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
        })()`);
        const proofScreenshot = await send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true,
            captureBeyondViewport: true,
            clip: proofRect
        });
        const proofOutput = path.resolve(__dirname, '..', 'reports', 'iron-maiden-proof-grid-mobile.png');
        fs.writeFileSync(proofOutput, Buffer.from(proofScreenshot.data, 'base64'));

        await send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: false
        });
        await send('Page.navigate', { url: PAGE_URL });
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (await evaluate(`document.readyState === 'complete'
                && document.querySelectorAll('#bandDesignShowcase .band-design-showcase-set:not([aria-hidden="true"]) .band-design-showcase-card').length === 10`)) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const desktop = await evaluate(`(() => {
            const showcase = document.getElementById('bandDesignShowcase');
            const set = showcase.querySelector('.band-design-showcase-set');
            const proof = document.querySelector('.band-real-product-proof-grid');
            return {
                showcaseCards: set.querySelectorAll('.band-design-showcase-card').length,
                showcaseAnimation: getComputedStyle(showcase.querySelector('.band-design-showcase-track')).animationName,
                proofColumns: getComputedStyle(proof).gridTemplateColumns.split(' ').length,
                pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        })()`);
        assert.equal(desktop.showcaseCards, 10);
        assert.equal(desktop.showcaseAnimation, 'band-showcase-scroll');
        assert.equal(desktop.proofColumns, 3);
        assert.equal(desktop.pageOverflow, false);
        console.log(JSON.stringify({ mobile: result, desktop, screenshots: [output, proofOutput] }, null, 2));
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
