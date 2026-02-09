namespace BlueChat {

  export const Toast = {
    show(msg: string, isError: boolean = false): void {
      const container = document.getElementById('toast-container');
      if (!container) return;
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
}
