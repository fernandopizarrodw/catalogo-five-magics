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

        const newProducts=products.filter(p=>p.id>=7339&&p.id<=7344);
        assert.equal(newProducts.length,6);
        const previous=JSON.parse(require('node:child_process').execFileSync('git',['show','HEAD:data/products.json'],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024}));
        for(const p of previous){
            const now=products.find(n=>n.id===p.id);
            if(p.id===5016) assert.deepEqual({...now,variants:now.variants.slice(0,24)},p);
            else assert.deepEqual(now,p);
        }
        assert.equal(new Set(products.map(p=>p.id)).size,products.length);
        for(const p of [...newProducts,current]){
            for(const v of p.variants)assert(fs.existsSync(path.join(root,v.img)),v.img);
        }
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/epica/#retrospect'});
            await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
            await pause(600);
            await waitFor('document.readyState==="complete"');
            await pause(700);
            assert(await evaluate('Math.abs(document.querySelector("#retrospect").getBoundingClientRect().top)<180'),'Anchor');
            await send('Page.reload');
            await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
            await pause(600);
            assert(await evaluate('Math.abs(document.querySelector("#retrospect").getBoundingClientRect().top)<180'),'Reload anchor');
            assert.equal(await evaluate('catalogDesigns.filter(d=>d.designId==="epica-retrospect").length'),1);
            await waitFor('[...document.querySelectorAll("#retrospect img")].every(i=>i.complete&&i.naturalWidth>0)');
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(profile,'epica-'+width+'.png'),Buffer.from(shot.data,'base64'));
            for(const [card,backIndex] of [[0,24],[1,22]]){
                await evaluate('document.querySelectorAll("#retrospect .band-featured-collection-card")['+card+'].click()');
                await waitFor('currentCatalogDesign?.designId==="epica-retrospect"');
                assert.equal(await evaluate('selectedCatalogBackRef.variantIndex'),backIndex);
                assert.equal(await evaluate('usesBandLandingShownComposition()'),false);
                await evaluate('selectColor("negro");selectSize("M");cart.clearCart()');
                const preset=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0]})');
                assert(preset.added);
                assert.equal(preset.item.backCode,await evaluate('cart.generateCode(5016,'+backIndex+')'));
                for(const cut of ['hombre_clasica','oversize_unisex']){
                    for(const mode of ['simple','double']){
                        await evaluate('selectRemeraVariant('+JSON.stringify(cut)+');selectPrintMode('+JSON.stringify(mode)+');selectColor("negro");selectSize("M");cart.clearCart()');
                        if(mode==='double')await evaluate('if(selectedCatalogBackRef?.variantIndex!=='+backIndex+')selectCatalogDesignBack(5016,'+backIndex+')');
                        const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                        assert(order.added,JSON.stringify(order));
                        const price=(cut==='hombre_clasica'?38000:41000)+(mode==='double'?7000:0);
                        assert(order.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),order.summary);
                        assert.equal(order.item.frontCode,await evaluate('cart.generateCode(5016,21)'));
                        if(mode==='double')assert.equal(order.item.backCode,await evaluate('cart.generateCode(5016,'+backIndex+')'));
                        assert.equal(await evaluate('cart.getCart().length'),1);
                    }
                }
                await evaluate('selectModalGarmentType("sin_mangas");selectPrintMode("double");selectColor("negro");selectSize("M");cart.clearCart()');
                await evaluate('if(selectedCatalogBackRef?.variantIndex!=='+backIndex+')selectCatalogDesignBack(5016,'+backIndex+')');
                const sleeveless=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                assert(sleeveless.added);
                assert.equal(sleeveless.item.backCode,await evaluate('cart.generateCode(5016,'+backIndex+')'));
                assert(sleeveless.summary.includes('* Precio: $45.000'),sleeveless.summary);
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Epica overflow');
            for(const slug of ['slayer','iron-maiden','pantera','']){
                await send('Page.navigate',{url:origin+'/'+slug+(slug?'/':'')});
                await waitFor('catalogDesigns.length>0');
                const scoped=newProducts.filter(p=>!slug||p.band===({'slayer':'Slayer','iron-maiden':'Iron Maiden','pantera':'Pantera'})[slug]);
                for(const p of scoped){
                    assert(await evaluate('catalogDesigns.some(d=>d.designId==='+JSON.stringify(p.designId)+')'));
                    await evaluate('openCatalogDesign('+JSON.stringify(p.designId)+');selectRemeraVariant("hombre_clasica");selectColor("negro");selectSize("M");cart.clearCart()');
                    await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                    const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                    assert(order.added,JSON.stringify(order));
                    assert(order.summary.includes('* Precio: $'+(p.id===7344?'45.000':'38.000')),order.summary);
                    assert.equal(order.item.frontCode,await evaluate('cart.generateCode('+p.id+',0)'));
                    if(p.id===7344)assert.equal(order.item.backCode,await evaluate('cart.generateCode(7344,1)'));
                    if(p.id===7339){
                        await evaluate('openCatalogDesignPreview('+JSON.stringify(p.designId)+',"remera_clasica","double","/images/slayer/dobles/god_hates_us_all_doble.jpg");selectColor("negro");selectSize("M");cart.clearCart()');
                        const double=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                        assert(double.added);
                        assert.equal(double.item.backCode,await evaluate('cart.generateCode(7339,1)'));
                        assert(double.summary.includes('* Precio: $45.000'));
                    }
                    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Overflow '+slug);
                    await evaluate('closeModal(false,false);cart.clearCart()');
                }
            }
        }
        assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
        console.log(JSON.stringify({status:'PASS',newDesigns:6,epicaCombinations:2,oldProductsPreserved:true,widths:[390,1440],prices:true,frontBackCodes:true,cartWhatsapp:true,anchorAndReload:true,errors,failedAssets,screenshots:profile}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });


