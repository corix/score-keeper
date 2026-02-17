const STORAGE_KEY = 'score-keeper-scores';
const TEAM_NAMES_STORAGE_KEY = 'score-keeper-team-names';
const TEAM_COLORS_STORAGE_KEY = 'score-keeper-team-colors';
const TEAM_ORDER_STORAGE_KEY = 'score-keeper-team-order';
const SIDEBAR_OPEN_STORAGE_KEY = 'score-keeper-sidebar-open';
const ALL_TEAM_IDS = ['a', 'b', 'c', 'd'];
const DEFAULT_NAMES = { a: 'Team A', b: 'Team B', c: 'Team C', d: 'Team D' };
const TEAM_NAME_MAX_LENGTH = 30;
const DEFAULT_COLORS = { a: '#2563eb', b: '#d97706', c: '#0d9488', d: '#7c3aed' };

let teamOrder = ['a', 'b'];
let scores = { a: 0, b: 0 };
let teamNames = { a: 'Team A', b: 'Team B' };
let teamColors = { a: '#2563eb', b: '#d97706' };
let openAccordionTeamId = null;
let toastHideTimeoutId = null;

// Palette: top stripe colors + extras, ordered in rainbow spectrum
function hexToHue(hex) {
  const rgb = hex.slice(1).match(/.{2}/g);
  if (!rgb) return 0;
  const r = parseInt(rgb[0], 16) / 255;
  const g = parseInt(rgb[1], 16) / 255;
  const b = parseInt(rgb[2], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6; break;
  }
  return h * 360;
}

const STRIPE_PALETTE = [
  '#c8102e', '#ff6600', '#d97706', '#ffc72c', '#84cc16', '#22c55e', '#006747',
  '#0d9488', '#06b6d4', '#006bb6', '#2563eb', '#1e40af', '#7c3aed',
  '#db2777', '#ff69b4'
].sort(function (a, b) { return hexToHue(a) - hexToHue(b); }).concat(['#737373', '#4a4a4a', '#252525']);

function hexToRgb(hex) {
  const m = hex.slice(1).match(/.{2}/g);
  return m ? m.map(function (x) { return parseInt(x, 16); }) : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(function (x) {
    const h = Math.max(0, Math.min(255, Math.round(x)));
    return (h < 16 ? '0' : '') + h.toString(16);
  }).join('');
}

function darkenHex(hex, amount) {
  amount = amount == null ? 0.15 : amount;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  l = Math.max(0, l - amount);
  if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
  const hue2rgb = function (p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex(
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255
  );
}

function applyTeamColors() {
  const root = document.documentElement;
  for (let i = 0; i < 4; i++) {
    const id = teamOrder[i];
    const color = id && teamColors[id] ? teamColors[id] : DEFAULT_COLORS[ALL_TEAM_IDS[i]];
    root.style.setProperty('--team-' + i + '-color', color);
    root.style.setProperty('--team-' + i + '-color-dark', darkenHex(color));
  }
}

function saveTeamColors() {
  try {
    localStorage.setItem(TEAM_COLORS_STORAGE_KEY, JSON.stringify(teamColors));
  } catch (e) {
    console.warn('Could not save team colors to localStorage', e);
  }
}

function loadTeamColors() {
  try {
    const stored = localStorage.getItem(TEAM_COLORS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      ALL_TEAM_IDS.forEach(function (id) {
        if (typeof parsed[id] === 'string') teamColors[id] = parsed[id];
      });
    }
  } catch (e) {
    console.warn('Could not load team colors from localStorage', e);
  }
  applyTeamColors();
}

function loadTeamOrder() {
  try {
    const stored = localStorage.getItem(TEAM_ORDER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.length <= 4) {
        teamOrder = parsed.filter(function (id) { return ALL_TEAM_IDS.indexOf(id) !== -1; });
        if (teamOrder.length < 2) teamOrder = ['a', 'b'];
      }
    }
  } catch (e) {
    console.warn('Could not load team order from localStorage', e);
  }
}

function saveTeamOrder() {
  try {
    localStorage.setItem(TEAM_ORDER_STORAGE_KEY, JSON.stringify(teamOrder));
  } catch (e) {
    console.warn('Could not save team order to localStorage', e);
  }
}

