namespace BlueChat {

  let messagesEl: HTMLElement | null = null;

  function formatTime(date: Date): string {
    const h = date.getHours();
    const m = date.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  export const Chat = {
    init(): void {
      messagesEl = document.getElementById('messages');
    },

    clear(): void {
      if (messagesEl) messagesEl.innerHTML = '';
    },

    addMessage(text: string, type: MessageType): void {
      if (!messagesEl) return;

      const div = document.createElement('div');

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
  };
}
