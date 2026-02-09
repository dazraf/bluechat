"use strict";
var BlueChat;
(function (BlueChat) {
    const DEFAULT_GATHERING_TIMEOUT = 5000;
    const GRACE_MS = 7000;
    const PING_INTERVAL_MS = 10000;
    const PONG_TIMEOUT_MS = 15000;
    const PING = '{"__bc":"ping"}';
    const PONG = '{"__bc":"pong"}';
    class WebRTCTransport extends BlueChat.TransportBase {
        constructor(config = {}) {
            var _a, _b;
            super();
            this.pc = null;
            this.dc = null;
            this._connected = false;
            // Grace period
            this._graceTimer = null;
            // Keepalive
            this._pingInterval = null;
            this._pongTimer = null;
            // ICE restart
            this._reconnecting = false;
            // Tracks whether DC has opened at least once (prevents ICE state from
            // emitting 'connected' before the DataChannel is ready on initial setup)
            this._hasConnected = false;
            this.config = {
                iceServers: (_a = config.iceServers) !== null && _a !== void 0 ? _a : [],
                gatheringTimeout: (_b = config.gatheringTimeout) !== null && _b !== void 0 ? _b : DEFAULT_GATHERING_TIMEOUT
            };
        }
        // --- Internal message protocol ---
        _sendRaw(data) {
            if (this.dc && this.dc.readyState === 'open') {
                this.dc.send(data);
            }
        }
        _isInternalMessage(data) {
            return data.startsWith('{"__bc":');
        }
        _handleInternalMessage(data) {
            try {
                const parsed = JSON.parse(data);
                const cmd = parsed.__bc;
                if (cmd === 'ping') {
                    this._sendRaw(PONG);
                }
                else if (cmd === 'pong') {
                    this._clearPongTimer();
                }
                else if (cmd === 'ice-offer') {
                    this._handleIceRestartOffer(parsed.sdp);
                }
                else if (cmd === 'ice-answer') {
                    this._handleIceRestartAnswer(parsed.sdp);
                }
            }
            catch ( /* malformed internal message, ignore */_a) { /* malformed internal message, ignore */ }
        }
        // --- Grace period ---
        _clearGraceTimer() {
            if (this._graceTimer) {
                clearTimeout(this._graceTimer);
                this._graceTimer = null;
            }
        }
        // --- Keepalive ---
        _startKeepalive() {
            this._stopKeepalive();
            this._pingInterval = setInterval(() => {
                this._sendRaw(PING);
                if (!this._pongTimer) {
                    this._pongTimer = setTimeout(() => {
                        this._pongTimer = null;
                        if (this._connected) {
                            this._connected = false;
                            this._stopKeepalive();
                            this.emit('disconnected');
                        }
                    }, PONG_TIMEOUT_MS);
                }
            }, PING_INTERVAL_MS);
        }
        _stopKeepalive() {
            if (this._pingInterval) {
                clearInterval(this._pingInterval);
                this._pingInterval = null;
            }
            this._clearPongTimer();
        }
        _clearPongTimer() {
            if (this._pongTimer) {
                clearTimeout(this._pongTimer);
                this._pongTimer = null;
            }
        }
        // --- ICE restart ---
        async attemptReconnect() {
            if (this._reconnecting)
                return false;
            if (!this.dc || this.dc.readyState !== 'open' || !this.pc)
                return false;
            this._reconnecting = true;
            try {
                const offer = await this.pc.createOffer({ iceRestart: true });
                await this.pc.setLocalDescription(offer);
                await this._waitForICE();
                const sdp = this.pc.localDescription.sdp;
                this._sendRaw(JSON.stringify({ __bc: 'ice-offer', sdp }));
                return true;
            }
            catch (err) {
                console.error('ICE restart failed:', err);
                return false;
            }
            finally {
                this._reconnecting = false;
            }
        }
        async _handleIceRestartOffer(sdp) {
            if (!this.pc)
                return;
            try {
                await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
                await this._waitForICE();
                const answerSdp = this.pc.localDescription.sdp;
                this._sendRaw(JSON.stringify({ __bc: 'ice-answer', sdp: answerSdp }));
            }
            catch (err) {
                console.error('Failed to handle ICE restart offer:', err);
            }
        }
        async _handleIceRestartAnswer(sdp) {
            if (!this.pc)
                return;
            try {
                await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
            }
            catch (err) {
                console.error('Failed to handle ICE restart answer:', err);
            }
        }
        // --- PeerConnection setup ---
        _createPC() {
            this.pc = new RTCPeerConnection({
                iceServers: this.config.iceServers
            });
            this.pc.oniceconnectionstatechange = () => {
                const state = this.pc.iceConnectionState;
                if (state === 'disconnected') {
                    // Start grace period — don't emit disconnected yet
                    if (!this._graceTimer && this._connected) {
                        this.emit('reconnecting');
                        this._graceTimer = setTimeout(async () => {
                            this._graceTimer = null;
                            if (!this._connected)
                                return;
                            // Auto-attempt ICE restart if DataChannel is still alive
                            if (this.dc && this.dc.readyState === 'open' && this.pc) {
                                const success = await this.attemptReconnect();
                                if (success)
                                    return; // wait for ICE to recover via state handler
                            }
                            // Auto-reconnect failed or DC is dead
                            if (this._connected) {
                                this._connected = false;
                                this._stopKeepalive();
                                this.emit('disconnected');
                            }
                        }, GRACE_MS);
                    }
                }
                else if (state === 'failed' || state === 'closed') {
                    // Immediate disconnection — no grace
                    this._clearGraceTimer();
                    if (this._connected) {
                        this._connected = false;
                        this._stopKeepalive();
                        this.emit('disconnected');
                    }
                }
                else if (state === 'connected' || state === 'completed') {
                    // ICE recovered — cancel grace timer.
                    // Only re-emit 'connected' if we've connected before (recovery).
                    // Initial connection is always signaled by dc.onopen.
                    this._clearGraceTimer();
                    if (!this._connected && this._hasConnected) {
                        this._connected = true;
                        this._startKeepalive();
                        this.emit('connected');
                    }
                }
            };
        }
        // --- DataChannel setup ---
        _setupDC(dc) {
            this.dc = dc;
            dc.onopen = () => {
                if (!this._connected) {
                    this._connected = true;
                    this._hasConnected = true;
                    this._startKeepalive();
                    this.emit('connected');
                }
            };
            dc.onclose = () => {
                this._stopKeepalive();
                if (this._connected) {
                    this._connected = false;
                    this.emit('disconnected');
                }
            };
            dc.onmessage = (e) => {
                if (typeof e.data === 'string' && this._isInternalMessage(e.data)) {
                    this._handleInternalMessage(e.data);
                }
                else {
                    this.emit('message', e.data);
                }
            };
        }
        // --- Public API ---
        async createInvite() {
            this._createPC();
            const dc = this.pc.createDataChannel('chat', { ordered: true });
            this._setupDC(dc);
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            await this._waitForICE();
            return this.pc.localDescription.sdp;
        }
        async acceptInvite(offerSDP) {
            this._createPC();
            this.pc.ondatachannel = (e) => {
                this._setupDC(e.channel);
            };
            const offer = new RTCSessionDescription({ type: 'offer', sdp: offerSDP });
            await this.pc.setRemoteDescription(offer);
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await this._waitForICE();
            return this.pc.localDescription.sdp;
        }
        async completeHandshake(answerSDP) {
            const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSDP });
            await this.pc.setRemoteDescription(answer);
        }
        send(message) {
            if (this.dc && this.dc.readyState === 'open') {
                this.dc.send(message);
            }
        }
        disconnect() {
            this._clearGraceTimer();
            this._stopKeepalive();
            this._reconnecting = false;
            if (this.dc) {
                try {
                    this.dc.close();
                }
                catch ( /* ignore */_a) { /* ignore */ }
                this.dc = null;
            }
            if (this.pc) {
                try {
                    this.pc.close();
                }
                catch ( /* ignore */_b) { /* ignore */ }
                this.pc = null;
            }
            this._connected = false;
        }
        _waitForICE() {
            return new Promise(resolve => {
                if (this.pc.iceGatheringState === 'complete') {
                    resolve();
                    return;
                }
                const timeout = setTimeout(() => {
                    this.pc.onicecandidate = null;
                    resolve();
                }, this.config.gatheringTimeout);
                this.pc.onicecandidate = (e) => {
                    if (e.candidate === null) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
            });
        }
    }
    BlueChat.WebRTCTransport = WebRTCTransport;
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=webrtc-transport.js.map