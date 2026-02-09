"use strict";
var BlueChat;
(function (BlueChat) {
    let activeScanner = null;
    BlueChat.QRManager = {
        displayQR(containerId, data) {
            const container = document.getElementById(containerId);
            if (!container)
                return;
            container.innerHTML = '';
            try {
                const qr = qrcode(0, 'L');
                qr.addData(data);
                qr.make();
                const size = Math.min(264, window.innerWidth - 80);
                const img = document.createElement('img');
                img.src = qr.createDataURL(4, 0);
                img.width = size;
                img.height = size;
                img.alt = 'QR Code';
                img.style.imageRendering = 'pixelated';
                container.appendChild(img);
            }
            catch (e) {
                container.textContent = 'QR code too large. Use debug mode (?debug=true).';
                console.error('QR generation error:', e);
            }
        },
        startScanner(containerId, onResult) {
            BlueChat.QRManager.stopScanner();
            const scanner = new Html5Qrcode(containerId);
            activeScanner = scanner;
            return scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, (decodedText) => {
                BlueChat.QRManager.stopScanner();
                onResult(decodedText);
            }, () => { });
        },
        stopScanner() {
            if (activeScanner) {
                const scanner = activeScanner;
                activeScanner = null;
                try {
                    if (scanner.isScanning) {
                        scanner.stop().catch(() => { });
                    }
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }
        }
    };
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=qr-manager.js.map