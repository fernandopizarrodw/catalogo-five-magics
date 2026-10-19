'use strict';

const assert = require('node:assert/strict');

async function main() {
    const pages = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
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
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    try {
        await send('Page.navigate', { url: 'http://127.0.0.1:5500/iron-maiden/' });
        for (let attempt = 0; attempt < 100; attempt += 1) {
            if (await evaluate('typeof catalogDesigns !== "undefined" && catalogDesigns.length > 0')) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const result = await evaluate(`(async () => {
            const input = document.getElementById('searchInput');
            const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
            const snapshot = () => ({
                zoomVisible: document.getElementById('zoomOverlay').style.display === 'flex',
                zoomImage: document.getElementById('zoomImg').getAttribute('src') || '',
                frontImage: currentModalSourceRefs[currentSlide]?.image || '',
                printMode: selectedPrintMode
            });
            input.value = 'IMFERF-7021.V2';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const card = document.querySelector('#productsGrid .catalog-design-card-main');
            const cardImage = card?.querySelector('img')?.getAttribute('src') || '';
            card?.click();
            const clicked = snapshot();
            closeModal();
            await pause(350);
            input.value = 'IMFERF-7021.V2';
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: input.value }));
            await pause(100);
            const pasted = snapshot();
            closeModal();
            await pause(350);
            input.value = 'IMFERF-7021.V2';
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            const entered = snapshot();
            closeModal();
            await pause(350);
            const openedFront = openExactCodeMatch('IMFERF-7021.V1');
            const front = snapshot();
            closeModal();
            return { cardImage, clicked, pasted, entered, openedFront, front };
        })()`);
        assert(result.cardImage.endsWith('fmd_eddie_run_for_dorso.jpg'), JSON.stringify(result));
        for (const value of [result.clicked, result.pasted, result.entered]) {
            assert.equal(value.zoomVisible, true, JSON.stringify(result));
            assert(value.zoomImage.endsWith('fmd_eddie_run_for_dorso.jpg'), JSON.stringify(result));
            assert.equal(value.printMode, 'double');
        }
        assert.equal(result.openedFront, true);
        assert.equal(result.front.zoomVisible, false);
        assert(result.front.frontImage.endsWith('fmd_eddie_run_for_frente.jpg'), JSON.stringify(result));
        console.log(JSON.stringify(result, null, 2));
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
