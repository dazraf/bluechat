"use strict";
var BlueChat;
(function (BlueChat) {
    const DEFAULT_GATHERING_TIMEOUT = 5000;
    class WebRTCTransport extends BlueChat.TransportBase {
        constructor(config = {}) {
            var _a, _b;
            super();
            this.pc = null;
            this.dc = null;
            this._connected = false;
            this.config = {
                iceServers: (_a = config.iceServers) !== null && _a !== void 0 ? _a : [],
                gatheringTimeout: (_b = config.gatheringTimeout) !== null && _b !== void 0 ? _b : DEFAULT_GATHERING_TIMEOUT
            };
        }
        _createPC() {
            this.pc = new RTCPeerConnection({
                iceServers: this.config.iceServers
            });
            // Only use ICE state for disconnection detection.
            // Connection is signaled by dc.onopen (DataChannel ready).
            this.pc.oniceconnectionstatechange = () => {
                const state = this.pc.iceConnectionState;
                if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                    if (this._connected) {
                        this._connected = false;
                        this.emit('disconnected');
                    }
                }
            };
        }
        _setupDC(dc) {
            this.dc = dc;
            dc.onopen = () => {
                if (!this._connected) {
                    this._connected = true;
                    this.emit('connected');
                }
            };
            dc.onclose = () => {
                if (this._connected) {
                    this._connected = false;
                    this.emit('disconnected');
                }
            };
            dc.onmessage = (e) => {
                this.emit('message', e.data);
            };
        }
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