// Retro-Pi Hub Client Application
import { VirtualGamepadController } from './services/virtual-gamepad.service.js';
import { SaveSyncManager } from './services/save-sync-manager.service.js';
import { RomCacheService } from './services/rom-cache.service.js';
import { WebRtcPeerCoordinator, generateJoinQrSvg } from './services/netplay-coordinator.service.js';

// State
let allGames = [];
let currentFilter = 'all';
let currentSearch = '';
let activeEmulatorInstance = null;
let currentSaveSyncManager = null;
const romCache = new RomCacheService();
const virtualGamepad = new VirtualGamepadController();

// DOM Elements
const catalogView = document.getElementById('catalog-view');
const playerView = document.getElementById('player-view');
const gameGrid = document.getElementById('game-grid');
const searchInput = document.getElementById('search-input');
const systemFilters = document.getElementById('system-filters');
const gameCounter = document.getElementById('game-counter');
const tvStatusBadge = document.getElementById('tv-status-badge');
const tvAlertBanner = document.getElementById('tv-alert-banner');
const playerGameTitle = document.getElementById('player-game-title');
const playerSyncStatus = document.getElementById('player-sync-status');
const btnBackCatalog = document.getElementById('btn-back-catalog');
const btnFullscreen = document.getElementById('btn-fullscreen');
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
    // If a game is being played on the TV, it reflects in lock status
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

// 2. Render Game Grid
function renderGames() {
  const filtered = allGames.filter(game => {
    const matchesSystem = (currentFilter === 'all') || (game.system === currentFilter);
    const matchesSearch = !currentSearch || game.title.toLowerCase().includes(currentSearch.toLowerCase());
    return matchesSystem && matchesSearch;
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
    const saveBadge = game.hasSramSave ? '<div class="card-save-status">💾 Save TV Sincronizado</div>' : '';

    return `
      <div class="game-card">
        <div>
          <div class="card-top">
            <span class="sys-badge badge-${game.system}">${game.system}</span>
            <span class="file-size">${sizeText}</span>
          </div>
          <h3 class="game-title">${escapeHtml(game.title)}</h3>
          ${saveBadge}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-play" data-system="${game.system}" data-rom="${escapeHtml(game.fileName)}" data-title="${escapeHtml(game.title)}" data-core="${game.coreName}">
            ▶ Jogar
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach play events
  document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      launchPlayer({
        system: target.dataset.system,
        fileName: target.dataset.rom,
        title: target.dataset.title,
        coreName: target.dataset.core
      });
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 3. Launch Emulator Player
async function launchPlayer(game) {
  catalogView.classList.add('hidden');
  playerView.classList.remove('hidden');
  playerGameTitle.textContent = `${game.title} (${game.system.toUpperCase()})`;
  playerSyncStatus.textContent = 'Carregando...';

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
      playerSyncStatus.textContent = '💾 Salvo no Hub';
      return { success: true };
    }
  });

  // Setup EmulatorJS in #game-container
  const container = document.getElementById('game-container');
  container.innerHTML = '<div id="game" style="width:100%;height:100%;"></div>';

  window.EJS_player = '#game';
  window.EJS_core = game.coreName || 'snes9x';
  window.EJS_gameUrl = `/api/roms/${encodeURIComponent(game.system)}/${encodeURIComponent(game.fileName)}`;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
  window.EJS_startOnLoaded = true;

  // Attempt to load existing save
  try {
    const saveRes = await fetch(`/api/saves/${encodeURIComponent(game.system)}/${encodeURIComponent(game.fileName)}/latest`);
    if (saveRes.ok) {
      const saveBlob = await saveRes.blob();
      window.EJS_loadStateURL = URL.createObjectURL(saveBlob);
      playerSyncStatus.textContent = '💾 Save Carregado';
    } else {
      playerSyncStatus.textContent = 'Novo Jogo';
    }
  } catch {
    playerSyncStatus.textContent = 'Novo Jogo';
  }

  // Load loader.js dynamically if not present
  if (!document.getElementById('ejs-loader-script')) {
    const script = document.createElement('script');
    script.id = 'ejs-loader-script';
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    document.body.appendChild(script);
  } else if (window.EJS_emulator) {
    // Reload if already initialized
    window.location.reload();
  }
}

// 4. Close Player & Return to Catalog
btnBackCatalog.addEventListener('click', () => {
  if (currentSaveSyncManager && currentSaveSyncManager.hasUncommittedChanges()) {
    currentSaveSyncManager.handlePageUnload();
  }
  playerView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  document.getElementById('game-container').innerHTML = '';
});

// Fullscreen Toggle
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    playerView.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// 5. On-Screen Virtual Gamepad Touch Handlers
document.querySelectorAll('.virtual-gamepad button').forEach(btn => {
  const key = btn.dataset.btn;
  if (!key) return;

  const press = (e) => {
    e.preventDefault();
    virtualGamepad.pressButton(key);
    btn.style.transform = 'scale(0.92)';
    btn.style.filter = 'brightness(1.4)';
  };

  const release = (e) => {
    e.preventDefault();
    virtualGamepad.releaseButton(key);
    btn.style.transform = '';
    btn.style.filter = '';
  };

  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
  btn.addEventListener('touchcancel', release, { passive: false });
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
});

// 6. 2P Netplay Modal
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

// 7. Search & Filters
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
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

// 8. Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Initialize
loadCatalog();
checkTvLock();
setInterval(checkTvLock, 10000);
