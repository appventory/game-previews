(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('castle-sw.js', {updateViaCache: 'none'}).catch(function () {
      // Storage may be unavailable in a private browsing session; play still boots.
    });
  });
})();
