const STORAGE_KEY = "living-dex-pwa-v1";
const NATIONAL_DEX_TOTAL = 1025;

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const uniqueSorted = (ids) => [...new Set(ids)].sort((a, b) => a - b);

const GAME_CONFIGS = [
  { key: "red-blue", name: "Red/Blue", fallbackIds: range(1,151), note: "Kanto Pokédex" },
  { key: "yellow", name: "Yellow", fallbackIds: range(1,151), note: "Kanto Pokédex" },
  { key: "gold-silver-crystal", name: "Gold/Silver/Crystal", fallbackIds: range(1,251), note: "Johto-era National Dex" },
  { key: "ruby-sapphire-emerald", name: "Ruby/Sapphire/Emerald", fallbackIds: range(1,386), note: "Gen 3 National Dex" },
  { key: "firered-leafgreen", name: "FireRed/LeafGreen", fallbackIds: range(1,386), note: "Gen 3 National Dex" },
  { key: "diamond-pearl-platinum", name: "Diamond/Pearl/Platinum", fallbackIds: range(1,493), note: "Gen 4 National Dex" },
  { key: "heartgold-soulsilver", name: "HeartGold/SoulSilver", fallbackIds: range(1,493), note: "Gen 4 National Dex" },
  { key: "black-white", name: "Black/White", fallbackIds: range(1,649), note: "Gen 5 National Dex" },
  { key: "black2-white2", name: "Black 2/White 2", fallbackIds: range(1,649), note: "Gen 5 National Dex" },
  { key: "x-y", name: "X/Y", fallbackIds: range(1,721), note: "Gen 6 National Dex" },
  { key: "omega-ruby-alpha-sapphire", name: "Omega Ruby/Alpha Sapphire", fallbackIds: range(1,721), note: "Gen 6 National Dex" },
  { key: "sun-moon", name: "Sun/Moon", fallbackIds: range(1,809), note: "Gen 7 National Dex" },
  { key: "ultra-sun-ultra-moon", name: "Ultra Sun/Ultra Moon", fallbackIds: range(1,809), note: "Gen 7 National Dex" },
  { key: "lets-go", name: "Let’s Go Pikachu/Eevee", fallbackIds: uniqueSorted([...range(1,151), 808, 809]), note: "Exact built-in pool: Kanto plus Meltan line" },
  { key: "sword-shield", name: "Sword/Shield", fallbackIds: range(1,898), regionalDexes: ["galar","isle-of-armor","crown-tundra"], note: "Loads exact Galar + DLC species online" },
  { key: "bdsp", name: "Brilliant Diamond/Shining Pearl", fallbackIds: range(1,493), note: "National Dex through Gen 4" },
  { key: "legends-arceus", name: "Legends: Arceus", fallbackIds: uniqueSorted([...range(1,493), 899,900,901,902,903,904,905]), regionalDexes: ["hisui"], note: "Loads exact Hisui Pokédex online" },
  { key: "scarlet-violet", name: "Scarlet/Violet", fallbackIds: range(1,1025), regionalDexes: ["paldea","kitakami","blueberry"], note: "Loads exact Paldea + DLC species online" }
];

const state = {
  theme: "dark",
  activeGame: GAME_CONFIGS[0].key,
  search: "",
  status: "all",
  caughtOnly: false,
  showUnavailable: false,
  pokemon: [],
  collections: {},
  gamePools: Object.fromEntries(GAME_CONFIGS.map(g => [g.key, g.fallbackIds])),
  poolStatus: { mode: "fallback", loadedGames: [] }
};

