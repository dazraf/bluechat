(function () {
  'use strict';

  // Abstract Transport base class using EventTarget
  // Events: 'message', 'connected', 'disconnected'
  // Subclasses implement: createOffer, acceptOffer, completeConnection, send, disconnect

  function Transport() {
    this._listeners = {};
  }

  Transport.prototype.on = function (event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  };

  Transport.prototype.off = function (event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
  };

  Transport.prototype.emit = function (event, data) {
    var fns = this._listeners[event];
    if (!fns) return;
    for (var i = 0; i < fns.length; i++) {
      fns[i](data);
    }
  };

  // To be overridden by subclass
  Transport.prototype.createOffer = function () {
    return Promise.reject(new Error('Not implemented'));
  };

  Transport.prototype.acceptOffer = function (/* offerData */) {
    return Promise.reject(new Error('Not implemented'));
  };

  Transport.prototype.completeConnection = function (/* answerData */) {
    return Promise.reject(new Error('Not implemented'));
  };

  Transport.prototype.send = function (/* message */) {
    throw new Error('Not implemented');
  };

  Transport.prototype.disconnect = function () {
    throw new Error('Not implemented');
  };

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.Transport = Transport;
})();
