/*
 * Storage adapter.
 * On the R1: window.creationStorage.plain (per-Creation, values must be Base64).
 * Elsewhere (desktop preview): localStorage. If neither works, memory only.
 */
(function () {
  const KEY = "kallimni_v1";

  function toB64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromB64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }
  function r1Store() {
    try {
      const s = window.creationStorage && window.creationStorage.plain;
      return s && typeof s.setItem === "function" ? s : null;
    } catch (e) { return null; }
  }
  function withTimeout(p, ms) {
    return Promise.race([
      Promise.resolve(p),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
    ]);
  }

  let backend = "memory";
  let memory = null;

  async function load() {
    const s = r1Store();
    if (s) {
      try {
        const raw = await withTimeout(s.getItem(KEY), 3000);
        backend = "r1";
        return raw ? JSON.parse(fromB64(raw)) : null;
      } catch (e) { /* fall through to localStorage */ }
    }
    try {
      const raw = localStorage.getItem(KEY);
      backend = "local";
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      backend = "memory";
      return memory;
    }
  }

  let pending = null;
  function save(state) {
    memory = state;
    clearTimeout(pending);
    pending = setTimeout(() => writeNow(state), 250); // debounce bursts of taps
  }
  async function writeNow(state) {
    const json = JSON.stringify(state);
    if (backend === "r1") {
      try { await withTimeout(r1Store().setItem(KEY, toB64(json)), 3000); return; }
      catch (e) { /* try localStorage */ }
    }
    try { localStorage.setItem(KEY, json); if (backend !== "r1") backend = "local"; }
    catch (e) { backend = "memory"; }
  }
  async function clear() {
    memory = null;
    const s = r1Store();
    if (s) { try { await withTimeout(s.removeItem(KEY), 3000); } catch (e) {} }
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.KStore = {
    load, save, clear, flush: (state) => writeNow(state),
    get backend() { return backend; }
  };
})();