function ensureTeamData(id) {
  if (typeof scores[id] !== 'number') scores[id] = 0;
  if (typeof teamNames[id] !== 'string') teamNames[id] = DEFAULT_NAMES[id] || 'Team ' + id.toUpperCase();
  if (typeof teamColors[id] !== 'string') teamColors[id] = DEFAULT_COLORS[id] || STRIPE_PALETTE[0];
}

function renderMainSections() {
  const container = document.getElementById('main-container');
  if (!container) return;
  container.textContent = '';
  teamOrder.forEach(function (id, index) {
    ensureTeamData(id);
    const name = teamNames[id];
    const section = document.createElement('section');
    section.setAttribute('data-team-id', id);
    section.setAttribute('data-position', String(index));
    section.innerHTML =
      '<div class="team-name-hover-area">' +
        '<div class="team-name-wrap">' +
          '<h2 id="team-name-' + id + '" data-team="' + id + '">' + escapeHtml(name) + '</h2>' +
        '</div>' +
      '</div>' +
      '<p class="score" id="score-' + id + '">' + scores[id] + '</p>' +
      '<button onclick="decrementScore(\'' + id + '\')">-</button>' +
      '<button onclick="incrementScore(\'' + id + '\')">+</button>';
    container.appendChild(section);
    updateDisplay(id);
  });
  requestAnimationFrame(function () {
    teamOrder.forEach(shrinkTeamNameToFit);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

var MIN_TEAM_NAME_FONT_SIZE_PX = 11;

function shrinkTeamNameToFit(teamId) {
  const el = document.getElementById('team-name-' + teamId);
  if (!el) return;
  const wrap = el.closest('.team-name-wrap');
  if (!wrap) return;
  const container = wrap.parentElement;
  if (!container) return;
  el.style.fontSize = '';
  var computed = window.getComputedStyle(el).fontSize;
  var px = parseFloat(computed, 10);
  if (String(computed).indexOf('rem') !== -1) {
    px = parseFloat(computed, 10) * parseFloat(window.getComputedStyle(document.documentElement).fontSize, 10);
  }
  while (wrap.offsetWidth > container.clientWidth && px > MIN_TEAM_NAME_FONT_SIZE_PX) {
    px -= 1;
    el.style.fontSize = px + 'px';
  }
}

function renderSidebarTeams() {
  const container = document.getElementById('sidebar-teams');
  const addBtn = document.getElementById('sidebar-add-team');
  if (!container) return;
  container.textContent = '';
  teamOrder.forEach(function (id) {
    ensureTeamData(id);
    const panelId = 'sidebar-panel-' + id;
    const item = document.createElement('div');
    item.className = 'sidebar-accordion-item';
    item.setAttribute('data-team-id', id);
    item.setAttribute('data-drag-index', String(teamOrder.indexOf(id)));
    const gripSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6h2v2H8V6zm4 0h2v2h-2V6zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2z"/></svg>';
    const teamColor = teamColors[id] || DEFAULT_COLORS[id] || STRIPE_PALETTE[0];
    const pencilSvg = '<svg class="sidebar-accordion-toggle-icon" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="#fff" stroke-width="0.6" stroke-linejoin="round" paint-order="stroke fill"/></svg>';
    item.innerHTML =
      '<div class="sidebar-accordion-header">' +
        '<button type="button" class="sidebar-grip" draggable="true" aria-label="Drag to reorder">' + gripSvg + '</button>' +
        '<span class="sidebar-accordion-label" id="sidebar-label-' + id + '" contenteditable="true" data-team="' + id + '" spellcheck="false">' + escapeHtml(teamNames[id]) + '</span>' +
        '<button type="button" class="sidebar-accordion-toggle" aria-expanded="false" aria-controls="' + panelId + '" data-accordion-team="' + id + '" style="background:' + escapeHtml(teamColor) + '" title="Colors">' + pencilSvg + '</button>' +
      '</div>' +
      '<div id="' + panelId + '" class="sidebar-accordion-panel" role="region" aria-label="' + escapeHtml(teamNames[id]) + ' color">' +
        '<div class="sidebar-accordion-panel-inner">' +
          '<div class="sidebar-row">' +
            '<div class="sidebar-swatches" id="sidebar-swatches-' + id + '" role="group" aria-label="' + escapeHtml(teamNames[id]) + ' color"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    container.appendChild(item);
    setupSidebarTeamNameEdit(id);
  });
  renderSidebarSwatches();
  if (addBtn) {
    addBtn.style.display = teamOrder.length >= 4 ? 'none' : 'block';
  }
}

function renderSidebarSwatches() {
  teamOrder.forEach(function (team) {
    const container = document.getElementById('sidebar-swatches-' + team);
    if (!container) return;
    container.textContent = '';
    const current = teamColors[team] || DEFAULT_COLORS[team];
    STRIPE_PALETTE.forEach(function (hex) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-swatch';
      btn.style.background = hex;
      btn.setAttribute('aria-pressed', hex.toLowerCase() === (current || '').toLowerCase());
      btn.setAttribute('aria-label', teamNames[team] + ': ' + hex);
      btn.dataset.team = team;
      btn.dataset.color = hex;
      container.appendChild(btn);
    });
  });
}

function setupSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;
  try {
    const stored = localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (stored === 'true') {
      sidebar.classList.add('sidebar--open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close');
      toggle.setAttribute('title', 'Close');
    }
  } catch (e) {}
  toggle.addEventListener('click', function () {
    const isOpen = sidebar.classList.contains('sidebar--open');
    if (isOpen) {
      sidebar.classList.remove('sidebar--open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Settings');
      toggle.setAttribute('title', 'Settings');
    } else {
      sidebar.classList.add('sidebar--open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close');
      toggle.setAttribute('title', 'Close');
    }
    try {
      localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, sidebar.classList.contains('sidebar--open') ? 'true' : 'false');
    } catch (e) {}
  });
}

