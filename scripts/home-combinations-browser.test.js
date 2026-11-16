'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const designId = 'epica-retrospect';
    const products = JSON.parse(fs.readFileSync(path.join(root,'data/products.json'),'utf8'));
    assert.equal(products.find(p=>p.id===7316).variants[12].designId,'slayer-3d-fmd-south-of-heaven-original-1988');
    const current=products.find(p=>p.id===5016);
    assert.equal(current.variants[21].designId,designId);
    assert.equal(current.variants[22].backTargetDesignId,designId);
    assert.equal(current.variants[7].designId,'cd-epica-the-holographic-principle--p5016');
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-slayer-epica-assets-'));
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


        const cards=require('./../js/home-combinations.js');
        const old=JSON.parse(require('node:child_process').execFileSync('git',['show','HEAD:data/products.json'],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024}));
        for(const p of old){const now=products.find(n=>n.id===p.id);assert.deepEqual(p.variants?{...now,variants:now.variants.slice(0,p.variants.length)}:now,p);}
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:'about:blank'});
            await waitFor('location.href==="about:blank"');
            await send('Page.navigate',{url:origin+'/#doble-estampa'});
            await waitFor('document.querySelectorAll("#homeCombinationsGrid a").length===4');
            assert(await evaluate('document.querySelector("#heroSection").nextElementSibling.id==="doble-estampa"'));
            await evaluate('document.querySelector("#homeCombinationsMore").click()');
            assert.equal(await evaluate('document.querySelectorAll("#homeCombinationsGrid a").length'),18);
            for(let i=0;i<cards.length;i++){
                const c=cards[i];
                await evaluate('document.querySelectorAll("#homeCombinationsGrid a")['+i+'].click()');
                await waitFor('currentCatalogDesign?.designId==='+JSON.stringify(c.designId));
                assert.equal(await evaluate('selectedPrintMode'),'double',c.file);
                assert.equal(await evaluate('selectedCatalogBackRef?.productId'),c.backProduct,c.file);
                assert.equal(await evaluate('selectedCatalogBackRef?.variantIndex'),c.back,c.file);
                assert.equal(await evaluate('document.getElementById("modalPurchaseFlow").dataset.combination'),'true',c.file);
                for(const cut of ['hombre_clasica','oversize_unisex']){
                    await evaluate('selectRemeraVariant('+JSON.stringify(cut)+');selectColor("negro");selectSize("M");cart.clearCart()');
                    await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                    assert.equal(await evaluate('selectedCatalogBackRef?.variantIndex'),c.back,c.file);
                    await evaluate('setModalPurchaseStep(2,false);document.querySelector("[data-flow-action=next]").click()');
                    assert.equal(await evaluate('document.getElementById("modalPurchaseFlow").dataset.step'),'4',c.file);
                    const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                    assert(order.added,JSON.stringify(order));
                    assert.equal(order.item.backCode,await evaluate('cart.generateCode('+c.backProduct+','+c.back+')'),c.file);
                    const frontIndex=products.find(p=>p.id===c.product).variants[c.front].orderVariantIndex??c.front;
                    assert.equal(order.item.frontCode,await evaluate('cart.generateCode('+c.product+','+frontIndex+')'),c.file);
                    const price=(cut==='hombre_clasica'?45000:48000)+(c.product===7312?2000:0);
                    assert(order.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),order.summary);
                    assert.equal(await evaluate('cart.getCart().length'),1);
                }
                await evaluate('setModalPurchaseStep(3,false)');
                assert.equal(await evaluate('document.getElementById("modalPurchaseFlow").dataset.combination'),'false');
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
            await evaluate('document.getElementById("homeCombinationsMore").click()');
            assert.equal(await evaluate('[...document.querySelectorAll("#homeCombinationsGrid a")].filter(a=>!a.hidden).length'),4);
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
            await evaluate('document.getElementById("doble-estampa").scrollIntoView({behavior:"instant"})');
            await pause(700);
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(profile,'combos-'+width+'.png'),Buffer.from(shot.data,'base64'));
        }
        assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
        console.log(JSON.stringify({status:'PASS',combinations:18,widths:[390,1440],frontBackCodes:true,prices:true,cartWhatsapp:true,threeStepPurchase:true,customize:true,existingProductsPreserved:true,errors,failedAssets,screenshots:profile}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });




