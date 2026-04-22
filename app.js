/* ═══════════════════════════════════════════
   WORDLY – app.js
   Single Page Application – Dictionary SPA
   API: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
   ═══════════════════════════════════════════ */

// ── DOM references ──────────────────────────────────────
const wordInput      = document.getElementById('wordInput');
const searchBtn      = document.getElementById('searchBtn');
const errorMsg       = document.getElementById('errorMsg');
const resultSection  = document.getElementById('resultSection');
const loader         = document.getElementById('loader');
const wordTitle      = document.getElementById('wordTitle');
const phonetic       = document.getElementById('phonetic');
const audioBtn       = document.getElementById('audioBtn');
const meaningsContainer = document.getElementById('meaningsContainer');
const sourceRow      = document.getElementById('sourceRow');
const sourceLink     = document.getElementById('sourceLink');
const favoriteBtn    = document.getElementById('favoriteBtn');
const favSection     = document.getElementById('favSection');
const favList        = document.getElementById('favList');

// ── State ────────────────────────────────────────────────
let currentWord  = '';
let currentAudio = null;
let favorites    = JSON.parse(localStorage.getItem('wordly_favorites') || '[]');

// ── Helpers ──────────────────────────────────────────────
const show  = el => el.classList.remove('hidden');
const hide  = el => el.classList.add('hidden');

function setError(msg) {
  errorMsg.textContent = msg;
}

function clearError() {
  errorMsg.textContent = '';
}

// ── Search handler ───────────────────────────────────────
async function searchWord() {
  const query = wordInput.value.trim().toLowerCase();
  if (!query) {
    setError('Please enter a word to search.');
    return;
  }

  clearError();
  hide(resultSection);
  show(loader);
  currentAudio = null;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        setError(`"${query}" was not found. Try a different spelling.`);
      } else {
        setError('Something went wrong. Please try again.');
      }
      hide(loader);
      return;
    }

    const data = await res.json();
    renderResult(data[0]);
    currentWord = query;
    updateFavoriteButton();

  } catch (err) {
    setError('Network error. Please check your connection.');
  } finally {
    hide(loader);
  }
}

