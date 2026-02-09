"use strict";
var BlueChat;
(function (BlueChat) {
    let messagesEl = null;
    function formatTime(date) {
        const h = date.getHours();
        const m = date.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    BlueChat.Chat = {
        init() {
            messagesEl = document.getElementById('messages');
        },
        clear() {
            if (messagesEl)
                messagesEl.innerHTML = '';
        },
        addMessage(text, type) {
            if (!messagesEl)
                return;
            const div = document.createElement('div');
            if (type === 'system') {
                div.className = 'msg-system';
                div.textContent = text;
            }
            else {
                div.className = 'msg ' + (type === 'sent' ? 'sent' : 'received');
                div.innerHTML = escapeHTML(text) +
                    '<span class="msg-time">' + formatTime(new Date()) + '</span>';
            }
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    };
})(BlueChat || (BlueChat = {}));
//# sourceMappingURL=chat.js.map