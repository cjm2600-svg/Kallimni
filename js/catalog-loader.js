/* Load reviewed lesson packs from same-origin catalog; fall back to built-in lessons offline. */
(async function () {
  const builtIn = window.KALLIMNI_LESSONS;
  try {
    const response = await fetch('lessons/catalog.json', {cache: 'no-store'});
    if (!response.ok) throw Error('Catalog HTTP '+response.status);
    const data = await response.json();
    if (!Number.isInteger(data.version) || !Array.isArray(data.lessons)) throw Error('Invalid catalog');
    const ids = new Set(builtIn.map(x=>x.id));
    const phraseIds = new Set(builtIn.flatMap(x=>x.phrases.map(p=>p.id)));
    for (const lesson of data.lessons) {
      if (!lesson || typeof lesson.id !== 'string' || ids.has(lesson.id) ||
          !['title','arTitle','icon','blurb'].every(k=>typeof lesson[k]==='string' && lesson[k]) ||
          !Array.isArray(lesson.phrases) || lesson.phrases.length < 6) throw Error('Invalid lesson');
      ids.add(lesson.id);
      for (const p of lesson.phrases) {
        if (!p || typeof p.id !== 'string' || phraseIds.has(p.id) ||
            !['ar','tr','en'].every(k=>typeof p[k]==='string' && p[k])) throw Error('Invalid phrase');
        phraseIds.add(p.id);
      }
    }
    window.KALLIMNI_LESSONS = builtIn.concat(data.lessons);
  } catch (err) {
    console.warn('Using built-in lessons:', err.message);
  } finally {
    const app = document.createElement('script');
    app.src = 'js/app.js';
    document.body.appendChild(app);
  }
})();