const els = {
  themeToggle: document.getElementById("themeToggle"),
  overallCount: document.getElementById("overallCount"),
  gameLabel: document.getElementById("gameLabel"),
  gameCount: document.getElementById("gameCount"),
  completionBadge: document.getElementById("completionBadge"),
  poolBadge: document.getElementById("poolBadge"),
  progressBar: document.getElementById("progressBar"),
  gameSelect: document.getElementById("gameSelect"),
  searchInput: document.getElementById("searchInput"),
  statusSelect: document.getElementById("statusSelect"),
  caughtOnly: document.getElementById("caughtOnly"),
  showUnavailable: document.getElementById("showUnavailable"),
  dexStatus: document.getElementById("dexStatus"),
  pokemonList: document.getElementById("pokemonList"),
  gamesOverview: document.getElementById("gamesOverview"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  resetBtn: document.getElementById("resetBtn"),
  installBtn: document.getElementById("installBtn"),
  tabs: [...document.querySelectorAll(".tab-btn")],
  panels: {
    tracker: document.getElementById("trackerTab"),
    games: document.getElementById("gamesTab")
  }
};

function defaultCollections() {
  const out = {};
  GAME_CONFIGS.forEach(g => out[g.key] = {});
  return out;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    theme: state.theme,
    activeGame: state.activeGame,
    collections: state.collections
  }));
}

function restoreState() {
  state.collections = defaultCollections();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.theme = parsed.theme || "dark";
    state.activeGame = parsed.activeGame || GAME_CONFIGS[0].key;
    state.collections = { ...defaultCollections(), ...(parsed.collections || {}) };
  } catch (e) {
    console.error("Could not restore state", e);
  }
}

function applyTheme() {
  document.body.classList.toggle("light", state.theme === "light");
  els.themeToggle.textContent = state.theme === "dark" ? "☼" : "☾";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", state.theme === "dark" ? "#09090b" : "#f4f4f5");
}

function titleCasePokemonName(name) {
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\bNidoran F\b/i, "Nidoran♀")
    .replace(/\bNidoran M\b/i, "Nidoran♂");
}

async function loadNationalDex() {
  els.dexStatus.textContent = "Loading National Dex…";
  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
    if (!response.ok) throw new Error("Dex request failed");
    const data = await response.json();
    state.pokemon = data.results.map(entry => {
      const match = entry.url.match(/\/pokemon\/(\d+)\/?$/);
      const id = match ? Number(match[1]) : null;
      if (!id || id > NATIONAL_DEX_TOTAL) return null;
      return {
        id,
        name: titleCasePokemonName(entry.name),
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
      };
    }).filter(Boolean).sort((a,b) => a.id - b.id);
    els.dexStatus.textContent = "";
  } catch (e) {
    console.error(e);
    els.dexStatus.textContent = "Could not load the National Dex right now.";
  }
}

