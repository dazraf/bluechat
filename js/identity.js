(function () {
  'use strict';

  var ADJECTIVES = [
    'bold', 'calm', 'cool', 'dark', 'fast', 'kind', 'keen', 'warm',
    'wise', 'wild', 'free', 'fair', 'glad', 'gold', 'pink', 'blue',
    'red', 'soft', 'tall', 'true', 'pure', 'neat', 'slim', 'deep'
  ];

  var NOUNS = [
    'fox', 'owl', 'cat', 'dog', 'elk', 'bee', 'ant', 'bat',
    'cow', 'emu', 'hen', 'jay', 'ram', 'yak', 'ape', 'cod',
    'fly', 'gnu', 'hog', 'koi', 'lynx', 'pug', 'ray', 'wolf'
  ];

  function randomHex(len) {
    var hex = '';
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (var i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function generate() {
    var adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    var noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    var hex = randomHex(2);
    return adj + '-' + noun + '-' + hex;
  }

  function getOrCreate() {
    var key = 'bluechat-device-id';
    var id = localStorage.getItem(key);
    if (!id) {
      id = generate();
      localStorage.setItem(key, id);
    }
    return id;
  }

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.Identity = {
    getOrCreate: getOrCreate
  };
})();
