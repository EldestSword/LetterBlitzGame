(() => {
  "use strict";

  // Keep the existing v0.6.0 storage key deliberately. This makes the v1 UI
  // open the current live session without any score migration or reset.
  const STORAGE_KEY = "letter-blitz-host-edition/v0.6.0";
  const BACKUP_KEY = "letter-blitz-host-edition/pre-v1.0.0-backup";
  const LEGACY_STORAGE_KEYS = [
    "letter-blitz-host-edition/v0.5.0",
    "letter-blitz-host-edition/v0.4.0",
    "letter-blitz-host-edition/v0.3.0",
    "letter-blitz-host-edition/v0.2.0",
    "letter-blitz-host-edition/v0.1.0",
  ];
  const CHANNEL_NAME = "letter-blitz-live-v1";
  const CATEGORY_DATA_URL = "data/categories.json";
  const FRIENDLY_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "W"];
  const HARD_LETTERS = ["Q", "U", "V", "X", "Y", "Z"];
  const PLAYER_COLOURS = ["var(--player-1)", "var(--player-2)", "var(--player-3)", "var(--player-4)", "var(--player-5)", "var(--player-6)", "var(--player-7)", "var(--player-8)"];
  const STOP_WORDS = new Set(["a", "an", "and", "de", "da", "del", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
  const REDCAP_IMAGE_PATHS = [
    "assets/redcap/redcap02.png",
    "assets/redcap/redcap03.png",
    "assets/redcap/redcap04.png",
    "assets/redcap/redcap05.png",
    "assets/redcap/redcap06.png",
    "assets/redcap/redcap07.png",
    "assets/redcap/redcap08.png",
    "assets/redcap/redcap09.png",
    "assets/redcap/redcap010.png",
    "assets/redcap/redcap011.png",
    "assets/redcap/redcap012.png",
    "assets/redcap/redcap013.png",
    "assets/redcap/redcap014.png",
    "assets/redcap/redcap015.png",
    "assets/redcap/redcap016.png",
    "assets/redcap/redcap017.png",
    "assets/redcap/redcap018.png",
    "assets/redcap/redcap019.png",
  ];

  let state = createDefaultState();
  let categoryBank = [];
  let categoryLoadError = "";
  let timerInterval = null;
  let isSpinning = false;
  let lastRedcapImagePath = null;
  let redcapTimeout = null;
  let liveWindow = null;
  let lastLivePingAt = 0;
  let channel = null;

  const els = {
    openLiveBtn: document.getElementById("openLiveBtn"),
    openLiveSidebarBtn: document.getElementById("openLiveSidebarBtn"),
    openSetupBtn: document.getElementById("openSetupBtn"),
    openRulesBtn: document.getElementById("openRulesBtn"),
    openHistoryBtn: document.getElementById("openHistoryBtn"),
    exportSummaryBtn: document.getElementById("exportSummaryBtn"),
    liveConnectionBadge: document.getElementById("liveConnectionBadge"),
    roundLetter: document.getElementById("roundLetter"),
    roundTitle: document.getElementById("roundTitle"),
    roundSubtitle: document.getElementById("roundSubtitle"),
    roundMeta: document.getElementById("roundMeta"),
    timerCard: document.getElementById("timerCard"),
    timerStatus: document.getElementById("timerStatus"),
    timerValue: document.getElementById("timerValue"),
    timerBar: document.getElementById("timerBar"),
    spinRoundBtn: document.getElementById("spinRoundBtn"),
    startPauseTimerBtn: document.getElementById("startPauseTimerBtn"),
    resetTimerBtn: document.getElementById("resetTimerBtn"),
    finaliseRoundBtn: document.getElementById("finaliseRoundBtn"),
    categoryBankStatus: document.getElementById("categoryBankStatus"),
    categoryRail: document.getElementById("categoryRail"),
    activeCategoryNumber: document.getElementById("activeCategoryNumber"),
    activeCategoryTitle: document.getElementById("activeCategoryTitle"),
    categoryProgress: document.getElementById("categoryProgress"),
    prevCategoryBtn: document.getElementById("prevCategoryBtn"),
    nextCategoryBtn: document.getElementById("nextCategoryBtn"),
    answerGrid: document.getElementById("answerGrid"),
    leaderboardList: document.getElementById("leaderboardList"),
    roundSnapshot: document.getElementById("roundSnapshot"),
    setupModal: document.getElementById("setupModal"),
    closeSetupBtn: document.getElementById("closeSetupBtn"),
    addPlayerBtn: document.getElementById("addPlayerBtn"),
    playerList: document.getElementById("playerList"),
    roundLengthSegment: document.getElementById("roundLengthSegment"),
    categoryCountSegment: document.getElementById("categoryCountSegment"),
    friendlyLettersToggle: document.getElementById("friendlyLettersToggle"),
    resetSessionBtn: document.getElementById("resetSessionBtn"),
    rulesModal: document.getElementById("rulesModal"),
    closeRulesBtn: document.getElementById("closeRulesBtn"),
    historyModal: document.getElementById("historyModal"),
    closeHistoryBtn: document.getElementById("closeHistoryBtn"),
    historyList: document.getElementById("historyList"),
    redcapOverlay: document.getElementById("redcapOverlay"),
    redcapImage: document.getElementById("redcapImage"),
  };

  init();

  async function init() {
    initialiseChannel();
    ensurePreV1Backup();
    await loadCategoryBank();
    state = loadState();
    ensureStateShape();
    bindEvents();
    renderAll();
    updateLiveConnectionStatus();

    if (isFreshDefaultSession()) {
      openModal(els.setupModal);
    }
  }

  function createDefaultState() {
    const players = [0, 1, 2].map((index) => ({
      id: makeId(),
      name: `Player ${index + 1}`,
      totalScore: 0,
    }));

    return {
      players,
      settings: {
        roundSeconds: 75,
        categoryCount: 12,
        friendlyLettersOnly: true,
      },
      roundNumber: 1,
      currentRound: null,
      history: [],
      timer: {
        remaining: 75,
        running: false,
        finished: false,
      },
      ui: {
        activeCategoryIndex: 0,
        liveMode: "waiting",
      },
    };
  }

  function ensurePreV1Backup() {
    try {
      if (localStorage.getItem(BACKUP_KEY)) return;
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      if (currentRaw) localStorage.setItem(BACKUP_KEY, currentRaw);
    } catch (error) {
      console.warn("Could not create the pre-v1 session backup", error);
    }
  }

  function loadState() {
    try {
      const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") continue;
        if (key !== STORAGE_KEY) localStorage.setItem(STORAGE_KEY, raw);
        return parsed;
      }
    } catch (error) {
      console.error("Failed to load Letter Blitz state", error);
    }
    return createDefaultState();
  }

  function ensureStateShape() {
    if (!Array.isArray(state.players) || !state.players.length) {
      state.players = createDefaultState().players;
    }

    state.players = state.players.slice(0, 8).map((player, index) => ({
      id: player && player.id ? String(player.id) : makeId(),
      name: player && typeof player.name === "string" && player.name.trim() ? player.name.trim() : `Player ${index + 1}`,
      totalScore: Number.isFinite(Number(player && player.totalScore)) ? Number(player.totalScore) : 0,
    }));

    if (!state.settings || typeof state.settings !== "object") state.settings = {};
    state.settings.roundSeconds = [45, 60, 75, 90, 120].includes(Number(state.settings.roundSeconds)) ? Number(state.settings.roundSeconds) : 75;
    state.settings.categoryCount = [10, 11, 12].includes(Number(state.settings.categoryCount)) ? Number(state.settings.categoryCount) : 12;
    state.settings.friendlyLettersOnly = state.settings.friendlyLettersOnly !== false;

    if (!Array.isArray(state.history)) state.history = [];
    state.roundNumber = Number.isFinite(Number(state.roundNumber)) && Number(state.roundNumber) > 0 ? Number(state.roundNumber) : state.history.length + 1;

    if (!state.timer || typeof state.timer !== "object") state.timer = {};
    state.timer.remaining = Number.isFinite(Number(state.timer.remaining)) ? Math.max(0, Math.round(Number(state.timer.remaining))) : state.settings.roundSeconds;
    state.timer.running = false;
    state.timer.finished = Boolean(state.timer.finished);

    if (state.currentRound && typeof state.currentRound === "object") {
      state.currentRound.committed = Boolean(state.currentRound.committed);
      state.currentRound.createdAt = state.currentRound.createdAt || new Date().toISOString();
      state.currentRound.roundNumber = Number.isFinite(Number(state.currentRound.roundNumber)) ? Number(state.currentRound.roundNumber) : state.roundNumber;
      state.currentRound.roundSeconds = [45, 60, 75, 90, 120].includes(Number(state.currentRound.roundSeconds)) ? Number(state.currentRound.roundSeconds) : state.settings.roundSeconds;
      state.currentRound.letter = typeof state.currentRound.letter === "string" ? state.currentRound.letter.toUpperCase() : "?";
      state.currentRound.categories = Array.isArray(state.currentRound.categories) ? state.currentRound.categories.slice(0, 12) : [];
      state.currentRound.answers = Array.isArray(state.currentRound.answers) ? state.currentRound.answers : [];
      ensureCurrentRoundShape();
    } else {
      state.currentRound = null;
    }

    if (!state.ui || typeof state.ui !== "object") state.ui = {};
    const maxIndex = state.currentRound ? Math.max(0, state.currentRound.categories.length - 1) : 0;
    state.ui.activeCategoryIndex = clamp(Number(state.ui.activeCategoryIndex) || 0, 0, maxIndex);

    if (state.currentRound?.committed) {
      state.ui.liveMode = "results";
    } else if (state.currentRound) {
      state.ui.liveMode = state.timer.finished || hasAnyTypedAnswer(state.currentRound) ? "reveal" : "round";
    } else {
      state.ui.liveMode = "waiting";
      state.timer.remaining = state.settings.roundSeconds;
      state.timer.finished = false;
    }

    saveState();
  }

  function initialiseChannel() {
    if (!("BroadcastChannel" in window)) return;
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type === "live-ready" || message.type === "live-ping") {
        lastLivePingAt = Date.now();
        updateLiveConnectionStatus();
        broadcastState();
      }
    });
  }

  async function loadCategoryBank() {
    categoryLoadError = "";
    try {
      const response = await fetch(CATEGORY_DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      if (!Array.isArray(parsed) || parsed.length < 12) throw new Error("Invalid category bank");
      categoryBank = parsed.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
      if (categoryBank.length < 12) throw new Error("Not enough categories");
    } catch (error) {
      console.error("Failed to load categories", error);
      categoryLoadError = "Category file unavailable";
      categoryBank = [];
    }
  }

  function bindEvents() {
    els.openLiveBtn.addEventListener("click", openLiveScreen);
    els.openLiveSidebarBtn.addEventListener("click", openLiveScreen);
    els.openSetupBtn.addEventListener("click", () => openModal(els.setupModal));
    els.closeSetupBtn.addEventListener("click", () => closeModal(els.setupModal));
    els.openRulesBtn.addEventListener("click", () => openModal(els.rulesModal));
    els.closeRulesBtn.addEventListener("click", () => closeModal(els.rulesModal));
    els.openHistoryBtn.addEventListener("click", () => openModal(els.historyModal));
    els.closeHistoryBtn.addEventListener("click", () => closeModal(els.historyModal));
    els.exportSummaryBtn.addEventListener("click", handleExportSummary);

    [els.setupModal, els.rulesModal, els.historyModal].forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(modal);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeModal(els.setupModal);
      closeModal(els.rulesModal);
      closeModal(els.historyModal);
    });

    els.spinRoundBtn.addEventListener("click", handleSpinRound);
    els.startPauseTimerBtn.addEventListener("click", handleStartPauseTimer);
    els.resetTimerBtn.addEventListener("click", handleResetTimer);
    els.finaliseRoundBtn.addEventListener("click", handleFinaliseRound);
    els.prevCategoryBtn.addEventListener("click", () => setActiveCategory((state.ui.activeCategoryIndex || 0) - 1));
    els.nextCategoryBtn.addEventListener("click", () => setActiveCategory((state.ui.activeCategoryIndex || 0) + 1));

    els.categoryRail.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category-index]");
      if (!button || !state.currentRound) return;
      setActiveCategory(Number(button.dataset.categoryIndex));
    });

    els.answerGrid.addEventListener("input", handleAnswerInput);
    els.answerGrid.addEventListener("blur", handleAnswerBlur, true);
    els.answerGrid.addEventListener("click", handleAnswerGridClick);
    els.answerGrid.addEventListener("keydown", handleAnswerKeydown);

    els.addPlayerBtn.addEventListener("click", handleAddPlayer);
    els.playerList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='remove-player']");
      if (!button) return;
      handleRemovePlayer(button.dataset.playerId);
    });
    els.playerList.addEventListener("change", (event) => {
      const input = event.target.closest("[data-action='rename-player']");
      if (!input) return;
      const player = state.players.find((item) => item.id === input.dataset.playerId);
      if (!player) return;
      const index = state.players.findIndex((item) => item.id === player.id);
      player.name = input.value.trim() || `Player ${index + 1}`;
      input.value = player.name;
      ensureCurrentRoundShape();
      saveState();
      renderAll();
    });

    els.roundLengthSegment.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='set-round-seconds']");
      if (!button) return;
      const value = Number(button.dataset.value);
      if (![45, 60, 75, 90, 120].includes(value)) return;
      state.settings.roundSeconds = value;
      if (!state.currentRound || state.currentRound.committed) {
        state.timer.remaining = value;
        state.timer.finished = false;
      }
      saveState();
      renderAll();
    });

    els.categoryCountSegment.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='set-category-count']");
      if (!button) return;
      const value = Number(button.dataset.value);
      if (![10, 11, 12].includes(value)) return;
      state.settings.categoryCount = value;
      saveState();
      renderAll();
    });

    els.friendlyLettersToggle.addEventListener("change", () => {
      state.settings.friendlyLettersOnly = els.friendlyLettersToggle.checked;
      saveState();
      renderRoundConsole();
    });

    els.resetSessionBtn.addEventListener("click", handleResetSession);

    window.setInterval(updateLiveConnectionStatus, 2500);
  }

  function openLiveScreen() {
    try {
      if (!liveWindow || liveWindow.closed) {
        liveWindow = window.open("live.html", "letter-blitz-live");
      }
      if (liveWindow) {
        liveWindow.focus();
        lastLivePingAt = Date.now();
        window.setTimeout(broadcastState, 150);
      }
    } catch (error) {
      console.error("Could not open live screen", error);
    }
    updateLiveConnectionStatus();
  }

  function updateLiveConnectionStatus() {
    const connected = Date.now() - lastLivePingAt < 8000 || Boolean(liveWindow && !liveWindow.closed);
    els.liveConnectionBadge.textContent = connected ? "Connected" : "Not open";
    els.liveConnectionBadge.classList.toggle("is-connected", connected);
    els.openLiveBtn.classList.toggle("is-connected", connected);
  }

  async function handleSpinRound() {
    if (isSpinning || categoryBank.length < state.settings.categoryCount) return;

    if (state.currentRound && !state.currentRound.committed && (hasAnyTypedAnswer(state.currentRound) || state.timer.remaining !== state.currentRound.roundSeconds || state.timer.finished)) {
      const proceed = window.confirm("This round is not finalised. Spinning again will replace it. Carry on?");
      if (!proceed) return;
    }

    stopTimer();
    isSpinning = true;
    updateControlStates();
    els.roundLetter.classList.add("is-spinning");
    els.spinRoundBtn.textContent = "Spinning…";

    const selectedLetter = pickLetter();
    const selectedCategories = pickCategories(state.settings.categoryCount);
    const pool = getLetterPool();

    for (let cycle = 0; cycle < 12; cycle += 1) {
      const previewLetter = randomItem(pool);
      const previewCategories = sampleWithoutReplacement(categoryBank, state.settings.categoryCount);
      els.roundLetter.textContent = previewLetter;
      renderCategoryRailPreview(previewCategories);
      broadcastEvent({ type: "spin-preview", letter: previewLetter, categories: previewCategories, roundNumber: state.roundNumber });
      await delay(72 + cycle * 4);
    }

    state.currentRound = createRound(selectedLetter, selectedCategories);
    state.timer.remaining = state.settings.roundSeconds;
    state.timer.running = false;
    state.timer.finished = false;
    state.ui.activeCategoryIndex = 0;
    state.ui.liveMode = "round";

    isSpinning = false;
    els.roundLetter.classList.remove("is-spinning");
    els.spinRoundBtn.textContent = "Spin round";
    saveState();
    renderAll();
  }

  function handleStartPauseTimer() {
    if (!state.currentRound || state.currentRound.committed || isSpinning) return;

    if (state.timer.running) {
      stopTimer();
      saveState();
      renderAll();
      return;
    }

    if (state.timer.remaining <= 0) {
      state.timer.remaining = state.currentRound.roundSeconds || state.settings.roundSeconds;
      state.timer.finished = false;
    }

    const endAt = Date.now() + state.timer.remaining * 1000;
    state.timer.running = true;
    state.timer.finished = false;
    state.ui.liveMode = "round";
    saveState();
    renderAll();

    timerInterval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (remaining !== state.timer.remaining) {
        state.timer.remaining = remaining;
        if (remaining <= 0) {
          stopTimer();
          state.timer.remaining = 0;
          state.timer.finished = true;
          state.ui.liveMode = "reveal";
        }
        saveState();
        renderRoundConsole();
        renderRoundSnapshot();
        updateControlStates();
      }
    }, 120);
  }

  function handleResetTimer() {
    if (!state.currentRound) return;
    stopTimer();
    state.timer.remaining = state.currentRound.roundSeconds || state.settings.roundSeconds;
    state.timer.finished = false;
    state.ui.liveMode = "round";
    saveState();
    renderAll();
  }

  function handleFinaliseRound() {
    if (!state.currentRound || state.currentRound.committed) return;
    stopTimer();

    const summary = computeRoundSummary(state.currentRound);
    state.players.forEach((player) => {
      player.totalScore += summary.totals[player.id] || 0;
    });

    const historyEntry = {
      roundNumber: state.currentRound.roundNumber || state.roundNumber,
      letter: state.currentRound.letter,
      categories: [...state.currentRound.categories],
      categoryCount: state.currentRound.categories.length,
      roundSeconds: state.currentRound.roundSeconds || state.settings.roundSeconds,
      committedAt: new Date().toISOString(),
      scores: state.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        score: summary.totals[player.id] || 0,
      })),
    };

    state.history.unshift(historyEntry);
    state.currentRound.committed = true;
    state.currentRound.committedAt = historyEntry.committedAt;
    state.roundNumber += 1;
    state.timer.running = false;
    state.timer.finished = true;
    state.ui.liveMode = "results";
    saveState();
    renderAll();
  }

  function handleAnswerInput(event) {
    const input = event.target.closest("[data-action='answer-input']");
    if (!input || !state.currentRound || state.currentRound.committed) return;
    const playerId = input.dataset.playerId;
    const cell = getRoundCell(state.ui.activeCategoryIndex, playerId);
    if (!cell) return;
    cell.text = input.value;
    saveState();
    refreshScoringUI();
  }

  function handleAnswerBlur(event) {
    const input = event.target.closest("[data-action='answer-input']");
    if (!input || !state.currentRound || state.currentRound.committed) return;
    const cell = getRoundCell(state.ui.activeCategoryIndex, input.dataset.playerId);
    if (!cell) return;
    const tidied = tidyDisplayText(input.value);
    cell.text = tidied;
    input.value = tidied;
    saveState();
    refreshScoringUI();
  }

  function handleAnswerGridClick(event) {
    const button = event.target.closest("[data-action='toggle-redcap']");
    if (!button || !state.currentRound || state.currentRound.committed) return;
    const cell = getRoundCell(state.ui.activeCategoryIndex, button.dataset.playerId);
    if (!cell || !normaliseForScoring(cell.text || "")) return;
    const becomingRedcapped = !cell.manualInvalid;
    cell.manualInvalid = becomingRedcapped;

    if (becomingRedcapped) {
      const imagePath = getRandomRedcapImagePath();
      showRedcapBurst(imagePath);
      broadcastEvent({ type: "redcap", imagePath });
    }

    saveState();
    refreshScoringUI();
  }

  function handleAnswerKeydown(event) {
    const input = event.target.closest("[data-action='answer-input']");
    if (!input || event.key !== "Enter") return;
    event.preventDefault();

    const playerIndex = state.players.findIndex((player) => player.id === input.dataset.playerId);
    if (playerIndex < 0) return;

    if (event.shiftKey) {
      if (playerIndex > 0) {
        focusPlayerInput(state.players[playerIndex - 1].id);
      } else if (state.ui.activeCategoryIndex > 0) {
        setActiveCategory(state.ui.activeCategoryIndex - 1, { focusPlayerId: state.players[state.players.length - 1].id });
      }
      return;
    }

    if (playerIndex < state.players.length - 1) {
      focusPlayerInput(state.players[playerIndex + 1].id);
    } else if (state.ui.activeCategoryIndex < state.currentRound.categories.length - 1) {
      setActiveCategory(state.ui.activeCategoryIndex + 1, { focusPlayerId: state.players[0].id });
    }
  }

  function setActiveCategory(index, options = {}) {
    if (!state.currentRound?.categories?.length) return;
    state.ui.activeCategoryIndex = clamp(index, 0, state.currentRound.categories.length - 1);
    if (state.timer.finished || hasAnyTypedAnswer(state.currentRound)) state.ui.liveMode = "reveal";
    saveState();
    renderCategoryRail();
    renderAnswerWorkspace();
    renderRoundSnapshot();
    if (options.focusPlayerId) {
      window.setTimeout(() => focusPlayerInput(options.focusPlayerId), 0);
    }
  }

  function focusPlayerInput(playerId) {
    const input = els.answerGrid.querySelector(`[data-action='answer-input'][data-player-id="${cssEscape(playerId)}"]`);
    if (!input) return;
    input.focus();
    input.select();
  }

  function handleAddPlayer() {
    if (state.players.length >= 8) return;
    state.players.push({ id: makeId(), name: `Player ${state.players.length + 1}`, totalScore: 0 });
    ensureCurrentRoundShape();
    saveState();
    renderAll();
  }

  function handleRemovePlayer(playerId) {
    if (state.players.length <= 1) return;
    const index = state.players.findIndex((player) => player.id === playerId);
    if (index < 0) return;
    const player = state.players[index];
    const message = player.totalScore > 0
      ? `Remove ${player.name}? Their ${player.totalScore} session points will disappear from the live standings. Finalised history remains unchanged.`
      : `Remove ${player.name}?`;
    if (!window.confirm(message)) return;
    state.players.splice(index, 1);
    ensureCurrentRoundShape();
    saveState();
    renderAll();
  }

  function handleResetSession() {
    const proceed = window.confirm("Reset the whole Letter Blitz session? This clears players, current scores, round history and the live round. A pre-v1 backup is kept separately.");
    if (!proceed) return;
    stopTimer();
    state = createDefaultState();
    saveState();
    renderAll();
    openModal(els.setupModal);
  }

  function renderAll() {
    renderRoundConsole();
    renderCategoryRail();
    renderAnswerWorkspace();
    renderLeaderboard();
    renderRoundSnapshot();
    renderPlayers();
    updateSegments();
    renderHistory();
    updateControlStates();
  }

  function renderRoundConsole() {
    const round = state.currentRound;
    const roundSeconds = round?.roundSeconds || state.settings.roundSeconds;
    const remaining = clamp(Number(state.timer.remaining) || 0, 0, roundSeconds);
    const progress = roundSeconds > 0 ? (remaining / roundSeconds) * 100 : 0;

    els.roundLetter.textContent = round?.letter || "?";
    els.timerValue.textContent = formatTimer(remaining);
    els.timerBar.querySelector("span").style.width = `${progress}%`;
    els.timerCard.classList.toggle("is-urgent", remaining > 0 && remaining <= 15);
    els.timerCard.classList.toggle("is-timeup", Boolean(round && state.timer.finished && remaining === 0));

    if (!round) {
      els.roundTitle.textContent = "Ready when you are";
      els.roundSubtitle.textContent = categoryLoadError ? "The category file could not be loaded." : "Open the live screen, then spin your next round.";
      els.timerStatus.textContent = "Ready";
      els.roundMeta.innerHTML = [
        metaPill(`Round ${state.roundNumber} queued`),
        metaPill(`${state.players.length} player${state.players.length === 1 ? "" : "s"}`),
        metaPill(`${state.settings.roundSeconds} sec`),
        metaPill(`${state.settings.categoryCount} categories`),
      ].join("");
      return;
    }

    els.roundTitle.textContent = `Round ${round.roundNumber || state.roundNumber} · Letter ${round.letter}`;
    if (round.committed) {
      els.roundSubtitle.textContent = "Round finalised. Spin when you’re ready for the next one.";
    } else if (state.timer.running) {
      els.roundSubtitle.textContent = "Round is live. The presentation screen is keeping answers hidden.";
    } else if (state.timer.finished) {
      els.roundSubtitle.textContent = "Time’s up. Judge the answers category by category.";
    } else if (hasAnyTypedAnswer(round)) {
      els.roundSubtitle.textContent = "Reveal in progress.";
    } else {
      els.roundSubtitle.textContent = "Categories stay visible for the whole round.";
    }

    if (round.committed) els.timerStatus.textContent = "Locked";
    else if (state.timer.running) els.timerStatus.textContent = "Running";
    else if (state.timer.finished && remaining === 0) els.timerStatus.textContent = "Time up";
    else if (remaining !== roundSeconds) els.timerStatus.textContent = "Paused";
    else els.timerStatus.textContent = "Ready";

    const summary = computeRoundSummary(round);
    const filled = countFilledAnswers(round);
    const totalSlots = round.categories.length * state.players.length;
    const leader = findLiveRoundLeader(summary.totals);
    els.roundMeta.innerHTML = [
      metaPill(`${round.categories.length} categories`),
      metaPill(`${filled} / ${totalSlots} answers entered`),
      metaPill(leader ? `Round leader: ${leader}` : "No round leader yet"),
    ].join("");
  }

  function renderCategoryRail() {
    if (categoryLoadError) {
      els.categoryBankStatus.textContent = categoryLoadError;
      els.categoryBankStatus.classList.add("is-error");
    } else {
      els.categoryBankStatus.textContent = `${categoryBank.length} categories in the bank`;
      els.categoryBankStatus.classList.remove("is-error");
    }

    if (!state.currentRound?.categories?.length) {
      els.categoryRail.innerHTML = `<div class="category-empty">Spin a round and the complete category board will stay here throughout.</div>`;
      return;
    }

    const summary = computeRoundSummary(state.currentRound);
    els.categoryRail.innerHTML = state.currentRound.categories.map((category, index) => {
      const entered = state.players.filter((player) => summary.rows[index]?.cells[player.id]?.hasText).length;
      return `
        <button class="category-chip ${index === state.ui.activeCategoryIndex ? "is-active" : ""}" type="button" data-category-index="${index}">
          <span class="category-chip-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="category-chip-name">${escapeHtml(category)}</span>
          <span class="category-chip-entered">${entered}/${state.players.length} entered</span>
        </button>`;
    }).join("");
  }

  function renderCategoryRailPreview(categories) {
    els.categoryRail.innerHTML = categories.map((category, index) => `
      <button class="category-chip" type="button" disabled>
        <span class="category-chip-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="category-chip-name">${escapeHtml(category)}</span>
      </button>`).join("");
  }

  function renderAnswerWorkspace() {
    const round = state.currentRound;
    if (!round?.categories?.length) {
      els.activeCategoryNumber.textContent = "--";
      els.activeCategoryTitle.textContent = "Spin a round to begin";
      els.categoryProgress.textContent = "0 / 0";
      els.answerGrid.innerHTML = `<div class="answer-empty">The reveal desk will show one category at a time, with every player visible together.</div>`;
      els.prevCategoryBtn.disabled = true;
      els.nextCategoryBtn.disabled = true;
      return;
    }

    const index = clamp(state.ui.activeCategoryIndex || 0, 0, round.categories.length - 1);
    state.ui.activeCategoryIndex = index;
    const summary = computeRoundSummary(round);
    const row = summary.rows[index];

    els.activeCategoryNumber.textContent = String(index + 1).padStart(2, "0");
    els.activeCategoryTitle.textContent = round.categories[index];
    els.categoryProgress.textContent = `${index + 1} / ${round.categories.length}`;
    els.prevCategoryBtn.disabled = index <= 0;
    els.nextCategoryBtn.disabled = index >= round.categories.length - 1;

    els.answerGrid.innerHTML = state.players.map((player, playerIndex) => {
      const cell = row.cells[player.id];
      return `
        <article class="answer-card state-${cell.status}" data-player-id="${escapeAttribute(player.id)}" style="--player:${PLAYER_COLOURS[playerIndex % PLAYER_COLOURS.length]}">
          <div class="answer-card-head">
            <div class="answer-player"><span class="player-dot"></span><span>${escapeHtml(player.name)}</span></div>
            <span class="status-badge badge-${cell.status}">${escapeHtml(cell.statusLabel)}</span>
          </div>
          <div class="answer-input-row">
            <input class="answer-input" type="text" maxlength="48" value="${escapeAttribute(cell.displayText)}" placeholder="Type answer…" data-action="answer-input" data-player-id="${escapeAttribute(player.id)}" ${round.committed ? "disabled" : ""} aria-label="${escapeAttribute(player.name)} answer for ${escapeAttribute(round.categories[index])}" />
            <button class="redcap-btn ${cell.manualInvalid ? "is-active" : ""}" type="button" data-action="toggle-redcap" data-player-id="${escapeAttribute(player.id)}" ${round.committed || !cell.displayText ? "disabled" : ""}>${cell.manualInvalid ? "Undo" : "Redcap"}</button>
          </div>
          <div class="answer-points">${cell.points > 0 ? `${cell.points} point${cell.points === 1 ? "" : "s"}` : cell.hasText ? "0 points" : "Awaiting answer"}</div>
        </article>`;
    }).join("");
  }

  function refreshScoringUI() {
    if (!state.currentRound) return;
    const summary = computeRoundSummary(state.currentRound);
    const row = summary.rows[state.ui.activeCategoryIndex];
    if (!row) return;

    state.players.forEach((player) => {
      const card = els.answerGrid.querySelector(`.answer-card[data-player-id="${cssEscape(player.id)}"]`);
      if (!card) return;
      const cell = row.cells[player.id];
      card.className = `answer-card state-${cell.status}`;
      const badge = card.querySelector(".status-badge");
      badge.className = `status-badge badge-${cell.status}`;
      badge.textContent = cell.statusLabel;
      const redcapButton = card.querySelector(".redcap-btn");
      redcapButton.classList.toggle("is-active", cell.manualInvalid);
      redcapButton.textContent = cell.manualInvalid ? "Undo" : "Redcap";
      redcapButton.disabled = state.currentRound.committed || !cell.displayText;
      const points = card.querySelector(".answer-points");
      points.textContent = cell.points > 0 ? `${cell.points} point${cell.points === 1 ? "" : "s"}` : cell.hasText ? "0 points" : "Awaiting answer";
    });

    renderCategoryRail();
    renderLeaderboard(summary.totals);
    renderRoundSnapshot();
    renderRoundConsole();
  }

  function renderLeaderboard(liveTotals = null) {
    const totals = liveTotals || (state.currentRound ? computeRoundSummary(state.currentRound).totals : {});
    const rows = state.players.map((player, index) => ({
      ...player,
      colour: PLAYER_COLOURS[index % PLAYER_COLOURS.length],
      roundScore: totals[player.id] || 0,
    })).sort((a, b) => b.totalScore - a.totalScore || b.roundScore - a.roundScore || a.name.localeCompare(b.name));

    if (!rows.length) {
      els.leaderboardList.innerHTML = `<p class="placeholder">No players yet.</p>`;
      return;
    }

    els.leaderboardList.innerHTML = rows.map((player, rank) => `
      <div class="leader-row" style="--player:${player.colour}">
        <div class="leader-rank">${rank + 1}</div>
        <div class="leader-main">
          <div class="leader-name"><span class="player-dot"></span><strong>${escapeHtml(player.name)}</strong></div>
          <div class="leader-round">${state.currentRound ? `${state.currentRound.committed ? "Last" : "Live"} round: ${player.roundScore}` : "No live round"}</div>
        </div>
        <div class="leader-total">${player.totalScore}</div>
      </div>`).join("");
  }

  function renderRoundSnapshot() {
    const round = state.currentRound;
    if (!round) {
      els.roundSnapshot.innerHTML = `
        <div class="snapshot-row"><span>Next round</span><strong>${state.roundNumber}</strong></div>
        <div class="snapshot-row"><span>Players</span><strong>${state.players.length}</strong></div>
        <div class="snapshot-row"><span>Categories</span><strong>${state.settings.categoryCount}</strong></div>
        <div class="snapshot-row"><span>Timer</span><strong>${state.settings.roundSeconds}s</strong></div>`;
      return;
    }
    const summary = computeRoundSummary(round);
    const filled = countFilledAnswers(round);
    els.roundSnapshot.innerHTML = `
      <div class="snapshot-row"><span>Letter</span><strong>${escapeHtml(round.letter)}</strong></div>
      <div class="snapshot-row"><span>Answers</span><strong>${filled}/${round.categories.length * state.players.length}</strong></div>
      <div class="snapshot-row"><span>Round leader</span><strong>${escapeHtml(findLiveRoundLeader(summary.totals) || "—")}</strong></div>
      <div class="snapshot-row"><span>Presentation</span><strong>${escapeHtml(liveModeLabel(state.ui.liveMode))}</strong></div>`;
  }

  function renderPlayers() {
    els.playerList.innerHTML = state.players.map((player, index) => `
      <div class="player-row" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}">
        <div class="player-index">${index + 1}</div>
        <input class="player-name-input" type="text" maxlength="24" value="${escapeAttribute(player.name)}" data-action="rename-player" data-player-id="${escapeAttribute(player.id)}" aria-label="Player ${index + 1} name" />
        <button class="remove-player" type="button" data-action="remove-player" data-player-id="${escapeAttribute(player.id)}" aria-label="Remove ${escapeAttribute(player.name)}" ${state.players.length === 1 ? "disabled" : ""}>×</button>
      </div>`).join("");
    els.addPlayerBtn.disabled = state.players.length >= 8;
  }

  function updateSegments() {
    els.roundLengthSegment.querySelectorAll(".segment-btn").forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.value) === state.settings.roundSeconds);
    });
    els.categoryCountSegment.querySelectorAll(".segment-btn").forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.value) === state.settings.categoryCount);
    });
    els.friendlyLettersToggle.checked = state.settings.friendlyLettersOnly;
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historyList.innerHTML = `<p class="placeholder">No rounds have been finalised yet.</p>`;
      return;
    }
    els.historyList.innerHTML = state.history.map((round) => `
      <article class="history-card">
        <div class="history-card-head">
          <div><h3>Round ${round.roundNumber}</h3><div class="history-categories">${round.committedAt ? new Date(round.committedAt).toLocaleString("en-GB") : ""}</div></div>
          <span>${escapeHtml(round.letter || "?")}</span>
        </div>
        <div class="history-categories">${escapeHtml((round.categories || []).join(" · "))}</div>
        <div class="history-scores">${(round.scores || []).slice().sort((a,b) => b.score - a.score).map((score) => `<span class="history-score">${escapeHtml(score.name)} <strong>${Number(score.score) || 0}</strong></span>`).join("")}</div>
      </article>`).join("");
  }

  function updateControlStates() {
    const round = state.currentRound;
    const committed = Boolean(round?.committed);
    els.spinRoundBtn.disabled = isSpinning || state.players.length === 0 || categoryBank.length < state.settings.categoryCount;
    els.startPauseTimerBtn.disabled = isSpinning || !round || committed;
    els.resetTimerBtn.disabled = isSpinning || !round || committed;
    els.finaliseRoundBtn.disabled = isSpinning || !round || committed;
    els.startPauseTimerBtn.textContent = state.timer.running ? "Pause timer" : (state.timer.remaining < (round?.roundSeconds || state.settings.roundSeconds) && !state.timer.finished ? "Resume timer" : "Start timer");
    els.finaliseRoundBtn.textContent = committed ? "Round finalised" : "Finalise round";
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    const anyOpen = [els.setupModal, els.rulesModal, els.historyModal].some((item) => !item.hidden);
    if (!anyOpen) document.body.style.overflow = "";
  }

  function showRedcapBurst(imagePath) {
    if (redcapTimeout) window.clearTimeout(redcapTimeout);
    els.redcapImage.src = imagePath;
    els.redcapOverlay.hidden = false;
    redcapTimeout = window.setTimeout(() => {
      els.redcapOverlay.hidden = true;
    }, 1500);
  }

  function getRandomRedcapImagePath() {
    let choices = REDCAP_IMAGE_PATHS;
    if (lastRedcapImagePath && REDCAP_IMAGE_PATHS.length > 1) {
      choices = REDCAP_IMAGE_PATHS.filter((path) => path !== lastRedcapImagePath);
    }
    lastRedcapImagePath = randomItem(choices);
    return lastRedcapImagePath;
  }

  function handleExportSummary() {
    const now = new Date();
    const lines = [
      "# Letter Blitz session summary",
      "",
      `Generated: ${now.toLocaleString("en-GB")}`,
      "",
      "## Overall leaderboard",
      ...state.players.slice().sort((a,b) => b.totalScore - a.totalScore).map((player, index) => `${index + 1}. ${player.name} — ${player.totalScore}`),
      "",
      "## Finalised rounds",
      "",
    ];

    if (!state.history.length) lines.push("- None yet");
    state.history.slice().reverse().forEach((round) => {
      lines.push(`### Round ${round.roundNumber} — Letter ${round.letter}`);
      lines.push(`- Categories: ${(round.categories || []).join(" | ")}`);
      lines.push("- Scores:");
      (round.scores || []).forEach((score) => lines.push(`  - ${score.name}: ${score.score}`));
      lines.push("");
    });

    downloadTextFile(`letter-blitz-${formatFileStamp(now)}.md`, lines.join("\n"));
  }

  function createRound(letter, categories) {
    return {
      id: makeId(),
      createdAt: new Date().toISOString(),
      roundNumber: state.roundNumber,
      roundSeconds: state.settings.roundSeconds,
      committed: false,
      letter,
      categories,
      answers: categories.map(() => Object.fromEntries(state.players.map((player) => [player.id, { text: "", manualInvalid: false }]))),
    };
  }

  function ensureCurrentRoundShape() {
    if (!state.currentRound) return;
    if (!Array.isArray(state.currentRound.answers)) state.currentRound.answers = [];
    state.currentRound.categories.forEach((_, categoryIndex) => {
      if (!state.currentRound.answers[categoryIndex] || typeof state.currentRound.answers[categoryIndex] !== "object") {
        state.currentRound.answers[categoryIndex] = {};
      }
      state.players.forEach((player) => {
        const existing = state.currentRound.answers[categoryIndex][player.id];
        if (!existing || typeof existing !== "object") {
          state.currentRound.answers[categoryIndex][player.id] = { text: "", manualInvalid: false };
        } else {
          existing.text = typeof existing.text === "string" ? existing.text : "";
          existing.manualInvalid = Boolean(existing.manualInvalid);
        }
      });
      Object.keys(state.currentRound.answers[categoryIndex]).forEach((playerId) => {
        if (!state.players.some((player) => player.id === playerId)) delete state.currentRound.answers[categoryIndex][playerId];
      });
    });
  }

  function getRoundCell(categoryIndex, playerId) {
    if (!state.currentRound) return null;
    ensureCurrentRoundShape();
    return state.currentRound.answers?.[categoryIndex]?.[playerId] || null;
  }

  function computeRoundSummary(round) {
    const summary = { rows: [], totals: Object.fromEntries(state.players.map((player) => [player.id, 0])) };
    if (!round) return summary;

    const roundLetter = String(round.letter || "").toLowerCase();
    const repeatedCounterByPlayer = Object.fromEntries(state.players.map((player) => [player.id, {}]));

    round.categories.forEach((category, categoryIndex) => {
      const row = { category, categoryIndex, cells: {}, duplicateCounter: {} };

      state.players.forEach((player) => {
        const source = round.answers?.[categoryIndex]?.[player.id] || { text: "", manualInvalid: false };
        const displayText = tidyDisplayText(source.text || "");
        const normalised = normaliseForScoring(displayText);
        const hasText = Boolean(normalised);
        const wrongLetter = hasText ? !startsWithRoundLetter(normalised, roundLetter) : false;
        const manualInvalid = Boolean(source.manualInvalid);
        const baseValid = hasText && !wrongLetter && !manualInvalid;

        row.cells[player.id] = {
          displayText,
          normalised,
          hasText,
          wrongLetter,
          manualInvalid,
          baseValid,
          points: 0,
          status: "blank",
          statusLabel: "Blank",
        };

        if (baseValid) {
          row.duplicateCounter[normalised] = (row.duplicateCounter[normalised] || 0) + 1;
          repeatedCounterByPlayer[player.id][normalised] = (repeatedCounterByPlayer[player.id][normalised] || 0) + 1;
        }
      });

      summary.rows.push(row);
    });

    summary.rows.forEach((row) => {
      state.players.forEach((player) => {
        const cell = row.cells[player.id];
        const repeatedCount = repeatedCounterByPlayer[player.id][cell.normalised] || 0;

        if (!cell.hasText) {
          cell.status = "blank";
          cell.statusLabel = "Blank";
        } else if (cell.manualInvalid) {
          cell.status = "invalid";
          cell.statusLabel = "Redcapped";
        } else if (cell.wrongLetter) {
          cell.status = "invalid";
          cell.statusLabel = "Wrong letter";
        } else if ((row.duplicateCounter[cell.normalised] || 0) > 1) {
          cell.status = "duplicate";
          cell.statusLabel = "Duplicate";
        } else if (repeatedCount > 1) {
          cell.status = "repeat";
          cell.statusLabel = "Repeated";
        } else {
          const alliterative = isAlliterative(cell.displayText, roundLetter);
          cell.status = alliterative ? "alliteration" : "valid";
          cell.statusLabel = alliterative ? "2 pts · allit" : "1 pt";
          cell.points = alliterative ? 2 : 1;
        }

        summary.totals[player.id] += cell.points;
      });
    });

    return summary;
  }

  function pickLetter() {
    const pool = getLetterPool();
    const recent = state.history.slice(0, 2).map((round) => round.letter);
    if (state.currentRound?.letter) recent.push(state.currentRound.letter);
    const candidates = pool.filter((letter) => !recent.includes(letter));
    return randomItem(candidates.length ? candidates : pool);
  }

  function pickCategories(count) {
    const used = new Set();
    state.history.forEach((round) => (round.categories || []).forEach((category) => used.add(category)));
    if (state.currentRound?.categories) state.currentRound.categories.forEach((category) => used.add(category));
    let pool = categoryBank.filter((category) => !used.has(category));
    if (pool.length < count) pool = [...categoryBank];
    return sampleWithoutReplacement(pool, count);
  }

  function getLetterPool() {
    return state.settings.friendlyLettersOnly ? [...FRIENDLY_LETTERS] : [...FRIENDLY_LETTERS, ...HARD_LETTERS];
  }

  function hasAnyTypedAnswer(round) {
    if (!round || !Array.isArray(round.answers)) return false;
    return round.answers.some((row) => Object.values(row || {}).some((cell) => normaliseForScoring(cell?.text || "")));
  }

  function countFilledAnswers(round) {
    if (!round || !Array.isArray(round.answers)) return 0;
    let total = 0;
    round.answers.forEach((row) => Object.values(row || {}).forEach((cell) => {
      if (normaliseForScoring(cell?.text || "")) total += 1;
    }));
    return total;
  }

  function findLiveRoundLeader(totals) {
    const ranked = state.players.map((player) => ({ name: player.name, score: totals[player.id] || 0 })).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    if (!ranked.length || ranked[0].score <= 0) return "";
    const top = ranked[0].score;
    return ranked.filter((item) => item.score === top).map((item) => item.name).join(" & ");
  }

  function startsWithRoundLetter(normalisedText, roundLetter) {
    const match = normalisedText.match(/[a-z0-9]/i);
    return Boolean(match) && match[0].toLowerCase() === String(roundLetter).toLowerCase();
  }

  function isAlliterative(text, roundLetter) {
    const words = (String(text).toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => !STOP_WORDS.has(word));
    return words.length >= 2 && words.every((word) => word.startsWith(String(roundLetter).toLowerCase()));
  }

  function tidyDisplayText(raw) {
    const collapsed = String(raw || "").replace(/\s+/g, " ").trim();
    if (!collapsed) return "";
    const uniformCase = collapsed === collapsed.toLowerCase() || collapsed === collapsed.toUpperCase();
    return uniformCase ? titleCase(collapsed.toLowerCase()) : collapsed;
  }

  function titleCase(text) {
    return text.split(" ").map((word) => word.split("-").map((segment) => segment.split("'").map((piece) => piece ? piece.charAt(0).toUpperCase() + piece.slice(1) : piece).join("'")).join("-")).join(" ");
  }

  function normaliseForScoring(text) {
    let value = String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    value = value.replace(/^(the|a|an)\s+/, "");
    return value;
  }

  function stopTimer() {
    if (timerInterval) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    state.timer.running = false;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save Letter Blitz state", error);
    }
    broadcastState();
  }

  function broadcastState() {
    if (!channel) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.__summary = state.currentRound ? computeRoundSummary(state.currentRound) : null;
    channel.postMessage({ type: "state", state: snapshot });
  }

  function broadcastEvent(message) {
    if (channel) channel.postMessage(message);
  }

  function isFreshDefaultSession() {
    return !state.currentRound && !state.history.length && state.players.length === 3 && state.players.every((player, index) => player.totalScore === 0 && player.name === `Player ${index + 1}`);
  }

  function liveModeLabel(mode) {
    if (mode === "round") return "Round board";
    if (mode === "reveal") return "Answer reveal";
    if (mode === "results") return "Results";
    return "Waiting";
  }

  function metaPill(text) { return `<span class="meta-pill">${escapeHtml(text)}</span>`; }
  function formatTimer(totalSeconds) { const mins = Math.floor(totalSeconds / 60); const secs = totalSeconds % 60; return `${mins}:${String(secs).padStart(2, "0")}`; }
  function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
  function sampleWithoutReplacement(list, count) { const pool = [...list]; const result = []; while (pool.length && result.length < count) result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); return result; }
  function delay(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function cssEscape(value) { return window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/(["'\\.#:[\]()])/g, "\\$1"); }
  function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
  function makeId() { return window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : `id-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36)}`; }
  function formatFileStamp(date) { const pad = (value) => String(value).padStart(2, "0"); return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`; }
  function downloadTextFile(filename, content) { const blob = new Blob([content], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
})();
