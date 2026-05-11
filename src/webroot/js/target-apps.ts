import { exec } from './bridge.js';
import { fetchJson } from './utils.js';
import { showToast } from './toast.js';
import { getTranslation } from './i18n.js';
import { API_URLS } from './constants.js';
import { appendToOutput } from './terminal.js';

type AppState = 'unchecked' | 'bare' | 'conditional' | 'force';

interface TargetApp {
  packageName: string;
  appName: string;
  state: AppState;
}

const STATE_ORDER: AppState[] = ['unchecked', 'bare', 'conditional', 'force'];
const STATE_ICONS: Record<AppState, string> = {
  unchecked: '',
  bare: 'done',
  conditional: '',
  force: '',
};

const STATE_TEXT: Record<AppState, string> = {
  unchecked: '',
  bare: '',
  conditional: '?',
  force: '!',
};
const STATE_LABEL_KEYS: Record<AppState, string> = {
  unchecked: 'ta_state_unchecked',
  bare: 'ta_state_bare',
  conditional: 'ta_state_conditional',
  force: 'ta_state_force',
};
const TARGET_CACHE_FILE = '/data/adb/Specter/app_labels.json';

let apps: TargetApp[] = [];
let filteredApps: TargetApp[] = [];
let currentFilter: 'all' | 'selected' | 'not_selected' = 'all';
let currentSearch = '';

function t(key: string, fallback: string): string {
  return getTranslation(key) || fallback;
}

async function loadAppLabels(installedPkgs: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();

  const { stdout: cachedRaw } = await exec(`cat ${TARGET_CACHE_FILE} 2>/dev/null || echo "{}"`);
  let cached: Record<string, string> = {};
  try { cached = JSON.parse(cachedRaw || '{}'); } catch { cached = {}; }

  const needsRefresh = Object.keys(cached).length === 0;

  if (needsRefresh) {
    try {
      const catalog = await fetchJson<Record<string, string>>(API_URLS.APP_CATALOG);
      if (catalog) {
        const relevant: Record<string, string> = {};
        for (const pkg of installedPkgs) {
          if (catalog[pkg]) relevant[pkg] = catalog[pkg];
        }
        const content = JSON.stringify(relevant);
        await exec(`mkdir -p /data/adb/Specter && cat > ${TARGET_CACHE_FILE} << 'CEOF'\n${content}\nCEOF`);
        Object.assign(cached, relevant);
      }
    } catch (e) {
      console.warn('App catalog fetch failed, using cached/fallback', e);
    }
  }

  for (const pkg of installedPkgs) {
    labels.set(pkg, cached[pkg] || pkg);
  }
  return labels;
}

function nextState(current: AppState): AppState {
  const idx = STATE_ORDER.indexOf(current);
  return STATE_ORDER[(idx + 1) % STATE_ORDER.length];
}

