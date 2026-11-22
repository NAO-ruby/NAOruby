"use strict";

const levels = {
  basic: {
    name: "初級",
    pairCount: 5,
    timeLimit: 60,
    entries: [
      ["CPU", "命令を処理する頭脳", "アプリからの命令に従って、計算や判断をする部品です。パソコンの頭脳にたとえられます。"],
      ["RAM", "作業用の一時的な記憶領域", "開いているアプリや作業中のデータを一時的に置く場所です。電源を切ると、置いていた内容は消えます。"],
      ["SSD", "ファイルなどを保存する装置", "写真や文書などを保存する部品です。電源を切っても、保存したデータは残ります。"],
      ["OS", "パソコン全体を管理するソフト", "Windowsなど、アプリを動かしたり、画面やキーボードなどを管理したりする基本のソフトです。"],
      ["Ctrl＋C", "コピー", "選んだ文字やファイルをコピーするショートカットです。Ctrlキーを押しながらCキーを押します。"],
      ["Ctrl＋V", "貼り付け", "コピーした文字やファイルなどを、選んだ場所に貼り付けます。Ctrlキーを押しながらVキーを押します。"],
    ],
  },
  advanced: {
    name: "中上級",
    pairCount: 10,
    timeLimit: 120,
    entries: [
      ["VPN", "暗号化などで通信を保護する仮想の専用網", "インターネットなどの上に作る仮想の専用ネットワークです。たとえば、外出先から会社のネットワークに安全につなぐために使います。"],
      ["CSV", "項目をカンマで区切るデータ形式", "住所録などの表を文字データで保存するときに使えます。基本的に、1行に並ぶ項目をカンマで区切ります。"],
      ["PDF", "レイアウトを保ちやすい文書形式", "別のパソコンで開いても、ページの見た目が変わりにくい形式です。配布資料などによく使われます。"],
      [".xlsx", "Excelの標準的なブック形式", "Excelのブックを保存するときによく使われる拡張子です。複数のシートや数式をまとめて保存できます。"],
      ["BIOS", "パソコンの電源投入直後に動く起動プログラム", "電源を入れた直後に、パソコンの部品を準備してOSを起動する処理につなぎます。最近のパソコンでは、同じような役割をUEFIが担います。"],
      ["ファームウェア", "機器に組み込まれ、機器を制御するソフト", "プリンターやルーターなどの中に入っているソフトです。たとえば、プリンターの部品を動かすなど、機器の基本動作を担当します。"],
      ["ドライバー", "OSが周辺機器を操作するためのソフト", "たとえば、印刷するときにOSからの指示をプリンターが扱える形で伝えます。機器やOSに合ったドライバーが必要です。"],
      ["キャッシュ", "次に速く読み込むためのデータの一時保存", "一度読み込んだ画像などを手元に保存し、次に同じデータが必要になったときに素早く取り出す仕組みです。"],
      ["Cookie", "サイトがブラウザに預ける小さな情報", "ウェブサイトが、ログイン状態や設定などを覚えておくために使います。ブラウザに小さな情報が保存されます。"],
      ["API", "ソフト同士が機能やデータを使うための取り決め", "ソフトが別のソフトに処理を頼むときの窓口と、その頼み方です。たとえば、地図の機能を別のアプリから使うときに利用します。"],
    ],
  },
};

