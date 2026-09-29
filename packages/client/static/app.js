// Retro-Pi Hub Client Application
import { SaveSyncManager } from './services/save-sync-manager.service.js';
import { RomCacheService } from './services/rom-cache.service.js';
import { generateJoinQrSvg } from './services/netplay-coordinator.service.js';

// State
let allGames = [];
let currentFilter = 'all';
let currentGenre = 'all';
let filterPtBrOnly = false;
let filterMultiplayerOnly = false;
let currentSearch = '';
let activeRunningGame = null;
let currentSaveSyncManager = null;
const romCache = new RomCacheService();

// DOM Elements
const catalogView = document.getElementById('catalog-view');
const playerView = document.getElementById('player-view');
const gameGrid = document.getElementById('game-grid');
const searchInput = document.getElementById('search-input');
const systemFilters = document.getElementById('system-filters');
const filterChipPtbr = document.getElementById('filter-chip-ptbr');
const filterChipMultiplayer = document.getElementById('filter-chip-multiplayer');
const genreSelect = document.getElementById('genre-select');
const gameCounter = document.getElementById('game-counter');
const tvStatusBadge = document.getElementById('tv-status-badge');
const tvAlertBanner = document.getElementById('tv-alert-banner');

// Player Elements
const btnFloatBack = document.getElementById('btn-float-back');

// Active Game Banner Elements
const activeGameBanner = document.getElementById('active-game-banner');
const activeGameName = document.getElementById('active-game-name');
const activeGameSystem = document.getElementById('active-game-system');
const btnResumeGame = document.getElementById('btn-resume-game');
const btnCloseActiveGame = document.getElementById('btn-close-active-game');

// Details Modal Elements
const gameDetailsModal = document.getElementById('game-details-modal');
const btnDetailsClose = document.getElementById('btn-details-close');
const detailsCover = document.getElementById('details-cover');
const detailsTitle = document.getElementById('details-title');
const detailsSystemBadge = document.getElementById('details-system-badge');
const detailsFilesize = document.getElementById('details-filesize');
const detailsGenre = document.getElementById('details-genre');
const detailsYear = document.getElementById('details-year');
const detailsDeveloper = document.getElementById('details-developer');
const detailsDesc = document.getElementById('details-desc');
const btnDetailsPlay = document.getElementById('btn-details-play');
let selectedDetailsGame = null;

// Settings Modal Elements
const btnOpenSettings = document.getElementById('btn-open-settings');
const settingsModal = document.getElementById('settings-modal');
const btnSettingsClose = document.getElementById('btn-settings-close');
const raUsernameInput = document.getElementById('ra-username');
const raTokenInput = document.getElementById('ra-token');
const settingTouchControls = document.getElementById('setting-touch-controls');
const btnSaveSettings = document.getElementById('btn-save-settings');

// Purge any stale overrides
localStorage.removeItem('hub_gba_core');
localStorage.removeItem('hub_threads');

// Netplay Modal Elements
const btnNetplayOpen = document.getElementById('btn-netplay-open');
const netplayModal = document.getElementById('netplay-modal');
const btnNetplayClose = document.getElementById('btn-netplay-close');
const qrContainer = document.getElementById('qr-container');
const shareLinkInput = document.getElementById('share-link-input');
const btnCopyLink = document.getElementById('btn-copy-link');

// 1. Fetch Catalog & TV Lock Status
async function loadCatalog() {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error('Falha ao carregar catálogo');
    const systems = await res.json();
    
    allGames = [];
    for (const sys of systems) {
      if (sys.games && sys.games.length > 0) {
        for (const g of sys.games) {
          allGames.push({
            ...g,
            coreName: sys.coreName,
            systemLabel: sys.name
          });
        }
      }
    }

    renderGames();
  } catch (err) {
    console.error(err);
    gameCounter.textContent = 'Erro ao conectar ao Retro-Pi Hub.';
  }
}

