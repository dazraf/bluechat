"use strict";
var BlueChat;
(function (BlueChat) {
    BlueChat.Toast = {
        show(msg, isError = false) {
            const container = document.getElementById('toast-container');
            if (!container)
                return;
            const el = document.createElement('div');
            el.className = 'toast' + (isError ? ' toast-error' : '');
            el.textContent = msg;
            container.appendChild(el);
            setTimeout(() => {
                el.classList.add('toast-out');
                setTimeout(() => el.remove(), 300);
            }, 5000);
        }
    };
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=toast.js.map