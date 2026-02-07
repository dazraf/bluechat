(function () {
  'use strict';

  var activeScanner = null;

  // Generate a QR code into a container element
  function displayQR(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Choose error correction level and type based on data length
    var typeNumber = 0; // auto-detect
    var errorCorrection = 'L';

    try {
      var qr = qrcode(typeNumber, errorCorrection);
      qr.addData(data);
      qr.make();

      var size = Math.min(264, window.innerWidth - 80);
      var img = document.createElement('img');
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
  }

  // Start camera scanning
  function startScanner(containerId, onResult) {
    stopScanner(); // Clean up any previous scanner

    var scanner = new Html5Qrcode(containerId);
    activeScanner = scanner;

    var config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    return scanner.start(
      { facingMode: 'environment' },
      config,
      function onScanSuccess(decodedText) {
        // Stop scanning once we get a result
        stopScanner();
        onResult(decodedText);
      },
      function onScanFailure() {
        // Ignore scan failures (no QR in frame)
      }
    ).catch(function (err) {
      console.error('Scanner start error:', err);
      throw err;
    });
  }

  // Stop camera scanning
  function stopScanner() {
    if (activeScanner) {
      var scanner = activeScanner;
      activeScanner = null;
      try {
        if (scanner.isScanning) {
          scanner.stop().catch(function () { /* ignore */ });
        }
      } catch (e) {
        // ignore
      }
    }
  }

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.QRManager = {
    displayQR: displayQR,
    startScanner: startScanner,
    stopScanner: stopScanner
  };
})();
