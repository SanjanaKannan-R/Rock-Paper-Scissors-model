const $ = (id) => document.getElementById(id);
const els = {
  playModes: $("playModeGroup"), inputModes: $("inputModeGroup"), upload: $("uploadPanel"), webcam: $("webcamPanel"),
  guide: $("multiplayerGuide"), turn: $("turnMessage"), drop: $("dropArea"), file: $("imageInput"), browse: $("browseButton"),
  video: $("webcamVideo"), canvas: $("webcamCanvas"), idle: $("webcamIdle"), status: $("scanStatus"), hint: $("scanHint"),
  start: $("startCameraButton"), flip: $("switchCameraButton"), stop: $("stopCameraButton"),
  preview: $("previewSection"), image: $("imagePreview"), analyze: $("predictButton"), remove: $("removeButton"), loading: $("loading"),
  result: $("result"), prediction: $("prediction"), confidence: $("confidence"), bar: $("confidenceBar"), list: $("predictionList"),
  round: $("roundResult"), p1: $("playerOneMove"), p2: $("playerTwoMove"), outcome: $("roundOutcome"), next: $("nextRoundButton"),
  error: $("error"), errorText: $("errorMessage"), wins: $("scoreWins"), losses: $("scoreLosses"), ties: $("scoreTies"), reset: $("scoreResetButton"), celebration: $("celebration"), celebrationText: $("celebrationText")
};
const MOVES = { rock: "Rock", paper: "Paper", scissors: "Scissors" };
let mode = "practice", input = "upload", stream = null, facing = "user", scanTimer = null, scanBusy = false, selectedFile = null, playerOne = null, stableMove = null, stableFrames = 0;
const STABLE_FRAMES_REQUIRED = 3;
const SCORE_KEY = "rpsMultiplayerScore";
let score = loadScore();

function setActive(group, button) { [...group.children].forEach((item) => item.classList.toggle("active", item === button)); }
function setMode(nextMode) {
  mode = nextMode; playerOne = null; els.round.classList.add("hidden"); els.guide.classList.toggle("hidden", mode !== "multiplayer");
  if (mode === "multiplayer") { setInput("webcam"); els.turn.textContent = "Player 1: show your gesture, then lock it in."; }
  renderScore();
}
function setInput(nextInput) {
  input = nextInput; setActive(els.inputModes, [...els.inputModes.children].find((button) => button.dataset.input === input));
  els.upload.classList.toggle("hidden", input !== "upload"); els.webcam.classList.toggle("hidden", input !== "webcam");
  if (input !== "webcam") stopCamera();
}
els.playModes.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; setActive(els.playModes, button); setMode(button.dataset.mode); });
els.inputModes.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button || mode === "multiplayer") return; setInput(button.dataset.input); });

els.browse.onclick = () => els.file.click(); els.drop.onclick = () => els.file.click();
els.file.onchange = () => els.file.files[0] && handleFile(els.file.files[0]);
["dragover", "dragleave", "drop"].forEach((type) => els.drop.addEventListener(type, (event) => { event.preventDefault(); els.drop.classList.toggle("dragover", type === "dragover"); }));
els.drop.addEventListener("drop", (event) => event.dataTransfer.files[0] && handleFile(event.dataTransfer.files[0]));

