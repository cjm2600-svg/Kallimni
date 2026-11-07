/*
 * Background nasheed player.
 * - One HTMLAudioElement, streamed (preload="none") to stay light on the R1.
 * - Only plays tracks from music/playlist.js that carry license info.
 * - Ducks (lowers) or pauses while Arabic pronunciation plays, then restores.
 * - Starts only after a user tap (WebView autoplay rules).
 */
(function () {
  const DUCK_LEVEL = 0.15;   // fraction of the user's volume while ducked
  const FADE_MS = 300;

  const audio = new Audio();
  audio.preload = "none";
  audio.loop = false;

  let tracks = [];
  let idx = 0;
  let prefs = { enabled: false, volume: 0.3, duckMode: "lower", track: 0 };
  let ducked = false, pausedForSpeech = false, userPaused = false;
  let fadeRaf = null;
  let listeners = [];
  let lastError = null;
  let saveFn = () => {};

  function validTrack(t) {
    return t && t.src && t.title && t.license && (t.source || t.permission);
  }
  function emit() { listeners.forEach(f => { try { f(state()); } catch (e) {} }); }

  function targetVolume() {
    return ducked ? prefs.volume * DUCK_LEVEL : prefs.volume;
  }
  function fadeTo(v, ms = FADE_MS) {
    cancelAnimationFrame(fadeRaf);
    const from = audio.volume, t0 = performance.now();
    if (ms <= 0) { audio.volume = clamp(v); return; }
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      audio.volume = clamp(from + (v - from) * k);
      if (k < 1) fadeRaf = requestAnimationFrame(step);
    };
    fadeRaf = requestAnimationFrame(step);
  }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  function load(i) {
    if (!tracks.length) return false;
    idx = (i + tracks.length) % tracks.length;
    prefs.track = idx;
    audio.src = tracks[idx].src;
    return true;
  }

  function play() {
    if (!tracks.length) { lastError = "No licensed tracks in the playlist yet."; emit(); return Promise.resolve(false); }
    if (!audio.src) load(prefs.track || 0);
    lastError = null;
    userPaused = false;
    audio.volume = targetVolume();
    return audio.play().then(() => { emit(); return true; }).catch(err => {
      lastError = /NotAllowed/i.test(err && err.name) ? "Tap play to start music." : "Couldn't play this track.";
      emit();
      return false;
    });
  }
  function pause() { userPaused = true; audio.pause(); emit(); }

  audio.addEventListener("ended", () => { next(); });
  audio.addEventListener("error", () => {
    if (!audio.src) return;
    lastError = "Track failed to load — skipping.";
    emit();
    if (tracks.length > 1) setTimeout(next, 800);
  });
  ["play", "pause", "playing"].forEach(ev => audio.addEventListener(ev, emit));

  function next() { if (load(idx + 1)) { persist(); if (prefs.enabled && !userPaused) play(); else emit(); } }
  function prev() { if (load(idx - 1)) { persist(); if (prefs.enabled && !userPaused) play(); else emit(); } }

  function setEnabled(on) {
    prefs.enabled = !!on;
    persist();
    if (on) return play();
    audio.pause();
    emit();
    return Promise.resolve(false);
  }
  function setVolume(v) {
    prefs.volume = Math.round(clamp(v) * 100) / 100;
    fadeTo(targetVolume(), 80);
    persist();
    emit();
  }
  function setDuckMode(mode) { prefs.duckMode = mode === "pause" ? "pause" : "lower"; persist(); emit(); }

  // --- Ducking around pronunciation playback ---
  function duck() {
    if (audio.paused) return;
    if (prefs.duckMode === "pause") {
      pausedForSpeech = true;
      fadeTo(0, 150);
      setTimeout(() => { if (pausedForSpeech) audio.pause(); }, 160);
    } else {
      ducked = true;
      fadeTo(targetVolume(), 200);
    }
    emit();
  }
  function unduck() {
    if (pausedForSpeech) {
      pausedForSpeech = false;
      if (prefs.enabled && !userPaused) {
        audio.volume = 0;
        audio.play().then(() => fadeTo(targetVolume(), 500)).catch(() => {});
      }
    }
    if (ducked) {
      ducked = false;
      fadeTo(targetVolume(), 500);   // back to the user's previous volume
    }
    emit();
  }

  let hiddenPaused = false;
  // Don't leave audio running invisibly when the Creation is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !audio.paused) { audio.pause(); hiddenPaused = true; }
    else if (!document.hidden && hiddenPaused) {
      hiddenPaused = false;
      if (prefs.enabled && !userPaused) play();
    }
  });
  function persist() { saveFn(Object.assign({}, prefs)); }

  function state() {
    const t = tracks[idx];
    return {
      enabled: prefs.enabled,
      playing: !audio.paused,
      volume: prefs.volume,
      duckMode: prefs.duckMode,
      ducked: ducked || pausedForSpeech,
      hasTracks: tracks.length > 0,
      track: t ? { title: t.title, artist: t.artist || "", license: t.license, source: t.source || t.permission } : null,
      index: idx, count: tracks.length,
      error: lastError
    };
  }

  window.KMusic = {
    init(savedPrefs, onSave) {
      saveFn = onSave || saveFn;
      tracks = (window.KALLIMNI_PLAYLIST || []).filter(validTrack);
      if (savedPrefs) Object.assign(prefs, savedPrefs);
      if (prefs.track >= tracks.length) prefs.track = 0;
      idx = prefs.track || 0;
      if (tracks.length) audio.src = tracks[idx].src;
      audio.volume = prefs.volume;
      emit();
    },
    play, pause, next, prev, setEnabled, setVolume, setDuckMode, duck, unduck,
    toggle() { return audio.paused ? (prefs.enabled ? play() : setEnabled(true)) : pause(); },
    onChange(f) { listeners.push(f); },
    get state() { return state(); },
    _audio: audio // exposed for tests
  };
})();
