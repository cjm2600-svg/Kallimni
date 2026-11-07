/*
 * Pronunciation playback. Plays ONE phrase; never listens or scores.
 *
 * Source priority:
 *   1. phrase.audio — a bundled native-speaker recording (best; Egyptian accent)
 *   2. Web Speech API speechSynthesis with an Arabic voice (ar-EG preferred).
 *      Most Arabic TTS voices are Modern-Standard-leaning; we say so in the UI.
 *   3. Optional "R1 voice" (off by default): asks rabbitOS to read the phrase
 *      aloud via PluginMessageHandler + wantsR1Response. This goes through
 *      rabbit's cloud assistant, needs internet, and its pronunciation is not
 *      guaranteed — it is labelled experimental.
 *
 * Emits lifecycle callbacks so the music player can duck around speech:
 *   KSpeech.onStart(fn), KSpeech.onEnd(fn)
 */
(function () {
  const startFns = [], endFns = [];
  let speaking = false, endTimer = null, currentAudio = null;
  let settings = { rate: 0.85, r1Voice: false };

  function emitStart() {
    if (speaking) return;
    speaking = true;
    startFns.forEach(f => { try { f(); } catch (e) {} });
  }
  function emitEnd() {
    clearTimeout(endTimer);
    if (!speaking) return;
    speaking = false;
    endFns.forEach(f => { try { f(); } catch (e) {} });
  }
  // Never leave music ducked forever if a source fails to report its end.
  function safetyEnd(ms) {
    clearTimeout(endTimer);
    endTimer = setTimeout(emitEnd, ms);
  }

  function synth() {
    return ("speechSynthesis" in window) ? window.speechSynthesis : null;
  }
  let cachedVoice;
  function arabicVoice() {
    const s = synth();
    if (!s) return null;
    const voices = s.getVoices() || [];
    const ar = voices.filter(v => /^ar([-_]|$)/i.test(v.lang));
    cachedVoice = ar.find(v => /EG/i.test(v.lang)) || ar[0] || null;
    return cachedVoice;
  }
  // Voices load asynchronously on Chrome/Android.
  if (synth()) {
    arabicVoice();
    try { synth().addEventListener("voiceschanged", arabicVoice); } catch (e) {}
  }

  function hasR1Bridge() {
    return typeof window.PluginMessageHandler !== "undefined" &&
      window.PluginMessageHandler && typeof window.PluginMessageHandler.postMessage === "function";
  }

  /** What the device can do right now — shown honestly in the UI. */
  function capabilities() {
    const v = arabicVoice();
    return {
      tts: !!v,
      voiceName: v ? `${v.name} (${v.lang})` : null,
      egyptianVoice: !!(v && /EG/i.test(v.lang)),
      r1Bridge: hasR1Bridge()
    };
  }

  function stop() {
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    const s = synth();
    if (s) { try { s.cancel(); } catch (e) {} }
    emitEnd();
  }

  /**
   * Speak a phrase. Resolves with the source used: "recording" | "tts" | "r1" | "none".
   */
  function speak(phrase, opts = {}) {
    stop();
    const rate = (opts.slow ? 0.6 : 1) * settings.rate;

    if (phrase.audio) {
      const a = new Audio(phrase.audio);
      a.playbackRate = opts.slow ? 0.8 : 1;
      currentAudio = a;
      emitStart();
      a.onended = a.onerror = () => { if (currentAudio === a) currentAudio = null; emitEnd(); };
      safetyEnd(15000);
      return a.play().then(() => "recording").catch(() => {
        emitEnd();
        return speakTTS(phrase, rate);
      });
    }
    return speakTTS(phrase, rate);
  }

  function speakTTS(phrase, rate) {
    const s = synth(), v = arabicVoice();
    if (s && v) {
      const u = new SpeechSynthesisUtterance(phrase.say || phrase.ar.replace(/\.\.\./g, ""));
      u.voice = v; u.lang = v.lang; u.rate = rate; u.volume = 1;
      u.onstart = emitStart;
      u.onend = u.onerror = emitEnd;
      emitStart(); // duck immediately; onstart can lag on Android
      safetyEnd(8000);
      s.speak(u);
      return Promise.resolve("tts");
    }
    if (settings.r1Voice && hasR1Bridge()) {
      const text = (phrase.say || phrase.ar).replace(/\.\.\./g, "");
      const payload = {
        message:
          "Read the following Egyptian Arabic phrase aloud exactly once, in an Egyptian (Cairene) accent. " +
          "Say only the phrase. Do not translate, explain, or add anything.\n\n" + text,
        useLLM: true,
        wantsR1Response: true,
        wantsJournalEntry: false
      };
      try {
        window.PluginMessageHandler.postMessage(JSON.stringify(payload));
        // rabbitOS gives no "finished speaking" event, so estimate generously.
        emitStart();
        safetyEnd(4500 + text.length * 120);
        return Promise.resolve("r1");
      } catch (e) {
        emitEnd();
      }
    }
    return Promise.resolve("none");
  }

  window.KSpeech = {
    speak, stop, capabilities,
    onStart: f => startFns.push(f),
    onEnd: f => endFns.push(f),
    configure: s => Object.assign(settings, s),
    get speaking() { return speaking; },
    /** rabbitOS replies to our R1-voice request here; we only use it as a timing hint. */
    notifyPluginMessage() { if (speaking) safetyEnd(3500); }
  };
})();
