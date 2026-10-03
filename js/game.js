(() => {
  "use strict";

  const DATA = window.QIY_DATA;
  const ULTRA = window.QIY_ULTRA;
  const ALL = DATA.concat(ULTRA);
  const TOTAL = 9;           // 9問連続で成功するとクリア
  const FINAL_SECONDS = 9;   // 最終問題の制限時間
  const CALC_FINAL_SECONDS = 30; // 計算モードの最終問題（とにかく長い式）の制限時間
  const MAX_HINTS = 3;       // ヒントは1ゲーム3回まで

  const $ = (id) => document.getElementById(id);
  const el = {
    app: $("app"), stage: $("stage"), progress: $("progress"), best: $("best"),
    sign: $("sign"), signQ: $("sign-q"), signWord: $("sign-word"), signLang: $("sign-lang"),
    timer: $("timer"), timerFg: $("timer-fg"), timerNum: $("timer-num"),
    kuiya: $("kuiya"), kuiyaWrap: $("kuiya-wrap"), hole: $("hole"), gyozas: $("gyozas"), plate: $("plate"), gyozaTag: $("gyoza-tag"),
    fx: $("fx"), glass: $("glass"),
    btnNine: $("btn-nine"), btnNot: $("btn-not"),
    title: $("title-screen"), startBtn: $("start-btn"), titleNines: $("title-nines"),
    result: $("result"), resultMark: $("result-mark"), resultTitle: $("result-title"),
    resultWord: $("result-word"), resultDetail: $("result-detail"), resultNote: $("result-note"),
    resultStreak: $("result-streak"), resultBtn: $("result-btn"),
    finalIntro: $("final-intro"),
    clear: $("clear-screen"), clearWord: $("clear-word"), clearDetail: $("clear-detail"), clearBtn: $("clear-btn"),
    zukan: $("zukan"), zukanBtn: $("zukan-btn"), zukanClose: $("zukan-close"), zukanList: $("zukan-list"), zukanCount: $("zukan-count"),
    mute: $("mute-btn"), shatter: $("shatter-layer"), toast: $("toast"),
    clearUnlock: $("clear-unlock"), clearZukan: $("clear-zukan"),
    logo: $("logo"), ultraBtn: $("ultra-btn"), finalText: $("final-text"), clearTitle: $("clear-title"), clearMsg: $("clear-msg"),
    clearUltra: $("clear-ultra"), clearNormal: $("clear-normal"), calcBtn: $("calc-btn"),
    hintBtn: $("hint-btn"), hintLeft: $("hint-left"), signHint: $("sign-hint"),
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても遊べる */ } },
  };

  // ───────── サウンド（WebAudio で合成）─────────
  const sound = (() => {
    let ac = null;
    let muted = store.get("qiy-muted", false);
    const ctx = () => {
      if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
      if (ac && ac.state === "suspended") ac.resume();
      return ac;
    };
    const tone = (freq, dur, { type = "sine", vol = 0.2, at = 0, slide = 0 } = {}) => {
      const c = ctx(); if (!c || muted) return;
      const t = c.currentTime + at;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    const noise = (dur, { vol = 0.3, at = 0, filter = "lowpass", freq = 800 } = {}) => {
      const c = ctx(); if (!c || muted) return;
      const t = c.currentTime + at;
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq;
      const g = c.createGain(); g.gain.value = vol;
      s.connect(f).connect(g).connect(c.destination); s.start(t);
    };
    return {
      unlock: ctx,
      get muted() { return muted; },
      toggle() { muted = !muted; store.set("qiy-muted", muted); return muted; },
      ok() { tone(784, 0.15, { type: "triangle" }); tone(1175, 0.3, { type: "triangle", at: 0.12 }); },
      ng() { tone(220, 0.45, { type: "sawtooth", vol: 0.12, slide: -120 }); },
      dig() { for (let i = 0; i < 5; i++) noise(0.09, { at: i * 0.13, freq: 500, vol: 0.4 }); },
      chomp() { for (let i = 0; i < 3; i++) { noise(0.07, { at: i * 0.28, filter: "bandpass", freq: 1400, vol: 0.6 }); tone(180, 0.08, { at: i * 0.28, vol: 0.15 }); } },
      pop() { tone(500, 0.18, { type: "triangle", vol: 0.2, slide: 700 }); },
      tick() { tone(1320, 0.05, { type: "square", vol: 0.06 }); },
      drum() { for (let i = 0; i < 3; i++) tone(90, 0.3, { at: i * 0.32, vol: 0.5, slide: -40 }); tone(70, 0.8, { at: 1.0, vol: 0.6, slide: -30 }); },
      thud() { tone(80, 0.6, { vol: 0.6, slide: -40 }); noise(0.25, { freq: 300, vol: 0.5 }); },
      whoosh() { noise(0.5, { filter: "bandpass", freq: 900, vol: 0.4 }); },
      crash() {
        noise(1.1, { filter: "highpass", freq: 2500, vol: 0.9 });
        noise(0.3, { filter: "lowpass", freq: 400, vol: 0.8 });
        for (let i = 0; i < 14; i++) tone(rand(2200, 6500), rand(0.15, 0.5), { at: rand(0.02, 0.7), vol: 0.06 });
      },
      fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, { type: "triangle", at: i * 0.14, vol: 0.18 })); },
    };
  })();

  // ───────── 状態 ─────────
  const state = {
    round: 0,          // 0 始まり。8 が最終問題
    streak: 0,
    mode: "normal",    // "normal" または "ultra"（超難関）
    best: store.get("qiy-best", 0),
    cleared: store.get("qiy-cleared", false), // 一度クリアすると図鑑と超難関が開放される
    ultraCleared: store.get("qiy-ultra-cleared", false),
    q: null,
    used: new Set(),
    locked: true,
    lastCorrect: false,
    timerId: null,
    hints: MAX_HINTS,
    hintUsed: false,   // この問題でヒントを見たか
    underground: false, // クイヤが穴に潜ったまま（次の看板が出たら戻る）
    calcCleared: store.get("qiy-calc-cleared", false),
    recentCalc: [],     // 計算モードで最近出したテンプレート（同じ形が続かないように）
  };
  const isFinal = () => state.round === TOTAL - 1;
  const isUltra = () => state.mode === "ultra";
  const isCalc = () => state.mode === "calc";
  const bestKey = () => (isUltra() ? "qiy-best-ultra" : isCalc() ? "qiy-best-calc" : "qiy-best");

  function setMode(mode) {
    state.mode = mode;
    state.best = store.get(bestKey(), 0);
    document.body.classList.toggle("ultra", isUltra());
    document.body.classList.toggle("calc", isCalc());
    el.hintBtn.hidden = isUltra(); // 超難関はヒントなし
  }

  // ───────── 出題 ─────────
  function tierFor(round) {
    if (isUltra()) {
      if (round === TOTAL - 1) return 5;
      if (round < 4) return Math.random() < 0.5 ? 3 : 4;
      return Math.random() < 0.5 ? 4 : 5;
    }
    if (round === TOTAL - 1) return 3;
    if (round < 4) return 1;
    return Math.random() < 0.7 ? 2 : 1;
  }
  // 計算モード：1〜2問目かんたん、3〜5問目ふつう、6〜8問目むずかしい、9問目超むずかしい
  function calcLevel(round) {
    return round < 2 ? 1 : round < 5 ? 2 : round < 8 ? 3 : 4;
  }
  function chooseQuestion() {
    if (isCalc()) {
      const q = window.QIY_CALC.make(calcLevel(state.round), Math.random() < 0.5, new Set(state.recentCalc));
      state.recentCalc = [q.id, ...state.recentCalc].slice(0, 3);
      return q;
    }
    const tier = tierFor(state.round);
    const wantNine = Math.random() < 0.5; // 50% の確率で「9」
    const match = (e) => e.t === tier && (e.n === 9) === wantNine;
    let pool = ALL.filter((e) => match(e) && !state.used.has(e));
    if (!pool.length) pool = ALL.filter(match);
    const q = pick(pool);
    state.used.add(q);
    return q;
  }

  // ───────── 描画 ─────────
  function renderProgress() {
    el.progress.innerHTML = "";
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement("div");
      d.className = "dot" + (i === TOTAL - 1 ? " final" : "") + (i < state.streak ? " on" : "") + (i === state.round && !state.locked ? " now" : "");
      d.textContent = i === TOTAL - 1 ? "★" : String(i + 1);
      el.progress.appendChild(d);
    }
    el.best.textContent = state.best;
  }

  // お皿には「最後の餃子」がひとつだけ
  function renderGyoza() {
    el.gyozas.innerHTML = `
      <g transform="translate(64 12) scale(1.3)">
        <g class="gyoza">
          <path d="M0 20 Q28 -20 56 20 Q28 28 0 20Z" fill="#f6dfae" stroke="#c99a52" stroke-width="2"/>
          <path d="M3 20 Q28 27 53 20" fill="none" stroke="#d48a2c" stroke-width="5" stroke-linecap="round" opacity=".8"/>
          <path d="M16 6 q3 4 0 8 M24 2 q3 4 0 8 M32 2 q3 4 0 8 M40 6 q3 4 0 8" fill="none" stroke="#c99a52" stroke-width="1.8" stroke-linecap="round"/>
        </g>
      </g>`;
    el.gyozaTag.textContent = "最後の餃子";
    el.gyozaTag.classList.remove("done");
  }

  function setMood(mood) {
    const mouth = el.kuiya.querySelector(".mouth");
    const d = {
      sad: "M114 128 Q123 119 132 128",
      eat: "M115 121 Q123 137 131 121 Z",
      happy: "M114 122 Q118 128 123 122 Q128 128 132 122",
    };
    mouth.setAttribute("d", d[mood] || d.happy);
    mouth.setAttribute("fill", mood === "eat" ? "#6b3a1f" : "none");
  }

  function resetScene() {
    setMood("happy");
    if (state.underground) {
      clearKuiyaAnims({ keep: el.kuiya }); // 穴の中にいる状態は保つ
    } else {
      clearKuiyaAnims();
      el.kuiya.className.baseVal = "kuiya idle";
      el.hole.classList.remove("open");
    }
    renderGyoza();
  }

  function showQuestion() {
    const q = state.q;
    const final = isFinal();
    el.stage.classList.toggle("final-mode", final);
    el.signQ.textContent = isUltra()
      ? (final ? "超難関・最終問題" : `超難関 第${state.round + 1}問`)
      : isCalc() ? (final ? "計算・最終問題" : `計算 第${state.round + 1}問`)
      : (final ? "最終問題・超難問" : `第${state.round + 1}問`);
    el.signWord.innerHTML = glyphHtml(q);
    el.signWord.dataset.key = q.calc ? "" : ALL.indexOf(q);
    el.signWord.classList.toggle("calc", !!q.calc);
    el.signWord.classList.toggle("drawn", !!q.draw);
    el.signWord.classList.toggle("long", q.calc ? q.long || el.signWord.textContent.length > 26 : !q.draw && [...q.text].length > 9);
    // 計算モードは言語名の代わりに難しさを表示（最終問題でも隠さない）
    el.signLang.textContent = q.calc ? `難しさ：${q.lang}` : final ? "？？？" : q.lang;
    el.sign.classList.remove("flip"); void el.sign.offsetWidth; el.sign.classList.add("flip");
  }

  function setButtons(on) {
    el.btnNine.disabled = el.btnNot.disabled = !on;
    syncHint();
  }

  // ───────── 進行 ─────────
  async function nextQuestion() {
    hide(el.result);
    resetScene();
    state.q = chooseQuestion();
    if (isFinal()) {
      el.glass.hidden = false;
      setButtons(false);
      el.finalText.innerHTML = isCalc()
        ? `<div class="final-small">計算・8連続成功！</div><div class="final-big">最終問題</div><div class="final-hot">超むずかしい</div><div class="final-small">大学数学レベル＆とにかく長い式・制限時間 ${CALC_FINAL_SECONDS} 秒</div>`
        : isUltra()
        ? `<div class="final-small">超難関・8連続成功！</div><div class="final-big">最終問題</div><div class="final-hot">極 難 問</div><div class="final-small">言語名なし・ヒントなし・制限時間 9 秒</div>`
        : `<div class="final-small">8連続成功！</div><div class="final-big">最終問題</div><div class="final-hot">超 難 問</div><div class="final-small">言語名は伏せられ、制限時間は 9 秒</div>`;
      show(el.finalIntro);
      sound.drum();
      await sleep(2600);
      hide(el.finalIntro);
    } else {
      el.glass.hidden = true;
    }
    state.hintUsed = false;
    el.signHint.hidden = true;
    showQuestion();
    if (state.underground) {
      await sleep(450);
      await popUp();
    }
    state.locked = false;
    setButtons(true);
    renderProgress();
    if (isFinal()) startTimer();
  }

  // ───────── ヒント ─────────
  function syncHint() {
    el.hintLeft.textContent = state.hints;
    el.hintBtn.disabled = isUltra() || state.locked || state.hintUsed || state.hints <= 0;
  }
  function useHint() {
    if (el.hintBtn.disabled) return;
    state.hints--;
    state.hintUsed = true;
    // 絵で描く表し方には読みがないので、数え方のヒントを出す
    if (state.q.calc) el.signHint.innerHTML = "数字にすると：" + state.q.hintHtml;
    else el.signHint.textContent = state.q.kana ? "読み：" + state.q.kana : "ヒント：" + state.q.tip;
    el.signHint.hidden = false;
    el.signHint.classList.remove("in"); void el.signHint.offsetWidth; el.signHint.classList.add("in");
    sound.pop();
    syncHint();
  }

  function startGame(mode = state.mode) {
    stopTimer();
    setMode(mode);
    hide(el.title); hide(el.clear); hide(el.result);
    state.round = 0; state.streak = 0; state.used.clear();
    state.hints = MAX_HINTS;
    nextQuestion();
  }

  function startTimer() {
    const total = isCalc() ? CALC_FINAL_SECONDS : FINAL_SECONDS;
    let left = total;
    const C = 2 * Math.PI * 19;
    el.timer.hidden = false; el.timer.classList.remove("warn");
    el.timerFg.style.transition = "none";
    el.timerFg.style.strokeDashoffset = "0";
    void el.timerFg.getBoundingClientRect();
    el.timerFg.style.transition = "";
    el.timerNum.textContent = left;
    state.timerId = setInterval(() => {
      left--;
      el.timerNum.textContent = Math.max(0, left);
      el.timerFg.style.strokeDashoffset = String(C * (1 - left / total));
      if (left <= 3) { el.timer.classList.add("warn"); sound.tick(); }
      if (left <= 0) { stopTimer(); timeUp(); }
    }, 1000);
  }
  function stopTimer() {
    clearInterval(state.timerId); state.timerId = null;
    el.timer.classList.remove("warn");
  }

  function timeUp() {
    if (state.locked) return;
    state.locked = true; setButtons(false);
    setMood("sad");
    sound.ng();
    fail(true);
  }

  async function answer(saysNine) {
    if (state.locked) return;
    state.locked = true; setButtons(false);
    stopTimer();
    const q = state.q;
    const correct = saysNine === (q.n === 9);

    if (saysNine) await animEscape(); else await animEat();

    // 最終問題：正解でも不正解でもクイヤはガラスに飛び込む。割れたあとに判定が出る
    if (isFinal()) {
      el.timer.hidden = true;
      const firstClear = correct && saveClear();
      await diveThroughGlass(correct);
      if (correct) { addStreak(); showClear(firstClear); } else fail(false);
      return;
    }

    if (!correct) { setMood("sad"); sound.ng(); fail(false); return; }

    addStreak();
    sound.ok();
    if (!saysNine) { el.kuiya.classList.add("happy"); }
    showResult(true);
  }

  function addStreak() {
    state.streak++;
    if (state.streak > state.best) { state.best = state.streak; store.set(bestKey(), state.best); }
    renderProgress();
  }

  function fail(timeout) {
    el.timer.hidden = true;
    const record = state.streak;
    state.streak = 0;
    state.lastCorrect = false;
    renderProgress();
    showResult(false, { timeout, record });
  }

  function describe(q) {
    if (q.calc) {
      return `<span class="calc-plain">${q.hintHtml}</span><br>= <span class="num">${q.valueText}</span>` +
        (q.n === 9 ? "…つまり <b>「9」</b>！" : "…<b>「9」ではない</b>！");
    }
    return `<b>${q.lang}</b>（${escapeHtml(q.rom)}）<br>意味は <span class="num">${q.n}</span>` +
      (q.n === 9 ? "…つまり <b>「9」</b>！" : "…<b>「9」ではない</b>！");
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  function showResult(ok, { timeout = false, record = 0 } = {}) {
    const q = state.q;
    state.lastCorrect = ok;
    el.resultMark.className = "result-mark " + (ok ? "ok" : "ng");
    el.resultMark.textContent = ok ? "〇" : "✕";
    el.resultTitle.textContent = ok ? "せいかい！" : (timeout ? "時間切れ…" : "ざんねん…");
    el.resultWord.innerHTML = glyphHtml(q);
    el.resultDetail.innerHTML = describe(q);
    el.resultNote.textContent = q.note ? "💡 " + q.note : "";
    if (ok) {
      const left = TOTAL - state.streak;
      el.resultStreak.innerHTML = `連続成功 <b>${state.streak}</b> 回` + (left === 1 ? "<br>次はいよいよ最終問題…！" : `<br>クリアまであと ${left} 回`);
      el.resultBtn.textContent = "次へ";
    } else {
      el.resultStreak.innerHTML = `今回の記録 <b>${record}</b> 連続　（ベスト ${state.best}）`;
      el.resultBtn.textContent = "もう一度";
    }
    show(el.result);
    armButtons([el.resultBtn], 400);
    setTimeout(() => el.resultBtn.focus({ preventScroll: true }), 420);
  }

  function onResultNext() {
    if (state.lastCorrect) state.round++;
    else { state.round = 0; state.used.clear(); state.hints = MAX_HINTS; } // 失敗して1問目に戻るとヒント回復
    nextQuestion();
  }

  function glyphHtml(q) {
    if (q.calc) return q.html;
    return q.draw ? window.QIY_GLYPH(q.draw[0], q.draw[1]) : escapeHtml(q.text);
  }

  function fillClear() {
    el.clearWord.innerHTML = glyphHtml(state.q);
    el.clearDetail.innerHTML = describe(state.q);
  }

  // 画面が出た直後のタップや Enter（演出中の連打）で、うっかりボタンが押されないようにする
  function armButtons(buttons, ms) {
    buttons.forEach((b) => { b.disabled = true; });
    setTimeout(() => buttons.forEach((b) => { b.disabled = false; }), ms);
  }

  // クリアを記録する。初めてのクリアなら true
  function saveClear() {
    if (isCalc()) {
      const first = !state.calcCleared;
      state.calcCleared = true;
      store.set("qiy-calc-cleared", true);
      return first;
    }
    if (isUltra()) {
      const first = !state.ultraCleared;
      state.ultraCleared = true;
      store.set("qiy-ultra-cleared", true);
      return first;
    }
    const first = !state.cleared;
    unlockZukan();
    syncUltraBtn();
    return first;
  }

  function showClear(firstClear) {
    fillClear();
    el.clearUnlock.hidden = !firstClear;
    if (isCalc()) {
      el.clearTitle.textContent = "計算モードクリア！";
      el.clearMsg.innerHTML = "どんな言葉の数でも、どんな式でも計算できる！<br>クイヤは「9」の計算の達人になった！";
      el.clearUnlock.textContent = "🎉 クイヤ計算モードを初クリア！";
    } else if (isUltra()) {
      el.clearTitle.textContent = "超難関クリア！";
      el.clearMsg.innerHTML = "古代の言葉も、文字のない数も見抜いた！<br>クイヤは伝説の「9」ハンターになった！";
      el.clearUnlock.textContent = "🎉 図鑑に「超難関の9」が追加されました！";
    } else {
      el.clearTitle.textContent = "9連続成功！";
      el.clearMsg.innerHTML = "クイヤはガラスを突き破り、<br>9の向こう側へ飛び込んだ！";
      el.clearUnlock.textContent = "🎉「9の図鑑」と「超難関クイヤゲーム」が開放されました！";
    }
    el.clearUltra.hidden = state.mode !== "normal";
    el.clearNormal.hidden = state.mode === "normal";
    show(el.clear);
    armButtons([el.clearBtn, el.clearUltra, el.clearNormal, el.clearZukan], 1500);
    sound.fanfare();
    rainOfNines();
  }

  // ───────── 演出 ─────────
  function stagePoint(node, fx = 0.5, fy = 0.5) {
    const s = el.stage.getBoundingClientRect(), r = node.getBoundingClientRect();
    return { x: r.left - s.left + r.width * fx, y: r.top - s.top + r.height * fy };
  }

  function popText(text, node) {
    const p = stagePoint(node, 0.5, 0);
    const t = document.createElement("div");
    t.className = "pop-text"; t.textContent = text;
    t.style.left = p.x + "px"; t.style.top = p.y - 10 + "px";
    el.fx.appendChild(t);
    setTimeout(() => t.remove(), 1000);
  }

  function dirtBurst(count) {
    const p = stagePoint(el.hole, 0.5, 0.5);
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "dirt";
      const size = rand(6, 13);
      d.style.width = d.style.height = size + "px";
      d.style.left = p.x + rand(-30, 30) + "px"; d.style.top = p.y + "px";
      el.fx.appendChild(d);
      const dx = rand(-90, 90), up = rand(50, 120);
      d.animate([
        { transform: "translate(0,0)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${-up}px)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${rand(-10, 20)}px)`, opacity: 0 },
      ], { duration: rand(500, 800), delay: rand(0, 600), easing: "ease-out", fill: "both" }).onfinish = () => d.remove();
    }
  }

  async function animEscape() {
    el.kuiya.className.baseVal = "kuiya dig";
    el.hole.classList.add("open");
    sound.dig();
    dirtBurst(26);
    popText("ザクザク！", el.kuiyaWrap);
    await sleep(650);
    const h = el.kuiyaWrap.clientHeight * 1.05;
    await animateKuiya([{ transform: "translateY(0)" }, { transform: `translateY(${h}px)` }],
      { duration: 650, easing: "ease-in", fill: "forwards" });
    state.underground = true;
  }

  // 穴からぴょこっと戻ってくる
  async function popUp() {
    if (!state.underground) return;
    const h = el.kuiyaWrap.clientHeight * 1.05;
    clearKuiyaAnims();
    el.kuiya.className.baseVal = "kuiya";
    sound.pop();
    popText("ぴょこっ", el.kuiyaWrap);
    await animateKuiya([
      { transform: `translateY(${h}px)` },
      { transform: `translateY(${-h * 0.12}px)`, offset: 0.7 },
      { transform: "translateY(0)" },
    ], { duration: 500, easing: "ease-out", fill: "forwards" });
    clearKuiyaAnims();
    el.hole.classList.remove("open");
    el.kuiya.className.baseVal = "kuiya idle";
    state.underground = false;
  }

  // クイヤ本体の動き（WAAPI）。終わったら必ず解除して元の位置に戻す
  let kuiyaAnims = [];
  function animateKuiya(frames, opts, target = el.kuiya) {
    const a = target.animate(frames, opts);
    kuiyaAnims.push(a);
    return a.finished.catch(() => {});
  }
  function clearKuiyaAnims({ keep = null } = {}) {
    // keep: 食べ終わった餃子など、次の問題まで状態を残したい要素
    kuiyaAnims = kuiyaAnims.filter((a) => {
      if (keep && a.effect && a.effect.target === keep) return true;
      a.cancel();
      return false;
    });
  }

  // クイヤがお皿まで歩いていき、最後の餃子を食べる
  async function animEat() {
    // お皿の奥に回り込み、口が餃子のすぐ上に来る位置まで歩く
    const w = el.kuiyaWrap.getBoundingClientRect(), pl = el.plate.getBoundingClientRect();
    const dx = (pl.left + pl.width * 0.5) - (w.left + w.width * 0.56);
    const dy = (pl.top + pl.height * 0.1) - (w.top + w.height * 0.74);
    const at = (k, hop = 0) => `translate(${dx * k}px, ${dy * k - hop}px)`;
    el.kuiya.className.baseVal = "kuiya";
    await animateKuiya([
      { transform: `${at(0)} rotate(0)` },
      { transform: `${at(0.25, 6)} rotate(5deg)`, offset: 0.25 },
      { transform: `${at(0.5)} rotate(-5deg)`, offset: 0.5 },
      { transform: `${at(0.75, 6)} rotate(5deg)`, offset: 0.75 },
      { transform: `${at(1)} rotate(0)` },
    ], { duration: 650, easing: "linear", fill: "forwards" }, el.kuiyaWrap);

    // もぐもぐ
    setMood("eat");
    sound.chomp();
    popText("もぐもぐ", el.kuiyaWrap);
    const g = el.gyozas.querySelector(".gyoza");
    animateKuiya([
      { transform: "translateY(0)" }, { transform: "translateY(8%) scale(1.04, .94)" }, { transform: "translateY(0)" },
    ], { duration: 280, iterations: 3 });
    await animateKuiya([
      { transform: "scale(1)" }, { transform: "scale(.72)", offset: 0.33 }, { transform: "scale(.4)", offset: 0.66 }, { transform: "scale(0)" },
    ], { duration: 840, easing: "steps(3, jump-end)", fill: "forwards" }, g);
    setMood("happy");
    el.gyozaTag.textContent = "ごちそうさま！";
    el.gyozaTag.classList.add("done");
    await sleep(250);

    // 元の場所へ戻る
    await animateKuiya([
      { transform: at(1) }, { transform: at(0) },
    ], { duration: 450, easing: "ease-in-out", fill: "forwards" }, el.kuiyaWrap);
    clearKuiyaAnims({ keep: g });
  }

  // 最終問題：クイヤがガラスを突き破って飛び込み、そのあと正解・不正解を発表する
  async function diveThroughGlass(correct) {
    if (state.underground) { await sleep(300); await popUp(); }
    clearKuiyaAnims();
    el.kuiya.className.baseVal = "kuiya";
    setMood("happy");
    await sleep(250);

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H * 0.45;
    const r = el.kuiyaWrap.getBoundingClientRect();

    // 画面いっぱいのガラス
    el.glass.hidden = true;
    const layer = el.shatter;
    layer.innerHTML = "";
    const pane = document.createElement("div");
    pane.className = "pane";
    layer.appendChild(pane);

    // 飛び込むクイヤ（複製）
    const diver = document.createElement("div");
    diver.className = "diver";
    Object.assign(diver.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    diver.appendChild(el.kuiya.cloneNode(true));
    document.body.appendChild(diver);
    el.kuiya.classList.add("hidden-for-dive");

    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    sound.whoosh();
    await diver.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(0, 6%) scale(1.08, .85)", offset: 0.2 },
      { transform: `translate(${dx * 0.45}px, ${dy - H * 0.25}px) scale(1.8) rotate(-12deg)`, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(3.2) rotate(0deg)` },
    ], { duration: 900, easing: "ease-in", fill: "forwards" }).finished;

    // 衝突：ヒビ
    sound.crash();
    el.app.classList.remove("shake-screen"); void el.app.offsetWidth; el.app.classList.add("shake-screen");
    const geo = buildShatterGeometry(W, H, cx, cy);
    const svgNS = "http://www.w3.org/2000/svg";
    const cracks = document.createElementNS(svgNS, "svg");
    cracks.setAttribute("class", "cracks");
    cracks.setAttribute("viewBox", `0 0 ${W} ${H}`);
    geo.cracks.forEach((d, i) => {
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", d); p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1"; p.style.strokeDashoffset = "1";
      cracks.appendChild(p);
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 220, delay: i * 6, fill: "forwards", easing: "ease-out" });
    });
    layer.appendChild(cracks);
    diver.animate([{ transform: `translate(${dx}px, ${dy}px) scale(3.2)` }, { transform: `translate(${dx}px, ${dy}px) scale(3.0)` }],
      { duration: 280, fill: "forwards" });
    await sleep(380);

    // 粉砕：ここからクイヤはガラスの手前へ
    diver.style.zIndex = "32";
    pane.remove(); cracks.remove();
    const flash = document.createElement("div"); flash.className = "flash"; layer.appendChild(flash);
    flash.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 400, fill: "forwards" });

    shatterOnCanvas(layer, geo.shards, W, H);

    if (correct) {
      // クイヤが画面のこちら側へ飛び込んでくる
      diver.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(3)`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(4.5)`, opacity: 0 },
      ], { duration: 500, easing: "ease-in", fill: "forwards" });
    } else {
      // しょんぼりして落ちていく
      const m = diver.querySelector(".mouth");
      m.setAttribute("d", "M114 128 Q123 119 132 128"); m.setAttribute("fill", "none");
      diver.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(3) rotate(0)` },
        { transform: `translate(${dx}px, ${dy - 30}px) scale(2.8) rotate(-12deg)`, offset: 0.25 },
        { transform: `translate(${dx}px, ${H}px) scale(2.2) rotate(170deg)` },
      ], { duration: 1200, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    }
    await sleep(650);
    await judge(correct);

    layer.innerHTML = "";
    diver.remove();
    el.kuiya.classList.remove("hidden-for-dive");
    el.app.classList.remove("shake-screen");
  }

  // ガラスの破片を 1 枚の canvas で飛ばす（スマホでもメモリを使いすぎないように）
  function shatterOnCanvas(layer, shards, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement("canvas");
    cv.className = "shatter-canvas";
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    layer.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return Promise.resolve();
    ctx.scale(dpr, dpr);
    const parts = shards.map((sh) => ({
      ...sh,
      dist: rand(0.6, 1.3) * (sh.inner ? 420 : 160),
      fall: rand(500, 900),
      spin: sh.inner ? rand(-4, 4) : rand(-0.35, 0.35), // 外側の大きな破片は中心が画面外なので、回しすぎると一瞬で消える
      grow: rand(0, 0.4),
      life: rand(1100, 1600),
    }));
    const t0 = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const ms = now - t0;
        ctx.clearRect(0, 0, W, H);
        let alive = false;
        for (const p of parts) {
          const t = Math.min(1, ms / p.life);
          if (t >= 1) continue;
          alive = true;
          const out = 1 - Math.pow(1 - t, 3); // ease-out
          const x = p.dir[0] * p.dist * out, y = p.dir[1] * p.dist * out + p.fall * t * t;
          ctx.save();
          ctx.globalAlpha = 1 - t * t;
          ctx.translate(p.c[0] + x, p.c[1] + y);
          ctx.rotate(p.spin * t);
          ctx.scale(1 + p.grow * t, 1 + p.grow * t);
          ctx.translate(-p.c[0], -p.c[1]);
          ctx.beginPath();
          p.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.closePath();
          ctx.fillStyle = "rgba(225,242,255,.6)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,.95)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
        if (alive) requestAnimationFrame(frame);
        else { cv.remove(); resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  // ガラスが割れたあとの正解・不正解の発表
  async function judge(ok) {
    const j = document.createElement("div");
    j.className = "judge " + (ok ? "ok" : "ng");
    j.innerHTML = ok
      ? `<div class="judge-stamp">〇 正解！！</div>`
      : `<div class="judge-stamp">✕ 不正解…</div>`;
    document.body.appendChild(j);
    if (ok) sound.ok(); else { sound.ng(); sound.thud(); }
    await sleep(ok ? 1500 : 1800);
    await j.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished;
    j.remove();
  }

  // 衝突点から放射状のヒビと破片の多角形を作る
  function buildShatterGeometry(W, H, cx, cy) {
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.15;
    const rays = 15;
    const base = rand(0, Math.PI * 2);
    const angles = Array.from({ length: rays }, (_, i) => base + (i + rand(-0.3, 0.3)) * (Math.PI * 2 / rays));
    const rings = [rand(40, 70), R * 0.22, R * 0.45, R * 0.72, R * 1.1];
    const P = angles.map((a) => rings.map((rr, j) => {
      const k = j === rings.length - 1 ? 1 : rand(0.82, 1.18);
      return [cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k];
    }));
    const shards = [];
    const add = (pts, inner) => {
      const c = pts.reduce((acc, p) => [acc[0] + p[0] / pts.length, acc[1] + p[1] / pts.length], [0, 0]);
      const len = Math.hypot(c[0] - cx, c[1] - cy) || 1;
      shards.push({ pts, c, inner, dir: [(c[0] - cx) / len, (c[1] - cy) / len] });
    };
    for (let i = 0; i < rays; i++) {
      const n = (i + 1) % rays;
      add([[cx, cy], P[i][0], P[n][0]], true);
      for (let j = 1; j < rings.length; j++) {
        // 外側の大きな四角形はときどき2枚に割る
        const q = [P[i][j - 1], P[i][j], P[n][j], P[n][j - 1]];
        if (j >= 2 && Math.random() < 0.6) { add([q[0], q[1], q[2]], j < 3); add([q[0], q[2], q[3]], j < 3); }
        else add(q, j < 3);
      }
    }
    const cracks = [];
    for (let i = 0; i < rays; i++) {
      cracks.push(`M${cx} ${cy} ` + P[i].map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" "));
    }
    for (let j = 0; j < rings.length - 1; j++) {
      cracks.push(P.map((row, i) => `${i ? "L" : "M"}${row[j][0].toFixed(1)} ${row[j][1].toFixed(1)}`).join(" ") + " Z");
    }
    return { shards, cracks };
  }

  const NINE_GLYPHS = [...new Set(DATA.filter((e) => e.n === 9 && e.text && [...e.text].length <= 4).map((e) => e.text))];

  function rainOfNines() {
    for (let i = 0; i < 40; i++) {
      const s = document.createElement("div");
      s.className = "rain9";
      s.textContent = pick(NINE_GLYPHS);
      s.style.left = rand(0, 100) + "vw";
      s.style.fontSize = rand(18, 42) + "px";
      el.clear.insertBefore(s, el.clear.firstChild);
      s.animate([
        { transform: `translateY(0) rotate(${rand(-30, 30)}deg)`, opacity: 1 },
        { transform: `translateY(${window.innerHeight + 120}px) rotate(${rand(-200, 200)}deg)`, opacity: 0.9 },
      ], { duration: rand(2500, 4500), delay: rand(0, 2000), easing: "linear", fill: "both" }).onfinish = () => s.remove();
    }
  }

  // ───────── 図鑑 ─────────
  function syncZukanBtn() {
    el.zukanBtn.textContent = state.cleared ? "📖" : "🔒";
    el.zukanBtn.title = state.cleared ? "9の図鑑" : "9の図鑑（クリアで開放）";
  }
  function unlockZukan() {
    state.cleared = true;
    store.set("qiy-cleared", true);
    syncZukanBtn();
  }
  function syncUltraBtn() {
    el.ultraBtn.textContent = state.cleared ? "🔥 超難関クイヤゲーム" : "🔒 超難関クイヤゲーム（クリアで開放）";
    el.ultraBtn.classList.toggle("locked", !state.cleared);
  }
  function startUltra() {
    if (!state.cleared) { toast("🔒 ふつうのクイヤゲームをクリアすると遊べるよ！"); return; }
    sound.unlock();
    startGame("ultra");
  }
  function goTitle() {
    stopTimer();
    state.locked = true; setButtons(false);
    el.timer.hidden = true; el.glass.hidden = true;
    [el.result, el.clear, el.finalIntro, el.zukan].forEach(hide);
    setMode("normal");
    renderProgress();
    syncUltraBtn();
    show(el.title);
  }
  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    show(el.toast);
    el.toast.classList.remove("in"); void el.toast.offsetWidth; el.toast.classList.add("in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hide(el.toast), 2600);
  }
  function openZukan() {
    if (!state.cleared) { toast("🔒 クリアすると「9の図鑑」がひらくよ！"); return; }
    buildZukan();
    show(el.zukan);
  }

  function zukanItems(list) {
    return list.map((e) => `
      <div class="zukan-item">
        <div class="zw">${glyphHtml(e)}</div>
        <div class="zl">${escapeHtml(e.lang)}・${escapeHtml(e.rom)}</div>
      </div>`).join("");
  }
  function buildZukan() {
    const nines = DATA.filter((e) => e.n === 9);
    const ultraNines = ULTRA.filter((e) => e.n === 9);
    const langs = new Set(nines.map((e) => e.lang));
    el.zukanCount.textContent = `「9」を表す言葉・記号 ${nines.length} 種類（${langs.size} の言語・表記）を収録`;
    el.zukanList.innerHTML = zukanItems(nines) + (state.ultraCleared
      ? `<h3 class="zukan-sub">🔥 超難関の9（${ultraNines.length} 種類）</h3>` + zukanItems(ultraNines)
      : `<p class="zukan-sub locked">🔒 超難関クイヤゲームをクリアすると「超難関の9」が追加されます</p>`);
  }

  // ───────── 汎用 ─────────
  function show(node) { node.hidden = false; }
  function hide(node) { node.hidden = true; }

  function titleTicker() {
    const glyphs = DATA.filter((e) => e.n === 9 && e.text && [...e.text].length <= 3).map((e) => e.text);
    let i = 0;
    const tick = () => {
      if (el.title.hidden) return;
      el.titleNines.textContent = Array.from({ length: 5 }, (_, k) => glyphs[(i + k) % glyphs.length]).join(" ");
      i++;
    };
    tick();
    setInterval(tick, 900);
  }

  // ───────── イベント ─────────
  el.startBtn.addEventListener("click", () => { sound.unlock(); startGame("normal"); });
  el.ultraBtn.addEventListener("click", startUltra);
  el.calcBtn.addEventListener("click", () => { sound.unlock(); startGame("calc"); });
  el.clearUltra.addEventListener("click", () => startGame("ultra"));
  el.clearNormal.addEventListener("click", () => startGame("normal"));
  el.logo.addEventListener("click", goTitle);
  el.btnNine.addEventListener("click", () => answer(true));
  el.btnNot.addEventListener("click", () => answer(false));
  el.hintBtn.addEventListener("click", useHint);
  el.resultBtn.addEventListener("click", onResultNext);
  el.clearBtn.addEventListener("click", () => startGame());
  el.zukanBtn.addEventListener("click", openZukan);
  el.clearZukan.addEventListener("click", openZukan);
  el.zukanClose.addEventListener("click", () => hide(el.zukan));
  el.zukan.addEventListener("click", (e) => { if (e.target === el.zukan) hide(el.zukan); });
  const syncMute = () => { el.mute.textContent = sound.muted ? "🔇" : "🔊"; };
  el.mute.addEventListener("click", () => { sound.toggle(); syncMute(); });

  document.addEventListener("keydown", (e) => {
    if (!el.zukan.hidden) { if (e.key === "Escape") hide(el.zukan); return; }
    if (!el.title.hidden && e.key === "Enter") { e.preventDefault(); el.startBtn.click(); return; }
    if (!el.result.hidden && e.key === "Enter") { e.preventDefault(); if (!el.resultBtn.disabled) onResultNext(); return; }
    if (!el.clear.hidden) return; // クリア画面は Enter で勝手に始まらない（ボタンを押して選ぶ）
    if (!el.title.hidden) return;
    if (e.key === "ArrowLeft" || e.key === "1") answer(true);
    if (e.key === "ArrowRight" || e.key === "2") answer(false);
    if (e.key === "h" || e.key === "H") useHint();
  });

  // 動作確認（テスト）用：いまの問題を返す
  window.QIY_DEBUG = { current: () => state.q };

  syncMute();
  setButtons(false);
  resetScene();
  renderProgress();
  syncZukanBtn();
  syncUltraBtn();
  titleTicker();
})();