function setupSidebarAccordion() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('.sidebar-grip')) return;
    if (e.target.closest('.sidebar-accordion-label')) return;
    const toggle = e.target.closest('.sidebar-accordion-toggle');
    const label = e.target.closest('.sidebar-accordion-label');
    const item = e.target.closest('.sidebar-accordion-item');
    let id = toggle && toggle.dataset.accordionTeam ? toggle.dataset.accordionTeam : null;
    if (!id && label && item) id = item.getAttribute('data-team-id');
    if (!id) return;
    const panel = document.getElementById('sidebar-panel-' + id);
    const toggleEl = document.querySelector('.sidebar-accordion-toggle[data-accordion-team="' + id + '"]');
    if (!panel) return;
    const isOpen = openAccordionTeamId === id;
    document.querySelectorAll('.sidebar-accordion-panel').forEach(function (p) {
      p.classList.remove('sidebar-accordion-panel--open');
    });
    document.querySelectorAll('.sidebar-accordion-toggle').forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      panel.classList.add('sidebar-accordion-panel--open');
      if (toggleEl) toggleEl.setAttribute('aria-expanded', 'true');
      openAccordionTeamId = id;
    } else {
      openAccordionTeamId = null;
    }
  });
}

function setupSidebarDragDrop() {
  const container = document.getElementById('sidebar-teams');
  if (!container) return;
  let draggedId = null;
  container.addEventListener('dragstart', function (e) {
    const grip = e.target.closest('.sidebar-grip');
    if (!grip) return;
    const item = grip.closest('.sidebar-accordion-item');
    if (!item) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.getAttribute('data-team-id'));
    draggedId = item.getAttribute('data-team-id');
    item.classList.add('sidebar-accordion-item--dragging');
  });
  container.addEventListener('dragend', function (e) {
    const item = e.target.closest('.sidebar-accordion-item');
    if (item) item.classList.remove('sidebar-accordion-item--dragging');
    draggedId = null;
    container.style.removeProperty('--sidebar-drop-indicator-color');
  });
  function clearDropIndicator() {
    container.querySelectorAll('.sidebar-accordion-item').forEach(function (el) {
      el.classList.remove('sidebar-accordion-item--drop-before', 'sidebar-accordion-item--drop-after');
    });
    container.style.removeProperty('--sidebar-drop-indicator-color');
  }
  container.addEventListener('dragover', function (e) {
    e.preventDefault();
    clearDropIndicator();
    const item = e.target.closest('.sidebar-accordion-item');
    if (!item || item.getAttribute('data-team-id') === draggedId) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const dragColor = draggedId && (teamColors[draggedId] || DEFAULT_COLORS[draggedId]);
    if (dragColor) container.style.setProperty('--sidebar-drop-indicator-color', dragColor);
    item.classList.add(e.clientY < mid ? 'sidebar-accordion-item--drop-before' : 'sidebar-accordion-item--drop-after');
  });
  container.addEventListener('dragleave', function (e) {
    if (!e.relatedTarget || !container.contains(e.relatedTarget)) {
      clearDropIndicator();
    }
  });
  container.addEventListener('drop', function (e) {
    e.preventDefault();
    clearDropIndicator();
    const targetItem = e.target.closest('.sidebar-accordion-item');
    if (!targetItem || !draggedId) return;
    const targetId = targetItem.getAttribute('data-team-id');
    if (targetId === draggedId) return;
    const fromIndex = teamOrder.indexOf(draggedId);
    const toIndex = teamOrder.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const rect = targetItem.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    const newOrder = teamOrder.slice();
    newOrder.splice(fromIndex, 1);
    let newTo = newOrder.indexOf(targetId);
    if (!insertBefore) newTo += 1;
    newOrder.splice(newTo, 0, draggedId);
    teamOrder = newOrder;
    saveTeamOrder();
    renderMainSections();
    renderSidebarTeams();
    applyTeamColors();
  });
}

