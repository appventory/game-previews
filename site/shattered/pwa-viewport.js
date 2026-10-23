/* Keep the canvas edge-to-edge while Flutter SafeArea protects game controls. */
(() => {
  "use strict";
  const modes = ["fullscreen", "standalone", "minimal-ui"]
    .map(mode => window.matchMedia(`(display-mode: ${mode})`));
  const probe = document.getElementById("play-safe-area");
  let pending = false;

  function ensureViewport() {
    // Flutter's full-page embedding replaces index.html's viewport meta.
    // Keep its accessibility/zoom settings and restore only viewport-fit.
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const parts = (meta.getAttribute("content") || "")
      .split(",").map(part => part.trim()).filter(Boolean)
      .filter(part => !/^viewport-fit\s*=/i.test(part));
    const content = [...parts, "viewport-fit=cover"].join(", ");
    if (meta.getAttribute("content") !== content) meta.setAttribute("content", content);
  }

  window.playViewportState = () => {
    const style = window.getComputedStyle(probe);
    const inset = side => Math.max(0, Number.parseFloat(style[side]) || 0);
    return {
      installed: window.navigator.standalone === true || modes.some(mode => mode.matches),
      top: inset("paddingTop"), right: inset("paddingRight"),
      bottom: inset("paddingBottom"), left: inset("paddingLeft"),
    };
  };

  function refresh() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      ensureViewport();
      window.dispatchEvent(new Event("playviewportchange"));
    });
  }

  // Observe only the head: never touch Flutter's render/semantics DOM.
  new MutationObserver(records => {
    if (records.some(record => record.type === "childList" ||
        record.target.matches?.('meta[name="viewport"]'))) {
      ensureViewport();
      refresh();
    }
  }).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content"] });

  for (const mode of modes) {
    if (mode.addEventListener) mode.addEventListener("change", refresh);
    else mode.addListener(refresh);
  }
  for (const event of ["resize", "orientationchange", "pageshow", "fullscreenchange"]) {
    window.addEventListener(event, refresh);
  }
  window.visualViewport?.addEventListener("resize", refresh);
  ensureViewport();
  refresh();
})();
