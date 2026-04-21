    (() => {
      "use strict";

      const STORAGE_KEY = "letter-blitz-host-edition/v0.4.0";
      const LEGACY_STORAGE_KEYS = ["letter-blitz-host-edition/v0.3.0", "letter-blitz-host-edition/v0.2.0", "letter-blitz-host-edition/v0.1.0"];
      const FRIENDLY_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "W"];
      const HARD_LETTERS = ["Q", "U", "V", "X", "Y", "Z"];
      const PLAYER_COLOURS = ["var(--player-1)", "var(--player-2)", "var(--player-3)", "var(--player-4)", "var(--player-5)", "var(--player-6)", "var(--player-7)", "var(--player-8)"];
      const CATEGORY_DATA_URL = "data/categories.json";
      const STOP_WORDS = new Set(["a", "an", "and", "de", "da", "del", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);

      let state = createDefaultState();
      let timerInterval = null;
      let isSpinning = false;
      let timeUpFlashTimeout = null;
      let categoryBank = [];
      let categoryLoadError = "";

      const els = {
        heroTitle: document.getElementById("heroTitle"),
        heroSubtitle: document.getElementById("heroSubtitle"),
        heroMeta: document.getElementById("heroMeta"),
        roundLetter: document.getElementById("roundLetter"),
        letterCaption: document.getElementById("letterCaption"),
        timerCard: document.getElementById("timerCard"),
        timerStatus: document.getElementById("timerStatus"),
        timerValue: document.getElementById("timerValue"),
        timerHelper: document.getElementById("timerHelper"),
        timerRingProgress: document.getElementById("timerRingProgress"),
        categoryPreview: document.getElementById("categoryPreview"),
        categoryCountTag: document.getElementById("categoryCountTag"),
        answerBoardContainer: document.getElementById("answerBoardContainer"),
        boardSummary: document.getElementById("boardSummary"),
        playerList: document.getElementById("playerList"),
        leaderboardList: document.getElementById("leaderboardList"),
        historyList: document.getElementById("historyList"),
        roundLengthSegment: document.getElementById("roundLengthSegment"),
        categoryCountSegment: document.getElementById("categoryCountSegment"),
        friendlyLettersToggle: document.getElementById("friendlyLettersToggle"),
        spinRoundBtn: document.getElementById("spinRoundBtn"),
        startPauseTimerBtn: document.getElementById("startPauseTimerBtn"),
        resetTimerBtn: document.getElementById("resetTimerBtn"),
        commitRoundBtn: document.getElementById("commitRoundBtn"),
        addPlayerBtn: document.getElementById("addPlayerBtn"),
        exportSummaryBtn: document.getElementById("exportSummaryBtn"),
        resetSessionBtn: document.getElementById("resetSessionBtn"),
        openRulesBtn: document.getElementById("openRulesBtn"),
        openHistoryBtn: document.getElementById("openHistoryBtn"),
        closeHistoryModalBtn: document.getElementById("closeHistoryModalBtn"),
        closeRulesModalBtn: document.getElementById("closeRulesModalBtn"),
        historyModal: document.getElementById("historyModal"),
        rulesModal: document.getElementById("rulesModal"),
        categoryDataStatus: document.getElementById("categoryDataStatus"),
        setupView: document.getElementById("setupView"),
        gameView: document.getElementById("gameView"),
        startSessionBtn: document.getElementById("startSessionBtn"),
        backToSetupBtn: document.getElementById("backToSetupBtn"),
      };

      init();

      async function init() {
        await loadCategoryBank();
        state = loadState();
        ensureStateShape();
        bindEvents();
        renderView();
        updateSegments();
        renderPlayers();
        renderHero();
        renderAnswerBoard();
        renderLeaderboard();
        renderHistory();
        paintTimer();
      }

      function createDefaultState() {
        const players = [0, 1, 2].map((index) => {
          return {
            id: makeId(),
            name: `Player ${index + 1}`,
            totalScore: 0,
          };
        });

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
            activeView: "setup",
          },
        };
      }

      function ensureStateShape() {
        if (!Array.isArray(state.players) || !state.players.length) {
          state.players = createDefaultState().players;
        }

        state.players = state.players.slice(0, 8).map((player, index) => {
          return {
            id: player && player.id ? String(player.id) : makeId(),
            name: player && typeof player.name === "string" && player.name.trim() ? player.name.trim() : `Player ${index + 1}`,
            totalScore: Number.isFinite(Number(player && player.totalScore)) ? Number(player.totalScore) : 0,
          };
        });

        if (!state.settings || typeof state.settings !== "object") {
          state.settings = createDefaultState().settings;
        }

        state.settings.roundSeconds = [60, 75, 90].includes(Number(state.settings.roundSeconds)) ? Number(state.settings.roundSeconds) : 75;
        state.settings.categoryCount = [10, 11, 12].includes(Number(state.settings.categoryCount)) ? Number(state.settings.categoryCount) : 12;
        state.settings.friendlyLettersOnly = state.settings.friendlyLettersOnly !== false;

        if (!Array.isArray(state.history)) {
          state.history = [];
        }

        state.roundNumber = Number.isFinite(Number(state.roundNumber)) && Number(state.roundNumber) > 0 ? Number(state.roundNumber) : (state.history.length + 1);

        if (!state.timer || typeof state.timer !== "object") {
          state.timer = { remaining: state.settings.roundSeconds, running: false, finished: false };
        }

        state.timer.remaining = Number.isFinite(Number(state.timer.remaining)) ? Math.max(0, Number(state.timer.remaining)) : state.settings.roundSeconds;
        state.timer.running = false;
        state.timer.finished = Boolean(state.timer.finished);

        if (state.currentRound) {
          state.currentRound.committed = Boolean(state.currentRound.committed);
          state.currentRound.createdAt = state.currentRound.createdAt || new Date().toISOString();
          state.currentRound.roundNumber = Number.isFinite(Number(state.currentRound.roundNumber)) && Number(state.currentRound.roundNumber) > 0 ? Number(state.currentRound.roundNumber) : state.roundNumber;
          state.currentRound.roundSeconds = Number.isFinite(Number(state.currentRound.roundSeconds)) ? Number(state.currentRound.roundSeconds) : state.settings.roundSeconds;
          state.currentRound.letter = typeof state.currentRound.letter === "string" ? state.currentRound.letter.toUpperCase() : "?";
          state.currentRound.categories = Array.isArray(state.currentRound.categories) ? state.currentRound.categories.slice(0, 12) : [];
          state.currentRound.answers = Array.isArray(state.currentRound.answers) ? state.currentRound.answers : [];
          ensureCurrentRoundShape();
        } else {
          state.currentRound = null;
        }

        if (!state.currentRound) {
          state.timer.remaining = state.settings.roundSeconds;
          state.timer.finished = false;
        }

        if (!state.ui || typeof state.ui !== "object") {
          state.ui = { activeView: "setup" };
        }

        const hasLiveUnfinalisedRound = Boolean(state.currentRound && !state.currentRound.committed);
        const validViews = ["setup", "game"];
        const persistedView = validViews.includes(state.ui.activeView) ? state.ui.activeView : "setup";
        state.ui.activeView = hasLiveUnfinalisedRound ? "game" : persistedView;

        saveState();
      }

      function bindEvents() {
        els.addPlayerBtn.addEventListener("click", handleAddPlayer);
        els.spinRoundBtn.addEventListener("click", handleSpinRound);
        els.startPauseTimerBtn.addEventListener("click", handleStartPauseTimer);
        els.resetTimerBtn.addEventListener("click", handleResetTimer);
        els.commitRoundBtn.addEventListener("click", handleCommitRound);
        els.exportSummaryBtn.addEventListener("click", handleExportSummary);
        els.resetSessionBtn.addEventListener("click", handleResetSession);
        els.friendlyLettersToggle.addEventListener("change", handleFriendlyLettersToggle);
        els.startSessionBtn.addEventListener("click", handleStartSession);
        els.backToSetupBtn.addEventListener("click", handleBackToSetup);

        if (els.openRulesBtn && els.rulesModal) {
          els.openRulesBtn.addEventListener("click", () => openModal(els.rulesModal));
          els.closeRulesModalBtn.addEventListener("click", () => closeModal(els.rulesModal));
          els.rulesModal.addEventListener("click", (event) => { if (event.target === els.rulesModal) closeModal(els.rulesModal); });
        }

        if (els.openHistoryBtn && els.historyModal) {
          els.openHistoryBtn.addEventListener("click", () => openModal(els.historyModal));
          els.closeHistoryModalBtn.addEventListener("click", () => closeModal(els.historyModal));
          els.historyModal.addEventListener("click", (event) => { if (event.target === els.historyModal) closeModal(els.historyModal); });
        }

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeModal(els.rulesModal);
            closeModal(els.historyModal);
          }
        });

        els.roundLengthSegment.addEventListener("click", (event) => {
          const button = event.target.closest("[data-action='set-round-seconds']");
          if (!button) return;
          const value = Number(button.dataset.value);
          if (![60, 75, 90].includes(value)) return;
          state.settings.roundSeconds = value;
          if (!state.timer.running && (!state.currentRound || !hasAnyTypedAnswer(state.currentRound) || state.currentRound.committed)) {
            state.timer.remaining = value;
            state.timer.finished = false;
          }
          saveState();
          updateSegments();
          paintTimer();
          renderHero();
        });

        els.categoryCountSegment.addEventListener("click", (event) => {
          const button = event.target.closest("[data-action='set-category-count']");
          if (!button) return;
          const value = Number(button.dataset.value);
          if (![10, 11, 12].includes(value)) return;
          state.settings.categoryCount = value;
          saveState();
          updateSegments();
          renderHero();
        });

        els.playerList.addEventListener("click", (event) => {
          const button = event.target.closest("[data-action='remove-player']");
          if (!button) return;
          const playerId = button.dataset.playerId;
          handleRemovePlayer(playerId);
        });

        els.playerList.addEventListener("change", (event) => {
          const input = event.target.closest("[data-action='rename-player']");
          if (!input) return;
          const playerId = input.dataset.playerId;
          const player = state.players.find((item) => item.id === playerId);
          if (!player) return;
          const fallbackName = `Player ${state.players.findIndex((item) => item.id === playerId) + 1}`;
          player.name = input.value.trim() || fallbackName;
          input.value = player.name;
          ensureCurrentRoundShape();
          saveState();
          renderAnswerBoard();
          renderHero();
          renderLeaderboard();
          renderHistory();
        });

        els.answerBoardContainer.addEventListener("input", handleAnswerInput);
        els.answerBoardContainer.addEventListener("blur", handleAnswerBlur, true);
        els.answerBoardContainer.addEventListener("click", handleAnswerBoardClick);
        els.answerBoardContainer.addEventListener("keydown", handleAnswerKeydown);
      }





      function renderView() {
        const activeView = state.ui?.activeView === "game" ? "game" : "setup";
        els.setupView.hidden = activeView !== "setup";
        els.gameView.hidden = activeView !== "game";
        els.backToSetupBtn.hidden = activeView !== "game";
      }

      function setActiveView(view) {
        state.ui.activeView = view === "game" ? "game" : "setup";
        saveState();
        renderView();
      }

      function handleStartSession() {
        setActiveView("game");
      }

      function handleBackToSetup() {
        setActiveView("setup");
      }

      async function loadCategoryBank() {
        categoryLoadError = "";
        try {
          const response = await window.fetch(CATEGORY_DATA_URL, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const parsed = await response.json();
          if (!Array.isArray(parsed) || parsed.length < 12) throw new Error("Invalid category data");
          categoryBank = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
          if (categoryBank.length < 12) throw new Error("Not enough categories");
        } catch (error) {
          categoryLoadError = "Category data could not be loaded.";
          categoryBank = [];
        }
      }

      function openModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add("modal-open");
      }

      function closeModal(modal) {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        const hasOpenModal = [els.rulesModal, els.historyModal].some((item) => item && !item.hidden);
        if (!hasOpenModal) document.body.classList.remove("modal-open");
      }

      function handleFriendlyLettersToggle() {
        state.settings.friendlyLettersOnly = els.friendlyLettersToggle.checked;
        saveState();
        renderHero();
      }

      function handleAddPlayer() {
        if (state.players.length >= 8) return;
        const nextIndex = state.players.length + 1;
        state.players.push({
          id: makeId(),
          name: `Player ${nextIndex}`,
          totalScore: 0,
        });
        ensureCurrentRoundShape();
        saveState();
        renderPlayers();
        renderAnswerBoard();
        renderHero();
        renderLeaderboard();
      }

      function handleRemovePlayer(playerId) {
        const index = state.players.findIndex((player) => player.id === playerId);
        if (index === -1) return;
        if (state.players.length === 1) return;

        const playerName = state.players[index].name;
        let warning = `Remove ${playerName} from this session?`;
        if (state.players[index].totalScore > 0) {
          warning += "\n\nTheir running total will be removed from the live leaderboard. Committed round history cards will still show their old scores.";
        }

        if (!window.confirm(warning)) return;

        state.players.splice(index, 1);
        if (state.currentRound) {
          ensureCurrentRoundShape();
        }
        saveState();
        renderPlayers();
        renderAnswerBoard();
        renderHero();
        renderLeaderboard();
      }

      async function handleSpinRound() {
        if (isSpinning) return;

        if (state.currentRound && !state.currentRound.committed && (hasAnyTypedAnswer(state.currentRound) || state.timer.remaining !== state.settings.roundSeconds || state.timer.finished)) {
          const proceed = window.confirm("This round is not committed yet. Spinning a new round will replace it. Carry on?");
          if (!proceed) return;
        }

        stopTimer();
        clearTimeUpFlash();
        state.timer.remaining = state.settings.roundSeconds;
        state.timer.finished = false;

        const selectedLetter = pickLetter();
        const selectedCategories = pickCategories(state.settings.categoryCount);
        isSpinning = true;
        updateControlStates();

        els.spinRoundBtn.textContent = "Spinning...";
        els.roundLetter.classList.add("is-spinning");

        const previewCycles = 14;
        let cycle = 0;
        const letterPool = getLetterPool();

        await new Promise((resolve) => {
          const interval = window.setInterval(() => {
            cycle += 1;
            els.roundLetter.textContent = randomItem(letterPool);
            renderCategoryPreview(sampleWithoutReplacement(categoryBank, state.settings.categoryCount));
            if (cycle >= previewCycles) {
              window.clearInterval(interval);
              resolve();
            }
          }, 80);
        });

        state.currentRound = createRound(selectedLetter, selectedCategories);
        state.timer.remaining = state.settings.roundSeconds;
        state.timer.finished = false;
        saveState();

        isSpinning = false;
        els.spinRoundBtn.textContent = "Spin round";
        els.roundLetter.classList.remove("is-spinning");

        setActiveView("game");
        renderHero();
        renderAnswerBoard();
        renderLeaderboard();
        updateControlStates();
        focusFirstAnswerCell();
      }

      function handleStartPauseTimer() {
        if (!state.currentRound || state.currentRound.committed || isSpinning) return;

        if (state.timer.running) {
          stopTimer();
          saveState();
          renderHero();
          return;
        }

        if (state.timer.remaining <= 0) {
          state.timer.remaining = state.settings.roundSeconds;
          state.timer.finished = false;
        }

        const endTimestamp = Date.now() + state.timer.remaining * 1000;
        state.timer.running = true;
        state.timer.finished = false;
        updateControlStates();
        paintTimer();
        renderHero();

        timerInterval = window.setInterval(() => {
          const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
          if (remaining !== state.timer.remaining) {
            state.timer.remaining = remaining;
            paintTimer();
            renderHero();
            saveState();
          }

          if (remaining <= 0) {
            stopTimer();
            state.timer.remaining = 0;
            state.timer.finished = true;
            paintTimer();
            renderHero();
            saveState();
            flashTimeUp();
          }
        }, 120);
      }

      function handleResetTimer() {
        stopTimer();
        clearTimeUpFlash();
        state.timer.remaining = state.settings.roundSeconds;
        state.timer.finished = false;
        saveState();
        paintTimer();
        renderHero();
      }

      function handleCommitRound() {
        if (!state.currentRound || state.currentRound.committed) return;
        stopTimer();
        clearTimeUpFlash();

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
          scores: state.players.map((player) => {
            return {
              playerId: player.id,
              name: player.name,
              score: summary.totals[player.id] || 0,
            };
          }),
        };

        state.history.unshift(historyEntry);
        state.currentRound.committed = true;
        state.currentRound.committedAt = historyEntry.committedAt;
        state.roundNumber += 1;
        state.timer.finished = true;
        saveState();

        renderHero();
        renderAnswerBoard();
        renderLeaderboard();
        renderHistory();
      }

      function handleExportSummary() {
        const lines = [];
        const now = new Date();
        lines.push("# Letter Blitz session summary");
        lines.push("");
        lines.push(`Generated: ${now.toLocaleString("en-GB")}`);
        lines.push("");
        lines.push("## Settings");
        lines.push(`- Default round length: ${state.settings.roundSeconds} seconds`);
        lines.push(`- Categories per round: ${state.settings.categoryCount}`);
        lines.push(`- Friendly letters only: ${state.settings.friendlyLettersOnly ? "Yes" : "No"}`);
        lines.push(`- Competitors in current setup: ${state.players.map((player) => player.name).join(", ")}`);
        lines.push("");

        lines.push("## Overall leaderboard");
        if (!state.players.length) {
          lines.push("- No players configured");
        } else {
          const sortedPlayers = [...state.players].sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name));
          sortedPlayers.forEach((player, index) => {
            lines.push(`${index + 1}. ${player.name} — ${player.totalScore}`);
          });
        }
        lines.push("");

        if (state.history.length) {
          lines.push("## Finalised rounds");
          lines.push("");
          [...state.history].reverse().forEach((round) => {
            lines.push(`### Round ${round.roundNumber} — Letter ${round.letter}`);
            lines.push(`- Categories: ${round.categoryCount}`);
            lines.push(`- Committed: ${new Date(round.committedAt).toLocaleString("en-GB")}`);
            lines.push(`- Category list: ${round.categories.join(" | ")}`);
            lines.push("- Scores:");
            round.scores.forEach((score) => {
              lines.push(`  - ${score.name}: ${score.score}`);
            });
            lines.push("");
          });
        } else {
          lines.push("## Finalised rounds");
          lines.push("");
          lines.push("- None yet");
          lines.push("");
        }

        if (state.currentRound && !state.currentRound.committed) {
          const liveSummary = computeRoundSummary(state.currentRound);
          lines.push("## Uncommitted live round");
          lines.push("");
          lines.push(`- Round number: ${state.currentRound.roundNumber || state.roundNumber}`);
          lines.push(`- Letter: ${state.currentRound.letter}`);
          lines.push(`- Categories: ${state.currentRound.categories.join(" | ")}`);
          lines.push("- Current live totals:");
          state.players.forEach((player) => {
            lines.push(`  - ${player.name}: ${liveSummary.totals[player.id] || 0}`);
          });
          lines.push("");
        }

        const filename = `session-export-${formatFileStamp(now)}.md`;
        downloadTextFile(filename, lines.join("\n"));
      }

      function handleResetSession() {
        const proceed = window.confirm("Reset the whole session? This will clear players, scores, history, and the current round.");
        if (!proceed) return;
        stopTimer();
        clearTimeUpFlash();
        localStorage.removeItem(STORAGE_KEY);
        state = createDefaultState();
        state.ui.activeView = "setup";
        saveState();
        updateSegments();
        renderPlayers();
        renderHero();
        renderAnswerBoard();
        renderLeaderboard();
        renderHistory();
        paintTimer();
      }

      function handleAnswerInput(event) {
        const input = event.target.closest("[data-action='answer-input']");
        if (!input || !state.currentRound || state.currentRound.committed) return;

        const categoryIndex = Number(input.dataset.categoryIndex);
        const playerId = input.dataset.playerId;
        const cell = getRoundCell(categoryIndex, playerId);
        if (!cell) return;
        cell.text = input.value;
        saveState();
        refreshScoring();
      }

      function handleAnswerBlur(event) {
        const input = event.target.closest("[data-action='answer-input']");
        if (!input || !state.currentRound || state.currentRound.committed) return;
        const categoryIndex = Number(input.dataset.categoryIndex);
        const playerId = input.dataset.playerId;
        const cell = getRoundCell(categoryIndex, playerId);
        if (!cell) return;
        const tidied = tidyDisplayText(input.value);
        cell.text = tidied;
        input.value = tidied;
        saveState();
        refreshScoring();
      }

      function handleAnswerBoardClick(event) {
        const button = event.target.closest("[data-action='toggle-reject']");
        if (!button || !state.currentRound || state.currentRound.committed) return;
        const categoryIndex = Number(button.dataset.categoryIndex);
        const playerId = button.dataset.playerId;
        const cell = getRoundCell(categoryIndex, playerId);
        if (!cell) return;
        cell.manualInvalid = !cell.manualInvalid;
        saveState();
        refreshScoring();
      }

      function handleAnswerKeydown(event) {
        const input = event.target.closest("[data-action='answer-input']");
        if (!input) return;

        if (event.key === "Enter") {
          event.preventDefault();
          const inputs = Array.from(document.querySelectorAll("[data-action='answer-input']"));
          const currentIndex = inputs.indexOf(input);
          if (currentIndex === -1) return;
          const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (inputs[nextIndex]) {
            inputs[nextIndex].focus();
            inputs[nextIndex].select();
          }
        }
      }

      function renderPlayers() {
        els.playerList.innerHTML = state.players.map((player, index) => {
          return `
            <div class="player-row" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}">
              <div class="player-badge">${index + 1}</div>
              <input
                class="player-input"
                type="text"
                maxlength="24"
                value="${escapeHtml(player.name)}"
                data-action="rename-player"
                data-player-id="${player.id}"
                aria-label="Player ${index + 1} name"
              />
              <button
                class="remove-player-btn"
                type="button"
                data-action="remove-player"
                data-player-id="${player.id}"
                aria-label="Remove ${escapeHtml(player.name)}"
                ${state.players.length === 1 ? "disabled" : ""}
              >
                ×
              </button>
            </div>
          `;
        }).join("");

        els.addPlayerBtn.disabled = state.players.length >= 8;
      }

      function renderHero() {
        const hasRound = Boolean(state.currentRound);
        const displayedRoundNumber = hasRound ? (state.currentRound.roundNumber || state.roundNumber) : state.roundNumber;
        const categoryCount = hasRound ? state.currentRound.categories.length : state.settings.categoryCount;
        const slots = hasRound ? state.currentRound.categories.length * state.players.length : state.settings.categoryCount * state.players.length;
        const filled = hasRound ? countFilledAnswers(state.currentRound) : 0;
        const letter = hasRound ? state.currentRound.letter : "?";

        els.roundLetter.textContent = letter;
        els.categoryCountTag.textContent = `${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}`;
        els.letterCaption.textContent = state.settings.friendlyLettersOnly
          ? "Friendly letters on"
          : "Hard letters on";

        if (!hasRound) {
          els.heroTitle.textContent = "Spin the next round";
          els.heroSubtitle.textContent = categoryLoadError ? "Category list unavailable. Fix the file path and refresh." : "Spin when ready.";
          els.heroMeta.innerHTML = [
            makeMetaPill(`Round ${displayedRoundNumber} queued`),
            makeMetaPill(`${state.players.length} player${state.players.length === 1 ? "" : "s"} ready`),
            makeMetaPill(`${state.settings.roundSeconds} seconds`),
            makeMetaPill(`${state.settings.categoryCount} categories`)
          ].join("");
          renderCategoryPreview([]);
        } else {
          const roundSummary = computeRoundSummary(state.currentRound);
          const leaderName = findLiveRoundLeader(roundSummary.totals);
          let subtitle = "Enter answers and keep the round moving.";
          if (state.currentRound.committed) {
            subtitle = "Round finalised. Spin when you are ready.";
          } else if (state.timer.running) {
            subtitle = "Timer running.";
          } else if (state.timer.finished) {
            subtitle = "Time up. Enter answers.";
          }

          els.heroTitle.textContent = `Round ${displayedRoundNumber} · Letter ${letter}`;
          els.heroSubtitle.textContent = subtitle;
          els.heroMeta.innerHTML = [
            makeMetaPill(`${state.currentRound.categories.length} categories`),
            makeMetaPill(`${filled} / ${slots} answers entered`),
            makeMetaPill(`${state.players.length} player${state.players.length === 1 ? "" : "s"} live`),
            makeMetaPill(leaderName ? `Leader: ${leaderName}` : "Leader: nobody yet")
          ].join("");
          renderCategoryPreview(state.currentRound.categories);
        }

        if (els.categoryDataStatus) {
          els.categoryDataStatus.textContent = categoryLoadError ? "Category file unavailable" : `Category bank: ${categoryBank.length}`;
          els.categoryDataStatus.classList.toggle("is-error", Boolean(categoryLoadError));
        }

        updateControlStates();
        paintTimer();
      }

      function renderCategoryPreview(categories) {
        if (!categories.length) {
          if (categoryLoadError) {
            els.categoryPreview.innerHTML = `<div class="category-chip is-error"><div class="category-chip-number">!</div><div class="category-chip-name">Could not load category data. Keep 'data/categories.json' available when hosting the app.</div></div>`;
          } else {
            els.categoryPreview.innerHTML = `<div class="category-chip"><div class="category-chip-number">01</div><div class="category-chip-name">Spin a round to load categories.</div></div>`;
          }
          return;
        }

        els.categoryPreview.innerHTML = categories.map((category, index) => {
          return `
            <div class="category-chip">
              <div class="category-chip-number">${String(index + 1).padStart(2, "0")}</div>
              <div class="category-chip-name">${escapeHtml(category)}</div>
            </div>
          `;
        }).join("");
      }

      function renderAnswerBoard() {
        if (!state.currentRound) {
          els.answerBoardContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-badge">LB</div>
              <h3>No live round yet</h3><p>Spin a round to begin.</p>
            </div>
          `;
          els.boardSummary.innerHTML = `
            <span class="meta-pill">No live round</span>
            <span class="meta-pill">Scores appear once the board is live</span>
          `;
          return;
        }

        ensureCurrentRoundShape();
        const summary = computeRoundSummary(state.currentRound);

        const tableHead = `
          <thead>
            <tr>
              <th class="sticky-col corner-cell">
                <span class="corner-title">Category</span>
                <span class="corner-copy">One answer per player.</span>
              </th>
              ${state.players.map((player, index) => `
                <th class="player-head" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}">
                  <div class="player-head-inner">
                    <div class="player-chip" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}">
                      <span class="player-dot"></span>
                      <span class="player-name">${escapeHtml(player.name)}</span>
                    </div>
                    <div class="player-small">Host entry</div>
                  </div>
                </th>
              `).join("")}
            </tr>
          </thead>
        `;

        const tableBody = `
          <tbody>
            ${state.currentRound.categories.map((category, categoryIndex) => {
              return `
                <tr data-category-index="${categoryIndex}">
                  <th class="sticky-col category-cell">
                    <div class="category-wrap">
                      <div class="category-label">
                        <span class="category-index">${String(categoryIndex + 1).padStart(2, "0")}</span>
                        <span class="category-name">${escapeHtml(category)}</span>
                      </div>
                    </div>
                  </th>

                  ${state.players.map((player) => {
                    const cell = summary.rows[categoryIndex].cells[player.id];
                    return `
                      <td class="answer-cell">
                        <div class="answer-card state-${cell.status}" data-category-index="${categoryIndex}" data-player-id="${player.id}">
                          <label class="visually-hidden" for="answer-${categoryIndex}-${player.id}">${escapeHtml(player.name)} answer for ${escapeHtml(category)}</label>
                          <input
                            id="answer-${categoryIndex}-${player.id}"
                            class="answer-input"
                            type="text"
                            maxlength="48"
                            placeholder="Type answer…"
                            value="${escapeAttribute(cell.displayText)}"
                            data-action="answer-input"
                            data-category-index="${categoryIndex}"
                            data-player-id="${player.id}"
                            ${state.currentRound.committed ? "disabled" : ""}
                          />
                          <div class="cell-meta">
                            <span class="status-badge badge-${cell.status}">${cell.statusLabel}</span>
                            <button
                              type="button"
                              class="review-toggle ${cell.manualInvalid ? "is-rejected" : ""}"
                              data-action="toggle-reject"
                              data-category-index="${categoryIndex}"
                              data-player-id="${player.id}"
                              ${state.currentRound.committed || !cell.displayText ? "disabled" : ""}
                            >
                              ${cell.manualInvalid ? "Undo" : "Reject"}
                            </button>
                          </div>
                        </div>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        `;

        const tableFoot = `
          <tfoot>
            <tr>
              <th class="sticky-col round-total-label">Round total</th>
              ${state.players.map((player, index) => `
                <td class="round-total-cell" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}">
                  <div class="round-total-wrap">
                    <span class="player-dot" style="--player:${PLAYER_COLOURS[index % PLAYER_COLOURS.length]}"></span>
                    <div>
                      <div class="round-total-number" id="round-total-${player.id}">${summary.totals[player.id] || 0}</div>
                      <div class="round-total-copy">${escapeHtml(player.name)}</div>
                    </div>
                  </div>
                </td>
              `).join("")}
            </tr>
          </tfoot>
        `;

        els.answerBoardContainer.innerHTML = `
          <div class="board-shell">
            <div class="board-scroll">
              <table class="answer-table">
                ${tableHead}
                ${tableBody}
                ${tableFoot}
              </table>
            </div>
          </div>
        `;

        refreshScoring();
      }

      function refreshScoring() {
        if (!state.currentRound) {
          renderLeaderboard();
          return;
        }

        const summary = computeRoundSummary(state.currentRound);
        const enteredAnswers = countFilledAnswers(state.currentRound);
        const totalSlots = state.currentRound.categories.length * state.players.length;

        state.players.forEach((player) => {
          const totalEl = document.getElementById(`round-total-${player.id}`);
          if (totalEl) {
            totalEl.textContent = summary.totals[player.id] || 0;
          }
        });

        summary.rows.forEach((row, categoryIndex) => {
          state.players.forEach((player) => {
            const cellData = row.cells[player.id];
            const card = els.answerBoardContainer.querySelector(`.answer-card[data-category-index="${categoryIndex}"][data-player-id="${player.id}"]`);
            if (!card) return;
            card.className = `answer-card state-${cellData.status}`;

            const badge = card.querySelector(".status-badge");
            if (badge) {
              badge.className = `status-badge badge-${cellData.status}`;
              badge.textContent = cellData.statusLabel;
            }

            const button = card.querySelector(".review-toggle");
            if (button) {
              button.textContent = cellData.manualInvalid ? "Undo" : "Reject";
              button.classList.toggle("is-rejected", cellData.manualInvalid);
              button.disabled = state.currentRound.committed || !cellData.displayText;
            }

            const input = card.querySelector(".answer-input");
            if (input && document.activeElement !== input) {
              input.value = cellData.displayText;
            }
            if (input) {
              input.disabled = state.currentRound.committed;
            }
          });
        });

        const leaderName = findLiveRoundLeader(summary.totals);
        els.boardSummary.innerHTML = [
          makeMetaPill(`${enteredAnswers} / ${totalSlots} answers entered`),
          makeMetaPill(`Letter ${state.currentRound.letter} live`),
          makeMetaPill(leaderName ? `Current leader: ${leaderName}` : "Current leader: nobody yet"),
          makeMetaPill("Duplicates and repeats auto-zero")
        ].join("");

        renderLeaderboard(summary.totals);
        renderHero();
      }

      function renderLeaderboard(liveTotals = null) {
        const currentTotals = liveTotals || (state.currentRound ? computeRoundSummary(state.currentRound).totals : {});
        const players = [...state.players].map((player, index) => {
          return {
            ...player,
            liveRoundScore: currentTotals[player.id] || 0,
            accent: PLAYER_COLOURS[index % PLAYER_COLOURS.length],
          };
        }).sort((a, b) => b.totalScore - a.totalScore || b.liveRoundScore - a.liveRoundScore || a.name.localeCompare(b.name));

        if (!players.length) {
          els.leaderboardList.innerHTML = `<p class="placeholder-note">No players configured yet.</p>`;
          return;
        }

        const maxTotal = Math.max(1, ...players.map((player) => player.totalScore));

        els.leaderboardList.innerHTML = players.map((player) => {
          const width = Math.max(6, Math.round((player.totalScore / maxTotal) * 100));
          return `
            <div class="leader-row" style="--player:${player.accent}">
              <div class="leader-top">
                <div class="leader-player">
                  <span class="player-dot" style="--player:${player.accent}"></span>
                  <div class="leader-player-name">
                    <strong>${escapeHtml(player.name)}</strong>
                    <span>Live round: ${player.liveRoundScore}</span>
                  </div>
                </div>

                <div class="leader-scores">
                  <span class="leader-total">${player.totalScore}</span>
                  <span class="leader-round">Session total</span>
                </div>
              </div>

              <div class="leader-bar">
                <span style="width:${width}%"></span>
              </div>
            </div>
          `;
        }).join("");
      }

      function renderHistory() {
        if (!state.history.length) {
          els.historyList.innerHTML = `<p class="placeholder-note">No rounds finalised yet.</p>`;
          return;
        }

        els.historyList.innerHTML = state.history.map((round) => {
          const scoreRows = round.scores
            .slice()
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .map((score) => {
              return `
                <div class="history-score-row">
                  <span>${escapeHtml(score.name)}</span>
                  <strong>${score.score}</strong>
                </div>
              `;
            })
            .join("");

          return `
            <article class="history-card">
              <div class="history-top">
                <div>
                  <h3 class="history-title">Round ${round.roundNumber}</h3>
                  <div class="history-subtitle">${round.categoryCount} categories · ${new Date(round.committedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div class="history-letter">${escapeHtml(round.letter)}</div>
              </div>

              <div class="history-subtitle">${escapeHtml(round.categories.join(" · "))}</div>

              <div class="history-scores">
                ${scoreRows}
              </div>
            </article>
          `;
        }).join("");
      }

      function updateSegments() {
        Array.from(els.roundLengthSegment.querySelectorAll(".segment-btn")).forEach((button) => {
          button.classList.toggle("is-selected", Number(button.dataset.value) === state.settings.roundSeconds);
        });

        Array.from(els.categoryCountSegment.querySelectorAll(".segment-btn")).forEach((button) => {
          button.classList.toggle("is-selected", Number(button.dataset.value) === state.settings.categoryCount);
        });

        els.friendlyLettersToggle.checked = state.settings.friendlyLettersOnly;
      }

      function updateControlStates() {
        const hasRound = Boolean(state.currentRound);
        const committed = hasRound && state.currentRound.committed;

        els.spinRoundBtn.disabled = isSpinning || state.players.length === 0 || categoryBank.length < state.settings.categoryCount;
        els.startPauseTimerBtn.disabled = isSpinning || !hasRound || committed;
        els.resetTimerBtn.disabled = isSpinning || !hasRound;
        els.commitRoundBtn.disabled = isSpinning || !hasRound || committed;
        els.commitRoundBtn.textContent = committed ? "Round finalised" : "Finalise round";
        els.startPauseTimerBtn.textContent = state.timer.running ? "Pause timer" : (state.timer.remaining < state.settings.roundSeconds && !state.timer.finished ? "Resume timer" : "Start timer");
      }

      function paintTimer() {
        const circumference = 2 * Math.PI * 72;
        els.timerRingProgress.style.strokeDasharray = String(circumference);

        const total = Math.max(1, state.settings.roundSeconds);
        const progress = Math.max(0, Math.min(1, state.timer.remaining / total));
        const offset = circumference * (1 - progress);
        els.timerRingProgress.style.strokeDashoffset = String(offset);
        els.timerValue.textContent = formatTimer(state.timer.remaining);

        els.timerCard.classList.toggle("is-urgent", state.timer.remaining > 0 && state.timer.remaining <= 15);
        els.timerCard.classList.toggle("is-timeup", state.timer.finished && state.timer.remaining === 0);

        if (!state.currentRound) {
          els.timerStatus.textContent = "Ready";
          els.timerHelper.textContent = "Waiting for the first round";
          return;
        }

        if (state.currentRound.committed) {
          els.timerStatus.textContent = "Locked";
          els.timerHelper.textContent = "Round finalised";
          return;
        }

        if (state.timer.running) {
          els.timerStatus.textContent = "Running";
          els.timerHelper.textContent = state.timer.remaining <= 10 ? "The panic should be peaking now" : "Live countdown";
          return;
        }

        if (state.timer.finished && state.timer.remaining === 0) {
          els.timerStatus.textContent = "Time up";
          els.timerHelper.textContent = "Start the reveal";
          return;
        }

        if (state.timer.remaining !== state.settings.roundSeconds) {
          els.timerStatus.textContent = "Paused";
          els.timerHelper.textContent = "Ready to resume";
          return;
        }

        els.timerStatus.textContent = "Ready";
        els.timerHelper.textContent = "Ready to start";
      }

      function stopTimer() {
        if (timerInterval) {
          window.clearInterval(timerInterval);
          timerInterval = null;
        }
        state.timer.running = false;
        updateControlStates();
        paintTimer();
      }

      function flashTimeUp() {
        clearTimeUpFlash();
        els.timerCard.classList.add("is-timeup");
        timeUpFlashTimeout = window.setTimeout(() => {
          els.timerCard.classList.remove("is-timeup");
        }, 2600);
      }

      function clearTimeUpFlash() {
        if (timeUpFlashTimeout) {
          window.clearTimeout(timeUpFlashTimeout);
          timeUpFlashTimeout = null;
        }
        els.timerCard.classList.remove("is-timeup");
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
          answers: categories.map(() => {
            return Object.fromEntries(state.players.map((player) => [player.id, { text: "", manualInvalid: false }]));
          }),
        };
      }

      function ensureCurrentRoundShape() {
        if (!state.currentRound) return;

        state.currentRound.answers = Array.isArray(state.currentRound.answers) ? state.currentRound.answers : [];

        state.currentRound.categories.forEach((_, categoryIndex) => {
          if (!state.currentRound.answers[categoryIndex] || typeof state.currentRound.answers[categoryIndex] !== "object") {
            state.currentRound.answers[categoryIndex] = {};
          }

          state.players.forEach((player) => {
            if (!state.currentRound.answers[categoryIndex][player.id]) {
              state.currentRound.answers[categoryIndex][player.id] = { text: "", manualInvalid: false };
            }
          });

          Object.keys(state.currentRound.answers[categoryIndex]).forEach((playerId) => {
            if (!state.players.some((player) => player.id === playerId)) {
              delete state.currentRound.answers[categoryIndex][playerId];
            }
          });
        });
      }

      function getRoundCell(categoryIndex, playerId) {
        if (!state.currentRound) return null;
        ensureCurrentRoundShape();
        return state.currentRound.answers[categoryIndex] ? state.currentRound.answers[categoryIndex][playerId] : null;
      }

      function computeRoundSummary(round) {
        const summary = {
          rows: [],
          totals: Object.fromEntries(state.players.map((player) => [player.id, 0])),
        };

        if (!round) return summary;

        const roundLetter = round.letter.toLowerCase();
        const repeatedCounterByPlayer = Object.fromEntries(state.players.map((player) => [player.id, {}]));

        round.categories.forEach((category, categoryIndex) => {
          const row = {
            category,
            categoryIndex,
            cells: {},
          };

          const duplicateCounter = {};

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
              manualInvalid,
              wrongLetter,
              baseValid,
              points: 0,
              status: "blank",
              statusLabel: "Blank",
            };

            if (baseValid) {
              duplicateCounter[normalised] = (duplicateCounter[normalised] || 0) + 1;
              repeatedCounterByPlayer[player.id][normalised] = (repeatedCounterByPlayer[player.id][normalised] || 0) + 1;
            }
          });

          row.duplicateCounter = duplicateCounter;
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
              cell.statusLabel = "Rejected";
            } else if (cell.wrongLetter) {
              cell.status = "invalid";
              cell.statusLabel = "Wrong letter";
            } else if ((row.duplicateCounter[cell.normalised] || 0) > 1) {
              cell.status = "duplicate";
              cell.statusLabel = "Duplicate";
            } else if (repeatedCount > 1) {
              cell.status = "repeat";
              cell.statusLabel = "Repeated this round";
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

      function hasAnyTypedAnswer(round) {
        if (!round || !Array.isArray(round.answers)) return false;
        return round.answers.some((row) => {
          if (!row) return false;
          return Object.values(row).some((cell) => cell && normaliseForScoring(cell.text || ""));
        });
      }

      function countFilledAnswers(round) {
        if (!round || !Array.isArray(round.answers)) return 0;
        let total = 0;
        round.answers.forEach((row) => {
          Object.values(row || {}).forEach((cell) => {
            if (normaliseForScoring(cell && cell.text ? cell.text : "")) {
              total += 1;
            }
          });
        });
        return total;
      }

      function startsWithRoundLetter(normalisedText, roundLetter) {
        if (!normalisedText) return false;
        const match = normalisedText.match(/[a-z0-9]/i);
        return Boolean(match) && match[0].toLowerCase() === roundLetter.toLowerCase();
      }

      function isAlliterative(text, roundLetter) {
        if (!text) return false;
        const meaningfulWords = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
          .filter((word) => !STOP_WORDS.has(word));

        if (meaningfulWords.length < 2) return false;
        return meaningfulWords.every((word) => word.startsWith(roundLetter.toLowerCase()));
      }

      function tidyDisplayText(raw) {
        const collapsed = String(raw || "").replace(/\s+/g, " ").trim();
        if (!collapsed) return "";
        const uniformCase = collapsed === collapsed.toLowerCase() || collapsed === collapsed.toUpperCase();
        return uniformCase ? titleCase(collapsed.toLowerCase()) : collapsed;
      }

      function titleCase(text) {
        return text.split(" ").map((word) => {
          return word.split("-").map((segment) => {
            return segment.split("'").map((piece) => {
              if (!piece) return piece;
              return piece.charAt(0).toUpperCase() + piece.slice(1);
            }).join("'");
          }).join("-");
        }).join(" ");
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

      function getLetterPool() {
        return state.settings.friendlyLettersOnly ? [...FRIENDLY_LETTERS] : [...FRIENDLY_LETTERS, ...HARD_LETTERS];
      }

      function pickLetter() {
        const pool = getLetterPool();
        const recentLetters = state.history.slice(0, 2).map((round) => round.letter);
        if (state.currentRound?.letter) {
          recentLetters.push(state.currentRound.letter);
        }

        let candidatePool = pool.filter((letter) => !recentLetters.includes(letter));
        if (!candidatePool.length) {
          candidatePool = pool;
        }

        return randomItem(candidatePool);
      }

      function pickCategories(count) {
        const used = new Set();
        state.history.forEach((round) => round.categories.forEach((category) => used.add(category)));
        if (state.currentRound?.categories) {
          state.currentRound.categories.forEach((category) => used.add(category));
        }

        let pool = categoryBank.filter((category) => !used.has(category));
        if (pool.length < count) {
          pool = [...categoryBank];
        }

        return sampleWithoutReplacement(pool, count);
      }

      function findLiveRoundLeader(totals) {
        const ranked = state.players
          .map((player) => {
            return {
              name: player.name,
              score: totals[player.id] || 0,
            };
          })
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

        if (!ranked.length || ranked[0].score <= 0) return "";
        const topScore = ranked[0].score;
        const leaders = ranked.filter((item) => item.score === topScore).map((item) => item.name);
        return leaders.join(" & ");
      }

      function focusFirstAnswerCell() {
        const firstInput = els.answerBoardContainer.querySelector("[data-action='answer-input']");
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }

      function randomItem(list) {
        return list[Math.floor(Math.random() * list.length)];
      }

      function sampleWithoutReplacement(list, count) {
        const pool = [...list];
        const result = [];
        while (pool.length && result.length < count) {
          const index = Math.floor(Math.random() * pool.length);
          result.push(pool.splice(index, 1)[0]);
        }
        return result;
      }

      function makeMetaPill(text) {
        return `<span class="meta-pill">${escapeHtml(text)}</span>`;
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
      }

      function formatTimer(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${String(secs).padStart(2, "0")}`;
      }

      function makeId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
          return window.crypto.randomUUID();
        }
        return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      }

      function formatFileStamp(date) {
        const pad = (value) => String(value).padStart(2, "0");
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
      }

      function downloadTextFile(filename, content) {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      function saveState() {
        try {
          const persisted = JSON.parse(JSON.stringify(state));
          persisted.timer.running = false;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
        } catch (error) {
          console.error("Failed to save state", error);
        }
      }

      function loadState() {
        try {
          const candidates = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
          for (const key of candidates) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              if (key !== STORAGE_KEY) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
              }
              return parsed;
            }
          }
          return createDefaultState();
        } catch (error) {
          console.error("Failed to load state", error);
          return createDefaultState();
        }
      }
    })();
