"use strict";
var BlueChat;
(function (BlueChat) {
    let transport = null;
    let deviceId = '';
    let peerId = '';
    let hasConnectedOnce = false;
    const isDebug = window.location.search.indexOf('debug=true') !== -1;
    // Expose transport for debugging (used by test-debug-flow.js)
    BlueChat._transport = null;
    function cleanup() {
        BlueChat.QRManager.stopScanner();
        if (transport) {
            transport.disconnect();
            transport = null;
            BlueChat._transport = null;
        }
        hasConnectedOnce = false;
    }
    function setupTransport() {
        BlueChat._transport = transport;
        transport.on('connected', () => {
            const name = peerId || 'Peer';
            const dot = document.getElementById('status-dot');
            dot.classList.remove('disconnected', 'reconnecting');
            document.getElementById('btn-reconnect').classList.add('hidden');
            if (!hasConnectedOnce) {
                hasConnectedOnce = true;
                BlueChat.Screens.show('chat');
                BlueChat.Chat.clear();
                document.getElementById('peer-name').textContent = name;
                BlueChat.Chat.addMessage('Connected to ' + name, 'system');
            }
            else {
                BlueChat.Chat.addMessage('Connection restored', 'system');
            }
        });
        transport.on('reconnecting', () => {
            const dot = document.getElementById('status-dot');
            dot.classList.remove('disconnected');
            dot.classList.add('reconnecting');
            BlueChat.Chat.addMessage('Connection unstable, attempting to recover...', 'system');
        });
        transport.on('disconnected', () => {
            const dot = document.getElementById('status-dot');
            dot.classList.remove('reconnecting');
            dot.classList.add('disconnected');
            document.getElementById('btn-reconnect').classList.remove('hidden');
            BlueChat.Chat.addMessage('Peer disconnected', 'system');
        });
        transport.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'chat') {
                    BlueChat.Chat.addMessage(msg.text, 'received');
                }
            }
            catch (_a) {
                BlueChat.Chat.addMessage(data, 'received');
            }
        });
    }
    function sendMessage(text) {
        if (!transport || !text.trim())
            return;
        const msg = { type: 'chat', text: text.trim(), from: deviceId };
        transport.send(JSON.stringify(msg));
        BlueChat.Chat.addMessage(text.trim(), 'sent');
    }
    // --- Host flow ---
    function startHost() {
        cleanup();
        transport = new BlueChat.WebRTCTransport();
        setupTransport();
        BlueChat.Screens.show('host');
        document.getElementById('host-instruction').textContent = 'Generating connection code...';
        document.getElementById('host-qr-container').innerHTML = '';
        document.getElementById('host-scanner-container').classList.add('hidden');
        document.getElementById('btn-scan-answer').classList.add('hidden');
        transport.createInvite().then(sdp => {
            const compressed = BlueChat.SDPCompress.compress(sdp, 'offer', deviceId);
            console.log('Offer compressed length:', compressed.length);
            document.getElementById('host-instruction').textContent = 'Show this QR code to your peer';
            BlueChat.QRManager.displayQR('host-qr-container', compressed);
            if (isDebug) {
                document.getElementById('host-offer-text').value = compressed;
            }
            // Show "Scan Answer" button (replaces old 5-second auto-switch)
            if (!isDebug) {
                document.getElementById('btn-scan-answer').classList.remove('hidden');
            }
        }).catch(err => {
            BlueChat.Toast.show('Failed to create offer: ' + err.message, true);
            console.error(err);
        });
    }
    function startAnswerScan() {
        document.getElementById('host-instruction').textContent = "Scan your peer's answer QR code";
        document.getElementById('host-qr-container').classList.add('hidden');
        document.getElementById('btn-scan-answer').classList.add('hidden');
        document.getElementById('host-scanner-container').classList.remove('hidden');
        BlueChat.QRManager.startScanner('host-scanner-container', (data) => {
            processAnswer(data);
        }).catch(err => {
            BlueChat.Toast.show('Camera error: ' + err, true);
        });
    }
    function processAnswer(compressed) {
        const result = BlueChat.SDPCompress.decompress(compressed);
        if (!result || result.type !== 'answer') {
            BlueChat.Toast.show('Invalid answer QR code', true);
            return;
        }
        peerId = result.peerId;
        transport.completeHandshake(result.sdp).catch(err => {
            BlueChat.Toast.show('Connection failed: ' + err.message, true);
        });
    }
    // --- Join flow ---
    function startJoin() {
        cleanup();
        transport = new BlueChat.WebRTCTransport();
        setupTransport();
        BlueChat.Screens.show('join');
        document.getElementById('join-instruction').textContent = "Scan the host's QR code";
        document.getElementById('join-qr-container').classList.add('hidden');
        document.getElementById('join-scanner-container').classList.remove('hidden');
        if (!isDebug) {
            BlueChat.QRManager.startScanner('join-scanner-container', (data) => {
                processOffer(data);
            }).catch(err => {
                BlueChat.Toast.show('Camera error: ' + err, true);
            });
        }
    }
    function processOffer(compressed) {
        const result = BlueChat.SDPCompress.decompress(compressed);
        if (!result || result.type !== 'offer') {
            BlueChat.Toast.show('Invalid offer QR code', true);
            return;
        }
        peerId = result.peerId;
        document.getElementById('join-instruction').textContent = 'Creating answer...';
        transport.acceptInvite(result.sdp).then(answerSDP => {
            const answerCompressed = BlueChat.SDPCompress.compress(answerSDP, 'answer', deviceId);
            console.log('Answer compressed length:', answerCompressed.length);
            document.getElementById('join-instruction').textContent = 'Show this QR code to the host';
            document.getElementById('join-scanner-container').classList.add('hidden');
            document.getElementById('join-qr-container').classList.remove('hidden');
            BlueChat.QRManager.displayQR('join-qr-container', answerCompressed);
            if (isDebug) {
                document.getElementById('join-answer-text').value = answerCompressed;
            }
        }).catch(err => {
            BlueChat.Toast.show('Failed to create answer: ' + err.message, true);
            console.error(err);
        });
    }
    // --- Theme ---
    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('bluechat-theme', theme);
        document.getElementById('btn-theme').textContent = theme === 'dark' ? '\u2600' : '\u263E';
        document.querySelector('meta[name="theme-color"]')
            .setAttribute('content', theme === 'dark' ? '#121212' : '#ffffff');
    }
    // --- Init ---
    function init() {
        // Apply saved theme (default: dark)
        applyTheme(localStorage.getItem('bluechat-theme') || 'dark');
        deviceId = BlueChat.Identity.getOrCreate();
        document.getElementById('device-id').textContent = deviceId;
        BlueChat.Chat.init();
        if (isDebug) {
            document.querySelectorAll('.debug-panel').forEach(el => {
                el.classList.remove('hidden');
            });
        }
        // Button handlers
        document.getElementById('btn-new-chat').addEventListener('click', startHost);
        document.getElementById('btn-join-chat').addEventListener('click', startJoin);
        document.getElementById('btn-scan-answer').addEventListener('click', startAnswerScan);
        document.getElementById('btn-host-back').addEventListener('click', () => {
            cleanup();
            BlueChat.Screens.show('home');
        });
        document.getElementById('btn-join-back').addEventListener('click', () => {
            cleanup();
            BlueChat.Screens.show('home');
        });
        document.getElementById('btn-leave').addEventListener('click', () => {
            cleanup();
            BlueChat.Screens.show('home');
        });
        // Reconnect button
        document.getElementById('btn-reconnect').addEventListener('click', async () => {
            if (!transport || !transport.attemptReconnect) {
                BlueChat.Toast.show('Reconnection not available', true);
                return;
            }
            const btn = document.getElementById('btn-reconnect');
            btn.disabled = true;
            btn.textContent = 'Reconnecting...';
            const success = await transport.attemptReconnect();
            btn.disabled = false;
            btn.textContent = 'Reconnect';
            if (!success) {
                BlueChat.Toast.show('Cannot reconnect — connection fully lost. Start a new chat.', true);
                btn.classList.add('hidden');
            }
        });
        // Chat form
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            sendMessage(input.value);
            input.value = '';
        });
        // Debug handlers
        document.getElementById('host-accept-answer').addEventListener('click', () => {
            const text = document.getElementById('host-answer-text').value.trim();
            if (text)
                processAnswer(text);
        });
        document.getElementById('join-process-offer').addEventListener('click', () => {
            const text = document.getElementById('join-offer-text').value.trim();
            if (text)
                processOffer(text);
        });
        // Theme toggle
        document.getElementById('btn-theme').addEventListener('click', () => {
            const current = localStorage.getItem('bluechat-theme') || 'dark';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
        // Service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.log('SW registration failed:', err);
            });
        }
    }
    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=app.js.map