// ── Render result ────────────────────────────────────────
function renderResult(entry) {
  // Word title
  wordTitle.textContent = entry.word;

  // Phonetic
  const phoneticText = entry.phonetic
    || (entry.phonetics && entry.phonetics.find(p => p.text)?.text)
    || '';
  phonetic.textContent = phoneticText;

  // Audio
  const audioUrl = entry.phonetics?.find(p => p.audio && p.audio !== '')?.audio || '';
  if (audioUrl) {
    currentAudio = new Audio(audioUrl);
    show(audioBtn);
  } else {
    hide(audioBtn);
    currentAudio = null;
  }

  // Meanings
  meaningsContainer.innerHTML = '';
  entry.meanings.forEach(meaning => {
    meaningsContainer.appendChild(buildMeaningBlock(meaning));
  });

  // Source
  if (entry.sourceUrls && entry.sourceUrls.length > 0) {
    sourceLink.href = entry.sourceUrls[0];
    sourceLink.textContent = entry.sourceUrls[0];
    show(sourceRow);
  } else {
    hide(sourceRow);
  }

  // Show result
  show(resultSection);
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Build a meaning block ────────────────────────────────
function buildMeaningBlock(meaning) {
  const block = document.createElement('div');
  block.className = 'meaning-block';

  // Part of speech badge
  const pos = document.createElement('span');
  pos.className = 'part-of-speech';
  pos.textContent = meaning.partOfSpeech;
  block.appendChild(pos);

  // Definitions list
  const ul = document.createElement('ul');
  ul.className = 'definitions-list';

  const defs = meaning.definitions.slice(0, 5); // max 5 defs per POS
  defs.forEach((def, i) => {
    const li = document.createElement('li');
    li.className = 'definition-item';

    const num = document.createElement('span');
    num.className = 'def-number';
    num.textContent = `${i + 1}.`;

    const content = document.createElement('div');
    content.className = 'def-content';

    const defText = document.createElement('span');
    defText.className = 'def-text';
    defText.textContent = def.definition;
    content.appendChild(defText);

    if (def.example) {
      const ex = document.createElement('em');
      ex.className = 'def-example';
      ex.textContent = `"${def.example}"`;
      content.appendChild(ex);
    }

    li.appendChild(num);
    li.appendChild(content);
    ul.appendChild(li);
  });

  block.appendChild(ul);

  // Synonyms & Antonyms
  const syns = meaning.synonyms?.slice(0, 6) || [];
  const ants = meaning.antonyms?.slice(0, 6) || [];

  if (syns.length > 0 || ants.length > 0) {
    const row = document.createElement('div');
    row.className = 'syn-ant-row';

    if (syns.length > 0) {
      const group = document.createElement('div');
      group.className = 'syn-group';
      const label = document.createElement('span');
      label.className = 'syn-label';
      label.textContent = 'Synonyms:';
      group.appendChild(label);
      syns.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-syn';
        chip.textContent = s;
        chip.title = `Search "${s}"`;
        chip.addEventListener('click', () => {
          wordInput.value = s;
          searchWord();
        });
        group.appendChild(chip);
      });
      row.appendChild(group);
    }

    if (ants.length > 0) {
      const group = document.createElement('div');
      group.className = 'ant-group';
      const label = document.createElement('span');
      label.className = 'ant-label';
      label.textContent = 'Antonyms:';
      group.appendChild(label);
      ants.forEach(a => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-ant';
        chip.textContent = a;
        chip.title = `Search "${a}"`;
        chip.addEventListener('click', () => {
          wordInput.value = a;
          searchWord();
        });
        group.appendChild(chip);
      });
      row.appendChild(group);
    }

    block.appendChild(row);
  }

  return block;
}

// ── Audio playback ───────────────────────────────────────
audioBtn.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.currentTime = 0;
    currentAudio.play().catch(() => setError('Audio playback failed.'));
  }
});

// ── Favorites logic ──────────────────────────────────────
function saveFavorites() {
  localStorage.setItem('wordly_favorites', JSON.stringify(favorites));
}

function updateFavoriteButton() {
  if (favorites.includes(currentWord)) {
    favoriteBtn.classList.add('active');
    favoriteBtn.title = 'Remove from favorites';
  } else {
    favoriteBtn.classList.remove('active');
    favoriteBtn.title = 'Save to favorites';
  }
}

favoriteBtn.addEventListener('click', () => {
  if (!currentWord) return;
  if (favorites.includes(currentWord)) {
    favorites = favorites.filter(w => w !== currentWord);
  } else {
    favorites.unshift(currentWord);
  }
  saveFavorites();
  updateFavoriteButton();
  renderFavorites();
});

function renderFavorites() {
  favList.innerHTML = '';
  if (favorites.length === 0) {
    hide(favSection);
    return;
  }
  show(favSection);
  favorites.forEach(word => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    li.title = `Look up "${word}"`;

    const label = document.createTextNode(word);
    li.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'fav-remove';
    removeBtn.textContent = '×';
    removeBtn.title = `Remove "${word}"`;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      favorites = favorites.filter(w => w !== word);
      saveFavorites();
      if (currentWord === word) updateFavoriteButton();
      renderFavorites();
    });

    li.appendChild(removeBtn);

    li.addEventListener('click', () => {
      wordInput.value = word;
      searchWord();
    });

    favList.appendChild(li);
  });
}

// ── Event listeners ──────────────────────────────────────
searchBtn.addEventListener('click', searchWord);

wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchWord();
});

// Clear error on input
wordInput.addEventListener('input', clearError);

// ── Init ─────────────────────────────────────────────────
renderFavorites();
