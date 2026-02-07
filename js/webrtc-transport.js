(function () {
  'use strict';

  var Transport = window.BlueChat.Transport;

  function WebRTCTransport() {
    Transport.call(this);
    this.pc = null;
    this.dc = null;
    this._connected = false;
  }

  // Inherit from Transport
  WebRTCTransport.prototype = Object.create(Transport.prototype);
  WebRTCTransport.prototype.constructor = WebRTCTransport;

  WebRTCTransport.prototype._createPC = function () {
    var self = this;
    // No STUN/TURN — local network only
    this.pc = new RTCPeerConnection({ iceServers: [] });

    // Only use ICE state for disconnection detection.
    // Connection is signaled by dc.onopen (DataChannel ready).
    this.pc.oniceconnectionstatechange = function () {
      var state = self.pc.iceConnectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (self._connected) {
          self._connected = false;
          self.emit('disconnected');
        }
      }
    };
  };

  WebRTCTransport.prototype._setupDC = function (dc) {
    var self = this;
    this.dc = dc;

    dc.onopen = function () {
      if (!self._connected) {
        self._connected = true;
        self.emit('connected');
      }
    };

    dc.onclose = function () {
      if (self._connected) {
        self._connected = false;
        self.emit('disconnected');
      }
    };

    dc.onmessage = function (e) {
      self.emit('message', e.data);
    };
  };

  // Host side: create offer and wait for ICE candidates to gather
  WebRTCTransport.prototype.createOffer = function () {
    var self = this;
    this._createPC();

    var dc = this.pc.createDataChannel('chat', { ordered: true });
    this._setupDC(dc);

    return this.pc.createOffer().then(function (offer) {
      return self.pc.setLocalDescription(offer);
    }).then(function () {
      return self._waitForICE();
    }).then(function () {
      return self.pc.localDescription.sdp;
    });
  };

  // Joiner side: accept offer and return answer SDP
  WebRTCTransport.prototype.acceptOffer = function (offerSDP) {
    var self = this;
    this._createPC();

    this.pc.ondatachannel = function (e) {
      self._setupDC(e.channel);
    };

    var offer = new RTCSessionDescription({ type: 'offer', sdp: offerSDP });
    return this.pc.setRemoteDescription(offer).then(function () {
      return self.pc.createAnswer();
    }).then(function (answer) {
      return self.pc.setLocalDescription(answer);
    }).then(function () {
      return self._waitForICE();
    }).then(function () {
      return self.pc.localDescription.sdp;
    });
  };

  // Host side: complete connection with answer
  WebRTCTransport.prototype.completeConnection = function (answerSDP) {
    var answer = new RTCSessionDescription({ type: 'answer', sdp: answerSDP });
    return this.pc.setRemoteDescription(answer);
  };

  WebRTCTransport.prototype.send = function (message) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(message);
    }
  };

  WebRTCTransport.prototype.disconnect = function () {
    if (this.dc) {
      try { this.dc.close(); } catch (e) { /* ignore */ }
      this.dc = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch (e) { /* ignore */ }
      this.pc = null;
    }
    this._connected = false;
  };

  // Wait for ICE gathering to complete (or timeout with what we have)
  WebRTCTransport.prototype._waitForICE = function () {
    var self = this;
    return new Promise(function (resolve) {
      if (self.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      var timeout = setTimeout(function () {
        // Use what we have after timeout
        self.pc.onicecandidate = null;
        resolve();
      }, 3000);

      self.pc.onicecandidate = function (e) {
        if (e.candidate === null) {
          // Gathering complete
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  };

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.WebRTCTransport = WebRTCTransport;
})();
