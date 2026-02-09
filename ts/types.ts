namespace BlueChat {

  // --- Screen Management ---
  export type ScreenName = 'home' | 'host' | 'join' | 'chat';

  // --- Chat Messages ---
  export type MessageType = 'sent' | 'received' | 'system';

  export interface ChatMessage {
    type: 'chat';
    text: string;
    from: string;
  }

  // --- Transport ---

  export interface TransportConfig {
    iceServers?: RTCIceServer[];
    gatheringTimeout?: number;
  }

  export interface TransportEventMap {
    connected: void;
    disconnected: void;
    reconnecting: void;
    message: string;
  }

  /**
   * Transport interface — generic signaling contract.
   * Not SDP-specific: each implementation defines what the
   * opaque invite/response strings contain.
   */
  export interface ITransport {
    createInvite(): Promise<string>;
    acceptInvite(inviteData: string): Promise<string>;
    completeHandshake(responseData: string): Promise<void>;
    send(message: string): void;
    disconnect(): void;
    attemptReconnect?(): Promise<boolean>;
    on<K extends keyof TransportEventMap>(
      event: K,
      fn: (data: TransportEventMap[K]) => void
    ): void;
    off<K extends keyof TransportEventMap>(
      event: K,
      fn: (data: TransportEventMap[K]) => void
    ): void;
  }

  // --- SDP Compression ---

  export interface SDPEssentials {
    fp: string;
    ufrag: string;
    pwd: string;
    candidates: string[];
  }

  export interface SDPPayload {
    t: 'o' | 'a';
    f: string;
    u: string;
    p: string;
    c: string[];
    id: string;
  }

  export interface DecompressedSDP {
    sdp: string;
    type: 'offer' | 'answer';
    peerId: string;
  }
}
