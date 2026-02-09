namespace BlueChat {

  let transport: ITransport | null = null;
  let deviceId = '';
  let peerId = '';
  let hasConnectedOnce = false;
  const isDebug = window.location.search.indexOf('debug=true') !== -1;

  // Expose transport for debugging (used by test-debug-flow.js)
  export let _transport: ITransport | null = null;

  function cleanup(): void {
    QRManager.stopScanner();
    if (transport) {
      transport.disconnect();
      transport = null;
      _transport = null;
    }
    hasConnectedOnce = false;
  }

  function setupTransport(): void {
    _transport = transport;

    transport!.on('connected', () => {
      const name = peerId || 'Peer';
      const dot = document.getElementById('status-dot')!;
      dot.classList.remove('disconnected', 'reconnecting');
      document.getElementById('btn-reconnect')!.classList.add('hidden');

      if (!hasConnectedOnce) {
        hasConnectedOnce = true;
        Screens.show('chat');
        Chat.clear();
        document.getElementById('peer-name')!.textContent = name;
        Chat.addMessage('Connected to ' + name, 'system');
      } else {
        Chat.addMessage('Connection restored', 'system');
      }
    });

    transport!.on('reconnecting', () => {
      const dot = document.getElementById('status-dot')!;
      dot.classList.remove('disconnected');
      dot.classList.add('reconnecting');
      Chat.addMessage('Connection unstable, attempting to recover...', 'system');
    });

    transport!.on('disconnected', () => {
      const dot = document.getElementById('status-dot')!;
      dot.classList.remove('reconnecting');
      dot.classList.add('disconnected');
      document.getElementById('btn-reconnect')!.classList.remove('hidden');
      Chat.addMessage('Peer disconnected', 'system');
    });

    transport!.on('message', (data: string) => {
      try {
        const msg: ChatMessage = JSON.parse(data);
        if (msg.type === 'chat') {
          Chat.addMessage(msg.text, 'received');
        }
      } catch {
        Chat.addMessage(data, 'received');
      }
    });
  }

  function sendMessage(text: string): void {
    if (!transport || !text.trim()) return;
    const msg: ChatMessage = { type: 'chat', text: text.trim(), from: deviceId };
    transport.send(JSON.stringify(msg));
    Chat.addMessage(text.trim(), 'sent');
  }

  // --- Host flow ---

  function startHost(): void {
    cleanup();
    transport = new WebRTCTransport();
    setupTransport();

    Screens.show('host');
    document.getElementById('host-instruction')!.textContent = 'Generating connection code...';
    document.getElementById('host-qr-container')!.innerHTML = '';
    document.getElementById('host-scanner-container')!.classList.add('hidden');
    document.getElementById('btn-scan-answer')!.classList.add('hidden');

    transport.createInvite().then(sdp => {
      const compressed = SDPCompress.compress(sdp, 'offer', deviceId);
      console.log('Offer compressed length:', compressed.length);

      document.getElementById('host-instruction')!.textContent = 'Show this QR code to your peer';
      QRManager.displayQR('host-qr-container', compressed);

      if (isDebug) {
        (document.getElementById('host-offer-text') as HTMLTextAreaElement).value = compressed;
      }

      // Show "Scan Answer" button (replaces old 5-second auto-switch)
      if (!isDebug) {
        document.getElementById('btn-scan-answer')!.classList.remove('hidden');
      }
    }).catch(err => {
      Toast.show('Failed to create offer: ' + err.message, true);
      console.error(err);
    });
  }

  function startAnswerScan(): void {
    document.getElementById('host-instruction')!.textContent = "Scan your peer's answer QR code";
    document.getElementById('host-qr-container')!.classList.add('hidden');
    document.getElementById('btn-scan-answer')!.classList.add('hidden');
    document.getElementById('host-scanner-container')!.classList.remove('hidden');

    QRManager.startScanner('host-scanner-container', (data: string) => {
      processAnswer(data);
    }).catch(err => {
      Toast.show('Camera error: ' + err, true);
    });
  }

  function processAnswer(compressed: string): void {
    const result = SDPCompress.decompress(compressed);
    if (!result || result.type !== 'answer') {
      Toast.show('Invalid answer QR code', true);
      return;
    }
    peerId = result.peerId;
    transport!.completeHandshake(result.sdp).catch(err => {
      Toast.show('Connection failed: ' + err.message, true);
    });
  }

  // --- Join flow ---

  function startJoin(): void {
    cleanup();
    transport = new WebRTCTransport();
    setupTransport();

    Screens.show('join');
    document.getElementById('join-instruction')!.textContent = "Scan the host's QR code";
    document.getElementById('join-qr-container')!.classList.add('hidden');
    document.getElementById('join-scanner-container')!.classList.remove('hidden');

    if (!isDebug) {
      QRManager.startScanner('join-scanner-container', (data: string) => {
        processOffer(data);
      }).catch(err => {
        Toast.show('Camera error: ' + err, true);
      });
    }
  }

  function processOffer(compressed: string): void {
    const result = SDPCompress.decompress(compressed);
    if (!result || result.type !== 'offer') {
      Toast.show('Invalid offer QR code', true);
      return;
    }
    peerId = result.peerId;

    document.getElementById('join-instruction')!.textContent = 'Creating answer...';

    transport!.acceptInvite(result.sdp).then(answerSDP => {
      const answerCompressed = SDPCompress.compress(answerSDP, 'answer', deviceId);
      console.log('Answer compressed length:', answerCompressed.length);

      document.getElementById('join-instruction')!.textContent = 'Show this QR code to the host';
      document.getElementById('join-scanner-container')!.classList.add('hidden');
      document.getElementById('join-qr-container')!.classList.remove('hidden');
      QRManager.displayQR('join-qr-container', answerCompressed);

      if (isDebug) {
        (document.getElementById('join-answer-text') as HTMLTextAreaElement).value = answerCompressed;
      }
    }).catch(err => {
      Toast.show('Failed to create answer: ' + err.message, true);
      console.error(err);
    });
  }

  // --- Init ---

  function init(): void {
    deviceId = Identity.getOrCreate();
    document.getElementById('device-id')!.textContent = deviceId;
    Chat.init();

    if (isDebug) {
      document.querySelectorAll('.debug-panel').forEach(el => {
        el.classList.remove('hidden');
      });
    }

    // Button handlers
    document.getElementById('btn-new-chat')!.addEventListener('click', startHost);
    document.getElementById('btn-join-chat')!.addEventListener('click', startJoin);
    document.getElementById('btn-scan-answer')!.addEventListener('click', startAnswerScan);

    document.getElementById('btn-host-back')!.addEventListener('click', () => {
      cleanup();
      Screens.show('home');
    });

    document.getElementById('btn-join-back')!.addEventListener('click', () => {
      cleanup();
      Screens.show('home');
    });

    document.getElementById('btn-leave')!.addEventListener('click', () => {
      cleanup();
      Screens.show('home');
    });

    // Reconnect button
    document.getElementById('btn-reconnect')!.addEventListener('click', async () => {
      if (!transport || !transport.attemptReconnect) {
        Toast.show('Reconnection not available', true);
        return;
      }

      const btn = document.getElementById('btn-reconnect') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Reconnecting...';

      const success = await transport.attemptReconnect();

      btn.disabled = false;
      btn.textContent = 'Reconnect';

      if (!success) {
        Toast.show('Cannot reconnect — connection fully lost. Start a new chat.', true);
        btn.classList.add('hidden');
      }
    });

    // Chat form
    document.getElementById('chat-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const input = document.getElementById('chat-input') as HTMLInputElement;
      sendMessage(input.value);
      input.value = '';
    });

    // Debug handlers
    document.getElementById('host-accept-answer')!.addEventListener('click', () => {
      const text = (document.getElementById('host-answer-text') as HTMLTextAreaElement).value.trim();
      if (text) processAnswer(text);
    });

    document.getElementById('join-process-offer')!.addEventListener('click', () => {
      const text = (document.getElementById('join-offer-text') as HTMLTextAreaElement).value.trim();
      if (text) processOffer(text);
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
  } else {
    init();
  }
}
