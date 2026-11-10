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
        for(const page of ['/epica/','/?banda=Epica#catalogoPrincipal']){
            for(const width of [390,1440]){
                await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
                await send('Page.navigate',{url:origin+page});
                await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
                if(page==='/epica/') await evaluate('selectBandLandingGarment("remera")');
                assert.equal(await evaluate(`document.querySelectorAll('.catalog-design-card[data-design-id="${designId}"]').length`),1);
                await evaluate(`document.querySelector('.catalog-design-card[data-design-id="${designId}"] .catalog-design-card-main').click()`);
                await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete&&document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                assert.equal(await evaluate('selectedPrintMode'),'double');
                for(const garment of ['remera_clasica','oversize']){
                    for(const mode of ['double','simple']){
                        await evaluate(`selectRemeraVariant('${garment==='oversize'?'oversize_unisex':'hombre_clasica'}');selectPrintMode('${mode}');selectColor('negro');selectSize('M');cart.clearCart()`);
                        const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                        assert(order.added,JSON.stringify(order));
                        const price=garment==='oversize'?(mode==='double'?48000:41000):(mode==='double'?45000:38000);
                        assert(order.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),order.summary);
                        assert(order.item.frontCode);
                        if(mode==='double'){assert(order.item.backCode);assert(order.summary.includes('Retrospect - Simone Simons'));assert(!order.summary.includes('a definir'));}
                        assert.equal(await evaluate('cart.getCart().length'),1);
                    }
                }
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Overflow '+width);
                await evaluate('closeModal(false,false);openCatalogDesign("cd-epica-the-holographic-principle--p5016");selectColor("negro");selectSize("M");cart.clearCart()');
                const holo=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                assert(holo.added,holo.summary);
                assert.equal(holo.item.frontCode,await evaluate('cart.generateCode(5016,7)'));
                assert.equal(holo.item.backCode,await evaluate('cart.generateCode(5016,23)'));
                assert(holo.summary.includes('* Precio: $45.000'));
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
        }
        const newId='slayer-3d-fmd-south-of-heaven-original-1988';
        const slayerIds=['slayer-3d-fmd-reign-in-blood-v2','slayer-3d-fmd-south-of-heaven',newId];
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/slayer/'});
            await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
            assert.equal(await evaluate('catalogDesigns.filter(d=>d.band==="Slayer").length'),61);
            for(const collection of ['3d-fmd','fmd-originals']){
                await evaluate(`selectBandLandingCollection('${collection}')`);
                assert(await evaluate(`Boolean(document.querySelector('.catalog-design-card[data-design-id="${newId}"]'))`),collection);
            }
            await evaluate('selectBandLandingCollection("3d-fmd")');
            assert.equal(await evaluate('document.querySelectorAll(".catalog-design-card").length'),12);
            for(const id of slayerIds){
                await evaluate(`document.querySelector('.catalog-design-card[data-design-id="${id}"] .catalog-design-card-main').click();selectSize('M');selectColor('negro');selectPrintMode('simple');cart.clearCart()`);
                await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete&&document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                const state=await evaluate('({id:currentCatalogDesign.designId,image:selectedCatalogFrontRef.image,added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                assert.equal(state.id,id);assert(state.added);assert(state.summary.includes('* Precio: $38.000'));
                if(id===newId)assert.equal(state.item.frontCode,'S3F-7316.V13');
                const local=fs.readFileSync(path.join(root,state.image));
                const served=Buffer.from(await fetch(origin+'/'+state.image.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')).then(r=>r.arrayBuffer()));
                assert(local.equals(served),'Stale image: '+state.image);
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Slayer overflow');
        }
        const fearId='iron-maiden-run-for-your-lives-logo-fear-set-list-argentina-2026';
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/iron-maiden/?asset-check='+width+'#diseno-'+fearId});
            await waitFor('currentCatalogDesign?.designId==="'+fearId+'"').catch(async error=>{
                console.error(await evaluate('({hash:location.hash,current:currentCatalogDesign?.designId,available:catalogDesigns.some(d=>d.front.productId===7338)})'));
                throw error;
            });
            assert.equal(await evaluate('catalogDesigns.filter(d=>d.designId==="'+fearId+'").length'),1);
            assert.equal(await evaluate('selectedPrintMode'),'double');
            assert.equal(await evaluate('selectedCatalogBackRef?.productId'),7315);
            assert.equal(await evaluate('selectedCatalogBackRef?.variantIndex'),2);
            await waitFor('document.querySelector(".carousel-slide img").complete&&document.querySelector(".carousel-slide img").naturalWidth>0');
            for(const variant of ['hombre_clasica','oversize_unisex']){
                for(const mode of ['double','simple']){
                    await evaluate('selectRemeraVariant("'+variant+'");selectColor("negro");selectSize("M");selectPrintMode("'+mode+'");cart.clearCart()');
                    if(mode==='double')await evaluate('if(!selectedCatalogBackRef)selectCatalogDesignBack(7315,2)');
                    const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                    assert(order.added,order.summary);
                    const price=(variant==='oversize_unisex'?41000:38000)+(mode==='double'?7000:0);
                    assert(order.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),order.summary);
                    if(mode==='double')assert.equal(order.item.backCode,await evaluate('cart.generateCode(7315,2)'));
                }
            }
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
        }
        await send('Page.navigate',{url:origin+'/'});
        await waitFor('catalogDesigns.length>0');
        const marty=await evaluate('catalogDesigns.find(d=>d.front.productId===29&&d.front.variantIndex===1)?.designId');
        assert(marty);
        await evaluate('openCatalogDesign('+JSON.stringify(marty)+')');
        await waitFor('document.querySelector(".carousel-slide img").complete&&document.querySelector(".carousel-slide img").naturalWidth>0');
        assert((await evaluate('selectedCatalogFrontRef.image')).endsWith('Marty_1990_RIP.jpg'));
        await evaluate('closeModal(false,false);cart.clearCart()');
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',slayer:61,collection3d:12,slayerImages:3,epicaRetrospect:true,epicaHolographic:true,maidenLogoFear:true,martyUpdated:true,widths:[390,1440],filters:true,prices:true,cartWhatsapp:true,errors,failedAssets}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
