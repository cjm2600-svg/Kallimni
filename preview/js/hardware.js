/*
 * R1 hardware input, per the official creations-sdk event names:
 *   scrollUp / scrollDown  (wheel, per detent)
 *   sideClick              (PTT single press; a double press arrives as two sideClicks ~50ms apart)
 *   longPressStart / longPressEnd (PTT hold)
 * Desktop preview maps keys: ↑/↓ wheel, Enter/Space side click, P long press.
 */
(function () {
  const handlers = {};
  function on(name, fn) { handlers[name] = fn; }
  function fire(name, e) { const h = handlers[name]; if (h) h(e); }

  // Ignore the second click of a hardware double-press so one press = one action.
  let lastSide = 0;
  window.addEventListener("sideClick", e => {
    const now = Date.now();
    if (now - lastSide < 120) return;
    lastSide = now;
    fire("side", e);
  });
  window.addEventListener("scrollUp", e => fire("up", e));
  window.addEventListener("scrollDown", e => fire("down", e));
  window.addEventListener("longPressStart", e => fire("long", e));
  window.addEventListener("longPressEnd", e => fire("longEnd", e));

  window.addEventListener("keydown", e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const map = { ArrowUp: "up", ArrowDown: "down", Enter: "side", " ": "side", p: "long", P: "long" };
    const n = map[e.key];
    if (n) { e.preventDefault(); fire(n, e); }
  });

  window.KHardware = {
    on,
    isR1: typeof window.PluginMessageHandler !== "undefined" || !!window.creationStorage
  };
})();