const find = (id) => document.getElementById(id);
const home = find("home");
const game = find("game");
const board = find("board");
const status = find("status");
const helpDialog = find("help-dialog");
const learnDialog = find("learn-dialog");
const clearDialog = find("clear-dialog");
const confetti = find("confetti");
const helpButton = find("help");
const modeInputs = [...home.querySelectorAll('input[name="mode"]')];
const strengthOptions = find("cpu-options");
const modeNames = { cpu: "CPU対戦", timed: "タイムアタック" };
const cpuMemoryChance = 0.2;
let round;

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function timeLabel(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function elapsedMilliseconds() {
  return round.elapsed + (round.runningSince === undefined ? 0 : performance.now() - round.runningSince);
}

function remainingSeconds() {
  return Math.max(0, Math.ceil((round.timeLimit * 1000 - elapsedMilliseconds()) / 1000));
}

function updateClock() {
  const timed = round.mode === "timed";
  const seconds = timed ? remainingSeconds() : Math.floor(elapsedMilliseconds() / 1000);
  find("timer").textContent = timeLabel(seconds);
  find("timer-stat").dataset.urgent = String(timed && seconds <= 15);
}

function startClock() {
  round.runningSince = performance.now();
  round.clock = setInterval(checkClock, 100);
}

function pauseClock() {
  round.elapsed = elapsedMilliseconds();
  round.runningSince = undefined;
  clearInterval(round.clock);
}

function checkClock() {
  if (round.mode === "timed" && elapsedMilliseconds() >= round.timeLimit * 1000) {
    pauseClock();
    round.elapsed = round.timeLimit * 1000;
    clearTimeout(round.pending);
    round.first = undefined;
    round.phase = "ended";
    for (const card of round.cards) {
      if (!card.matched) setCardFace(card, false);
    }
    if (helpDialog.open) helpDialog.close();
    status.textContent = "制限時間が終了しました。";
    updateStats();
    showResult();
    return false;
  }
  updateClock();
  return true;
}

function updateStats() {
  find("progress").textContent = `${round.matched} / ${round.pairCount}`;
  find("attempts").textContent = `${round.attempts} 回`;
  find("player-pairs").textContent = `${round.points.player} ペア`;
  find("cpu-pairs").textContent = `${round.points.cpu} ペア`;
  find("turn").textContent = round.phase === "ended" ? "終了" : round.turn === "cpu" ? "CPU" : "あなた";
  find("turn-stat").dataset.turn = round.phase === "ended" ? "" : round.turn;
  const playerCanPlay = round.phase === "select" && round.turn === "player";
  helpButton.disabled = !playerCanPlay;
  for (const card of round.cards) {
    card.element.setAttribute("aria-disabled", String(!playerCanPlay || card.matched || card === round.first));
  }
  updateClock();
}

function stopRound() {
  if (round) {
    clearInterval(round.clock);
    clearTimeout(round.pending);
    round = undefined;
  }
  for (const dialog of [learnDialog, clearDialog, helpDialog]) {
    if (dialog.open) dialog.close();
  }
  helpButton.disabled = false;
  confetti.replaceChildren();
}

function createCard(entry, kind, position) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "card";
  element.dataset.kind = kind;
  element.innerHTML = `
    <span class="card-inner" aria-hidden="true">
      <span class="card-face card-back"><i class="pc-icon"></i></span>
      <span class="card-face card-front"><span class="card-tag"></span><span class="card-text"></span></span>
    </span>`;
  const card = { entry, kind, position, element, matched: false };
  card.value = kind === "term" ? entry[0] : entry[1];
  card.label = kind === "term" ? "用語" : "意味";
  element.querySelector(".card-text").textContent = card.value;
  setCardFace(card, false);
  element.addEventListener("click", () => {
    if (round?.turn === "player" && !helpDialog.open) turnCard(card);
  });
  return card;
}

function setCardFace(card, open) {
  const { element, matched, label, value, position } = card;
  element.dataset.open = String(open);
  element.dataset.matched = String(matched);
  element.setAttribute("aria-label", open
    ? `カード${position}、${label}、${value}${matched ? "、正解済み" : ""}`
    : `カード${position}、裏向き`);
  element.querySelector(".card-tag").textContent = matched ? `✓ ${label}` : label;
}

function startRound(levelKey, mode, cpuStrength) {
  stopRound();
  const { name, pairCount, timeLimit, entries } = levels[levelKey];
  const selected = shuffled(entries).slice(0, pairCount);
  const faces = selected.flatMap((entry) => [{ entry, kind: "term" }, { entry, kind: "meaning" }]);
  const cards = shuffled(faces).map(({ entry, kind }, index) => createCard(entry, kind, index + 1));
  board.dataset.level = levelKey;
  board.replaceChildren(...cards.map((card) => card.element));
  const versusCpu = mode === "cpu";
  find("game-heading").textContent = `${modeNames[mode]} · ${name}`;
  find("game-details").textContent = versusCpu
    ? `対戦相手は${levels[cpuStrength].name}CPU。あなたからスタート！`
    : `制限時間は${timeLimit / 60}分。すべてのペアをそろえよう！`;
  find("game-stats").dataset.mode = mode;
  for (const id of ["player-stat", "cpu-stat", "turn-stat"]) find(id).hidden = !versusCpu;
  find("progress-stat").hidden = versusCpu;
  find("attempt-label").textContent = versusCpu ? "あなたの挑戦回数" : "挑戦回数";
  find("timer-label").textContent = versusCpu ? "経過時間（分:秒）" : "残り時間（分:秒）";
  status.textContent = "1枚目のカードをめくろう。";
  home.hidden = true;
  game.hidden = false;
  round = {
    levelKey, mode, cpuStrength, pairCount, timeLimit, cards,
    attempts: 0, matched: 0, points: { player: 0, cpu: 0 },
    turn: "player", phase: "select", elapsed: 0, memory: new Map(),
  };
  updateStats();
  startClock();
  find("game-heading").focus();
}

