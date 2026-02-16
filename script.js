const STORAGE_KEY = 'score-keeper-scores';
const scores = { a: 0, b: 0 };

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

// Load saved scores when the page loads.
loadScores();