async function checkTvLock() {
  try {
    const res = await fetch('/api/saves/tv_lock_status').catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.active) {
        tvStatusBadge.className = 'badge badge-tv-active';
        tvStatusBadge.textContent = '📺 TV Em Uso';
        tvAlertBanner.classList.remove('hidden');
        return;
      }
    }
    tvStatusBadge.className = 'badge badge-tv-idle';
    tvStatusBadge.textContent = '📺 TV Livre';
    tvAlertBanner.classList.add('hidden');
  } catch {
    // ignore
  }
}

// 2. Render Game Grid with Boxart
function renderGames() {
  const filtered = allGames.filter(game => {
    const matchesSystem = (currentFilter === 'all') || (game.system === currentFilter);
    const matchesGenre = (currentGenre === 'all') || (game.genre && game.genre.toLowerCase().includes(currentGenre.toLowerCase()));

    const isPt = game.language === 'pt-br' || /(\b|_|-)(brazil|brasil|portugu[eê]s|t-por|pt-br)(\b|_|-)/i.test(game.fileName + ' ' + (game.title || ''));
    const matchesPtBr = !filterPtBrOnly || isPt;

    const matchesMulti = !filterMultiplayerOnly || (game.players && game.players >= 2);

    const q = currentSearch.toLowerCase().trim();
    if (!q) return matchesSystem && matchesGenre && matchesPtBr && matchesMulti;

    const matchesTitle = game.title.toLowerCase().includes(q);
    const matchesGenreText = game.genre && game.genre.toLowerCase().includes(q);
    const matchesDev = game.developer && game.developer.toLowerCase().includes(q);
    const matchesYear = game.releaseDate && game.releaseDate.includes(q);

    return matchesSystem && matchesGenre && matchesPtBr && matchesMulti && (matchesTitle || matchesGenreText || matchesDev || matchesYear);
  });

  gameCounter.textContent = `${filtered.length} jogos encontrados (${allGames.length} no total)`;

  if (filtered.length === 0) {
    gameGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        Nenhum jogo encontrado para os filtros selecionados.
      </div>
    `;
    return;
  }

  gameGrid.innerHTML = filtered.map(game => {
    const sizeMb = (game.fileSizeBytes / (1024 * 1024)).toFixed(1);
    const sizeText = sizeMb > 0.1 ? `${sizeMb} MB` : `${Math.round(game.fileSizeBytes / 1024)} KB`;
    const saveBadge = game.hasSramSave ? '<div class="card-save-status">💾 Save Sincronizado</div>' : '';
    const genreText = game.genre ? `<div class="game-subinfo">${escapeHtml(game.genre)}</div>` : '';

    const isPt = game.language === 'pt-br' || /(\b|_|-)(brazil|brasil|portugu[eê]s|t-por|pt-br)(\b|_|-)/i.test(game.fileName + ' ' + (game.title || ''));
    const ptbrBadge = isPt ? '<span class="badge-ptbr" title="Jogo Traduzido para Português">🇧🇷 PT-BR</span>' : '';
    const playersBadge = (game.players && game.players >= 2) ? `<span class="badge-multiplayer" title="Multijogador ${game.players} Jogadores">👥 ${game.players}P</span>` : '';

    const coverHtml = game.boxartUrl ? `
      <img class="card-cover" src="${escapeHtml(game.boxartUrl)}" alt="${escapeHtml(game.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <div class="card-placeholder" style="display: none;">
        <span class="placeholder-icon">🕹️</span>
        <span>${escapeHtml(game.system.toUpperCase())}</span>
      </div>
    ` : `
      <div class="card-placeholder">
        <span class="placeholder-icon">🕹️</span>
        <span>${escapeHtml(game.system.toUpperCase())}</span>
      </div>
    `;

    return `
      <div class="game-card" data-id="${escapeHtml(game.id)}">
        <div class="card-media">
          ${coverHtml}
          <div class="card-top-badges">
            <span class="sys-badge badge-${game.system}">${game.system}</span>
            <span class="file-size-badge">${sizeText}</span>
          </div>
        </div>
        <div class="card-content">
          <div>
            <h3 class="game-title" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</h3>
            <div class="card-tags">
              ${ptbrBadge}
              ${playersBadge}
            </div>
            ${genreText}
            ${saveBadge}
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-details" data-id="${escapeHtml(game.id)}" title="Ver detalhes e sinopse">
              ℹ️ Info
            </button>
            <button class="btn btn-primary btn-play" data-id="${escapeHtml(game.id)}">
              ▶ Jogar
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card & button click handlers
  document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const game = allGames.find(g => g.id === id);
      if (game) launchPlayer(game);
    });
  });

  document.querySelectorAll('.btn-details, .card-media, .game-title').forEach(el => {
    el.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.game-card');
      const id = card ? card.dataset.id : e.currentTarget.dataset.id;
      const game = allGames.find(g => g.id === id);
      if (game) openGameDetails(game);
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 3. Game Details Modal
function openGameDetails(game) {
  selectedDetailsGame = game;
  detailsTitle.textContent = game.title;
  detailsSystemBadge.className = `sys-badge badge-${game.system}`;
  detailsSystemBadge.textContent = game.systemLabel || game.system.toUpperCase();
  
  const sizeMb = (game.fileSizeBytes / (1024 * 1024)).toFixed(1);
  detailsFilesize.textContent = sizeMb > 0.1 ? `${sizeMb} MB` : `${Math.round(game.fileSizeBytes / 1024)} KB`;

  detailsGenre.textContent = game.genre || 'Gênero: Clássico';
  detailsYear.textContent = game.releaseDate ? `Ano: ${game.releaseDate.substring(0, 4)}` : 'Ano: N/D';
  detailsDeveloper.textContent = game.developer ? `Dev: ${game.developer}` : 'Dev: N/D';

  detailsDesc.textContent = game.description || 'Sinopse não disponível para este jogo.';

  if (game.boxartUrl) {
    detailsCover.src = game.boxartUrl;
    detailsCover.style.display = 'block';
  } else {
    detailsCover.src = '';
    detailsCover.style.display = 'none';
  }

  gameDetailsModal.classList.remove('hidden');
}

btnDetailsClose.addEventListener('click', () => {
  gameDetailsModal.classList.add('hidden');
  selectedDetailsGame = null;
});

btnDetailsPlay.addEventListener('click', () => {
  if (selectedDetailsGame) {
    gameDetailsModal.classList.add('hidden');
    launchPlayer(selectedDetailsGame);
  }
});

// 4. Launch Emulator Player (with Keep-Alive & Active Game Bar)
async function launchPlayer(game) {
  // If user clicks play on the already active game, simply resume
  if (activeRunningGame && activeRunningGame.id === game.id) {
    resumeActiveGame();
    return;
  }

  // If another game was running, flush save before loading new one
  if (currentSaveSyncManager && currentSaveSyncManager.hasUncommittedChanges()) {
    currentSaveSyncManager.handlePageUnload();
  }

  activeRunningGame = game;
  updateActiveGameBanner();

  catalogView.classList.add('hidden');
  playerView.classList.remove('hidden');

  // Setup SaveSyncManager
  currentSaveSyncManager = new SaveSyncManager({
    system: game.system,
    romName: game.fileName,
    slot: 'tv_shared',
    syncFn: async (system, rom, slot, data) => {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const sha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const base64Data = btoa(String.fromCharCode(...data));

      const res = await fetch(`/api/saves/${encodeURIComponent(system)}/${encodeURIComponent(rom)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          payloadBase64: base64Data,
          sha256
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { statusCode: res.status, ...err };
      }
      return { success: true };
    }
  });

  // Setup EmulatorJS in #game-container
  const container = document.getElementById('game-container');
  container.innerHTML = '<div id="game" style="width:100%;height:100%;"></div>';

  delete window.EJS_threads;
  window.EJS_player = '#game';
  window.EJS_core = game.coreName || 'snes9x';
  window.EJS_gameUrl = `/api/roms/${encodeURIComponent(game.system)}/${encodeURIComponent(game.fileName)}`;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
  window.EJS_startOnLoaded = true;

  // Configure EmulatorJS Buttons (Save state, load state, settings, gamepad mapper)
  window.EJS_Buttons = {
    playPause: true,
    restart: true,
    mute: true,
    settings: true,
    fullscreen: true,
    saveState: true,
    loadState: true,
    screenRecord: false,
    gamepad: true,
    cheat: true,
    volume: true,
    saveSavFiles: true,
    loadSavFiles: true,
    quickSave: true,
    quickLoad: true,
    screenshot: true,
    cacheManager: true
  };

  // Configure Touch Gamepad (Only EmulatorJS native touch controls, zero dual overlay!)
  const touchSetting = localStorage.getItem('hub_touch_controls');
  const enableTouch = touchSetting !== 'false';
  window.EJS_VirtualGamepad = enableTouch;

  // Configure RetroAchievements if set
  const raUser = localStorage.getItem('hub_ra_username');
  const raToken = localStorage.getItem('hub_ra_token');
  if (raUser && raToken) {
    window.EJS_retroachievements = {
      enabled: true,
      username: raUser,
      token: raToken
    };
  }

  // Attempt to load existing save
  try {
    const saveRes = await fetch(`/api/saves/${encodeURIComponent(game.system)}/${encodeURIComponent(game.fileName)}/latest`);
    if (saveRes.ok) {
      const saveBlob = await saveRes.blob();
      window.EJS_loadStateURL = URL.createObjectURL(saveBlob);
    }
  } catch {
    // ignore
  }

  // Load loader.js dynamically if not present
  if (!document.getElementById('ejs-loader-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-loader-script';
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    document.body.appendChild(script);
  } else if (window.EJS_emulator) {
    // Reload page if needed to reinitialize another core
    window.location.reload();
  }
}

// 5. Minimize & Resume Handling (Keep-Alive & Auto-Pause)
function pauseEmulator() {
  try {
    if (window.EJS_emulator) {
      if (typeof window.EJS_emulator.pause === 'function') {
        window.EJS_emulator.pause();
      } else if (!window.EJS_emulator.paused && typeof window.EJS_emulator.togglePlaying === 'function') {
        window.EJS_emulator.togglePlaying();
      }
    }
    if (window.EJS_emulator?.audioCtx && window.EJS_emulator.audioCtx.state === 'running') {
      window.EJS_emulator.audioCtx.suspend().catch(() => {});
    }
  } catch (e) {
    console.warn('Could not pause emulator:', e);
  }
}

function resumeEmulator() {
  try {
    if (window.EJS_emulator) {
      if (typeof window.EJS_emulator.play === 'function') {
        window.EJS_emulator.play();
      } else if (window.EJS_emulator.paused && typeof window.EJS_emulator.togglePlaying === 'function') {
        window.EJS_emulator.togglePlaying();
      }
    }
    if (window.EJS_emulator?.audioCtx && window.EJS_emulator.audioCtx.state === 'suspended') {
      window.EJS_emulator.audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn('Could not resume emulator:', e);
  }
}

btnFloatBack?.addEventListener('click', () => {
  minimizePlayer();
});

function minimizePlayer() {
  pauseEmulator();
  playerView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  updateActiveGameBanner();
}

function resumeActiveGame() {
  if (!activeRunningGame) return;
  catalogView.classList.add('hidden');
  playerView.classList.remove('hidden');
  resumeEmulator();
}

btnResumeGame.addEventListener('click', () => {
  resumeActiveGame();
});

function updateActiveGameBanner() {
  if (activeRunningGame) {
    activeGameName.textContent = activeRunningGame.title;
    activeGameSystem.textContent = activeRunningGame.system.toUpperCase();
    activeGameSystem.className = `sys-badge badge-${activeRunningGame.system}`;
    activeGameBanner.classList.remove('hidden');
  } else {
    activeGameBanner.classList.add('hidden');
  }
}

function quitCurrentGame() {
  if (currentSaveSyncManager && currentSaveSyncManager.hasUncommittedChanges()) {
    currentSaveSyncManager.handlePageUnload();
  }

  pauseEmulator();
  try {
    if (window.EJS_emulator?.audioCtx) {
      window.EJS_emulator.audioCtx.close().catch(() => {});
    }
  } catch {}

  activeRunningGame = null;
  currentSaveSyncManager = null;

  const container = document.getElementById('game-container');
  if (container) container.innerHTML = '';

  try {
    delete window.EJS_emulator;
  } catch {}

  activeGameBanner.classList.add('hidden');
  playerView.classList.add('hidden');
  catalogView.classList.remove('hidden');
}

btnCloseActiveGame.addEventListener('click', quitCurrentGame);

// 6. Settings Modal (RetroAchievements & Touch Controls)
btnOpenSettings.addEventListener('click', () => {
  raUsernameInput.value = localStorage.getItem('hub_ra_username') || '';
  raTokenInput.value = localStorage.getItem('hub_ra_token') || '';
  settingTouchControls.checked = localStorage.getItem('hub_touch_controls') !== 'false';
  settingsModal.classList.remove('hidden');
});

btnSettingsClose.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

btnSaveSettings.addEventListener('click', () => {
  localStorage.setItem('hub_ra_username', raUsernameInput.value.trim());
  localStorage.setItem('hub_ra_token', raTokenInput.value.trim());
  localStorage.setItem('hub_touch_controls', settingTouchControls.checked ? 'true' : 'false');

  settingsModal.classList.add('hidden');
  alert('Configurações salvas com sucesso! As alterações serão aplicadas na próxima sessão.');
});

// 7. 2P Netplay Modal
btnNetplayOpen.addEventListener('click', () => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const host = window.location.hostname;
  const port = window.location.port || '3000';
  const joinUrl = `http://${host}:${port}/#join=${roomCode}`;

  shareLinkInput.value = joinUrl;
  qrContainer.innerHTML = generateJoinQrSvg(host, port, roomCode);
  netplayModal.classList.remove('hidden');
});

btnNetplayClose.addEventListener('click', () => {
  netplayModal.classList.add('hidden');
});

btnCopyLink.addEventListener('click', () => {
  shareLinkInput.select();
  navigator.clipboard.writeText(shareLinkInput.value).then(() => {
    btnCopyLink.textContent = 'Copiado! ✓';
    setTimeout(() => { btnCopyLink.textContent = 'Copiar Link'; }, 2000);
  });
});

// 8. Filters & Search Listeners
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  renderGames();
});

filterChipPtbr?.addEventListener('click', () => {
  filterPtBrOnly = !filterPtBrOnly;
  filterChipPtbr.classList.toggle('active', filterPtBrOnly);
  renderGames();
});

filterChipMultiplayer?.addEventListener('click', () => {
  filterMultiplayerOnly = !filterMultiplayerOnly;
  filterChipMultiplayer.classList.toggle('active', filterMultiplayerOnly);
  renderGames();
});

genreSelect?.addEventListener('change', (e) => {
  currentGenre = e.target.value;
  renderGames();
});

systemFilters.addEventListener('click', (e) => {
  if (e.target.classList.contains('filter-btn')) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.system;
    renderGames();
  }
});

// 10. Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Initialize
loadCatalog();
checkTvLock();
setInterval(checkTvLock, 10000);
