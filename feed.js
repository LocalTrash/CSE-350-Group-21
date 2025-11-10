// --- Config / Mock API ---
const PAGE_SIZE = 6;

// Simulated server data (replace with real API)
const MOCK = Array.from({length: 42}).map((_, i) => ({
  id: i+1,
  user: ["emily","jacob","sarah","luis","andy","logan","jprice"][i % 7],
  when: `${(i%5)+1}h`,
  img: `https://picsum.photos/seed/tp${i}/900/600`,
  cap: [
    "Study break at Ekstrom 📚",
    "Cards game tonight! 🏀",
    "Sunset over campus 🌇",
    "Lab group grinding 💻",
    "Lunch spot at SAC 🍔",
    "CS project shipping soon 🚀",
    "Clouds look crazy today ☁️"
  ][i % 7],
  mine: i % 9 === 0,              // pretend some are mine
  following: i % 2 === 0          // pretend every other user is followed
}));

// --- State ---
let page = 0;
let loading = false;
let scope = "all";
let q = "";

// --- Elements ---
const grid = document.querySelector('#feedGrid');
const pager = document.querySelector('#pager');
const search = document.querySelector('#q');
const scopeChips = document.querySelectorAll('#scope .chip');

// --- Helpers ---
const card = (p) => {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <div class="head">
      <div class="avatar"></div>
      <div class="uname">@${p.user}</div>
      <div class="time">${p.when}</div>
    </div>
    <div class="imgbox"><img alt="post image" loading="lazy" src="${p.img}"></div>
    <div class="cap">${escapeHtml(p.cap)}</div>
    <div class="acts">❤️ ${Math.floor((p.id*7)%37)} &nbsp;&nbsp; 💬 ${Math.floor((p.id*5)%9)}</div>
  `;
  return el;
};

const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Filter + paginate “server-side”
const fetchPage = async () => {
  loading = true;
  pager.textContent = "Loading…";

  // simulate API latency
  await new Promise(r => setTimeout(r, 350));

  let data = MOCK;
  if (scope === "following") data = data.filter(d => d.following);
  if (scope === "mine") data = data.filter(d => d.mine);
  if (q.trim()) {
    const qq = q.toLowerCase();
    data = data.filter(d => d.user.includes(qq) || d.cap.toLowerCase().includes(qq));
  }

  const start = page * PAGE_SIZE;
  const slice = data.slice(start, start + PAGE_SIZE);
  const done = start + PAGE_SIZE >= data.length;

  slice.forEach(p => grid.appendChild(card(p)));
  pager.textContent = done ? "End of feed" : "Scroll for more ↓";
  loading = false;
  if (!done) page += 1;
  return !done;
};

// --- Events ---
search.addEventListener('input', () => {
  q = search.value;
  resetAndLoad();
});

scopeChips.forEach(ch => ch.addEventListener('click', () => {
  scopeChips.forEach(c => c.classList.remove('active'));
  ch.classList.add('active');
  scope = ch.dataset.scope;
  resetAndLoad();
}));

const resetAndLoad = () => {
  grid.innerHTML = "";
  page = 0;
  fetchPage();
};

// Infinite scroll
window.addEventListener('scroll', () => {
  if (loading) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (nearBottom) fetchPage();
});

// Initial load
resetAndLoad();