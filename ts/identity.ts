namespace BlueChat {

  const ADJECTIVES: string[] = [
    'bold', 'calm', 'cool', 'dark', 'fast', 'kind', 'keen', 'warm',
    'wise', 'wild', 'free', 'fair', 'glad', 'gold', 'pink', 'blue',
    'red', 'soft', 'tall', 'true', 'pure', 'neat', 'slim', 'deep'
  ];

  const NOUNS: string[] = [
    'fox', 'owl', 'cat', 'dog', 'elk', 'bee', 'ant', 'bat',
    'cow', 'emu', 'hen', 'jay', 'ram', 'yak', 'ape', 'cod',
    'fly', 'gnu', 'hog', 'koi', 'lynx', 'pug', 'ray', 'wolf'
  ];

  function randomHex(len: number): string {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  function generate(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}-${noun}-${randomHex(2)}`;
  }

  export const Identity = {
    getOrCreate(): string {
      const key = 'bluechat-device-id';
      let id = localStorage.getItem(key);
      if (!id) {
        id = generate();
        localStorage.setItem(key, id);
      }
      return id;
    }
  };
}
