namespace BlueChat {

  function stripSDP(sdp: string): SDPEssentials {
    const lines = sdp.split('\r\n');
    const essential: SDPEssentials = { fp: '', ufrag: '', pwd: '', candidates: [] };

    for (const line of lines) {
      if (line.startsWith('a=fingerprint:')) {
        essential.fp = line.substring('a=fingerprint:'.length);
      } else if (line.startsWith('a=ice-ufrag:')) {
        essential.ufrag = line.substring('a=ice-ufrag:'.length);
      } else if (line.startsWith('a=ice-pwd:')) {
        essential.pwd = line.substring('a=ice-pwd:'.length);
      } else if (line.startsWith('a=candidate:')) {
        essential.candidates.push(line.substring('a=candidate:'.length));
      }
    }

    return essential;
  }

  function rebuildSDP(essential: SDPEssentials, type: 'offer' | 'answer'): string {
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 0.0.0.0',
      's=-',
      't=0 0',
      'a=group:BUNDLE 0',
      'a=msid-semantic:WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
      'c=IN IP4 0.0.0.0',
      'a=mid:0',
      'a=sctp-port:5000',
      'a=max-message-size:262144',
      'a=ice-ufrag:' + essential.ufrag,
      'a=ice-pwd:' + essential.pwd,
      'a=fingerprint:' + essential.fp,
      'a=setup:' + (type === 'offer' ? 'actpass' : 'active')
    ];

    for (const c of essential.candidates) {
      sdp.push('a=candidate:' + c);
    }

    sdp.push('');
    return sdp.join('\r\n');
  }

  export const SDPCompress = {
    compress(sdp: string, type: 'offer' | 'answer', deviceId: string): string {
      const essential = stripSDP(sdp);
      const payload: SDPPayload = {
        t: type === 'offer' ? 'o' : 'a',
        f: essential.fp,
        u: essential.ufrag,
        p: essential.pwd,
        c: essential.candidates,
        id: deviceId || ''
      };
      return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    },

    decompress(compressed: string): DecompressedSDP | null {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) return null;

      let payload: SDPPayload;
      try {
        payload = JSON.parse(json);
      } catch {
        return null;
      }

      const type = payload.t === 'o' ? 'offer' as const : 'answer' as const;
      const essential: SDPEssentials = {
        fp: payload.f,
        ufrag: payload.u,
        pwd: payload.p,
        candidates: payload.c || []
      };

      return {
        sdp: rebuildSDP(essential, type),
        type,
        peerId: payload.id || ''
      };
    }
  };
}
