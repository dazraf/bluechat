(function () {
  'use strict';

  var SCREENS = ['home', 'host', 'join', 'chat'];
  var current = 'home';
  var listeners = [];

  function show(name) {
    if (SCREENS.indexOf(name) === -1) return;
    var prev = current;
    current = name;
    SCREENS.forEach(function (s) {
      var el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
    listeners.forEach(function (fn) { fn(name, prev); });
  }

  function getCurrent() {
    return current;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  window.BlueChat = window.BlueChat || {};
  window.BlueChat.Screens = {
    show: show,
    getCurrent: getCurrent,
    onChange: onChange
  };
})();