els.start.onclick = startCamera; els.stop.onclick = stopCamera; els.flip.onclick = async () => { facing = facing === "user" ? "environment" : "user"; stopCamera(); await startCamera(); };
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
    els.video.srcObject = stream; await els.video.play(); els.idle.classList.add("hidden"); els.webcam.classList.add("live"); els.start.classList.add("hidden"); els.flip.classList.remove("hidden"); els.stop.classList.remove("hidden"); els.error.classList.add("hidden");
    if (mode === "multiplayer") { els.status.textContent = playerOne ? "Player 2's turn" : "Player 1's turn"; els.hint.textContent = "Hold a gesture still while it is detected automatically"; }
    else { els.status.textContent = "Live scan active"; els.hint.textContent = "Hold your hand inside the frame"; }
    startScanning();
  } catch (error) { showError("Could not access your camera. Allow camera permission, then try again."); }
}
function startScanning() { clearInterval(scanTimer); stableMove = null; stableFrames = 0; scanOnce(); scanTimer = setInterval(scanOnce, 900); }
function stopCamera() {
  clearInterval(scanTimer); scanTimer = null; stableMove = null; stableFrames = 0; if (stream) stream.getTracks().forEach((track) => track.stop()); stream = null; els.video.srcObject = null; els.idle.classList.remove("hidden"); els.webcam.classList.remove("live"); els.start.classList.remove("hidden"); els.flip.classList.add("hidden"); els.stop.classList.add("hidden"); els.status.textContent = "Camera off"; els.hint.textContent = "Start your camera to begin";
}
async function scanOnce() { if (scanBusy || !stream || els.video.readyState < 2) return; scanBusy = true; try { const data = await requestPrediction(await captureFrame()); displayPrediction(data); if (mode === "multiplayer") considerGesture(data); } catch (error) { showError(error.message); } finally { scanBusy = false; } }
function considerGesture(data) {
  const move = normalizeMove(data.prediction);
  if (!move || data.confidence < 70) { stableMove = null; stableFrames = 0; els.hint.textContent = "Show a clear gesture in the frame"; return; }
  stableFrames = move === stableMove ? stableFrames + 1 : 1; stableMove = move;
  els.hint.textContent = `Gesture found: ${MOVES[move]} — hold still (${stableFrames}/${STABLE_FRAMES_REQUIRED})`;
  if (stableFrames >= STABLE_FRAMES_REQUIRED) acceptGesture(move);
}
function acceptGesture(move) {
  clearInterval(scanTimer); scanTimer = null; stableMove = null; stableFrames = 0;
  if (!playerOne) {
    playerOne = move; els.p1.textContent = MOVES[move]; els.p2.textContent = "Waiting"; els.round.classList.remove("hidden"); els.turn.textContent = "Pass the camera to Player 2. Their scan begins shortly."; els.status.textContent = "Player 1 locked"; els.hint.textContent = `Player 1 chose ${MOVES[move]}`;
    window.setTimeout(() => { if (stream && mode === "multiplayer" && playerOne) { els.status.textContent = "Player 2's turn"; els.hint.textContent = "Hold a gesture still while it is detected automatically"; startScanning(); } }, 1800);
  } else { finishRound(playerOne, move); stopCamera(); }
}
function captureFrame() {
  const width = els.video.videoWidth, height = els.video.videoHeight, side = Math.min(width, height), sx = (width - side) / 2, sy = (height - side) / 2; els.canvas.width = side; els.canvas.height = side; const ctx = els.canvas.getContext("2d"); ctx.save(); if (facing === "user") { ctx.translate(side, 0); ctx.scale(-1, 1); } ctx.drawImage(els.video, sx, sy, side, side, 0, 0, side, side); ctx.restore(); return new Promise((resolve, reject) => els.canvas.toBlob((blob) => blob ? resolve(new File([blob], "gesture.png", { type: "image/png" })) : reject(new Error("Could not capture the webcam frame.")), "image/png"));
}
function handleFile(file) { if (!file.type.startsWith("image/")) return showError("Please select an image file."); if (file.size > 10 * 1024 * 1024) return showError("Image must be smaller than 10 MB."); selectedFile = file; const reader = new FileReader(); reader.onload = (event) => { els.image.src = event.target.result; els.preview.classList.remove("hidden"); els.result.classList.add("hidden"); els.error.classList.add("hidden"); }; reader.readAsDataURL(file); }
els.analyze.onclick = async () => { if (!selectedFile) return showError("Please select an image first."); els.loading.classList.remove("hidden"); els.preview.classList.add("hidden"); try { displayPrediction(await requestPrediction(selectedFile)); } catch (error) { showError(error.message); els.preview.classList.remove("hidden"); } finally { els.loading.classList.add("hidden"); } };
async function requestPrediction(file) { const form = new FormData(); form.append("image", file); const response = await fetch("/predict", { method: "POST", body: form }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Prediction failed."); return data; }
function displayPrediction(data) { els.result.classList.remove("hidden"); els.prediction.textContent = data.prediction; els.confidence.textContent = `${data.confidence}%`; els.bar.style.width = `${data.confidence}%`; els.list.replaceChildren(...data.all_predictions.map((item) => { const row = document.createElement("div"); row.className = "prediction-row"; row.innerHTML = `<div class="prediction-header"><span>${item.label}</span><strong>${item.confidence}%</strong></div><div class="prediction-bar"><div class="prediction-fill" style="width:${item.confidence}%"></div></div>`; return row; })); }
function finishRound(first, second) { els.p1.textContent = MOVES[first]; els.p2.textContent = MOVES[second]; const outcome = first === second ? "tie" : (first === "rock" && second === "scissors") || (first === "paper" && second === "rock") || (first === "scissors" && second === "paper") ? "player-one" : "player-two"; els.outcome.className = `vs-outcome ${outcome}`; els.outcome.textContent = outcome === "tie" ? "It is a tie" : outcome === "player-one" ? "Player 1 wins" : "Player 2 wins"; els.round.classList.remove("hidden"); if (outcome === "player-one") score.wins++; else if (outcome === "player-two") score.losses++; else score.ties++; saveScore(); renderScore(); if (outcome !== "tie") celebrate(outcome === "player-one" ? "Player 1 wins!" : "Player 2 wins!"); }
function celebrate(winner) { els.celebrationText.textContent = winner; els.celebration.classList.remove("hidden"); window.setTimeout(() => els.celebration.classList.add("hidden"), 3200); }
els.next.onclick = () => { playerOne = null; els.round.classList.add("hidden"); els.turn.textContent = "Player 1: show your gesture. It will be locked automatically."; if (!stream) startCamera(); else { els.status.textContent = "Player 1's turn"; els.hint.textContent = "Hold a gesture still while it is detected automatically"; startScanning(); } };
function normalizeMove(label) { const move = String(label).toLowerCase().trim(); return MOVES[move] ? move : null; }
function loadScore() { try { return { wins: 0, losses: 0, ties: 0, ...JSON.parse(localStorage.getItem(SCORE_KEY)) }; } catch { return { wins: 0, losses: 0, ties: 0 }; } }
function saveScore() { localStorage.setItem(SCORE_KEY, JSON.stringify(score)); }
function renderScore() { els.wins.textContent = score.wins; els.losses.textContent = score.losses; els.ties.textContent = score.ties; }
els.reset.onclick = () => { score = { wins: 0, losses: 0, ties: 0 }; saveScore(); renderScore(); };
function showError(message) { els.errorText.textContent = message; els.error.classList.remove("hidden"); }
els.remove.onclick = () => { selectedFile = null; els.file.value = ""; els.preview.classList.add("hidden"); els.result.classList.add("hidden"); };
renderScore(); window.addEventListener("beforeunload", stopCamera);
