"use strict";
var BlueChat;
(function (BlueChat) {
    class TransportBase {
        constructor() {
            this._listeners = {};
        }
        on(event, fn) {
            if (!this._listeners[event])
                this._listeners[event] = [];
            this._listeners[event].push(fn);
        }
        off(event, fn) {
            const fns = this._listeners[event];
            if (!fns)
                return;
            this._listeners[event] = fns.filter(f => f !== fn);
        }
        emit(event, ...args) {
            const fns = this._listeners[event];
            if (!fns)
                return;
            for (const fn of fns) {
                fn(args[0]);
            }
        }
    }
    BlueChat.TransportBase = TransportBase;
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=transport.js.map