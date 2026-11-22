"use strict";

const levels = {
  basic: {
    name: "初級",
    pairCount: 5,
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

function elapsedSeconds() {
  return Math.floor(((round.finishedAt ?? performance.now()) - round.startedAt) / 1000);
}

function updateStats() {
  find("progress").textContent = `${round.matched} / ${round.pairCount}`;
  find("attempts").textContent = `${round.attempts} 回`;
  find("timer").textContent = timeLabel(elapsedSeconds());
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
  element.addEventListener("click", () => turnCard(card));
  return card;
}

function setCardFace(card, open) {
  const { element, matched, label, value, position } = card;
  element.dataset.open = String(open);
  element.dataset.matched = String(matched);
  element.setAttribute("aria-disabled", String(matched));
  element.setAttribute("aria-label", open
    ? `カード${position}、${label}、${value}${matched ? "、正解済み" : ""}`
    : `カード${position}、裏向き`);
  element.querySelector(".card-tag").textContent = matched ? `✓ ${label}` : label;
}

function startRound(levelKey) {
  stopRound();
  const { name, pairCount, entries } = levels[levelKey];
  const selected = shuffled(entries).slice(0, pairCount);
  const faces = selected.flatMap((entry) => [{ entry, kind: "term" }, { entry, kind: "meaning" }]);
  const cards = shuffled(faces).map(({ entry, kind }, index) => createCard(entry, kind, index + 1));
  board.dataset.level = levelKey;
  board.replaceChildren(...cards.map((card) => card.element));
  find("game-heading").textContent = `${name}のペアマッチ`;
  status.textContent = "1枚目のカードをめくろう。";
  home.hidden = true;
  game.hidden = false;
  round = { levelKey, pairCount, cards, attempts: 0, matched: 0, startedAt: performance.now() };
  updateStats();
  round.clock = setInterval(updateStats, 200);
  find("game-heading").focus();
}

function turnCard(card) {
  if (!round || round.locked || card.matched || card === round.first) return;
  setCardFace(card, true);

  if (!round.first) {
    round.first = card;
    status.textContent = `${card.label}「${card.value}」に合うカードを探そう。`;
    return;
  }

  const first = round.first;
  round.locked = true;
  round.attempts += 1;
  if (card.entry === first.entry && card.kind !== first.kind) {
    recordMatch(first, card);
  } else {
    status.textContent = `「${first.value}」と「${card.value}」は違う組み合わせです。`;
    updateStats();
    round.pending = setTimeout(() => {
      setCardFace(first, false);
      setCardFace(card, false);
      round.first = undefined;
      round.locked = false;
      status.textContent = "次の組み合わせを探そう。";
    }, 1500);
  }
}

function recordMatch(first, second) {
  for (const card of [first, second]) {
    card.matched = true;
    setCardFace(card, true);
  }
  round.first = undefined;
  round.matched += 1;
  if (round.matched === round.pairCount) {
    round.finishedAt = performance.now();
    clearInterval(round.clock);
  }
  updateStats();
  const [term, meaning, explanation] = second.entry;
  status.textContent = `正解！「${term}」のペアがそろいました。`;
  find("learn-title").textContent = term;
  find("learn-meaning").textContent = meaning;
  find("learn-text").textContent = explanation;
  find("continue").textContent = round.finishedAt === undefined ? "ゲームを続ける" : "クリア結果を見る";
  round.pending = setTimeout(() => learnDialog.showModal(), 330);
}

function continueRound() {
  learnDialog.close();
  if (round.finishedAt !== undefined) {
    showResult();
    return;
  }
  round.locked = false;
  status.textContent = "次のペアを探そう。";
  round.cards.find((card) => !card.matched).element.focus();
}

function showResult() {
  const seconds = elapsedSeconds();
  const extraAttempts = round.attempts - round.pairCount;
  const score = Math.max(0, round.pairCount * 200 - extraAttempts * 30 - seconds);
  find("final-score").textContent = `${score.toLocaleString("ja-JP")} 点`;
  find("final-attempts").textContent = `${round.attempts} 回`;
  find("final-time").textContent = timeLabel(seconds);
  clearDialog.showModal();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) startConfetti();
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

function chooseLevel() {
  stopRound();
  game.hidden = true;
  home.hidden = false;
  find("level-heading").focus();
}

function replay() {
  startRound(round.levelKey);
}

for (const button of home.querySelectorAll("[data-level]")) {
  button.addEventListener("click", () => startRound(button.dataset.level));
}
find("help").addEventListener("click", () => helpDialog.showModal());
find("close-help").addEventListener("click", () => helpDialog.close());
find("continue").addEventListener("click", continueRound);
find("restart").addEventListener("click", replay);
find("replay").addEventListener("click", replay);
find("back").addEventListener("click", chooseLevel);
find("choose").addEventListener("click", chooseLevel);
learnDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  continueRound();
});
clearDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  chooseLevel();
});
