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
    const designId = 'iron-maiden-buenos-aires-2026-aniversario-fmd';
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-modal-audit-'));
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
        const dir=path.join(root,'reports/customer-audit');
        fs.mkdirSync(dir,{recursive:true});
        const results=[],failures=[];
        const tap=async selector=>{
            await evaluate('[...document.querySelectorAll('+JSON.stringify(selector)+')].find(el=>el.offsetParent)?.scrollIntoView({behavior:"instant",block:"center",inline:"nearest"})');
            await pause(120);
            const point=await evaluate('(()=>{const el=[...document.querySelectorAll('+JSON.stringify(selector)+')].find(el=>el.offsetParent);if(!el)return null;const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const hit=document.elementFromPoint(x,y);return {x,y,hit:hit?.outerHTML.slice(0,180),ok:el===hit||el.contains(hit)};})()');
            assert(point?.ok,'Tap blocked '+selector+': '+JSON.stringify(point));
            await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
            await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
            await pause(80);
        };
        const fill=async(selector,value)=>evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');el.value='+JSON.stringify(value)+';el.dispatchEvent(new Event("input",{bubbles:true}));})()');
        const next=()=>tap('[data-flow-action="next"]');
        const snapshot=()=>evaluate('({garment:selectedModalGarment,mode:selectedPrintMode,color:selectedColor,size:selectedSize,front:getCurrentCatalogOrderCode(),back:selectedCatalogBackRef?cart.generateCode(selectedCatalogBackRef.productId,selectedCatalogBackRef.variantIndex):null})');
        const shot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(shot.data,'base64'));};
        for(const width of (process.env.AUDIT_WIDTH ? [Number(process.env.AUDIT_WIDTH)] : [360,1440])){
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
            for(const band of (process.env.AUDIT_BAND ? [process.env.AUDIT_BAND] : ['iron-maiden','slayer'])){
                try{
                    await send('Page.navigate',{url:origin+'/'+band+'/?audit='+width});
                    await waitFor('catalogDesigns.length>0&&location.pathname==="/'+band+'/"');
                    await pause(200);
                    await evaluate('cart.clearCart();localStorage.removeItem(SHIPPING_FORM_STORAGE_KEY);selectedDeliveryMethod="";selectedShippingZone=""');
                    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Page overflow');
                    await shot(band+'-hero-'+width);
                    if(band==='slayer'){
                        await tap('[data-slayer-browse="sin_mangas"]');
                        assert.equal(await evaluate('bandLandingGarment'),'sin_mangas');
                        assert((await evaluate('document.querySelectorAll(".catalog-design-card").length'))>0);
                        await tap('[data-slayer-style="sin_mangas"]');
                        await tap('[data-slayer-view="double"]');
                        await tap('#slayerLaunchChoose');
                    }else{
                        await tap('[onclick*="openCatalogDesignPreview(\'iron-maiden-buenos-aires-2026-aniversario-fmd"]');
                        await tap('#modalGarmentSelector [data-modal-garment-type="sin_mangas"]');
                    }
                    assert.equal(await evaluate('selectedModalGarment'),'sin_mangas');
                    await next();
                    await tap('#colorSelector [data-color="negro"]');
                    await tap('#sizeSelector [data-size="L"]');
                    await tap('.inline-size-guide-btn');
                    assert(await evaluate('Boolean(document.getElementById("modalSizeGuidePanel").offsetParent)'));
                    await tap('#modalSizeGuidePanel .modal-size-guide-head button');
                    await next();
                    await tap('[data-print-mode="double"]');
                    const needsBack=await evaluate('Boolean(getModalPurchaseProblem(3))');
                    if(needsBack){
                        const back=await evaluate('getCatalogDesignBackChoices().find(b=>b.backType==="Recomendado")||getCatalogDesignBackChoices()[0]');
                        await evaluate('const choice=document.querySelector("#dorsoVariantsGrid [data-dorso-product-id=\\"'+back.productId+'\\"][data-dorso-variant-index=\\"'+back.variantIndex+'\\"]");const group=choice.closest("details");if(group)group.open=true');
                        await tap('#dorsoVariantsGrid [data-dorso-product-id="'+back.productId+'"][data-dorso-variant-index="'+back.variantIndex+'"] > .catalog-design-dorso');
                    }
                    const chosen=await snapshot();
                    await next();
                    assert.equal(await evaluate('document.getElementById("modalPurchaseFlow").dataset.step'),'4');
                    await shot(band+'-review-'+width);
                    await tap('#btnBuyNow');
                    await waitFor('document.getElementById("cartPreviewModal").classList.contains("active")');
                    assert.equal(await evaluate('cart.getCart()[0].backCode'),chosen.back);
                    await tap('[data-order-delivery][data-delivery="domicilio"]');
                    assert(await evaluate('[...document.querySelectorAll("#cartPreviewModal [data-order-delivery]")].every(button=>button.getBoundingClientRect().height>=44)'));
                    await evaluate('const zone=document.getElementById("shippingZone");zone.value="amba";zone.dispatchEvent(new Event("change",{bubbles:true}))');
                    for(const[id,value]of Object.entries({inputNombre:'Cliente',inputApellido:'Prueba',inputTelefono:'1112345678',inputDireccion:'Calle 123',inputCP:'1603',inputLocalidad:'Villa Martelli',inputProvincia:'Buenos Aires'}))await fill('#'+id,value);
                    assert.equal(await evaluate('document.getElementById("btnConfirmCartWhatsapp").getAttribute("aria-disabled")'),'false');
                    await evaluate('window.__messages=[];window.open=url=>{window.__messages.push(String(url));return null}');
                    await evaluate('showNotification("Agregado al pedido",60000)');
                    await shot(band+'-checkout-'+width);
                    await tap('#btnConfirmCartWhatsapp');
                    const url=await evaluate('window.__messages.at(-1)');
                    assert(url,'WhatsApp not generated');
                    const message=new URL(url).searchParams.get('text');
                    assert(message.includes(chosen.back),'Wrong back in WhatsApp');
                    assert(message.toLowerCase().includes('sin mangas'),'Wrong garment in WhatsApp');
                    assert(message.includes('Envío a domicilio: $10.000'),message);
                    await evaluate('openCartPreview()');
                    const name=await evaluate('document.getElementById("inputNombre").value+" "+document.getElementById("inputApellido").value');
                    await tap('[data-order-delivery][data-delivery="retiro_andreani"]');
                    const branchName=await evaluate('document.getElementById("inputNombre").value');
                    assert.equal(branchName,'Cliente Prueba','Full name lost on delivery change');
                    await fill('#inputCP','1605');
                    assert.equal(await evaluate('loadShippingCustomerDataFromStorage().direccion'),'Calle 123','Address lost while editing pickup data');
                    assert((await evaluate('buildCustomerDataForWhatsapp(getShippingCustomerData())')).includes('Cliente Prueba'));
                    await tap('[data-order-delivery][data-delivery="domicilio"]');
                    const restoredName=await evaluate('document.getElementById("inputNombre").value+" "+document.getElementById("inputApellido").value');
                    assert.equal(restoredName,name);
                    assert.equal(await evaluate('document.getElementById("inputDireccion").value'),'Calle 123');
                    await tap('[data-order-delivery][data-delivery="retiro_andreani"]');
                    await fill('#inputNombre','María de los Ángeles Rojas');
                    await fill('#inputCP','7600');
                    await tap('[data-order-delivery][data-delivery="domicilio"]');
                    assert.equal(await evaluate('document.getElementById("inputNombre").value'),'María de los Ángeles Rojas');
                    assert.equal(await evaluate('document.getElementById("inputApellido").value'),'');
                    const price=await evaluate('calculateItemBasePrice(cart.getCart()[0])');
                    await evaluate('window.__auditBase=cart.getCart()[0];cart.cart=[__auditBase,{...__auditBase,timestamp:1}];cart.saveCart();renderCartPreview();selectDeliveryMethod("retiro_andreani")');
                    assert.equal(await evaluate('calculateCartTotal().envio'),0);
                    await tap('[data-order-delivery][data-delivery="domicilio"]');
                    assert.equal(await evaluate('calculateCartTotal().envio'),10000);
                    await evaluate('cart.cart.push({...__auditBase,timestamp:2});cart.saveCart();renderCartPreview()');
                    assert.equal(await evaluate('calculateCartTotal().descuento'),price*3*.1);
                    assert.equal(await evaluate('calculateCartTotal().envio'),0);
                    await tap('.cart-preview-item-remove');
                    assert.equal(await evaluate('calculateCartTotal().descuento'),0);
                    assert.equal(await evaluate('calculateCartTotal().envio'),10000);
                    assert(await evaluate('document.querySelector(".cart-preview-item-name").scrollWidth<=document.querySelector(".cart-preview-item-name").clientWidth+1'));
                    await shot(band+'-cart-readable-'+width);
                    results.push({band,width,chosen,whatsapp:true,deliveryName:{name,branchName,restoredName}});
                    await evaluate('closeCartPreview();cart.clearCart()');
                    // Verify search and section access without typing internal codes as the only option.
                    if(band==='iron-maiden'){
                        await tap('[onclick*="selectBandLandingCollectionAndScroll(\'eddies-argentinos"]');
                        assert.equal(await evaluate('bandLandingCollection'),'eddies-argentinos');
                        await fill('#searchInput','(ECHRFY-7032.V1)');
                        await evaluate('document.getElementById("searchInput").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
                        assert.equal(await evaluate('currentCatalogDesign?.front.productId'),7032);
                        await evaluate('closeModal(false,false)');
                        await fill('#searchInput','IMFERF-7021.V2');
                        await evaluate('document.getElementById("searchInput").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
                        assert(await evaluate('document.getElementById("zoomImg").getAttribute("src").endsWith("fmd_eddie_run_for_dorso.jpg")'));
                        await evaluate('closeModal(false,false);closeZoom()');
                    }
                    await evaluate('selectBandLandingGarment("remera");selectBandLandingCollection("'+(band==='slayer'?'3d-fmd':'eddies-argentinos')+'")');
                    await fill('#searchInput',band==='slayer'?'South':'Gaucho');
                    await tap('#productsGrid .catalog-design-card-main');
                    const returnState=await evaluate('({garment:bandLandingGarment,collection:bandLandingCollection,search:currentSearch,y:scrollPosition})');
                    await evaluate('selectColor("negro");selectSize("M");selectPrintMode("simple");setModalPurchaseStep(4,false)');
                    await tap('#btnBuyNow');
                    await tap('.cart-preview-actions [onclick="closeCartPreview()"]');
                    await pause(500);
                    const returned=await evaluate('({garment:bandLandingGarment,collection:bandLandingCollection,search:currentSearch,y:window.scrollY})');
                    assert.deepEqual({...returned,y:0},{...returnState,y:0});
                    assert(Math.abs(returned.y-returnState.y)<=2,'Scroll not preserved: '+JSON.stringify({returnState,returned}));
                    await evaluate('cart.clearCart();document.getElementById("searchInput").value="";currentSearch="";selectBandLandingCollection("")');
                    const collections=await evaluate('[...document.querySelectorAll("[data-band-landing-collection]")].map(button=>button.dataset.bandLandingCollection).filter(id=>id!=="backs")');
                    for(const collection of [...new Set(collections)]){
                        if(collection.startsWith('album-') && !await evaluate('document.querySelector(".band-landing-album-filters").open'))await tap('.band-landing-album-filters > summary');
                        await tap('[data-band-landing-collection="'+collection+'"]');
                        assert.equal(await evaluate('bandLandingCollection'),collection);
                        assert((await evaluate('document.querySelectorAll("#productsGrid .catalog-design-card").length'))>0,'Empty collection '+band+'/'+collection);
                    }
                    if(band==='iron-maiden'){
                        await tap('[data-band-landing-collection="backs"]');
                        await pause(500);
                        assert(await evaluate('document.getElementById("bandCommemorativeBacks").getBoundingClientRect().top<150'),'Backs link scroll target');
                    }
                }catch(error){failures.push({band,width,error:error.message});await shot(band+'-failure-'+width);}
            }
        }
        // Report every catalog-side button that names a missing section.
        const anchors=await evaluate('[...document.querySelectorAll("a[href^=\\"#\\"]")].map(a=>a.getAttribute("href")).filter(h=>h.length>1&&!h.startsWith("#diseno-")&&!document.getElementById(h.slice(1)))');
        console.log(JSON.stringify({results,failures,missingAnchors:[...new Set(anchors)],errors,failedAssets},null,2));
        fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({results,failures,errors,failedAssets},null,2));
        assert.deepEqual(failures, []);
        assert.deepEqual(errors, []);
        assert.deepEqual(failedAssets, []);
        assert.deepEqual([...new Set(anchors)], []);

    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
