(() => {
  "use strict";

  // ---------- Config ----------
  const PREDICT_URL = "/predict";
  const CAPTURE_INTERVAL_MS = 500;   // how often we sample a frame while scanning
  const MIN_CONFIDENCE = 60;         // % confidence a single frame needs to be accepted instantly
  const REQUIRED_MATCHES = 3;        // require a stable gesture before capturing it
  const COOLDOWN_MS = 1600;          // pause after a capture before scanning resumes
  const MOVES = ["rock", "paper", "scissors"];
  const EMOJI = { rock: "✊", paper: "✋", scissors: "✌️" };

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);

  const playModeGroup = el("playModeGroup");
  const multiplayerGuide = el("multiplayerGuide");
  const turnMessage = el("turnMessage");

  const webcamPanel = el("webcamPanel");
  const webcamVideo = el("webcamVideo");
  const webcamCanvas = el("webcamCanvas");
  const webcamIdle = el("webcamIdle");
  const startCameraButton = el("startCameraButton");
  const switchCameraButton = el("switchCameraButton");
  const stopCameraButton = el("stopCameraButton");
  const scanStatus = el("scanStatus");
  const scanHint = el("scanHint");
  const liveGuess = el("liveGuess");
  const liveGuessLabel = el("liveGuessLabel");
  const liveGuessConfidence = el("liveGuessConfidence");

  const roundResult = el("roundResult");
  const vsTagOne = el("vsTagOne");
  const vsTagTwo = el("vsTagTwo");
  const playerOneMove = el("playerOneMove");
  const playerTwoMove = el("playerTwoMove");
  const playerOneEmoji = el("playerOneEmoji");
  const playerTwoEmoji = el("playerTwoEmoji");
  const roundOutcome = el("roundOutcome");
  const nextRoundButton = el("nextRoundButton");

  const errorBox = el("error");
  const errorMessage = el("errorMessage");

  const scoreOneLabel = el("scoreOneLabel");
  const scoreTwoLabel = el("scoreTwoLabel");
  const scoreWinsEl = el("scoreWins");
  const scoreLossesEl = el("scoreLosses");
  const scoreTiesEl = el("scoreTies");
  const scoreResetButton = el("scoreResetButton");

  const celebration = el("celebration");
  const celebrationText = el("celebrationText");

  // ---------- State ----------
  const state = {
    playMode: "practice",      // 'practice' | 'multiplayer'
    scores: { wins: 0, losses: 0, ties: 0 },
    stream: null,
    videoDevices: [],
    currentDeviceIndex: 0,
    liveTimer: null,
    liveBusy: false,
    livePaused: false,         // true during cooldown / while awaiting user action
    candidateMove: null,
    candidateMatches: 0,
    turn: 1,                   // multiplayer: which player is currently being scanned
    pendingMoves: {},          // { 1: 'rock', 2: 'paper' } for multiplayer
  };

  // ---------- Small helpers ----------
  function show(node) { node.classList.remove("hidden"); }
  function hide(node) { node.classList.add("hidden"); }

  function resetCandidate() {
    state.candidateMove = null;
    state.candidateMatches = 0;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    show(errorBox);
    window.clearTimeout(showError._t);
    showError._t = window.setTimeout(() => hide(errorBox), 5000);
  }

  function normalizeMove(label) {
    if (!label) return null;
    const l = label.toLowerCase();
    if (l.includes("rock")) return "rock";
    if (l.includes("paper")) return "paper";
    if (l.includes("scissor")) return "scissors";
    return null;
  }

  function decideWinner(a, b) {
    // returns 'a', 'b', or 'tie'
    if (a === b) return "tie";
    const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
    return beats[a] === b ? "a" : "b";
  }

  function persistScores() {
    scoreWinsEl.textContent = state.scores.wins;
    scoreLossesEl.textContent = state.scores.losses;
    scoreTiesEl.textContent = state.scores.ties;
  }

  function resetRoundUI() {
    hide(roundResult);
    playerOneMove.textContent = "Waiting";
    playerTwoMove.textContent = "Waiting";
    playerOneEmoji.textContent = "✊";
    playerTwoEmoji.textContent = "✊";
    roundOutcome.textContent = "—";
    roundOutcome.className = "vs-outcome";
    state.pendingMoves = {};
    state.turn = 1;
  }

  // ---------- Mode switching ----------
  function applyModeLabels() {
    if (state.playMode === "practice") {
      scoreOneLabel.textContent = "You";
      scoreTwoLabel.textContent = "Computer";
      vsTagOne.textContent = "You";
      vsTagTwo.textContent = "Computer";
    } else {
      scoreOneLabel.textContent = "Player 1";
      scoreTwoLabel.textContent = "Player 2";
      vsTagOne.textContent = "Player 1";
      vsTagTwo.textContent = "Player 2";
    }
  }

  function updateTurnMessage() {
    if (state.playMode !== "multiplayer") return;
    const who = state.turn === 1 ? "Player 1" : "Player 2";
    turnMessage.innerHTML = `${who}: show your gesture to the camera.<span class="turn-badge">Turn ${state.turn}/2</span>`;
  }

  playModeGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".selector-btn");
    if (!btn) return;
    playModeGroup.querySelectorAll(".selector-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.playMode = btn.dataset.mode;
    if (state.playMode === "multiplayer") {
      show(multiplayerGuide);
    } else {
      hide(multiplayerGuide);
    }
    applyModeLabels();
    resetRoundUI();
    hide(celebration);
    if (state.stream) resumeLiveScanning();
  });

  // ---------- Prediction request ----------
  async function sendPrediction(blobOrFile) {
    const formData = new FormData();
    const filename = blobOrFile.name || "capture.jpg";
    formData.append("image", blobOrFile, filename);
    const res = await fetch(PREDICT_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Prediction failed.");
    }
    return data;
  }

  // ---------- Practice mode (vs computer) ----------
  function playPracticeRound(playerMove) {
    const computerMove = MOVES[Math.floor(Math.random() * MOVES.length)];
    const outcome = decideWinner(playerMove, computerMove);
    showRoundResult(playerMove, computerMove, outcome);
    if (outcome === "a") {
      state.scores.wins += 1;
      celebrate("You win!");
    } else if (outcome === "b") {
      state.scores.losses += 1;
      celebrate("Computer wins!");
    } else {
      state.scores.ties += 1;
    }
    persistScores();
  }

  // ---------- Multiplayer mode ----------
  function registerMultiplayerMove(turn, move) {
    state.pendingMoves[turn] = move;
    if (turn === 1) {
      playerOneMove.textContent = capitalize(move);
      playerOneEmoji.textContent = EMOJI[move];
      show(roundResult);
      state.turn = 2;
      updateTurnMessage();
    } else {
      playerTwoMove.textContent = capitalize(move);
      playerTwoEmoji.textContent = EMOJI[move];
      const outcome = decideWinner(state.pendingMoves[1], move);
      finishMultiplayerRound(outcome);
    }
  }

  function finishMultiplayerRound(outcome) {
    if (outcome === "a") {
      state.scores.wins += 1;
      roundOutcome.textContent = "Player 1 wins the round!";
      roundOutcome.className = "vs-outcome player-one";
      celebrate("Player 1 wins!");
    } else if (outcome === "b") {
      state.scores.losses += 1;
      roundOutcome.textContent = "Player 2 wins the round!";
      roundOutcome.className = "vs-outcome player-two";
      celebrate("Player 2 wins!");
    } else {
      state.scores.ties += 1;
      roundOutcome.textContent = "It's a tie!";
      roundOutcome.className = "vs-outcome tie";
    }
    persistScores();
  }

  function showRoundResult(playerMove, otherMove, outcome) {
    playerOneMove.textContent = capitalize(playerMove);
    playerOneEmoji.textContent = EMOJI[playerMove];
    playerTwoMove.textContent = capitalize(otherMove);
    playerTwoEmoji.textContent = EMOJI[otherMove];
    if (outcome === "a") {
      roundOutcome.textContent = state.playMode === "practice" ? "You win!" : "Player 1 wins the round!";
      roundOutcome.className = "vs-outcome player-one";
    } else if (outcome === "b") {
      roundOutcome.textContent = state.playMode === "practice" ? "Computer wins!" : "Player 2 wins the round!";
      roundOutcome.className = "vs-outcome player-two";
    } else {
      roundOutcome.textContent = "It's a tie!";
      roundOutcome.className = "vs-outcome tie";
    }
    show(roundResult);
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function celebrate(text) {
    celebrationText.textContent = text;
    show(celebration);
    window.clearTimeout(celebrate._t);
    celebrate._t = window.setTimeout(() => hide(celebration), 1800);
  }

  celebration.addEventListener("click", () => hide(celebration));

  nextRoundButton.addEventListener("click", () => {
    resetRoundUI();
    updateTurnMessage();
    hide(celebration);
    if (state.stream) resumeLiveScanning();
  });

  scoreResetButton.addEventListener("click", () => {
    state.scores = { wins: 0, losses: 0, ties: 0 };
    persistScores();
  });

  // ---------- Webcam: camera lifecycle ----------
  async function listVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.videoDevices = devices.filter((d) => d.kind === "videoinput");
      if (state.videoDevices.length > 1) show(switchCameraButton);
      else hide(switchCameraButton);
    } catch (_) {
      /* enumeration can fail silently before permission is granted */
    }
  }

  async function startCamera() {
    try {
      const constraints = { video: { facingMode: "user" }, audio: false };
      if (state.videoDevices[state.currentDeviceIndex]) {
        constraints.video = { deviceId: { exact: state.videoDevices[state.currentDeviceIndex].deviceId } };
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.stream = stream;
      webcamVideo.srcObject = stream;
      await webcamVideo.play();
      await listVideoDevices();

      webcamPanel.classList.add("live");
      hide(webcamIdle);
      hide(startCameraButton);
      show(stopCameraButton);
      scanStatus.textContent = "Scanning…";
      scanHint.textContent = "Show a gesture — it's read instantly";
      resetRoundUI();
      updateTurnMessage();
      resumeLiveScanning();
    } catch (err) {
      showError("Couldn't access the camera. Check your browser permissions and try again.");
    }
  }

  function stopCamera() {
    pauseLiveScanning(true);
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
    webcamVideo.srcObject = null;
    webcamPanel.classList.remove("live");
    show(webcamIdle);
    show(startCameraButton);
    hide(stopCameraButton);
    scanStatus.textContent = "Camera off";
    scanHint.textContent = "Start your camera to begin";
    hide(liveGuess);
  }

  startCameraButton.addEventListener("click", startCamera);
  stopCameraButton.addEventListener("click", stopCamera);
  switchCameraButton.addEventListener("click", async () => {
    if (state.videoDevices.length < 2) return;
    state.currentDeviceIndex = (state.currentDeviceIndex + 1) % state.videoDevices.length;
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    await startCamera();
  });

  // ---------- Webcam: live hands-free detection loop ----------
  // Every frame is classified independently and acted on immediately the
  // moment it clears the confidence bar — there's no "hold it steady for
  // N frames" lock-in step. The model is expected to read a single frame
  // reliably on its own.
  function resumeLiveScanning() {
    state.livePaused = false;
    resetCandidate();
    hide(liveGuess);
    liveGuess.classList.remove("captured");
    if (state.liveTimer) return; // already running
    state.liveTimer = window.setInterval(captureAndClassifyFrame, CAPTURE_INTERVAL_MS);
  }

  function pauseLiveScanning(fullStop) {
    state.livePaused = true;
    if (fullStop && state.liveTimer) {
      window.clearInterval(state.liveTimer);
      state.liveTimer = null;
    }
  }

  function grabSquareFrameBlob() {
    const video = webcamVideo;
    if (!video.videoWidth || !video.videoHeight) return Promise.resolve(null);
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    webcamCanvas.width = 224;
    webcamCanvas.height = 224;
    const ctx = webcamCanvas.getContext("2d");
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 224, 224);
    return new Promise((resolve) => webcamCanvas.toBlob(resolve, "image/jpeg", 0.9));
  }

  async function captureAndClassifyFrame() {
    if (state.livePaused || state.liveBusy || !state.stream) return;
    state.liveBusy = true;
    try {
      const blob = await grabSquareFrameBlob();
      if (!blob) return;
      const data = await sendPrediction(new File([blob], "frame.jpg", { type: "image/jpeg" }));
      const move = normalizeMove(data.prediction);

      if (move && data.confidence >= MIN_CONFIDENCE) {
        if (state.candidateMove === move) {
          state.candidateMatches += 1;
        } else {
          state.candidateMove = move;
          state.candidateMatches = 1;
        }
        show(liveGuess);
        liveGuessLabel.textContent = `${EMOJI[move]} ${capitalize(move)}`;
        liveGuessConfidence.textContent = `${Math.round(data.confidence)}% (${state.candidateMatches}/${REQUIRED_MATCHES})`;
        if (state.candidateMatches >= REQUIRED_MATCHES) captureGesture(move);
      } else {
        resetCandidate();
        hide(liveGuess);
      }
    } catch (err) {
      // Network hiccups shouldn't spam the error banner during live scanning.
      console.warn("Live prediction failed:", err.message);
    } finally {
      state.liveBusy = false;
    }
  }

  // Acts on a single confidently-classified frame right away.
  function captureGesture(move) {
    pauseLiveScanning(false); // keep interval alive, just skip work, so resume is instant
    resetCandidate();
    liveGuess.classList.add("captured");
    liveGuessLabel.textContent = `${EMOJI[move]} ${capitalize(move)} captured!`;
    scanStatus.textContent = "Captured";

    if (state.playMode === "practice") {
      playPracticeRound(move);
    } else {
      registerMultiplayerMove(state.turn, move);
    }

    window.setTimeout(() => {
      if (!state.stream) return;
      scanStatus.textContent = "Scanning…";
      resumeLiveScanning();
    }, COOLDOWN_MS);
  }

  // ---------- Init ----------
  applyModeLabels();
  persistScores();
  updateTurnMessage();
})();