function turnCard(card) {
  if (round.phase !== "select" || card.matched || card === round.first || !checkClock()) return;
  setCardFace(card, true);
  if (round.mode === "cpu") {
    round.memory.set(card.position, { entry: card.entry, kind: card.kind });
  }
  if (round.turn === "cpu") card.element.dataset.cpuPick = "true";

  if (!round.first) {
    round.first = card;
    status.textContent = round.turn === "cpu"
      ? `CPUが「${card.value}」をめくりました。`
      : `${card.label}「${card.value}」に合うカードを探そう。`;
    updateStats();
    return;
  }

  const first = round.first;
  round.phase = "resolve";
  if (round.turn === "player") round.attempts += 1;
  if (isPair(card, first)) {
    recordMatch(first, card);
  } else {
    status.textContent = `「${first.value}」と「${card.value}」は違う組み合わせです。`;
    updateStats();
    round.pending = setTimeout(() => {
      if (!checkClock()) return;
      setCardFace(first, false);
      setCardFace(card, false);
      delete first.element.dataset.cpuPick;
      delete card.element.dataset.cpuPick;
      round.first = undefined;
      if (round.mode === "cpu") {
        round.turn = round.turn === "player" ? "cpu" : "player";
      }
      prepareTurn();
    }, 1500);
  }
}

function isPair(first, second) {
  return first && second && first.entry === second.entry && first.kind !== second.kind;
}

function prepareTurn() {
  round.phase = "select";
  updateStats();
  if (round.turn === "cpu") {
    status.textContent = "CPUがカードを選んでいます…";
    round.pending = setTimeout(playCpuTurn, 600);
  } else {
    status.textContent = round.mode === "cpu" ? "あなたの番です。カードを2枚めくろう。" : "次のペアを探そう。";
    round.cards.find((card) => !card.matched).element.focus();
  }
}

function chooseCpuCard(useMemory) {
  const available = round.cards.filter((card) => !card.matched && card !== round.first);
  const candidates = shuffled(available);
  if (!useMemory) return candidates[0];

  const remembered = (card) => round.memory.get(card.position);
  const knownMatch = round.first
    ? candidates.find((card) => isPair(remembered(round.first), remembered(card)))
    : candidates.find((card) => candidates.some((other) => isPair(remembered(card), remembered(other))));
  return knownMatch ?? candidates.find((card) => !remembered(card)) ?? candidates[0];
}

function playCpuTurn() {
  const useMemory = round.cpuStrength === "advanced" || Math.random() < cpuMemoryChance;
  turnCard(chooseCpuCard(useMemory));
  round.pending = setTimeout(() => turnCard(chooseCpuCard(useMemory)), 700);
}

function recordMatch(first, second) {
  for (const card of [first, second]) {
    card.matched = true;
    setCardFace(card, true);
    delete card.element.dataset.cpuPick;
    round.memory.delete(card.position);
  }
  round.first = undefined;
  round.matched += 1;
  round.points[round.turn] += 1;
  round.phase = "learn";
  pauseClock();
  updateStats();
  const [term, meaning, explanation] = second.entry;
  const cpuMatched = round.turn === "cpu";
  status.textContent = cpuMatched ? `CPUが「${term}」のペアを取りました。` : `正解！「${term}」のペアがそろいました。`;
  find("learn-label").textContent = cpuMatched ? "✓ CPUがペアを獲得！" : "✓ ペア正解！";
  find("learn-title").textContent = term;
  find("learn-meaning").textContent = meaning;
  find("learn-text").textContent = explanation;
  find("continue").textContent = round.matched === round.pairCount ? "結果を見る" : "ゲームを続ける";
  round.pending = setTimeout(() => learnDialog.showModal(), 330);
}

