(function () {
  'use strict';

  var messagesEl = null;

  function init() {
    messagesEl = document.getElementById('messages');
  }

  function clear() {
    if (messagesEl) messagesEl.innerHTML = '';
  }

  function formatTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function escapeHTML(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function addMessage(text, type) {
    if (!messagesEl) return;

    var div = document.createElement('div');

    if (type === 'system') {
      div.className = 'msg-system';
      div.textContent = text;
    } else {
      div.className = 'msg ' + (type === 'sent' ? 'sent' : 'received');
      div.innerHTML = escapeHTML(text) +
        '<span class="msg-time">' + formatTime(new Date()) + '</span>';
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.Chat = {
    init: init,
    clear: clear,
    addMessage: addMessage
  };
})();
