// Searches /search.json, which the build regenerates on every publish.
// Results are built with textContent, so story text is never treated as HTML.
const indexUrl = document.currentScript?.dataset.index || '/search.json';
(async () => {
  const input = document.getElementById('q');
  const list = document.getElementById('results');
  const status = document.getElementById('status');
  let index;
  try {
    index = await (await fetch(indexUrl)).json();
  } catch {
    status.textContent = 'Search couldn’t load. Refresh the page to try again.';
    return;
  }
  input.value = new URLSearchParams(location.search).get('q') || '';

  const run = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    list.replaceChildren();
    if (!words.length) {
      status.textContent = '';
      return;
    }
    const hits = index.filter((e) => {
      const text = `${e.t} ${e.d} ${e.c} ${e.g.join(' ')}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
    status.textContent = hits.length
      ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'}`
      : 'No stories match. Try fewer or different words.';
    for (const e of hits.slice(0, 50)) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = e.c;
      const a = document.createElement('a');
      a.href = e.u;
      a.textContent = e.t;
      const p = document.createElement('p');
      p.textContent = e.d;
      li.append(label, a, p);
      list.append(li);
    }
  };

  input.addEventListener('input', () => {
    history.replaceState(null, '', input.value ? `?q=${encodeURIComponent(input.value)}` : location.pathname);
    run();
  });
  run();
})();