export async function openTargetAppsManager() {
  const overlay = document.createElement('div');
  overlay.className = 'ta-overlay';
  overlay.innerHTML = `
    <div class="ta-header">
      <button id="ta-back" class="ta-back-btn">
        <md-icon>arrow_back</md-icon>
      </button>
      <h2 class="ta-title">${t('ta_title', 'App Targeting')}</h2>
      <button id="ta-menu-btn" class="ta-menu-btn" aria-label="More options">
        <md-icon>more_vert</md-icon>
      </button>
      <md-menu id="ta-menu" class="ta-menu" anchor="ta-menu-btn" positioning="fixed">
        <md-menu-item id="ta-select-all" class="first">
          <div slot="headline">${t('ta_select_all', 'Select All')}</div>
        </md-menu-item>
        <md-menu-item id="ta-deselect-all">
          <div slot="headline">${t('ta_deselect_all', 'Deselect All')}</div>
        </md-menu-item>
        <md-menu-item id="ta-import-denylist" class="last">
          <div slot="headline">${t('ta_import_denylist', 'Import from DenyList')}</div>
        </md-menu-item>
      </md-menu>
    </div>

    <div class="ta-search-container">
      <md-outlined-text-field id="ta-search" class="ta-search" placeholder="${t('ta_search_placeholder', 'Search apps')}">
        <md-icon slot="leading-icon">search</md-icon>
      </md-outlined-text-field>
    </div>

    <div class="ta-filters">
      <md-filter-chip id="ta-filter-all" label="${t('ta_filter_all', 'All')}" selected>
        <md-icon slot="icon">select_all</md-icon>
      </md-filter-chip>
      <md-filter-chip id="ta-filter-selected" label="${t('ta_filter_selected', 'Selected')}">
        <md-icon slot="icon">check_circle</md-icon>
      </md-filter-chip>
      <md-filter-chip id="ta-filter-not-selected" label="${t('ta_filter_not_selected', 'Not Selected')}">
        <md-icon slot="icon">radio_button_unchecked</md-icon>
      </md-filter-chip>
    </div>

    <div class="ta-list" id="ta-list"></div>

    <md-fab id="ta-apply" class="ta-fab" label="${t('ta_apply', 'Apply')}">
      <md-icon slot="icon">check</md-icon>
    </md-fab>

    <div class="ta-loading" id="ta-loading">
      <md-circular-progress indeterminate></md-circular-progress>
      <p>${t('ta_loading', 'Loading apps...')}</p>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('ta-overlay--open'));
  document.documentElement.style.overflow = 'hidden';

  const list = overlay.querySelector('#ta-list') as HTMLElement;
  const loading = overlay.querySelector('#ta-loading') as HTMLElement;
  const searchInput = overlay.querySelector('#ta-search') as any;

  function closeOverlay() {
    overlay.classList.remove('ta-overlay--open');
    document.documentElement.style.overflow = '';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  overlay.querySelector('#ta-back')!.addEventListener('click', closeOverlay);

  overlay.querySelector('#ta-menu-btn')!.addEventListener('click', () => {
    const menu = overlay.querySelector('#ta-menu') as any;
    menu.open = !menu.open;
  });

  function closeTapMenu() {
    const menu = overlay.querySelector('#ta-menu') as any;
    if (menu.open) menu.open = false;
  }

  overlay.querySelector('#ta-select-all')!.addEventListener('click', () => {
    for (const app of apps) app.state = 'bare';
    applyFilters();
    closeTapMenu();
  });

  overlay.querySelector('#ta-deselect-all')!.addEventListener('click', () => {
    for (const app of apps) app.state = 'unchecked';
    applyFilters();
    closeTapMenu();
  });

  overlay.querySelector('#ta-import-denylist')!.addEventListener('click', async () => {
    const { stdout } = await exec('magisk --denylist ls 2>/dev/null | awk -F\'|\' \'{print $1}\' | grep -v "isolated" | sort -u || echo ""');
    const denylistPkgs = stdout.split('\n').map(s => s.trim()).filter(Boolean);
    if (denylistPkgs.length === 0) {
      showToast(t('ta_prompt_denylist_failed', 'Failed to read DenyList'), { icon: 'error', type: 'error' as any, autoCloseDelay: 3000 });
    } else {
      for (const app of apps) {
        if (denylistPkgs.includes(app.packageName)) app.state = 'bare';
      }
      applyFilters();
      showToast(t('ta_prompt_denylist_imported', 'DenyList apps selected'), { icon: 'check_circle', type: 'success' as any, autoCloseDelay: 2000 });
    }
    closeTapMenu();
  });

  async function loadData() {
    try {
      const [{ stdout: targetRaw }, { stdout: userRaw }, { stdout: sysRaw }, { stdout: sysAppExtra }] = await Promise.all([
        exec('cat /data/adb/tricky_store/target.txt 2>/dev/null || echo ""'),
        exec('pm list packages -3 2>/dev/null | cut -d: -f2'),
        exec('pm list packages -s 2>/dev/null | cut -d: -f2'),
        exec('cat /data/adb/tricky_store/system_app 2>/dev/null || echo ""'),
      ]);

      const targetLines = targetRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const targetMap = new Map<string, AppState>();
      for (const line of targetLines) {
        if (line.endsWith('!')) targetMap.set(line.slice(0, -1), 'force');
        else if (line.endsWith('?')) targetMap.set(line.slice(0, -1), 'conditional');
        else targetMap.set(line, 'bare');
      }

      const allPkgs = new Set<string>();
      for (const line of userRaw.split('\n').map(s => s.trim()).filter(Boolean)) allPkgs.add(line);
      for (const line of sysRaw.split('\n').map(s => s.trim()).filter(Boolean)) allPkgs.add(line);
      for (const line of sysAppExtra.split('\n').map(s => s.trim()).filter(Boolean)) allPkgs.add(line);

      const installedPkgs = Array.from(allPkgs).sort();
      const labelMap = await loadAppLabels(installedPkgs);

      apps = installedPkgs.map(pkg => ({
        packageName: pkg,
        appName: labelMap.get(pkg) || pkg,
        state: targetMap.get(pkg) || 'unchecked',
      }));

      loading.style.display = 'none';
      list.style.display = '';
      applyFilters();
    } catch (e) {
      console.warn('Failed to load app data:', e);
      loading.innerHTML = `<p>${t('ta_load_error', 'Failed to load apps')}</p>`;
    }
  }

  function renderList() {
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const app of filteredApps) {
      const item = document.createElement('div');
      item.className = 'ta-item';
      item.dataset.package = app.packageName;
      item.dataset.state = app.state;

      const label = document.createElement('div');
      label.className = 'ta-item-content';

      const nameEl = document.createElement('div');
      nameEl.className = 'ta-item-name';
      nameEl.textContent = app.appName;

      const pkgEl = document.createElement('div');
      pkgEl.className = 'ta-item-pkg';
      pkgEl.textContent = app.packageName;

      label.appendChild(nameEl);
      label.appendChild(pkgEl);

      const circle = document.createElement('div');
      circle.className = 'ta-state-circle';
      circle.setAttribute('data-state', app.state);
      circle.setAttribute('aria-label', t(STATE_LABEL_KEYS[app.state], app.state));
      circle.innerHTML = STATE_ICONS[app.state]
        ? `<md-icon class="ta-state-icon">${STATE_ICONS[app.state]}</md-icon>`
        : STATE_TEXT[app.state]
          ? `<span class="ta-state-icon ta-state-text">${STATE_TEXT[app.state]}</span>`
          : '';

      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        app.state = nextState(app.state);
        circle.setAttribute('data-state', app.state);
        circle.setAttribute('aria-label', t(STATE_LABEL_KEYS[app.state], app.state));
        const iconEl = circle.querySelector('.ta-state-icon');
        if (iconEl) {
          if (STATE_ICONS[app.state]) {
            iconEl.outerHTML = `<md-icon class="ta-state-icon">${STATE_ICONS[app.state]}</md-icon>`;
          } else if (STATE_TEXT[app.state]) {
            iconEl.outerHTML = `<span class="ta-state-icon ta-state-text">${STATE_TEXT[app.state]}</span>`;
          } else {
            iconEl.remove();
          }
        } else if (STATE_ICONS[app.state]) {
          circle.insertAdjacentHTML('beforeend', `<md-icon class="ta-state-icon">${STATE_ICONS[app.state]}</md-icon>`);
        } else if (STATE_TEXT[app.state]) {
          circle.insertAdjacentHTML('beforeend', `<span class="ta-state-icon ta-state-text">${STATE_TEXT[app.state]}</span>`);
        }
        item.dataset.state = app.state;
        circle.classList.remove('ta-state-circle--anim');
        void circle.offsetWidth;
        circle.classList.add('ta-state-circle--anim');
      });

      const ripple = document.createElement('md-ripple');
      item.appendChild(label);
      item.appendChild(circle);
      item.appendChild(ripple);
      fragment.appendChild(item);
    }

    list.appendChild(fragment);

    if (filteredApps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ta-empty';
      empty.textContent = t('ta_no_results', 'No apps match your filter');
      list.appendChild(empty);
    }
  }

  function applyFilters() {
    let result = apps;

    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      result = result.filter(a =>
        a.packageName.toLowerCase().includes(q) || a.appName.toLowerCase().includes(q)
      );
    }

    if (currentFilter === 'selected') {
      result = result.filter(a => a.state !== 'unchecked');
    } else if (currentFilter === 'not_selected') {
      result = result.filter(a => a.state === 'unchecked');
    }

    filteredApps = result;
    renderList();
  }

  searchInput.addEventListener('input', () => {
    currentSearch = (searchInput.value || '').trim();
    applyFilters();
  });

  function wireFilter(id: string, filter: typeof currentFilter) {
    const chip = overlay.querySelector(id) as any;
    chip.addEventListener('click', () => {
      overlay.querySelectorAll('.ta-filters md-filter-chip').forEach(c => { (c as any).selected = false; });
      chip.selected = true;
      currentFilter = filter;
      applyFilters();
    });
  }

  wireFilter('#ta-filter-all', 'all');
  wireFilter('#ta-filter-selected', 'selected');
  wireFilter('#ta-filter-not-selected', 'not_selected');

  overlay.querySelector('#ta-apply')!.addEventListener('click', async () => {
    const lines = apps
      .filter(a => a.state !== 'unchecked')
      .map(a => {
        if (a.state === 'force') return a.packageName + '!';
        if (a.state === 'conditional') return a.packageName + '?';
        return a.packageName;
      })
      .sort();

    const content = lines.join('\n');

    try {
      await exec(`cat > /data/adb/tricky_store/target.txt << 'TEOF'\n${content}\nTEOF`);
      showToast(t('ta_prompt_saved', 'Target list saved'), { icon: 'check_circle', type: 'success' as any, autoCloseDelay: 2500 });
      await exec('mkdir -p /data/adb/Specter && touch /data/adb/Specter/target_applied');
      appendToOutput(`[target-apps] Wrote ${lines.length} entries to target.txt`);
    } catch (e) {
      showToast(t('ta_prompt_error', 'Failed to save target list'), { icon: 'error', type: 'error' as any, autoCloseDelay: 4000 });
      console.warn('Failed to save target.txt:', e);
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  window.addEventListener('popstate', closeOverlay);

  await loadData();
}
