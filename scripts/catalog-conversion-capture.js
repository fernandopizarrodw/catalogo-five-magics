'use strict';

const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9333';
const SITE_URL = 'http://127.0.0.1:5500/index.html';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'reports', 'catalog-conversion-preview-2026-07-13');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
    const pages = await fetch(`${CDP_URL}/json`).then(response => response.json());
    const page = pages.find(item => item.type === 'page');
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
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    }

    async function navigate() {
        await send('Page.navigate', { url: SITE_URL });
        for (let attempt = 0; attempt < 50; attempt += 1) {
            await delay(120);
            if (await evaluate(`document.readyState === 'complete' && typeof catalogDesigns !== 'undefined' && catalogDesigns.length > 0`)) return;
        }
        throw new Error('Timeout cargando el catálogo local.');
    }

    return { socket, send, evaluate, navigate };
}

async function capture(cdp, filename) {
    await delay(450);
    const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(result.data, 'base64'));
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

async function showBandCatalog(cdp, band) {
    await cdp.evaluate(`openBandAccess(${JSON.stringify(band)})`);
    await delay(650);
    await cdp.evaluate(`(() => {
        const section = document.getElementById('catalogoPrincipal');
        window.scrollTo({ top: Math.max(0, section.offsetTop - 72), behavior: 'auto' });
    })()`);
}

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await setViewport(cdp, 1440, 1000, false);
    await showBandCatalog(cdp, 'Metallica');
    await capture(cdp, 'catalogo-desktop.png');

    await cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'metallica' && normalizeText(item.publicName) === 'ride the lightning');
        openCatalogDesign(design.designId);
        document.querySelector('.modal-body').scrollTop = 0;
    })()`);
    await capture(cdp, 'modal-desktop.png');

    await setViewport(cdp, 390, 844, true);
    await showBandCatalog(cdp, 'Metallica');
    await capture(cdp, 'catalogo-mobile.png');

    await cdp.evaluate(`(() => {
        const design = catalogDesigns.find(item => normalizeText(item.band) === 'metallica' && normalizeText(item.publicName) === 'ride the lightning');
        openCatalogDesign(design.designId);
        document.querySelector('.modal-body').scrollTop = 0;
    })()`);
    await capture(cdp, 'modal-mobile.png');

    cdp.socket.close();
    process.stdout.write(`${OUTPUT_DIR}\n`);
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