function setupSidebarSwatches() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.addEventListener('click', function (e) {
    const btn = e.target.closest('.sidebar-swatch');
    if (!btn || !btn.dataset.team || !btn.dataset.color) return;
    const team = btn.dataset.team;
    const color = btn.dataset.color;
    teamColors[team] = color;
    applyTeamColors();
    saveTeamColors();
    const all = btn.closest('.sidebar-swatches').querySelectorAll('.sidebar-swatch');
    all.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.color.toLowerCase() === color.toLowerCase());
    });
    const accordionToggle = document.querySelector('.sidebar-accordion-toggle[data-accordion-team="' + team + '"]');
    if (accordionToggle) accordionToggle.style.background = color;
  });
}

function addTeam() {
  if (teamOrder.length >= 4) return;
  const next = ALL_TEAM_IDS.find(function (id) { return teamOrder.indexOf(id) === -1; });
  if (!next) return;
  teamOrder.push(next);
  ensureTeamData(next);
  saveTeamOrder();
  saveScores();
  saveTeamNames();
  saveTeamColors();
  renderMainSections();
  renderSidebarTeams();
  applyTeamColors();
}

// Returns the score display element for the given team ('a' or 'b').
function getScoreElement(team) {
  return document.getElementById('score-' + team);
}

// Updates the on-screen score for the given team.
function updateDisplay(team) {
  const el = getScoreElement(team);
  if (el) el.textContent = scores[team];
}

// Persists current scores to localStorage.
function saveScores() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.warn('Could not save scores to localStorage', e);
  }
}

// Restores scores from localStorage and refreshes both displays.
function loadScores() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      teamOrder.forEach(function (id) {
        if (typeof parsed[id] === 'number') scores[id] = parsed[id];
      });
    }
  } catch (e) {
    console.warn('Could not load scores from localStorage', e);
  }
  teamOrder.forEach(function (id) {
    updateDisplay(id);
  });
}

// Adds one to the team's score, updates display, and saves.
function incrementScore(team) {
  scores[team]++;
  updateDisplay(team);
  saveScores();
}

// Subtracts one from the team's score (never below 0), updates display, and saves.
function decrementScore(team) {
  if (scores[team] > 0) {
    scores[team]--;
    updateDisplay(team);
    saveScores();
  }
}

function showTeamNameUpdatedToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (toastHideTimeoutId) {
    clearTimeout(toastHideTimeoutId);
    toastHideTimeoutId = null;
  }
  toast.classList.remove('toast--visible');
  toast.classList.add('toast--entering');
  toast.hidden = false;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('toast--visible');
      toast.classList.remove('toast--entering');
    });
  });
  toastHideTimeoutId = setTimeout(function () {
    toast.classList.remove('toast--visible', 'toast--entering');
    toast.hidden = true;
    toastHideTimeoutId = null;
  }, 2500);
}

