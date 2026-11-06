'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:data/products.json'], { cwd: root, encoding: 'utf8', maxBuffer: 20000000 }));
    const old = previous.find(p => p.id === 5013), ozzy = products.find(p => p.id === 5013);
    assert.equal(ozzy.variants.length, old.variants.length + 11);
    old.variants.forEach((variant, i) => {
        const { designId, ...current } = ozzy.variants[i];
        assert.deepEqual(current, variant, `Existing variant ${i}`);
    });
    const additions = ozzy.variants.slice(old.variants.length);
    for (const variant of additions) assert(fs.existsSync(path.join(root, variant.img)), variant.img);
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-ozzy-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) { if (launchError) throw launchError; await pause(100); }
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
        socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let sequence = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
            if (data.method === 'Network.responseReceived' && data.params.response.url.startsWith(origin) && data.params.response.status >= 400) failedAssets.push(data.params.response.url);
            const request = pending.get(data.id);
            if (!request) return;
            pending.delete(data.id); clearTimeout(request.timeout);
            data.error ? request.reject(new Error(data.error.message)) : request.resolve(data.result);
        });
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const id = ++sequence;
            const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
            pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
        });
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        };
        const waitFor = async expression => {
            for (let i = 0; i < 150; i++) { if (await evaluate(expression).catch(() => false)) return; await pause(100); }
            throw new Error(`Not ready: ${expression}`);
        };
        await send('Runtime.enable'); await send('Network.enable');
        for (const page of ['/ozzy/', '/?banda=Ozzy%20Osbourne#catalogoPrincipal']) {
            await send('Page.navigate', { url: origin + page });
            await waitFor('catalogDesigns.length > 0 && document.querySelectorAll(".catalog-design-card").length > 0');
            if (page === '/ozzy/') await evaluate('selectBandLandingGarment("remera")');
            const count = await evaluate('document.querySelectorAll(".catalog-design-card").length');
            assert.equal(count, 10, page);
            const identity = await evaluate(`(() => {
                const previous = ${JSON.stringify([old])};
                return FMDCatalogDesign.buildCatalogDesigns(previous, {resolveDesignId: getCatalogDesignResolverId}).map(d => ({
                    id:d.designId, code:d.orderCodeBase, current:catalogDesignById.get(d.designId)?.orderCodeBase
                }));
            })()`);
            for (const design of identity) assert.equal(design.current, design.code, design.id);
            for (const width of [360, 1440]) {
                await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
                assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `${page} overflow ${width}`);
                for (const variant of additions) {
                    const state = await evaluate(`(() => {
                        const img = ${JSON.stringify(variant.img)};
                        const design = catalogDesigns.find(d => getCatalogDesignFrontRefs(d).some(r => r.image.endsWith(img)));
                        if (!design) throw new Error('Missing design: ' + img);
                        openCatalogDesign(design.designId, 'remera_clasica');
                        const index = currentModalSourceRefs.findIndex(r => r.image.endsWith(img));
                        if (index < 0) throw new Error('Missing slide: ' + img);
                        goToSlide(index, false); selectColor('negro'); selectSize('M'); selectPrintMode('simple');
                        cart.clearCart();
                        return {added:addToCartFromModal(), summary:cart.generateSummary(), mode:selectedPrintMode, prices:resolveModalPriceConfig()};
                    })()`);
                    await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete && document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth > 0');
                    assert(state.added, variant.img);
                    assert.equal(state.mode, 'simple');
                    assert.equal(state.prices.simple, 38000); assert.equal(state.prices.doble, 45000);
                    assert(state.summary.includes('* Precio: $38.000'), state.summary);
                    await evaluate('selectPrintMode("double");cart.clearCart();addToCartFromModal()');
                    assert((await evaluate('cart.generateSummary()')).includes('* Precio: $45.000'));
                    await evaluate('closeModal(false,false);cart.clearCart()');
                }
            }
        }
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({ status:'PASS', files:11, uniqueDesigns:10, newArtworks:3, pages:['general','ozzy'], widths:[360,1440], images:true, prices:true, cartWhatsapp:true, existingCodes:true, errors, failedAssets }));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
