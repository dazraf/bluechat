"use strict";
var BlueChat;
(function (BlueChat) {
    const SCREENS = ['home', 'host', 'join', 'chat'];
    let current = 'home';
    const listeners = [];
    BlueChat.Screens = {
        show(name) {
            if (SCREENS.indexOf(name) === -1)
                return;
            const prev = current;
            current = name;
            SCREENS.forEach(s => {
                const el = document.getElementById('screen-' + s);
                if (el)
                    el.classList.toggle('active', s === name);
            });
            listeners.forEach(fn => fn(name, prev));
        },
        getCurrent() {
            return current;
        },
        onChange(fn) {
            listeners.push(fn);
        }
    };
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=screens.js.map