namespace BlueChat {

  const SCREENS: ScreenName[] = ['home', 'host', 'join', 'chat'];
  let current: ScreenName = 'home';
  const listeners: Array<(name: ScreenName, prev: ScreenName) => void> = [];

  export const Screens = {
    show(name: ScreenName): void {
      if (SCREENS.indexOf(name) === -1) return;
      const prev = current;
      current = name;
      SCREENS.forEach(s => {
        const el = document.getElementById('screen-' + s);
        if (el) el.classList.toggle('active', s === name);
      });
      listeners.forEach(fn => fn(name, prev));
    },

    getCurrent(): ScreenName {
      return current;
    },

    onChange(fn: (name: ScreenName, prev: ScreenName) => void): void {
      listeners.push(fn);
    }
  };
}
