(function () {
  'use strict';

  var BC = window.BlueChat;
  var transport = null;
  var deviceId = '';
  var peerId = '';
  var isDebug = window.location.search.indexOf('debug=true') !== -1;

  // Toast notifications
  function toast(msg, isError) {
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('toast-out');
      setTimeout(function () { el.remove(); }, 300);
    }, 5000);
  }

  // Clean up transport and scanner
  function cleanup() {
    BC.QRManager.stopScanner();
    if (transport) {
      transport.disconnect();
      transport = null;
    }
  }

  // Setup transport event handlers
  function setupTransport() {
    // Expose for debugging
    BC._transport = transport;

    transport.on('connected', function () {
      BC.Screens.show('chat');
      BC.Chat.clear();
      var name = peerId || 'Peer';
      document.getElementById('peer-name').textContent = name;
      document.getElementById('status-dot').classList.remove('disconnected');
      BC.Chat.addMessage('Connected to ' + name, 'system');
    });

    transport.on('disconnected', function () {
      document.getElementById('status-dot').classList.add('disconnected');
      BC.Chat.addMessage('Peer disconnected', 'system');
    });

    transport.on('message', function (data) {
      try {
        var msg = JSON.parse(data);
        if (msg.type === 'chat') {
          BC.Chat.addMessage(msg.text, 'received');
        }
      } catch (e) {
        // Raw text fallback
        BC.Chat.addMessage(data, 'received');
      }
    });
  }

  function sendMessage(text) {
    if (!transport || !text.trim()) return;
    var msg = JSON.stringify({ type: 'chat', text: text.trim(), from: deviceId });
    transport.send(msg);
    BC.Chat.addMessage(text.trim(), 'sent');
  }

  // Host flow: create offer → show QR → scan answer
  function startHost() {
    cleanup();
    transport = new BC.WebRTCTransport();
    setupTransport();

    BC.Screens.show('host');
    document.getElementById('host-instruction').textContent = 'Generating connection code...';
    document.getElementById('host-qr-container').innerHTML = '';
    document.getElementById('host-scanner-container').classList.add('hidden');

    transport.createOffer().then(function (sdp) {
      var compressed = BC.SDPCompress.compress(sdp, 'offer', deviceId);
      console.log('Offer compressed length:', compressed.length);

      document.getElementById('host-instruction').textContent = 'Show this QR code to your peer';
      BC.QRManager.displayQR('host-qr-container', compressed);

      // Debug mode: show text fields
      if (isDebug) {
        document.getElementById('host-offer-text').value = compressed;
      }

      // If not debug, auto-switch to camera after showing QR
      if (!isDebug) {
        // Wait a moment then switch to scanning for answer
        waitForAnswerScan();
      }
    }).catch(function (err) {
      toast('Failed to create offer: ' + err.message, true);
      console.error(err);
    });
  }

  function waitForAnswerScan() {
    // Show instruction to wait, then switch to scanner
    document.getElementById('host-instruction').textContent =
      'Waiting for peer... Camera will open after they scan.';

    // Give peer time to scan, then open our camera
    setTimeout(function () {
      if (BC.Screens.getCurrent() !== 'host') return;

      document.getElementById('host-instruction').textContent = 'Scan your peer\'s answer QR code';
      document.getElementById('host-qr-container').classList.add('hidden');
      document.getElementById('host-scanner-container').classList.remove('hidden');

      BC.QRManager.startScanner('host-scanner-container', function (data) {
        processAnswer(data);
      }).catch(function (err) {
        toast('Camera error: ' + err, true);
      });
    }, 5000);
  }

  function processAnswer(compressed) {
    var result = BC.SDPCompress.decompress(compressed);
    if (!result || result.type !== 'answer') {
      toast('Invalid answer QR code', true);
      return;
    }
    peerId = result.peerId;
    transport.completeConnection(result.sdp).catch(function (err) {
      toast('Connection failed: ' + err.message, true);
    });
  }

  // Join flow: scan offer QR → create answer → show answer QR
  function startJoin() {
    cleanup();
    transport = new BC.WebRTCTransport();
    setupTransport();

    BC.Screens.show('join');
    document.getElementById('join-instruction').textContent = 'Scan the host\'s QR code';
    document.getElementById('join-qr-container').classList.add('hidden');
    document.getElementById('join-scanner-container').classList.remove('hidden');

    if (!isDebug) {
      BC.QRManager.startScanner('join-scanner-container', function (data) {
        processOffer(data);
      }).catch(function (err) {
        toast('Camera error: ' + err, true);
      });
    }
  }

  function processOffer(compressed) {
    var result = BC.SDPCompress.decompress(compressed);
    if (!result || result.type !== 'offer') {
      toast('Invalid offer QR code', true);
      return;
    }
    peerId = result.peerId;

    document.getElementById('join-instruction').textContent = 'Creating answer...';

    transport.acceptOffer(result.sdp).then(function (answerSDP) {
      var answerCompressed = BC.SDPCompress.compress(answerSDP, 'answer', deviceId);
      console.log('Answer compressed length:', answerCompressed.length);

      document.getElementById('join-instruction').textContent = 'Show this QR code to the host';
      document.getElementById('join-scanner-container').classList.add('hidden');
      document.getElementById('join-qr-container').classList.remove('hidden');
      BC.QRManager.displayQR('join-qr-container', answerCompressed);

      // Debug mode
      if (isDebug) {
        document.getElementById('join-answer-text').value = answerCompressed;
      }
    }).catch(function (err) {
      toast('Failed to create answer: ' + err.message, true);
      console.error(err);
    });
  }

  // Initialize app
  function init() {
    deviceId = BC.Identity.getOrCreate();
    document.getElementById('device-id').textContent = deviceId;
    BC.Chat.init();

    // Show debug panels if ?debug=true
    if (isDebug) {
      document.querySelectorAll('.debug-panel').forEach(function (el) {
        el.classList.remove('hidden');
      });
    }

    // Button handlers
    document.getElementById('btn-new-chat').addEventListener('click', startHost);
    document.getElementById('btn-join-chat').addEventListener('click', startJoin);

    document.getElementById('btn-host-back').addEventListener('click', function () {
      cleanup();
      BC.Screens.show('home');
    });

    document.getElementById('btn-join-back').addEventListener('click', function () {
      cleanup();
      BC.Screens.show('home');
    });

    document.getElementById('btn-leave').addEventListener('click', function () {
      cleanup();
      BC.Screens.show('home');
    });

    // Chat form
    document.getElementById('chat-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('chat-input');
      sendMessage(input.value);
      input.value = '';
    });

    // Debug: host accept answer
    document.getElementById('host-accept-answer').addEventListener('click', function () {
      var text = document.getElementById('host-answer-text').value.trim();
      if (text) processAnswer(text);
    });

    // Debug: join process offer
    document.getElementById('join-process-offer').addEventListener('click', function () {
      var text = document.getElementById('join-offer-text').value.trim();
      if (text) processOffer(text);
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.log('SW registration failed:', err);
      });
    }
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
