/* One release cohort per document; never reads or changes campaign storage. */
(async function () {
  'use strict';
  const base = new URL('./', document.baseURI);
  const pointer = new URL('release.json', base);
  // A fresh pointer is needed even when this HTML/loader came from HTTP cache.
  pointer.searchParams.set('check', Date.now().toString(36));
  const response = await fetch(pointer, {cache: 'no-store', credentials: 'same-origin'});
  if (!response.ok) throw new Error('Unable to read the Shattered release');
  const release = await response.json();
  if (release.schema !== 1 || !/^[a-f0-9]{64}$/.test(release.revision)) {
    throw new Error('Invalid Shattered release');
  }
  const prefix = `releases/${release.revision}/`;
  const names = ['shattered-audio.js', 'pwa-viewport.js', 'play-hosted-bridge.js', 'game-host.js', 'flutter_bootstrap.js'];
  if (release.bootstrap !== prefix + names.at(-1)) throw new Error('Invalid Shattered bootstrap');
  window.__shatteredRuntime = Object.freeze({revision: release.revision, entrypointSha256: release.entrypointSha256});
  for (const name of names) {
    const url = new URL(prefix + name, base);
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url.href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Unable to load Shattered'));
      document.head.append(script);
    });
  }
})().catch(() => {
  // A failed initial network load leaves existing campaign data untouched.
  const button = document.createElement('button');
  button.textContent = 'Retry';
  button.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);padding:16px 28px;border:0;border-radius:18px;background:#8ae0cb;color:#102329;font:700 18px system-ui';
  button.addEventListener('click', () => location.reload());
  document.body.append(button);
});