// Persists team names to localStorage.
function saveTeamNames() {
  try {
    localStorage.setItem(TEAM_NAMES_STORAGE_KEY, JSON.stringify(teamNames));
  } catch (e) {
    console.warn('Could not save team names to localStorage', e);
  }
}

// Restores team names from localStorage and updates both headings.
function loadTeamNames() {
  try {
    const stored = localStorage.getItem(TEAM_NAMES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      teamOrder.forEach(function (id) {
        if (typeof parsed[id] === 'string') teamNames[id] = parsed[id].slice(0, TEAM_NAME_MAX_LENGTH);
      });
    }
  } catch (e) {
    console.warn('Could not load team names from localStorage', e);
  }
  teamOrder.forEach(function (id) {
    const el = document.getElementById('team-name-' + id);
    if (el) el.textContent = teamNames[id];
  });
  updateSidebarTeamLabels();
}

function updateSidebarTeamLabels() {
  teamOrder.forEach(function (id) {
    const label = document.getElementById('sidebar-label-' + id);
    const swatches = document.getElementById('sidebar-swatches-' + id);
    if (label) label.textContent = teamNames[id];
    if (swatches) swatches.setAttribute('aria-label', teamNames[id] + ' color');
  });
}

function setupSidebarTeamNameEdit(team) {
  const el = document.getElementById('sidebar-label-' + team);
  if (!el) return;
  const defaultName = DEFAULT_NAMES[team] || ('Team ' + team.toUpperCase());

  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var sel = window.getSelection();
      var selectionLen = (sel.rangeCount && el.contains(sel.anchorNode)) ? sel.getRangeAt(0).toString().length : 0;
      if (el.textContent.length - selectionLen + 1 > TEAM_NAME_MAX_LENGTH) {
        e.preventDefault();
      }
    }
  });

  el.addEventListener('input', function () {
    if (el.textContent.length > TEAM_NAME_MAX_LENGTH) {
      el.textContent = el.textContent.slice(0, TEAM_NAME_MAX_LENGTH);
    }
    const mainEl = document.getElementById('team-name-' + team);
    if (mainEl) {
      mainEl.textContent = el.textContent;
      shrinkTeamNameToFit(team);
    }
  });

  el.addEventListener('paste', function (e) {
    e.preventDefault();
    var pasted = (e.clipboardData || window.clipboardData).getData('text');
    var sel = window.getSelection();
    var selectionLen = (sel.rangeCount && el.contains(sel.anchorNode)) ? sel.getRangeAt(0).toString().length : 0;
    var maxInsert = TEAM_NAME_MAX_LENGTH - (el.textContent.length - selectionLen);
    if (maxInsert <= 0) return;
    var toInsert = pasted.slice(0, maxInsert);
    document.execCommand('insertText', false, toInsert);
  });

  el.addEventListener('blur', function () {
    const value = el.textContent.trim().slice(0, TEAM_NAME_MAX_LENGTH);
    const newName = value || defaultName;
    if (newName !== teamNames[team]) {
      teamNames[team] = newName;
      el.textContent = newName;
      saveTeamNames();
      updateSidebarTeamLabels();
      const mainEl = document.getElementById('team-name-' + team);
      if (mainEl) {
        mainEl.textContent = newName;
        shrinkTeamNameToFit(team);
      }
      showTeamNameUpdatedToast();
    }
  });
}

// Load and render on init.
loadTeamOrder();
teamOrder.forEach(function (id) { ensureTeamData(id); });
loadScores();
loadTeamNames();
loadTeamColors();
renderMainSections();
renderSidebarTeams();
applyTeamColors();
setupSidebarToggle();
setupSidebarSwatches();
setupSidebarAccordion();
setupSidebarDragDrop();

const addTeamBtn = document.getElementById('sidebar-add-team');
if (addTeamBtn) addTeamBtn.addEventListener('click', addTeam);

var resizeTimeoutId = null;
window.addEventListener('resize', function () {
  if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(function () {
    resizeTimeoutId = null;
    teamOrder.forEach(shrinkTeamNameToFit);
  }, 150);
});