async function fetchRegionalDexIds(dexName) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokedex/${dexName}`);
  if (!response.ok) throw new Error(`Failed regional dex ${dexName}`);
  const data = await response.json();
  return uniqueSorted(data.pokemon_entries.map(entry => {
    const url = entry.pokemon_species?.url || "";
    const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
  }).filter(Boolean));
}

async function loadExactPools() {
  const games = GAME_CONFIGS.filter(g => g.regionalDexes?.length);
  try {
    const loaded = await Promise.all(games.map(async game => {
      const lists = await Promise.all(game.regionalDexes.map(fetchRegionalDexIds));
      return [game.key, uniqueSorted(lists.flat())];
    }));
    loaded.forEach(([key, ids]) => state.gamePools[key] = ids);
    state.poolStatus = { mode: "exact", loadedGames: loaded.map(([key]) => key) };
  } catch (e) {
    console.warn("Using fallback pools", e);
    state.poolStatus = { mode: "fallback", loadedGames: [] };
  }
}

function currentGame() {
  return GAME_CONFIGS.find(g => g.key === state.activeGame) || GAME_CONFIGS[0];
}

function currentPool() {
  return state.gamePools[state.activeGame] || currentGame().fallbackIds;
}

function currentData() {
  return state.collections[state.activeGame] || {};
}

function overallCaughtCount() {
  const seen = new Set();
  GAME_CONFIGS.forEach(game => {
    Object.entries(state.collections[game.key] || {}).forEach(([id, val]) => {
      if (val.caught) seen.add(Number(id));
    });
  });
  return seen.size;
}

function gameStats(gameKey) {
  const game = GAME_CONFIGS.find(g => g.key === gameKey);
  const ids = state.gamePools[gameKey] || game.fallbackIds;
  const data = state.collections[gameKey] || {};
  const set = new Set(ids);
  return {
    total: ids.length,
    caught: ids.filter(id => data[id]?.caught).length,
    shiny: ids.filter(id => data[id]?.shiny).length,
    marked: ids.filter(id => data[id]?.marked).length,
    percent: ids.length ? Math.round((ids.filter(id => data[id]?.caught).length / ids.length) * 100) : 0,
    unavailableMarked: Object.keys(data).filter(id => data[id]?.caught && !set.has(Number(id))).length,
    exact: state.poolStatus.loadedGames.includes(gameKey)
  };
}

function updateEntry(id, patch) {
  const data = state.collections[state.activeGame] || {};
  data[id] = {
    caught: false,
    shiny: false,
    marked: false,
    notes: "",
    ...(data[id] || {}),
    ...patch
  };
  state.collections[state.activeGame] = data;
  saveState();
  render();
}

function visiblePokemon() {
  const data = currentData();
  const available = new Set(currentPool());
  return state.pokemon.filter(mon => {
    const entry = data[mon.id] || { caught: false, shiny: false, marked: false, notes: "" };
    const inGame = available.has(mon.id);
    const matchesSearch = mon.name.toLowerCase().includes(state.search.toLowerCase()) || String(mon.id).includes(state.search.trim());
    const matchesStatus =
      state.status === "all" ||
      (state.status === "caught" && entry.caught) ||
      (state.status === "missing" && inGame && !entry.caught) ||
      (state.status === "shiny" && entry.shiny) ||
      (state.status === "marked" && entry.marked) ||
      (state.status === "unavailable" && !inGame);
    return matchesSearch &&
      matchesStatus &&
      (!state.caughtOnly || entry.caught) &&
      (state.showUnavailable || inGame);
  });
}

function renderHeader() {
  const game = currentGame();
  const stats = gameStats(game.key);
  els.overallCount.textContent = `${overallCaughtCount()}/${NATIONAL_DEX_TOTAL}`;
  els.gameLabel.textContent = game.name;
  els.gameCount.textContent = `${stats.caught}/${stats.total}`;
  els.completionBadge.textContent = `${stats.percent}% complete`;
  els.poolBadge.textContent = `${stats.total} in pool`;
  els.progressBar.style.width = `${stats.percent}%`;
}

function renderGameSelect() {
  els.gameSelect.innerHTML = GAME_CONFIGS.map(game =>
    `<option value="${game.key}" ${game.key === state.activeGame ? "selected" : ""}>${game.name}</option>`
  ).join("");
}

function renderList() {
  if (!state.pokemon.length) return;
  const data = currentData();
  const availableSet = new Set(currentPool());
  const list = visiblePokemon();
  els.dexStatus.textContent = list.length ? "" : "No Pokémon match your filters.";
  els.pokemonList.innerHTML = list.map(mon => {
    const entry = data[mon.id] || { caught: false, shiny: false, marked: false, notes: "" };
    const inGame = availableSet.has(mon.id);
    return `
      <article class="mon-card">
        <div class="mon-head">
          <div class="mon-main">
            <img src="${mon.sprite}" alt="" loading="lazy" />
            <div style="min-width:0">
              <div class="mon-name">#${String(mon.id).padStart(4, "0")} ${mon.name}</div>
              <div class="chips">
                <span class="chip ${entry.caught ? "caught" : ""}">${entry.caught ? "Caught" : (inGame ? "Missing" : "Unavailable")}</span>
                ${entry.shiny ? '<span class="chip">Shiny</span>' : ""}
                ${entry.marked ? '<span class="chip">Marked</span>' : ""}
              </div>
            </div>
          </div>
          <button class="catch-btn ${entry.caught ? "active" : ""}" data-action="toggle-caught" data-id="${mon.id}">
            ${entry.caught ? "Caught" : "Mark Caught"}
          </button>
        </div>
        <div class="mon-actions">
          <button class="small-btn ${entry.shiny ? "active" : ""}" data-action="toggle-shiny" data-id="${mon.id}">
            ${entry.shiny ? "Remove Shiny" : "Mark Shiny"}
          </button>
          <button class="small-btn ${entry.marked ? "active" : ""}" data-action="toggle-marked" data-id="${mon.id}">
            ${entry.marked ? "Remove Mark" : "Mark Entry"}
          </button>
        </div>
        <textarea class="notes" rows="2" data-action="notes" data-id="${mon.id}" placeholder="Notes: form, game, trade, HOME, hunt target, etc.">${entry.notes || ""}</textarea>
      </article>
    `;
  }).join("");
}

function renderGames() {
  els.gamesOverview.innerHTML = GAME_CONFIGS.map(game => {
    const stats = gameStats(game.key);
    return `
      <div class="game-row">
        <div class="game-row-head">
          <div class="row-title">${game.name}</div>
          <span class="badge">${stats.percent}%</span>
        </div>
        <div class="progress-track" style="margin-top:10px"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
        <div class="row-sub">
          <span>${stats.caught}/${stats.total} caught</span>
          <span>${stats.shiny} shiny</span>
          <span>${stats.marked} marked</span>
          <span>${stats.exact ? "exact pool" : "built-in pool"}</span>
          ${stats.unavailableMarked ? `<span>${stats.unavailableMarked} outside pool</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function render() {
  applyTheme();
  renderGameSelect();
  renderHeader();
  renderList();
  renderGames();
}

function wireEvents() {
  els.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    render();
  });

  els.gameSelect.addEventListener("change", e => {
    state.activeGame = e.target.value;
    saveState();
    render();
  });

  els.searchInput.addEventListener("input", e => {
    state.search = e.target.value;
    render();
  });

  els.statusSelect.addEventListener("change", e => {
    state.status = e.target.value;
    render();
  });

  els.caughtOnly.addEventListener("change", e => {
    state.caughtOnly = e.target.checked;
    render();
  });

  els.showUnavailable.addEventListener("change", e => {
    state.showUnavailable = e.target.checked;
    render();
  });

  els.pokemonList.addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const entry = currentData()[id] || { caught: false, shiny: false, marked: false, notes: "" };
    if (btn.dataset.action === "toggle-caught") updateEntry(id, { caught: !entry.caught });
    if (btn.dataset.action === "toggle-shiny") updateEntry(id, { shiny: !entry.shiny });
    if (btn.dataset.action === "toggle-marked") updateEntry(id, { marked: !entry.marked });
  });

  els.pokemonList.addEventListener("change", e => {
    const area = e.target.closest("textarea[data-action='notes']");
    if (!area) return;
    const id = Number(area.dataset.id);
    updateEntry(id, { notes: area.value });
  });

  els.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({
      theme: state.theme,
      activeGame: state.activeGame,
      collections: state.collections
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "living-dex-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  els.importInput.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        state.theme = parsed.theme || "dark";
        state.activeGame = parsed.activeGame || GAME_CONFIGS[0].key;
        state.collections = { ...defaultCollections(), ...(parsed.collections || {}) };
        saveState();
        render();
      } catch {
        alert("That file could not be imported.");
      }
    };
    reader.readAsText(file);
  });

  els.resetBtn.addEventListener("click", () => {
    state.collections[state.activeGame] = {};
    saveState();
    render();
  });

  els.tabs.forEach(tab => tab.addEventListener("click", () => {
    els.tabs.forEach(t => t.classList.toggle("active", t === tab));
    Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === tab.dataset.tab));
  }));
}

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.classList.remove("hidden");
});

els.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.classList.add("hidden");
});

async function main() {
  restoreState();
  state.search = "";
  state.status = "all";
  state.caughtOnly = false;
  state.showUnavailable = false;

  els.searchInput.value = "";
  els.statusSelect.value = "all";
  els.caughtOnly.checked = false;
  els.showUnavailable.checked = false;

  wireEvents();
  render();

  await Promise.allSettled([loadNationalDex(), loadExactPools()]);
  render();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

main();
