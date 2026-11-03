'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { buildCatalogDesigns } = require('../js/catalog-design.js');
const configs = require('../js/band-archives-config.js');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:data/products.json'], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(buildCatalogDesigns(products).map(design => [design.designId, design.orderCodeBase]), buildCatalogDesigns(previous).map(design => [design.designId, design.orderCodeBase]), 'Color previews must not create designs or change order codes');
    const cards = configs.find(config => config.slug === 'iron-maiden').whiteShirts;
    assert.equal(cards.length, 12);
    for (const card of cards) assert(fs.existsSync(path.join(root, card.image)), card.image);
    for (const product of products.filter(product => product.band === 'Iron Maiden')) {
        for (const variant of product.variants || []) {
            assert(fs.existsSync(path.join(root, variant.img)), variant.img);
            for (const preview of variant.colorPreviews || []) assert(fs.existsSync(path.join(root, preview.img)), preview.img);
        }
    }
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/iron-maiden/`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-white-shirts-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const report = [];
    const reportDir = path.join(root, 'reports', 'maiden-white-shirts');
    fs.mkdirSync(reportDir, { recursive: true });
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) { if (launchError) throw launchError; await pause(100); }
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
        socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let sequence = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
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
        await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Page.navigate', { url });
        for (let i = 0; i < 100; i++) {
            await pause(100);
            if (await evaluate('document.readyState === "complete" && document.querySelectorAll("#bandWhiteShirtsGrid button").length === 12')) break;
        }
        assert.equal(await evaluate('document.querySelectorAll("#bandWhiteShirtsGrid button").length'), 12);
        assert.equal(await evaluate('document.querySelectorAll("#bandCuratedSelection [data-design-id]").length'), 16);
        for (const width of [390, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
            await evaluate('document.querySelector(".maiden-white-link").click()');
            assert(await evaluate('document.querySelector("#bandWhiteShirts details").open'));
            await evaluate('document.getElementById("bandWhiteShirts").scrollIntoView({behavior:"instant",block:"start"})');
            await pause(150);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(reportDir, `white-shirts-${width}.png`), Buffer.from(shot.data, 'base64'));
            const bounds = await evaluate('(() => { const box = document.getElementById("bandWhiteShirts").getBoundingClientRect(); return {left:box.left,right:box.right}; })()');
            assert(bounds.left >= -1 && bounds.right <= width + 1, `Section overflows at ${width}`);
            const imageBox = await evaluate('(() => { const box = document.querySelector("#bandWhiteShirtsGrid img").getBoundingClientRect(); return {width:box.width,height:box.height}; })()');
            assert(Math.abs(imageBox.width - imageBox.height) <= 1, 'White-shirt images must remain square without empty vertical space');
            for (const card of cards) {
                await evaluate(`cart.clearCart(); document.querySelector('#bandWhiteShirtsGrid button[data-design-id="${card.designId}"]').click();`);
                const opened = await evaluate('({id:currentCatalogDesign.designId,color:selectedColor,print:selectedPrintMode,image:getModalImages()[currentSlide].img,back:selectedCatalogBackRef?.label,code:getCurrentCatalogOrderCode(),simple:resolveModalPriceConfig().simple,double:resolveModalPriceConfig().doble})');
                assert.equal(opened.id, card.designId);
                assert.equal(opened.color, 'blanco', JSON.stringify(opened));
                assert.equal(opened.print, 'double');
                assert(opened.image.endsWith(card.image), JSON.stringify(opened));
                const special = card.designId === 'iron-maiden-buenos-aires-2026-aniversario-fmd';
                assert.equal(opened.simple, special ? 40000 : 38000);
                assert.equal(opened.double, special ? 47000 : 45000);
                if (card.designId === 'iron-maiden-eddie-huracan-original-fmd') assert.equal(opened.back, 'Dorso Eddie Huracán · Set List Argentina 2026');
                const changes = await evaluate(`(() => {
                    selectRemeraVariant('oversize_unisex'); selectSize('XL');
                    const before = { print:selectedPrintMode,back:selectedCatalogBackRef?.label };
                    selectColor('negro'); selectColor('blanco');
                    const after = { print:selectedPrintMode,back:selectedCatalogBackRef?.label };
                    return {before,after,size:selectedSize,price:resolveModalPriceConfig().doble};
                })()`);
                assert.deepEqual(changes.before, changes.after);
                assert.equal(changes.size, 'XL');
                assert.equal(changes.price, special ? 50000 : 48000);
                const order = await evaluate(`(() => {
                    selectRemeraVariant('hombre_clasica'); selectSize('M'); selectColor('blanco');
                    const added = addToCartFromModal();
                    return {added,item:cart.getCart()[0],summary:cart.generateSummary()};
                })()`);
                assert(order.added, JSON.stringify(opened));
                assert.equal(order.item.color, 'blanco');
                assert(order.item.frontImage.endsWith(card.image), JSON.stringify(order));
                assert(order.summary.includes('* Color: Blanca'));
                assert(order.summary.includes(`* Precio: $${special ? '47' : '45'}.000`));
                assert.equal(order.item.frontCode, opened.code);
                await evaluate('cart.clearCart(); selectPrintMode("simple"); selectColor("negro"); selectColor("blanco");');
                const simple = await evaluate('({print:selectedPrintMode,price:resolveModalPriceConfig().simple,code:getCurrentCatalogOrderCode()})');
                assert.equal(simple.print, 'simple');
                assert.equal(simple.price, special ? 40000 : 38000);
                assert.equal(simple.code, opened.code);
                report.push({ width, ...opened, prices: changes.price, order: order.summary });
                await evaluate('closeModal(false,false)');
            }
        }
        const variant = await evaluate(`(() => {
            openCatalogDesign('iron-maiden-eddie-huracan-original-fmd','remera');
            const i=currentModalSourceRefs.findIndex(ref=>ref.variantIndex===1); goToSlide(i,false); selectPrintMode('simple'); selectColor('blanco');
            return {variant:selectedCatalogFrontRef.variantIndex,print:selectedPrintMode};
        })()`);
        assert.deepEqual(variant, { variant: 1, print: 'simple' });
        fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({status:'PASS',designs:12,images:13,flows:report.length,unchangedDesignCountAndCodes:true,prices:'PASS',colorAndPrintPreservation:'PASS',order:'PASS',screenshots:reportDir},null,2));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => {console.error(error);process.exitCode=1;});
