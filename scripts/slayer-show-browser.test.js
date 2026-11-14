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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-slayer-show-'));
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

        const expected = [
            {product:7101,variant:5,front:0,back:4,title:'Reign in Blood · Argentina 2026'},
            {product:7122,variant:4,front:0,back:3,title:'Goat Tour · Buenos Aires'},
            {product:7106,variant:6,front:0,back:5,title:'Águila FMD · Buenos Aires'},
            {product:7113,variant:3,front:0,back:2,title:'Reign in Blood · 40th Anniversary'},
            {product:7316,variant:11,front:9,back:10,title:'Goat Flame 3D · Fechas 2026'}
        ];
        const reports = path.join(root,'reports/slayer-show');
        fs.mkdirSync(reports,{recursive:true});
        for (const width of [390,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/slayer/?show-test='+width+'#argentina-2026'});
            await waitFor('catalogDesigns.length>0');
            await evaluate('document.fonts.ready');
            await pause(800);
            const checkAnchor = async () => {
                const pos = await evaluate("document.getElementById('argentina-2026').getBoundingClientRect().top");
                assert(pos >= 0 && pos < 200, 'Anchor not visible: '+pos);
                assert.equal(await evaluate('Boolean(currentCatalogDesign)'), false);
            };
            await checkAnchor();
            await send('Page.reload',{ignoreCache:true});
            await waitFor('catalogDesigns.length>0 && document.readyState==="complete"');
            await pause(800);
            await checkAnchor();
            assert(await evaluate("document.querySelector('.band-landing-hero').compareDocumentPosition(document.getElementById('argentina-2026')) & Node.DOCUMENT_POSITION_FOLLOWING"));
            assert(await evaluate("document.getElementById('argentina-2026').compareDocumentPosition(document.getElementById('catalogoPrincipal')) & Node.DOCUMENT_POSITION_FOLLOWING"));
            assert.deepEqual(await evaluate("[...document.querySelectorAll('.slayer-show-card h3')].map(n=>n.textContent)"),expected.map(e=>e.title));
            assert.equal(await evaluate('document.querySelectorAll(".slayer-show-card").length'),5);
            for(let i=0;i<expected.length;i++) {
                const e=expected[i], selector='.slayer-show-card:nth-child('+(i+1)+')';
                await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",behavior:"instant"})');
                await waitFor('document.querySelector('+JSON.stringify(selector+' img')+').complete && document.querySelector('+JSON.stringify(selector+' img')+').naturalWidth>0');
                const point=await evaluate('(() => {const n=document.querySelector('+JSON.stringify(selector+' h3')+'); const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
                await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
                await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
                await waitFor('Boolean(currentCatalogDesign)');
                const state=await evaluate('({product:currentProduct.id,front:selectedCatalogFrontRef.variantIndex,back:selectedCatalogBackRef?.variantIndex,mode:selectedPrintMode,view:getModalImages()[currentSlide].img})');
                assert.equal(state.product,e.product);
                assert.equal(state.back,e.back,JSON.stringify(state));
                assert.equal(state.mode,'double');
                const cardImage=await evaluate('document.querySelector('+JSON.stringify(selector+' img')+').getAttribute("src")');
                assert.equal(state.view.replace(/^\//,''),cardImage.replace(/^\//,''));
                for(const cut of ['hombre_clasica','mujer_clasica','oversize_unisex','sin_mangas']) {
                    await evaluate(cut==='sin_mangas'?"selectModalGarmentType('sin_mangas')":"selectRemeraVariant('"+cut+"')");
                    await evaluate("selectSize('M');cart.clearCart()");
                    assert.equal(await evaluate('selectedPrintMode'),'double');
                    assert.equal(await evaluate('selectedCatalogBackRef.variantIndex'),e.back);
                    const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary(),frontCode:cart.generateCode('+e.product+','+e.front+'),backCode:cart.generateCode('+e.product+','+e.back+')})');
                    assert(order.added,JSON.stringify(order));
                    assert.equal(order.item.frontCode,order.frontCode);
                    assert.equal(order.item.backCode,order.backCode);
                    assert(order.summary.includes(cut==='oversize_unisex'?'$48.000':'$45.000'),order.summary);
                }
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
            await evaluate("document.getElementById('argentina-2026').scrollIntoView({behavior:'instant'})");
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Horizontal overflow');
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(reports,'section-'+width+'.png'),Buffer.from(shot.data,'base64'));
        }
        assert.deepEqual(errors,[]);
        assert.deepEqual(failedAssets,[]);
        console.log(JSON.stringify({status:'PASS',cards:5,widths:[390,1440],anchorFreshAndReload:true,exactCombinations:true,cuts:['classicMen','classicWomen','oversize','sleeveless'],cartAndPrices:true,errors,failedAssets}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });


