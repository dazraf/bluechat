namespace BlueChat {

  let activeScanner: Html5Qrcode | null = null;

  export const QRManager = {
    displayQR(containerId: string, data: string): void {
      const container = document.getElementById(containerId);
      if (!container) return;
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
      } catch (e) {
        container.textContent = 'QR code too large. Use debug mode (?debug=true).';
        console.error('QR generation error:', e);
      }
    },

    startScanner(containerId: string, onResult: (data: string) => void): Promise<void> {
      QRManager.stopScanner();

      const scanner = new Html5Qrcode(containerId);
      activeScanner = scanner;

      return scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          QRManager.stopScanner();
          onResult(decodedText);
        },
        () => { /* ignore scan failures */ }
      );
    },

    stopScanner(): void {
      if (activeScanner) {
        const scanner = activeScanner;
        activeScanner = null;
        try {
          if (scanner.isScanning) {
            scanner.stop().catch(() => { /* ignore */ });
          }
        } catch { /* ignore */ }
      }
    }
  };
}
