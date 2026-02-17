const STORAGE_KEY = 'score-keeper-scores';
const TEAM_NAMES_STORAGE_KEY = 'score-keeper-team-names';
const scores = { a: 0, b: 0 };
const teamNames = { a: 'Team A', b: 'Team B' };

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
      if (typeof parsed.a === 'number') scores.a = parsed.a;
      if (typeof parsed.b === 'number') scores.b = parsed.b;
    }
  } catch (e) {
    console.warn('Could not load scores from localStorage', e);
  }
  updateDisplay('a');
  updateDisplay('b');
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
      if (typeof parsed.a === 'string') {
        teamNames.a = parsed.a;
        const elA = document.getElementById('team-name-a');
        if (elA) elA.textContent = teamNames.a;
      }
      if (typeof parsed.b === 'string') {
        teamNames.b = parsed.b;
        const elB = document.getElementById('team-name-b');
        if (elB) elB.textContent = teamNames.b;
      }
    }
  } catch (e) {
    console.warn('Could not load team names from localStorage', e);
  }
}

function setupTeamNameEdit(team) {
  const el = document.getElementById('team-name-' + team);
  if (!el) return;
  const wrap = el.closest('.team-name-wrap');
  const icon = wrap && wrap.querySelector('.team-name-edit-icon');
  let hideIconTimeout = null;

  if (icon && wrap) {
    icon.addEventListener('click', function () {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    wrap.addEventListener('mouseenter', function () {
      if (hideIconTimeout) {
        clearTimeout(hideIconTimeout);
        hideIconTimeout = null;
      }
      wrap.classList.add('show-icon');
    });
    wrap.addEventListener('mouseleave', function () {
      hideIconTimeout = setTimeout(function () {
        wrap.classList.remove('show-icon');
        hideIconTimeout = null;
      }, 350);
    });
    el.addEventListener('focus', function () {
      if (hideIconTimeout) {
        clearTimeout(hideIconTimeout);
        hideIconTimeout = null;
      }
      wrap.classList.remove('show-icon');
    });
  }

  const defaultName = team === 'a' ? 'Team A' : 'Team B';
  el.addEventListener('blur', function () {
    const value = el.textContent.trim();
    teamNames[team] = value || defaultName;
    el.textContent = teamNames[team];
    saveTeamNames();
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });
}

// Load saved scores when the page loads.
loadScores();
loadTeamNames();
setupTeamNameEdit('a');
setupTeamNameEdit('b');
