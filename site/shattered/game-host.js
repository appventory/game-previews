/* Early, document-local buffer. Trust/origin checks remain in the shared SDK. */
(function (window) {
  'use strict';
  const started = Date.now();
  const waitLimit = window.parent !== window ? 1500 : 500;
  let nickname = null;
  let hooks = null;
  let bridge = null;
  const waiting = new Set();

  function finishWaiters() {
    for (const finish of Array.from(waiting)) finish();
  }

  function navigation() {
    return hooks ? hooks.getNavigationState() : {atHome: true, canGoBack: false};
  }

  function install() {
    if (bridge) return;
    bridge = window.installPlayHostedBridge({
      getNavigationState: navigation,
      back: () => hooks ? hooks.back() : navigation(),
      setPublicNickname(value) {
        nickname = value;
        // The SDK must receive a synchronous return, even if Dart applies later.
        if (hooks) hooks.setPublicNickname(value);
        if (value !== null) finishWaiters();
      },
    });
  }

  install(); // Ready before Flutter starts, including native top-frame polling.
  window.StandaloneGameHost = Object.freeze({
    attach(nextHooks) {
      install();
      hooks = nextHooks;
      hooks.setPublicNickname(nickname);
      bridge.navigationChanged();
      const current = hooks;
      return Object.freeze({
        navigationChanged() {
          if (hooks === current) bridge?.navigationChanged();
        },
        waitForInitialContext() {
          const remaining = Math.max(0, started + waitLimit - Date.now());
          if (nickname !== null || remaining === 0 || hooks !== current) {
            return Promise.resolve();
          }
          return new Promise(resolve => {
            let timer;
            const finish = () => {
              window.clearTimeout(timer);
              waiting.delete(finish);
              resolve();
            };
            waiting.add(finish);
            timer = window.setTimeout(finish, remaining);
          });
        },
        dispose() {
          if (hooks !== current) return;
          bridge?.dispose();
          bridge = null;
          hooks = null;
          nickname = null;
          finishWaiters();
        },
      });
    },
  });
})(window);
