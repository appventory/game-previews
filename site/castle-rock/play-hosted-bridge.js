/* Optional game-owner adapter. No network requests or native capabilities. */
(function (window) {
  'use strict';

  const protocol = 'play-hosted/v1';
  const nicknameProtocol = 'public-nickname/v1';
  const defaultHosts = [
    'https://play.dailysocial.in',
    'https://play-by-daily-social.web.app',
    'https://play-by-daily-social.firebaseapp.com',
  ];

  window.installPlayHostedBridge = function installPlayHostedBridge(game, options = {}) {
    if (!game || typeof game.getNavigationState !== 'function' || typeof game.back !== 'function') {
      throw new TypeError('Provide synchronous getNavigationState() and back() hooks.');
    }
    const hosts = new Set(options.allowedHostOrigins || defaultHosts);
    for (const origin of hosts) {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) {
        throw new TypeError('Allowed host origins must be exact HTTPS origins, without paths.');
      }
    }
    let active = true;
    let hostOrigin = null;
    let session = null;
    let lastRequestId = 0;
    let lastReply = null;
    const acceptsNickname = typeof game.setPublicNickname === 'function';

    function validNickname(value) {
      // Host emits canonical NFC; reject invalid/noncanonical wire values.
      // This is the intersection of the standalone client/backend policies.
      return value === null || (typeof value === 'string' &&
        value === value.normalize('NFC').trim().replace(/\s+/gu, ' ') &&
        Array.from(value).length > 0 && Array.from(value).length <= 30 &&
        !/[\p{C}<>@\u2028\u2029]|https?:|www\.|\d[\d\s()+.-]{6,}\d/iu.test(value));
    }

    function setPublicNickname(message) {
      if (!active || !acceptsNickname || !message ||
          message.protocol !== nicknameProtocol || !validNickname(message.nickname)) return false;
      try {
        // Pass only the whitelisted cosmetic value, never the envelope/account.
        const result = game.setPublicNickname(message.nickname);
        return !result || typeof result.then !== 'function';
      } catch (_) { return false; }
    }

    function clearNickname() {
      if (acceptsNickname) setPublicNickname({protocol: nicknameProtocol, nickname: null});
    }

    function validState(value) {
      if (!value || typeof value.atHome !== 'boolean' || typeof value.canGoBack !== 'boolean' ||
          value.atHome === value.canGoBack || typeof value.then === 'function') {
        throw new TypeError('Return {atHome: true, canGoBack: false}, or its inverse.');
      }
      // Whitelist navigation data; never forward arbitrary game state.
      return {atHome: value.atHome, canGoBack: value.canGoBack};
    }

    const api = Object.freeze({
      version: 1,
      capabilities: Object.freeze(acceptsNickname ? [nicknameProtocol] : []),
      setPublicNickname,
      getNavigationState() { return validState(game.getNavigationState()); },
      back() { return validState(game.back()); },
    });
    window.PlayHostedGame = api; // Android reads this hook in the top document.

    function send(type, navigation, requestId) {
      if (!active || !hostOrigin || !session || window.parent === window) return;
      const reply = {protocol, session, type, navigation};
      if (acceptsNickname) reply.capabilities = [nicknameProtocol];
      if (requestId !== undefined) reply.requestId = requestId;
      window.parent.postMessage(JSON.stringify(reply), hostOrigin);
      return reply;
    }

    function navigationChanged() {
      if (!active) return;
      try { send('state', api.getNavigationState()); } catch (_) { /* Remain opaque. */ }
    }

    function receive(event) {
      if (!active || window.parent === window || event.source !== window.parent ||
          !hosts.has(event.origin) || typeof event.data !== 'string' || event.data.length > 2048) return;
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      if (!message || message.protocol !== protocol || typeof message.session !== 'string' ||
          !/^[a-f0-9]{32}$/.test(message.session)) return;
      if (message.type === 'hello') {
        if (session !== message.session || hostOrigin !== event.origin) {
          clearNickname();
          session = message.session;
          hostOrigin = event.origin;
          lastRequestId = 0;
          lastReply = null;
        }
        navigationChanged();
        return;
      }
      if (message.session !== session || event.origin !== hostOrigin) return;
      if (message.type === 'state-request') {
        navigationChanged();
      } else if (message.type === 'player-nickname') {
        setPublicNickname({protocol: nicknameProtocol, nickname: message.nickname});
      } else if (message.type === 'back') {
        if (!Number.isSafeInteger(message.requestId) || message.requestId <= 0 ||
            message.requestId < lastRequestId) return;
        if (message.requestId === lastRequestId) {
          if (lastReply) window.parent.postMessage(JSON.stringify(lastReply), hostOrigin);
          return;
        }
        lastRequestId = message.requestId;
        lastReply = null;
        try { lastReply = send('back-result', api.back(), message.requestId); }
        catch (_) { /* Host timeout gives the player an escape on the next Back. */ }
      }
    }

    window.addEventListener('message', receive);
    return Object.freeze({
      navigationChanged,
      dispose() {
        clearNickname();
        active = false;
        window.removeEventListener('message', receive);
        if (window.PlayHostedGame === api) delete window.PlayHostedGame;
        hostOrigin = session = lastReply = null;
      },
    });
  };
})(window);
