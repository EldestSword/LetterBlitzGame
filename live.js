(() => {
  "use strict";

  const STORAGE_KEY = "letter-blitz-host-edition/v0.6.0";
  const CHANNEL_NAME = "letter-blitz-live-v1";
  const PLAYER_COLOURS = ["var(--player-1)", "var(--player-2)", "var(--player-3)", "var(--player-4)", "var(--player-5)", "var(--player-6)", "var(--player-7)", "var(--player-8)"];
  const STOP_WORDS = new Set(["a", "an", "and", "de", "da", "del", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);

  let state = null;
  let channel = null;
  let lastSyncAt = 0;
  let redcapTimeout = null;

  const els = {
    syncStatus: document.getElementById("syncStatus"),
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    waitingView: document.getElementById("waitingView"),
    roundView: document.getElementById("roundView"),
    revealView: document.getElementById("revealView"),
    resultsView: document.getElementById("resultsView"),
    waitingLeaderboard: document.getElementById("waitingLeaderboard"),
    liveRoundNumber: document.getElementById("liveRoundNumber"),
    liveLetter: document.getElementById("liveLetter"),
    liveTimerCard: document.getElementById("liveTimerCard"),
    liveTimerStatus: document.getElementById("liveTimerStatus"),
    liveTimerValue: document.getElementById("liveTimerValue"),
    liveCategoryGrid: document.getElementById("liveCategoryGrid"),
    revealLetter: document.getElementById("revealLetter"),
    revealProgress: document.getElementById("revealProgress"),
    revealCategory: document.getElementById("revealCategory"),
    revealGrid: document.getElementById("revealGrid"),
    revealCategoryDots: document.getElementById("revealCategoryDots"),
    resultsTitle: document.getElementById("resultsTitle"),
    resultsSubtitle: document.getElementById("resultsSubtitle"),
    roundResultsList: document.getElementById("roundResultsList"),
    resultsLeaderboard: document.getElementById("resultsLeaderboard"),
    liveRedcapOverlay: document.getElementById("liveRedcapOverlay"),
    liveRedcapImage: document.getElementById("liveRedcapImage"),
  };

  init();

  function init() {
    loadFromStorage();
    initialiseChannel();
    bindEvents();
    render();
    window.setInterval(updateSyncStatus, 2500);
  }

  function initialiseChannel() {
    if (!("BroadcastChannel" in window)) return;
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type === "state" && message.state) {
        state = message.state;
        lastSyncAt = Date.now();
        render();
      } else if (message.type === "spin-preview") {
        lastSyncAt = Date.now();
        renderSpinPreview(message);
      } else if (message.type === "redcap" && message.imagePath) {
        lastSyncAt = Date.now();
        showRedcapBurst(message.imagePath);
      }
    });
    channel.postMessage({ type: "live-ready" });
    window.setInterval(() => channel?.postMessage({ type: "live-ping" }), 4000);
  }

  function bindEvents() {
    els.fullscreenBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) {
        console.warn("Full screen is unavailable", error);
      }
    });
    document.addEventListener("fullscreenchange", () => {
      els.fullscreenBtn.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        state = JSON.parse(event.newValue);
        lastSyncAt = Date.now();
        render();
      } catch (error) {
        console.warn("Could not read updated Letter Blitz state", error);
      }
    });
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch (error) {
      console.warn("Could not read Letter Blitz state", error);
    }
  }

  function render() {
    updateSyncStatus();
    if (!state) {
      showView("waiting");
      renderWaitingLeaderboard([]);
      return;
    }

    const mode = inferLiveMode(state);
    if (mode === "results") renderResults();
    else if (mode === "reveal") renderReveal();
    else if (mode === "round") renderRound();
    else renderWaiting();
  }

  function inferLiveMode(sourceState) {
    if (!sourceState.currentRound) return "waiting";
    if (sourceState.currentRound.committed) return "results";
    if (["round", "reveal", "results"].includes(sourceState.ui?.liveMode)) return sourceState.ui.liveMode;
    if (sourceState.timer?.finished || hasAnyTypedAnswer(sourceState.currentRound)) return "reveal";
    return "round";
  }

  function showView(name) {
    els.waitingView.hidden = name !== "waiting";
    els.roundView.hidden = name !== "round";
    els.revealView.hidden = name !== "reveal";
    els.resultsView.hidden = name !== "results";
  }

  function renderWaiting() {
    showView("waiting");
    renderWaitingLeaderboard(state.players || []);
  }

  function renderWaitingLeaderboard(players) {
    const rows = players.slice().sort((a,b) => (Number(b.totalScore)||0) - (Number(a.totalScore)||0) || String(a.name).localeCompare(String(b.name)));
    if (!rows.length) {
      els.waitingLeaderboard.innerHTML = `<div class="waiting-leader-row"><div class="waiting-rank">—</div><div class="waiting-name">Waiting for players</div><div class="waiting-score">0</div></div>`;
      return;
    }
    els.waitingLeaderboard.innerHTML = rows.map((player, rank) => {
      const originalIndex = players.findIndex((item) => item.id === player.id);
      const colour = PLAYER_COLOURS[Math.max(0, originalIndex) % PLAYER_COLOURS.length];
      return `<div class="waiting-leader-row" style="--player:${colour}"><div class="waiting-rank">${rank + 1}</div><div class="waiting-name"><span class="player-dot"></span><span>${escapeHtml(player.name)}</span></div><div class="waiting-score">${Number(player.totalScore)||0}</div></div>`;
    }).join("");
  }

  function renderRound() {
    showView("round");
    const round = state.currentRound;
    const remaining = Math.max(0, Number(state.timer?.remaining) || 0);
    els.liveRoundNumber.textContent = round.roundNumber || state.roundNumber || 1;
    els.liveLetter.textContent = round.letter || "?";
    els.liveTimerValue.textContent = formatTimer(remaining);
    els.liveTimerCard.classList.toggle("is-urgent", remaining > 0 && remaining <= 15);
    els.liveTimerCard.classList.toggle("is-timeup", Boolean(state.timer?.finished && remaining === 0));

    if (state.timer?.running) els.liveTimerStatus.textContent = "Time remaining";
    else if (state.timer?.finished && remaining === 0) els.liveTimerStatus.textContent = "Time up";
    else if (remaining < (round.roundSeconds || state.settings?.roundSeconds || 75)) els.liveTimerStatus.textContent = "Paused";
    else els.liveTimerStatus.textContent = "Ready";

    els.liveCategoryGrid.innerHTML = (round.categories || []).map((category, index) => `
      <div class="live-category"><div class="live-category-num">${String(index + 1).padStart(2,"0")}</div><div class="live-category-name">${escapeHtml(category)}</div></div>`).join("");
  }

  function renderSpinPreview(message) {
    showView("round");
    els.liveRoundNumber.textContent = message.roundNumber || state?.roundNumber || 1;
    els.liveLetter.textContent = message.letter || "?";
    els.liveTimerStatus.textContent = "Choosing…";
    els.liveTimerValue.textContent = "—";
    els.liveTimerCard.classList.remove("is-urgent", "is-timeup");
    els.liveCategoryGrid.innerHTML = (message.categories || []).map((category, index) => `
      <div class="live-category"><div class="live-category-num">${String(index + 1).padStart(2,"0")}</div><div class="live-category-name">${escapeHtml(category)}</div></div>`).join("");
  }

  function renderReveal() {
    showView("reveal");
    const round = state.currentRound;
    const players = state.players || [];
    const summary = state.__summary || computeRoundSummary(state, round);
    const maxIndex = Math.max(0, (round.categories || []).length - 1);
    const index = clamp(Number(state.ui?.activeCategoryIndex) || 0, 0, maxIndex);
    const row = summary.rows[index];

    els.revealLetter.textContent = round.letter || "?";
    els.revealProgress.textContent = `Category ${index + 1} of ${(round.categories || []).length}`;
    els.revealCategory.textContent = round.categories?.[index] || "Category";

    els.revealGrid.innerHTML = players.map((player, playerIndex) => {
      const cell = row?.cells?.[player.id] || blankCell();
      const answer = cell.displayText || "No answer";
      return `
        <article class="reveal-card ${cell.status}" style="--player:${PLAYER_COLOURS[playerIndex % PLAYER_COLOURS.length]}">
          <div class="reveal-player"><span class="player-dot"></span><span>${escapeHtml(player.name)}</span></div>
          <div class="reveal-answer">${escapeHtml(answer)}</div>
          <div class="reveal-status"><span class="reveal-badge">${escapeHtml(cell.statusLabel)}</span><span class="reveal-points">${cell.points > 0 ? `+${cell.points}` : "0"}</span></div>
        </article>`;
    }).join("");

    els.revealCategoryDots.innerHTML = (round.categories || []).map((_, dotIndex) => `<span class="reveal-dot ${dotIndex === index ? "is-active" : ""}"></span>`).join("");
  }

  function renderResults() {
    showView("results");
    const round = state.currentRound;
    const players = state.players || [];
    const summary = state.__summary || computeRoundSummary(state, round);
    const historyRound = (state.history || []).find((item) => item.roundNumber === round.roundNumber) || state.history?.[0];
    const roundScores = new Map((historyRound?.scores || []).map((item) => [item.playerId, Number(item.score) || 0]));

    els.resultsTitle.textContent = `Round ${round.roundNumber || ""} locked in`;
    els.resultsSubtitle.textContent = `Letter ${round.letter || "?"} is done. Here’s the damage.`;

    const roundRows = players.map((player, index) => ({
      ...player,
      score: roundScores.has(player.id) ? roundScores.get(player.id) : (summary.totals[player.id] || 0),
      colour: PLAYER_COLOURS[index % PLAYER_COLOURS.length],
    })).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));

    els.roundResultsList.innerHTML = roundRows.map((player) => `
      <div class="round-result-row" style="--player:${player.colour}"><div class="result-name"><span class="player-dot"></span><span>${escapeHtml(player.name)}</span></div><div class="round-result-score">+${player.score}</div></div>`).join("");

    const standings = players.map((player, index) => ({ ...player, colour: PLAYER_COLOURS[index % PLAYER_COLOURS.length] })).sort((a,b) => (Number(b.totalScore)||0) - (Number(a.totalScore)||0) || a.name.localeCompare(b.name));
    const topScore = standings.length ? Number(standings[0].totalScore) || 0 : 0;
    els.resultsLeaderboard.innerHTML = standings.map((player, rank) => `
      <div class="results-leader-row ${topScore > 0 && Number(player.totalScore) === topScore ? "winner" : ""}" style="--player:${player.colour}"><div class="results-rank">${rank + 1}</div><div class="result-name"><span class="player-dot"></span><span>${escapeHtml(player.name)}</span></div><div class="results-total">${Number(player.totalScore)||0}</div></div>`).join("");
  }

  function updateSyncStatus() {
    const connected = lastSyncAt > 0 && Date.now() - lastSyncAt < 9000;
    els.syncStatus.textContent = connected ? "Synced to Control" : "Waiting for Control";
    els.syncStatus.classList.toggle("is-connected", connected);
  }

  function showRedcapBurst(imagePath) {
    if (redcapTimeout) window.clearTimeout(redcapTimeout);
    els.liveRedcapImage.src = imagePath;
    els.liveRedcapOverlay.hidden = false;
    redcapTimeout = window.setTimeout(() => { els.liveRedcapOverlay.hidden = true; }, 1750);
  }

  function computeRoundSummary(sourceState, round) {
    const players = sourceState.players || [];
    const summary = { rows: [], totals: Object.fromEntries(players.map((player) => [player.id, 0])) };
    if (!round) return summary;
    const roundLetter = String(round.letter || "").toLowerCase();
    const repeatedCounter = Object.fromEntries(players.map((player) => [player.id, {}]));

    (round.categories || []).forEach((category, categoryIndex) => {
      const row = { category, cells: {}, duplicateCounter: {} };
      players.forEach((player) => {
        const source = round.answers?.[categoryIndex]?.[player.id] || { text: "", manualInvalid: false };
        const displayText = tidyDisplayText(source.text || "");
        const normalised = normaliseForScoring(displayText);
        const hasText = Boolean(normalised);
        const wrongLetter = hasText ? !startsWithRoundLetter(normalised, roundLetter) : false;
        const manualInvalid = Boolean(source.manualInvalid);
        const baseValid = hasText && !wrongLetter && !manualInvalid;
        row.cells[player.id] = { displayText, normalised, hasText, wrongLetter, manualInvalid, points: 0, status: "blank", statusLabel: "Blank" };
        if (baseValid) {
          row.duplicateCounter[normalised] = (row.duplicateCounter[normalised] || 0) + 1;
          repeatedCounter[player.id][normalised] = (repeatedCounter[player.id][normalised] || 0) + 1;
        }
      });
      summary.rows.push(row);
    });

    summary.rows.forEach((row) => {
      players.forEach((player) => {
        const cell = row.cells[player.id];
        const repeatCount = repeatedCounter[player.id][cell.normalised] || 0;
        if (!cell.hasText) { cell.status = "blank"; cell.statusLabel = "Blank"; }
        else if (cell.manualInvalid) { cell.status = "invalid"; cell.statusLabel = "Redcapped"; }
        else if (cell.wrongLetter) { cell.status = "invalid"; cell.statusLabel = "Wrong letter"; }
        else if ((row.duplicateCounter[cell.normalised] || 0) > 1) { cell.status = "duplicate"; cell.statusLabel = "Duplicate"; }
        else if (repeatCount > 1) { cell.status = "repeat"; cell.statusLabel = "Repeated"; }
        else {
          const allit = isAlliterative(cell.displayText, roundLetter);
          cell.status = allit ? "alliteration" : "valid";
          cell.statusLabel = allit ? "2 pts · allit" : "1 pt";
          cell.points = allit ? 2 : 1;
        }
        summary.totals[player.id] += cell.points;
      });
    });
    return summary;
  }

  function blankCell() { return { displayText: "", points: 0, status: "blank", statusLabel: "Blank" }; }
  function hasAnyTypedAnswer(round) { return Array.isArray(round?.answers) && round.answers.some((row) => Object.values(row || {}).some((cell) => normaliseForScoring(cell?.text || ""))); }
  function startsWithRoundLetter(text, letter) { const match = String(text).match(/[a-z0-9]/i); return Boolean(match) && match[0].toLowerCase() === String(letter).toLowerCase(); }
  function isAlliterative(text, letter) { const words = (String(text).toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => !STOP_WORDS.has(word)); return words.length >= 2 && words.every((word) => word.startsWith(String(letter).toLowerCase())); }
  function tidyDisplayText(raw) { const collapsed = String(raw || "").replace(/\s+/g, " ").trim(); if (!collapsed) return ""; const uniform = collapsed === collapsed.toLowerCase() || collapsed === collapsed.toUpperCase(); return uniform ? titleCase(collapsed.toLowerCase()) : collapsed; }
  function titleCase(text) { return text.split(" ").map((word) => word.split("-").map((segment) => segment.split("'").map((piece) => piece ? piece.charAt(0).toUpperCase() + piece.slice(1) : piece).join("'")).join("-")).join(" "); }
  function normaliseForScoring(text) { let value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase().replace(/\s+/g, " ").trim(); return value.replace(/^(the|a|an)\s+/, ""); }
  function formatTimer(total) { const mins = Math.floor(total / 60); return `${mins}:${String(total % 60).padStart(2,"0")}`; }
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function escapeHtml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
})();
