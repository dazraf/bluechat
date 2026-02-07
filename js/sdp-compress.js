(function () {
  'use strict';

  // Extract only the essential fields from SDP needed for local network WebRTC
  function stripSDP(sdp) {
    var lines = sdp.split('\r\n');
    var essential = {
      type: '', // offer or answer
      fp: '',   // DTLS fingerprint
      ufrag: '',
      pwd: '',
      candidates: []
    };

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('a=fingerprint:') === 0) {
        essential.fp = line.substring('a=fingerprint:'.length);
      } else if (line.indexOf('a=ice-ufrag:') === 0) {
        essential.ufrag = line.substring('a=ice-ufrag:'.length);
      } else if (line.indexOf('a=ice-pwd:') === 0) {
        essential.pwd = line.substring('a=ice-pwd:'.length);
      } else if (line.indexOf('a=candidate:') === 0) {
        essential.candidates.push(line.substring('a=candidate:'.length));
      }
    }

    return essential;
  }

  // Rebuild a minimal SDP from stripped fields
  function rebuildSDP(essential, type) {
    var sdp = [
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

    for (var i = 0; i < essential.candidates.length; i++) {
      sdp.push('a=candidate:' + essential.candidates[i]);
    }

    sdp.push('');
    return sdp.join('\r\n');
  }

  // Compress SDP for QR code transport
  function compress(sdp, type, deviceId) {
    var essential = stripSDP(sdp);
    var payload = {
      t: type === 'offer' ? 'o' : 'a',
      f: essential.fp,
      u: essential.ufrag,
      p: essential.pwd,
      c: essential.candidates,
      id: deviceId || ''
    };
    var json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  }

  // Decompress QR code data back to SDP
  function decompress(compressed) {
    var json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    var payload;
    try {
      payload = JSON.parse(json);
    } catch (e) {
      return null;
    }

    var type = payload.t === 'o' ? 'offer' : 'answer';
    var essential = {
      fp: payload.f,
      ufrag: payload.u,
      pwd: payload.p,
      candidates: payload.c || []
    };

    return {
      sdp: rebuildSDP(essential, type),
      type: type,
      peerId: payload.id || ''
    };
  }

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.SDPCompress = {
    compress: compress,
    decompress: decompress
  };
})();