function continueRound() {
  if (!learnDialog.open) return;
  learnDialog.close();
  if (round.matched === round.pairCount) {
    round.phase = "ended";
    updateStats();
    showResult();
    return;
  }
  startClock();
  prepareTurn();
}

function showResult() {
  const versusCpu = round.mode === "cpu";
  const seconds = Math.floor(elapsedMilliseconds() / 1000);
  const difference = round.points.player - round.points.cpu;
  const result = versusCpu ? Math.sign(difference) : round.matched === round.pairCount ? 1 : -1;
  const outcome = { 1: "win", 0: "draw", "-1": "lose" }[result];
  const titles = { win: "YOU WIN!", draw: "DRAW!", lose: "YOU LOSE!" };
  const messages = {
    win: versusCpu ? "おめでとう！CPUに勝ちました！" : "おめでとう！PCマスター認定！",
    draw: "同点です！もう一度勝負しよう！",
    lose: versusCpu ? "残念！もう一度挑戦しよう！" : "時間切れ！もう一度挑戦しよう！",
  };
  clearDialog.dataset.outcome = outcome;
  find("clear-title").textContent = titles[outcome];
  find("result-message").textContent = messages[outcome];
  find("result-stats").dataset.mode = round.mode;
  find("final-player-stat").hidden = !versusCpu;
  find("final-cpu-stat").hidden = !versusCpu;
  find("final-score-stat").hidden = versusCpu;
  find("final-player").textContent = `${round.points.player} ペア`;
  find("final-cpu").textContent = `${round.points.cpu} ペア`;
  const wrongAttempts = round.attempts - round.points.player;
  const score = Math.max(0, round.matched * 200 - wrongAttempts * 30 - seconds);
  find("final-score").textContent = `${score.toLocaleString("ja-JP")} 点`;
  find("final-attempt-label").textContent = versusCpu ? "あなたの挑戦回数" : "挑戦回数";
  find("final-attempts").textContent = `${round.attempts} 回`;
  find("final-time-label").textContent = versusCpu ? "経過時間" : "残り時間";
  find("final-time").textContent = timeLabel(versusCpu ? seconds : remainingSeconds());
  clearDialog.showModal();
  if (outcome === "win" && !matchMedia("(prefers-reduced-motion: reduce)").matches) startConfetti();
}

function startConfetti() {
  const colors = ["#2e62e3", "#36a9e9", "#15a687", "#ffbd3b", "#e65387", "#9169de"];
  const pieces = Array.from({ length: 60 }, (_, index) => {
    const piece = document.createElement("span");
    piece.style.setProperty("--left", `${Math.random() * 100}%`);
    piece.style.setProperty("--size", `${6 + Math.random() * 7}px`);
    piece.style.setProperty("--paint", colors[index % colors.length]);
    piece.style.setProperty("--duration", `${2.1 + Math.random() * 1.7}s`);
    piece.style.setProperty("--delay", `${Math.random() * 1.2}s`);
    piece.style.setProperty("--drift", `${-18 + Math.random() * 36}vw`);
    piece.style.setProperty("--rotation", `${Math.random() * 900 - 450}deg`);
    return piece;
  });
  confetti.replaceChildren(...pieces);
}

function chooseGame() {
  stopRound();
  game.hidden = true;
  home.hidden = false;
  find("mode-heading").focus();
}

function replay() {
  startRound(round.levelKey, round.mode, round.cpuStrength);
}

function selectedMode() {
  return modeInputs.find((input) => input.checked).value;
}

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    strengthOptions.hidden = selectedMode() !== "cpu";
  });
}
for (const button of home.querySelectorAll("[data-level]")) {
  button.addEventListener("click", () => {
    const cpuStrength = strengthOptions.querySelector("input:checked").value;
    startRound(button.dataset.level, selectedMode(), cpuStrength);
  });
}
helpButton.addEventListener("click", () => helpDialog.showModal());
find("close-help").addEventListener("click", () => helpDialog.close());
find("continue").addEventListener("click", continueRound);
find("restart").addEventListener("click", replay);
find("replay").addEventListener("click", replay);
find("back").addEventListener("click", chooseGame);
find("choose").addEventListener("click", chooseGame);
learnDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  continueRound();
});
clearDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  chooseGame();
});
