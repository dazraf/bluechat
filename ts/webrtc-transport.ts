namespace BlueChat {

  const DEFAULT_GATHERING_TIMEOUT = 5000;

  export class WebRTCTransport extends TransportBase {
    private pc: RTCPeerConnection | null = null;
    private dc: RTCDataChannel | null = null;
    private _connected = false;
    private config: Required<TransportConfig>;

    constructor(config: TransportConfig = {}) {
      super();
      this.config = {
        iceServers: config.iceServers ?? [],
        gatheringTimeout: config.gatheringTimeout ?? DEFAULT_GATHERING_TIMEOUT
      };
    }

    private _createPC(): void {
      this.pc = new RTCPeerConnection({
        iceServers: this.config.iceServers
      });

      // Only use ICE state for disconnection detection.
      // Connection is signaled by dc.onopen (DataChannel ready).
      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc!.iceConnectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          if (this._connected) {
            this._connected = false;
            this.emit('disconnected');
          }
        }
      };
    }

    private _setupDC(dc: RTCDataChannel): void {
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

      dc.onmessage = (e: MessageEvent) => {
        this.emit('message', e.data);
      };
    }

    async createInvite(): Promise<string> {
      this._createPC();
      const dc = this.pc!.createDataChannel('chat', { ordered: true });
      this._setupDC(dc);

      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      await this._waitForICE();
      return this.pc!.localDescription!.sdp;
    }

    async acceptInvite(offerSDP: string): Promise<string> {
      this._createPC();

      this.pc!.ondatachannel = (e: RTCDataChannelEvent) => {
        this._setupDC(e.channel);
      };

      const offer = new RTCSessionDescription({ type: 'offer', sdp: offerSDP });
      await this.pc!.setRemoteDescription(offer);
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      await this._waitForICE();
      return this.pc!.localDescription!.sdp;
    }

    async completeHandshake(answerSDP: string): Promise<void> {
      const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSDP });
      await this.pc!.setRemoteDescription(answer);
    }

    send(message: string): void {
      if (this.dc && this.dc.readyState === 'open') {
        this.dc.send(message);
      }
    }

    disconnect(): void {
      if (this.dc) {
        try { this.dc.close(); } catch { /* ignore */ }
        this.dc = null;
      }
      if (this.pc) {
        try { this.pc.close(); } catch { /* ignore */ }
        this.pc = null;
      }
      this._connected = false;
    }

    private _waitForICE(): Promise<void> {
      return new Promise(resolve => {
        if (this.pc!.iceGatheringState === 'complete') {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          this.pc!.onicecandidate = null;
          resolve();
        }, this.config.gatheringTimeout);

        this.pc!.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
          if (e.candidate === null) {
            clearTimeout(timeout);
            resolve();
          }
        };
      });
    }
  }
}
