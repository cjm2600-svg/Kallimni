/* Kallimni — main app controller. Plain JS, no build step, no network required. */
(function () {
  const LESSONS = window.KALLIMNI_LESSONS;
  const LESSON_TARGET_SEC = 5 * 60;
  const QUIZ_LEN = 6;

  const $view = document.getElementById("view");
  const $back = document.getElementById("backBtn");
  const $title = document.getElementById("barTitle");
  const $timer = document.getElementById("timer");
  const $music = document.getElementById("musicBtn");
  const $toast = document.getElementById("toast");

  // ---------------- state ----------------
  const DEFAULT_STATE = () => ({
    v: 1,
    progress: {},            // lessonId -> { completed, best, runs }
    cards: {},               // phraseId -> { box: 0..3 }
    streak: { count: 0, last: null },
    settings: { rate: 0.85, r1Voice: false, voiceNoticeShown: false },
    music: null
  });
  let S = DEFAULT_STATE();
  const save = () => KStore.save(S);

  // ---------------- utils ----------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const lessonById = id => LESSONS.find(l => l.id === id);
  let toastTimer;
  function toast(msg, ms = 2600) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove("show"), ms);
  }

  // ---------------- screen plumbing ----------------
  let keys = {};            // current screen's hardware handlers
  let current = () => home(); // re-renders the screen under the music panel
  let backTo = null;
  function setBar({ title, back, timer }) {
    $title.innerHTML = title
      ? `<span class="bar-sub">${title}</span>`
      : `<span class="brand-ar">كلّمني</span><span class="brand-en">Kallimni</span>`;
    backTo = back || null;
    $back.hidden = !back;
    $timer.hidden = !timer;
  }
  function render(html, k = {}) {
    $view.innerHTML = `<div class="screen">${html}</div>`;
    keys = k;
    return $view.firstElementChild;
  }
  $back.addEventListener("click", () => backTo && backTo());
  ["up", "down", "side", "long"].forEach(n => KHardware.on(n, e => keys[n] && keys[n](e)));

  // ---------------- lesson timer ----------------
  let timerStart = 0, timerInt = null;
  function startTimer() {
    timerStart = Date.now();
    clearInterval(timerInt);
    const tick = () => {
      const s = Math.floor((Date.now() - timerStart) / 1000);
      $timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      $timer.classList.toggle("over", s >= LESSON_TARGET_SEC);
    };
    tick(); timerInt = setInterval(tick, 1000);
  }
  function stopTimer() { clearInterval(timerInt); return Math.floor((Date.now() - timerStart) / 1000); }

  // ---------------- pronunciation ----------------
  async function say(phrase, slow) {
    const src = await KSpeech.speak(phrase, { slow });
    if (src === "none") {
      const caps = KSpeech.capabilities();
      toast(caps.r1Bridge
        ? "No Arabic voice on this device. Read the transliteration, or try R1 voice in Settings."
        : "No Arabic voice available here. Read the transliteration for now.", 3400);
    } else if (src === "tts" && !S.settings.voiceNoticeShown) {
      const c = KSpeech.capabilities();
      if (!c.egyptianVoice) toast("Device voice is standard Arabic — Egyptian sounds may differ.", 3400);
      S.settings.voiceNoticeShown = true; save();
    } else if (src === "r1") {
      toast("Asked R1 to say it (online, experimental).", 2200);
    }
  }

  // ---------------- daily pick & stats ----------------
  function todaysLesson() {
    const next = LESSONS.find(l => !(S.progress[l.id] && S.progress[l.id].completed));
    if (next) return { lesson: next, review: false };
    // All done: review the weakest lesson.
    const weakest = LESSONS.slice().sort((a, b) => (S.progress[a.id].best || 0) - (S.progress[b.id].best || 0))[0];
    return { lesson: weakest, review: true };
  }
  function learnedCount() { return Object.values(S.cards).filter(c => c.box >= 1).length; }
  function totalPhrases() { return LESSONS.reduce((n, l) => n + l.phrases.length, 0); }
  function streakNow() { const s = S.streak; return (s.last === today() || s.last === yesterday()) ? s.count : 0; }

  // ======================================================
  //  HOME
  // ======================================================
  function navigation(active = "home") {
    return `<nav class="heritage-nav" aria-label="Main navigation">
      <button data-nav="home" class="${active === "home" ? "active" : ""}"><span>⌂</span>Home</button>
      <button data-nav="learn" class="${active === "learn" ? "active" : ""}"><span>▤</span>Learn</button>
      <button data-nav="practice" class="${active === "practice" ? "active" : ""}"><span>◇</span>Practice</button>
      <button data-nav="progress" class="${active === "progress" ? "active" : ""}"><span>◷</span>Progress</button>
    </nav>`;
  }
  function bindNavigation(el) {
    el.querySelectorAll("[data-nav]").forEach(btn => btn.onclick = () => {
      const page = btn.dataset.nav;
      if (page === "progress") return progressView();
      if (page === "practice") return practiceView();
      if (page === "learn") return lessonLibrary();
      home();
    });
  }
  function lessonLibrary() {
    current = lessonLibrary; KSpeech.stop(); stopTimer(); setBar({});
    const el = render(`<div class="heritage-scroll">
      <div class="eyebrow">YOUR JOURNEY</div><h1>Explore lessons</h1><p class="intro">Real Egyptian Arabic, one conversation at a time.</p>
      <div class="heritage-list">${LESSONS.map((l,i)=>`<button class="heritage-lesson" data-id="${l.id}"><span class="lesson-index">${String(i+1).padStart(2,"0")}</span><span class="lesson-copy"><b>${esc(l.title)}</b><small lang="ar">${esc(l.arTitle)}</small><small>${l.phrases.length} everyday phrases</small></span><span class="lesson-arrow">↗</span></button>`).join("")}</div>
    </div>${navigation("learn")}`);
    el.querySelectorAll("[data-id]").forEach(btn=>btn.onclick=()=>startLesson(btn.dataset.id));
    bindNavigation(el);
    keys={side:()=>startLesson(LESSONS[0].id),up:()=>{},down:()=>{}};
  }
  function practiceView() {
    current = practiceView; KSpeech.stop(); stopTimer(); setBar({});
    const el=render(`<div class="heritage-scroll">
      <div class="eyebrow">BUILD CONFIDENCE</div><h1>Practice makes fluent.</h1>
      <p class="intro">Flip cards, listen closely, and put your Egyptian Arabic to work.</p>
      <div class="practice-art" aria-hidden="true">إزيّك؟<small>izzayyak?</small></div>
      <button class="heritage-cta" id="practiceStart">Start practicing <span>↗</span></button>
      <p class="microcopy">Each session includes flashcards and a short quiz.</p>
    </div>${navigation("practice")}`);
    el.querySelector("#practiceStart").onclick=()=>startLesson(todaysLesson().lesson.id);
    bindNavigation(el); keys={side:()=>startLesson(todaysLesson().lesson.id)};
  }
  function progressView() {
    current=progressView; KSpeech.stop(); stopTimer(); setBar({});
    const completed=LESSONS.filter(l=>S.progress[l.id]?.completed).length;
    const pct=Math.round(100*completed/LESSONS.length);
    const el=render(`<div class="heritage-scroll">
      <div class="eyebrow">YOUR PROGRESS</div><h1>Every phrase counts.</h1><p class="intro">A little Egyptian Arabic every day adds up.</p>
      <div class="progress-hero"><div class="progress-ring" style="--pct:${pct}%"><div><strong>${pct}%</strong><small>complete</small></div></div><div><b>${completed} of ${LESSONS.length}</b><span>Lessons completed</span></div></div>
      <div class="heritage-metrics"><div><b>${streakNow()}</b><small>Day streak</small></div><div><b>${learnedCount()}</b><small>Phrases learned</small></div></div>
      <div class="eyebrow section-label">YOUR LESSONS</div>
      ${LESSONS.map(l=>`<div class="progress-lesson"><span>${esc(l.title)}</span><b>${S.progress[l.id]?.completed ? S.progress[l.id].best+"%" : "Not started"}</b></div>`).join("")}
    </div>${navigation("progress")}`);
    bindNavigation(el); keys={side:home};
  }
  function home() {
    current=home; KSpeech.stop(); stopTimer(); setBar({});
    const pick=todaysLesson(); const doneToday=S.streak.last===today();
    const el=render(`<div class="heritage-scroll">
      <div class="eyebrow">WELCOME TO KALLIMNI <span class="eyebrow-ar" lang="ar">أهلاً بيك</span></div>
      <h1>Speak like<br><em>you belong.</em></h1>
      <p class="intro">Egyptian Arabic for real conversations.</p>
      <div class="cairo-hero">
        <div class="cairo-sun"></div><div class="cairo-pyramid p1"></div><div class="cairo-pyramid p2"></div>
        <div class="cairo-skyline"></div><div class="cairo-river"></div>
        <div class="hero-content"><span class="hero-tag">YOUR DAILY JOURNEY</span><div lang="ar" class="hero-ar">يلا نتكلّم!</div><strong>${doneToday?"Keep the momentum":"Your next adventure"}</strong><small>${esc(pick.lesson.title)} · 5 minute lesson</small></div>
      </div>
      <button class="heritage-cta" id="todayStart">Continue learning <span>↗</span></button>
      <div class="heritage-metrics"><div><b>${streakNow()} <span>✦</span></b><small>Day streak</small></div><div><b>${learnedCount()}<span>/${totalPhrases()}</span></b><small>Phrases learned</small></div></div>
      <div class="section-heading"><div><span class="eyebrow">EXPLORE</span><h2>Your lessons</h2></div><button id="allLessons">See all ↗</button></div>
      <div class="heritage-list">${LESSONS.slice(0,3).map((l,i)=>`<button class="heritage-lesson" data-id="${l.id}"><span class="lesson-index">${String(i+1).padStart(2,"0")}</span><span class="lesson-copy"><b>${esc(l.title)}</b><small lang="ar">${esc(l.arTitle)}</small></span><span class="lesson-arrow">↗</span></button>`).join("")}</div>
      <button class="settings-link" id="setBtn">⚙ Settings & pronunciation</button>
    </div>${navigation("home")}`);
    el.querySelector("#todayStart").onclick=()=>startLesson(pick.lesson.id);
    el.querySelector("#allLessons").onclick=lessonLibrary;
    el.querySelector("#setBtn").onclick=settings;
    el.querySelectorAll("[data-id]").forEach(btn=>btn.onclick=()=>startLesson(btn.dataset.id));
    bindNavigation(el);
    const focusables=[...el.querySelectorAll("#todayStart,.heritage-lesson,#allLessons,#setBtn,[data-nav]")];let f=-1;
    const focus=i=>{f=(i+focusables.length)%focusables.length;focusables.forEach((x,j)=>x.classList.toggle("focus",i===j));focusables[f].scrollIntoView({block:"nearest"});};
    keys={up:()=>focus(f<=0?focusables.length-1:f-1),down:()=>focus(f+1),side:()=>focusables[f>=0?f:0].click(),long:()=>KMusic.toggle()};
  }

  // ======================================================
  //  LESSON FLOW: learn -> flashcards -> quiz -> done
  // ======================================================
  let L = null; // current lesson session
  function startLesson(id) {
    const lesson = lessonById(id);
    L = { lesson, i: 0, seen: new Set([0]) };
    startTimer();
    learn();
  }

  function learn() {
    current = learn;
    const { lesson } = L;
    const n = lesson.phrases.length;
    setBar({ title: `${lesson.icon} ${esc(lesson.title)} · Learn`, back: home, timer: true });
    const p = lesson.phrases[L.i];
    const dots = lesson.phrases.map((_, j) => `<i class="${j === L.i ? "on" : (L.seen.has(j) ? "seen" : "")}"></i>`).join("");
    const last = L.i === n - 1;
    const el = render(`
      <div class="journey-stage"><div class="eyebrow">SPEAK EGYPTIAN · LESSON ${LESSONS.indexOf(lesson)+1}</div><h1>Learn the language.<br><em>Live the culture.</em></h1><p class="intro">Listen, repeat, and make each phrase your own.</p>
      <div class="journey-panel"><div class="journey-overline">PHRASE ${L.i+1} OF ${n}</div>
      <div class="card" id="card">
        <span class="step">${L.i + 1}/${n}</span>
        <div class="ar" lang="ar">${esc(p.ar)}</div>
        <div class="tr">${esc(p.tr)}</div>
        <div class="en">${esc(p.en)}</div>
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
      </div>
      </div><div class="dots">${dots}</div>
      <div class="row journey-actions">
        <button class="btn narrow" id="prev" ${L.i === 0 ? "disabled" : ""} aria-label="Previous">‹</button>
        <button class="btn cyan" id="play">🔊 Play</button>
        <button class="btn narrow" id="slow" aria-label="Play slowly">🐢</button>
        <button class="btn ${last ? "primary" : "narrow"}" id="next" aria-label="Next">${last ? "Practice ›" : "›"}</button>
      </div>`);
    const go = d => {
      if (d > 0 && last) return flashStart();
      const j = L.i + d;
      if (j < 0 || j >= n) return;
      KSpeech.stop(); L.i = j; L.seen.add(j); learn();
    };
    el.querySelector("#prev").onclick = () => go(-1);
    el.querySelector("#next").onclick = () => go(1);
    el.querySelector("#play").onclick = () => say(p);
    el.querySelector("#slow").onclick = () => say(p, true);
    el.querySelector("#card").onclick = () => say(p);
    keys = { up: () => go(-1), down: () => go(1), side: () => say(p), long: () => say(p, true) };
  }

  // ---------------- flashcards ----------------
  function flashStart() {
    KSpeech.stop();
    L.queue = shuffle(L.lesson.phrases);
    L.requeued = new Set();
    L.flashDone = 0;
    flash();
  }
  function flash() {
    current = flash;
    const { lesson } = L;
    if (!L.queue.length) return quizStart();
    setBar({ title: `${lesson.icon} ${esc(lesson.title)} · Cards`, back: home, timer: true });
    const p = L.queue[0];
    const total = lesson.phrases.length + L.requeued.size;
    const el = render(`
      <div class="journey-stage"><div class="eyebrow">REMEMBER WHAT YOU LEARN</div><h1>Make it <em>stick.</em></h1><p class="intro">Tap the card to reveal its meaning.</p>
      <div class="progress"><i style="width:${Math.round(100 * L.flashDone / total)}%"></i></div>
      <div class="flip" id="flip">
        <div class="flip-inner">
          <div class="face front card">
            <div class="ar" lang="ar">${esc(p.ar)}</div>
            <div class="tr">${esc(p.tr)}</div>
            <div class="hint">Tap card to reveal meaning</div>
          </div>
          <div class="face back card">
            <div class="ar sm" lang="ar">${esc(p.ar)}</div>
            <div class="en">${esc(p.en)}</div>
            ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
          </div>
        </div>
      </div>
      <div class="row journey-actions" id="pre">
        <button class="btn cyan" id="play">🔊</button>
        <button class="btn primary" id="reveal" style="flex:2">Reveal</button>
      </div>
      <div class="row journey-actions" id="post" hidden>
        <button class="btn" id="again">↺ Again</button>
        <button class="btn narrow cyan" id="play2">🔊</button>
        <button class="btn primary" id="got">✓ Got it</button>
      </div></div>`);
    let flipped = false;
    const $flip = el.querySelector("#flip");
    const reveal = () => {
      if (flipped) return;
      flipped = true; $flip.classList.add("flipped");
      el.querySelector("#pre").hidden = true; el.querySelector("#post").hidden = false;
    };
    const grade = ok => {
      if (!flipped) return reveal();
      const c = S.cards[p.id] || { box: 0 };
      if (ok) { c.box = Math.min(3, c.box + 1); L.queue.shift(); L.flashDone++; }
      else {
        c.box = 0;
        L.queue.shift();
        if (!L.requeued.has(p.id)) { L.requeued.add(p.id); L.queue.push(p); } else L.flashDone++;
      }
      S.cards[p.id] = c; save();
      KSpeech.stop(); flash();
    };
    $flip.onclick = reveal;
    el.querySelector("#reveal").onclick = reveal;
    el.querySelector("#play").onclick = () => say(p);
    el.querySelector("#play2").onclick = () => say(p);
    el.querySelector("#again").onclick = () => grade(false);
    el.querySelector("#got").onclick = () => grade(true);
    keys = {
      side: () => flipped ? grade(true) : reveal(),
      up: () => flipped ? grade(false) : reveal(),
      down: () => flipped ? grade(true) : reveal(),
      long: () => say(p)
    };
  }

  // ---------------- quiz ----------------
  function quizStart() {
    const { lesson } = L;
    const pool = lesson.phrases;
    const others = LESSONS.filter(l => l !== lesson).flatMap(l => l.phrases);
    L.quiz = shuffle(pool).slice(0, Math.min(QUIZ_LEN, pool.length)).map((p, k) => {
      const dir = k % 2 === 0 ? "toEn" : "toAr";
      const distract = shuffle(pool.filter(x => x.id !== p.id)).concat(shuffle(others)).slice(0, 3);
      return { p, dir, options: shuffle([p, ...distract]) };
    });
    L.qi = 0; L.correct = 0;
    quiz();
  }
  function quiz() {
    current = quiz;
    const { lesson } = L;
    if (L.qi >= L.quiz.length) return finish();
    setBar({ title: `${lesson.icon} ${esc(lesson.title)} · Quiz`, back: home, timer: true });
    const Q = L.quiz[L.qi];
    const prompt = Q.dir === "toEn"
      ? `<div class="qlab">What does this mean?</div><div class="ar sm" lang="ar">${esc(Q.p.ar)}</div><div class="tr">${esc(Q.p.tr)}</div>`
      : `<div class="qlab">How do you say…</div><div class="en" style="font-size:14px">${esc(Q.p.en)}</div>`;
    const opts = Q.options.map((o, j) => Q.dir === "toEn"
      ? `<button class="opt" data-j="${j}"><span class="k">${j + 1}</span>${esc(o.en)}</button>`
      : `<button class="opt ar-opt" data-j="${j}" lang="ar">${esc(o.ar)}</button>`).join("");
    const el = render(`
      <div class="journey-stage"><div class="eyebrow">YOUR MOMENT TO SHINE</div><h1>Test your <em>Egyptian.</em></h1><p class="intro">Question ${L.qi+1} of ${L.quiz.length}</p>
      <div class="progress"><i style="width:${Math.round(100 * L.qi / L.quiz.length)}%"></i></div>
      <div class="q">${prompt}</div>
      <div class="options">${opts}</div></div>`);
    const $opts = [...el.querySelectorAll(".opt")];
    let sel = -1, answered = false;
    const select = j => { sel = (j + $opts.length) % $opts.length; $opts.forEach((b, k) => b.classList.toggle("sel", k === sel)); };
    const answer = j => {
      if (answered) { L.qi++; return quiz(); }
      answered = true;
      const ok = Q.options[j] === Q.p;
      if (ok) L.correct++;
      $opts.forEach((b, k) => {
        if (Q.options[k] === Q.p) b.classList.add("right");
        else if (k === j) b.classList.add("wrong");
      });
      toast(ok ? "✓ Ṣaḥ! (Correct)" : `✗ It's: ${Q.p.en} — ${Q.p.tr}`, ok ? 1100 : 2400);
      setTimeout(() => { if (answered && L.quiz && L.quiz[L.qi] === Q) { L.qi++; quiz(); } }, ok ? 1100 : 2400);
    };
    $opts.forEach((b, j) => b.onclick = () => answer(j));
    keys = {
      up: () => !answered && select(sel <= 0 ? $opts.length - 1 : sel - 1),
      down: () => !answered && select(sel + 1),
      side: () => answered ? answer(0) : (sel >= 0 ? answer(sel) : select(0)),
      long: () => say(Q.p)
    };
  }

  // ---------------- finish ----------------
  function finish() {
    const secs = stopTimer();
    const { lesson } = L;
    const pct = Math.round(100 * L.correct / L.quiz.length);
    const prev = S.progress[lesson.id] || { completed: false, best: 0, runs: 0 };
    S.progress[lesson.id] = { completed: true, best: Math.max(prev.best, pct), runs: prev.runs + 1 };
    const t = today();
    if (S.streak.last !== t) {
      S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1;
      S.streak.last = t;
    }
    KStore.flush(S);
    L.secs = secs; L.pct = pct;
    doneView();
  }
  function doneView() {
    current = doneView;
    const { lesson, pct, secs } = L;
    setBar({ title: `${lesson.icon} ${esc(lesson.title)}`, back: home });
    const msg = pct === 100 ? "ممتاز!" : pct >= 67 ? "برافو!" : "كمّل!";
    const tr = pct === 100 ? "mumtaaz! — excellent!" : pct >= 67 ? "bravo! — well done!" : "kammil! — keep going!";
    const el = render(`
      <div class="journey-stage"><div class="eyebrow">LESSON COMPLETE</div><h1>You showed <em>up.</em></h1><div class="screen done" style="position:static;padding:0;flex:1">
        <div class="ar" lang="ar">${msg}</div>
        <div class="tr">${tr}</div>
        <div class="score">${L.correct}/${L.quiz.length}</div>
        <div class="cap">Quiz score · ${Math.floor(secs / 60)}m ${secs % 60}s · 🔥 ${S.streak.count}-day streak</div>
        <div class="cap">Progress saved${KStore.backend === "memory" ? " for this session only" : ""}.</div>
      </div>
      <div class="row">
        <button class="btn" id="again">↺ Redo</button>
        <button class="btn primary" id="homeB">Home ›</button>
      </div></div>`);
    el.querySelector("#again").onclick = () => startLesson(lesson.id);
    el.querySelector("#homeB").onclick = home;
    keys = { side: home, down: home, up: () => startLesson(lesson.id) };
  }

  // ======================================================
  //  MUSIC PANEL
  // ======================================================
  function musicPanel() {
    if (keys._music) return; // already open
    const showTimer = !$timer.hidden;
    const back = () => current();
    const draw = () => {
      const st = KMusic.state;
      setBar({ title: "♪ Calm Music", back, timer: showTimer });
      const trackHtml = st.hasTracks
        ? `<div class="track"><b>${esc(st.track.title)}</b><span>${esc(st.track.artist)}${st.track.artist ? " · " : ""}${esc(st.track.license)}</span><span>${st.index + 1} of ${st.count}${st.ducked ? " · lowered for Arabic" : ""}</span></div>`
        : `<div class="empty">Calming instrumental ambience is ready.</div>`;
      const el = render(`
        <div class="panel" style="display:flex;flex-direction:column;gap:6px;flex:1">
          <div class="toggle-row"><span class="lbl">Background music<small>Gentle instrumental ambience while you study</small></span>
            <button class="sw ${st.enabled ? "on" : ""}" id="en" aria-label="Music on/off"></button></div>
          ${trackHtml}
          <div class="row">
            <button class="btn narrow" id="pv" ${st.count > 1 ? "" : "disabled"}>⏮</button>
            <button class="btn cyan" id="pp" ${st.hasTracks ? "" : "disabled"}>${st.playing ? "❚❚ Pause" : "▶ Play"}</button>
            <button class="btn narrow" id="nx" ${st.count > 1 ? "" : "disabled"}>⏭</button>
          </div>
          <div class="vol"><button class="btn narrow" id="vd" style="height:26px">−</button>
            <div class="bar"><i style="width:${Math.round(st.volume * 100)}%"></i></div>
            <button class="btn narrow" id="vu" style="height:26px">+</button><span class="pct">${Math.round(st.volume * 100)}%</span></div>
          <div class="sub">While Arabic plays:</div>
          <div class="seg"><button id="dl" class="${st.duckMode === "lower" ? "on" : ""}">Lower music</button><button id="dp" class="${st.duckMode === "pause" ? "on" : ""}">Pause music</button></div>
          ${st.error ? `<div class="cap" style="color:var(--orange-soft)">${esc(st.error)}</div>` : ""}
        </div>`);
      el.querySelector("#en").onclick = () => KMusic.setEnabled(!st.enabled);
      el.querySelector("#pp").onclick = () => st.playing ? KMusic.pause() : (st.enabled ? KMusic.play() : KMusic.setEnabled(true));
      el.querySelector("#pv").onclick = () => KMusic.prev();
      el.querySelector("#nx").onclick = () => KMusic.next();
      el.querySelector("#vd").onclick = () => KMusic.setVolume(st.volume - 0.05);
      el.querySelector("#vu").onclick = () => KMusic.setVolume(st.volume + 0.05);
      el.querySelector("#dl").onclick = () => KMusic.setDuckMode("lower");
      el.querySelector("#dp").onclick = () => KMusic.setDuckMode("pause");
      keys = {
        _music: true,
        up: () => KMusic.setVolume(KMusic.state.volume + 0.05),
        down: () => KMusic.setVolume(KMusic.state.volume - 0.05),
        side: () => el.querySelector("#pp").click(),
        long: () => KMusic.next()
      };
    };
    panelRedraw = draw;
    draw();
  }
  let panelRedraw = null;

  function updateMusicIcon(st) {
    $music.classList.toggle("on", st.playing || (st.enabled && st.ducked));
    $music.classList.toggle("ducked", st.ducked);
    $music.setAttribute("aria-label", st.playing ? "Music playing — open controls" : "Music controls");
    if (keys._music && panelRedraw) panelRedraw();
  }
  $music.addEventListener("click", () => keys._music ? current() : musicPanel());

  // ======================================================
  //  SETTINGS
  // ======================================================
  function settings() {
    current = settings;
    setBar({ title: "⚙ Settings", back: home });
    const c = KSpeech.capabilities();
    const voiceLine = c.tts
      ? `Device voice: <b>${esc(c.voiceName)}</b>${c.egyptianVoice ? "" : " (standard Arabic accent)"}`
      : `Device voice: <b>none for Arabic</b>`;
    const el = render(`
      <div class="scroll panel" style="display:flex;flex-direction:column;gap:7px;flex:1">
        <div class="toggle-row"><span class="lbl">Slower voice<small>Speak phrases at a learner pace</small></span>
          <button class="sw ${S.settings.rate < 0.8 ? "on" : ""}" id="slow"></button></div>
        <div class="toggle-row"><span class="lbl">R1 voice (experimental)<small>Online · asks rabbitOS to read the phrase when no device voice exists. Accuracy not guaranteed.</small></span>
          <button class="sw ${S.settings.r1Voice ? "on" : ""}" id="r1v" ${c.r1Bridge ? "" : "disabled"}></button></div>
        <div class="cap">${voiceLine}<br>Storage: <b>${{ r1: "R1 creation storage", local: "browser storage", memory: "this session only" }[KStore.backend]}</b></div>
        <div class="cap">Kallimni plays example audio only. It does not listen to you or score your pronunciation.</div>
        <div class="cap">Wheel ↕ browse · Side button = main action · Hold side = play Arabic (home: music on/off)</div>
        <button class="btn" id="reset" style="flex:none">Reset progress</button>
      </div>`);
    el.querySelector("#slow").onclick = () => { S.settings.rate = S.settings.rate < 0.8 ? 0.85 : 0.65; KSpeech.configure({ rate: S.settings.rate }); save(); settings(); };
    el.querySelector("#r1v").onclick = () => { if (!c.r1Bridge) return; S.settings.r1Voice = !S.settings.r1Voice; KSpeech.configure({ r1Voice: S.settings.r1Voice }); save(); settings(); };
    let armed = false;
    el.querySelector("#reset").onclick = async e => {
      if (!armed) { armed = true; e.target.textContent = "Tap again to erase all progress"; e.target.classList.add("primary"); return; }
      const music = S.music;
      await KStore.clear();
      S = DEFAULT_STATE(); S.music = music; save();
      toast("Progress reset."); home();
    };
    const sc = el.querySelector(".scroll");
    keys = { up: () => sc.scrollBy(0, -40), down: () => sc.scrollBy(0, 40), side: home };
  }

  // ======================================================
  //  BOOT
  // ======================================================
  window.onPluginMessage = function () { KSpeech.notifyPluginMessage(); };

  KSpeech.onStart(() => KMusic.duck());
  KSpeech.onEnd(() => KMusic.unduck());
  KMusic.onChange(updateMusicIcon);

  KStore.load().then(saved => {
    if (saved && saved.v === 1) S = Object.assign(DEFAULT_STATE(), saved, { settings: Object.assign(DEFAULT_STATE().settings, saved.settings || {}) });
    KSpeech.configure({ rate: S.settings.rate, r1Voice: S.settings.r1Voice });
    // Music never autoplays on launch; the saved on/off preference is restored
    // and music resumes on the first tap anywhere (WebView autoplay rules).
    KMusic.init(S.music, prefs => { S.music = prefs; save(); });
    if (S.music && S.music.enabled && KMusic.state.hasTracks) {
      const resume = () => { document.removeEventListener("pointerdown", resume, true); if (KMusic.state.enabled && !KMusic.state.playing) KMusic.play(); };
      document.addEventListener("pointerdown", resume, true);
    }
    home();
  });

  window.addEventListener("pagehide", () => KStore.flush(S));
  document.addEventListener("visibilitychange", () => { if (document.hidden) KStore.flush(S); });

  // test hook
  window.__kallimni = { get state() { return S; } };
})();
