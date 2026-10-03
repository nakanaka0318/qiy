(() => {
  "use strict";

  const DATA = window.QIY_DATA;
  const TOTAL = 9;           // 9問連続で成功するとクリア
  const FINAL_SECONDS = 9;   // 最終問題の制限時間

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
    best: store.get("qiy-best", 0),
    cleared: store.get("qiy-cleared", false), // 一度クリアすると図鑑が開放される
    q: null,
    used: new Set(),
    locked: true,
    lastCorrect: false,
    timerId: null,
  };
  const isFinal = () => state.round === TOTAL - 1;

  // ───────── 出題 ─────────
  function tierFor(round) {
    if (round === TOTAL - 1) return 3;
    if (round < 4) return 1;
    return Math.random() < 0.7 ? 2 : 1;
  }
  function chooseQuestion() {
    const tier = tierFor(state.round);
    const wantNine = Math.random() < 0.5; // 50% の確率で「9」
    const match = (e) => e.t === tier && (e.n === 9) === wantNine;
    let pool = DATA.filter((e) => match(e) && !state.used.has(e));
    if (!pool.length) pool = DATA.filter(match);
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
    clearKuiyaAnims();
    el.kuiya.className.baseVal = "kuiya idle";
    el.hole.classList.remove("open");
    setMood("happy");
    renderGyoza();
  }

  function showQuestion() {
    const q = state.q;
    const final = isFinal();
    el.stage.classList.toggle("final-mode", final);
    el.signQ.textContent = final ? "最終問題・超難問" : `第${state.round + 1}問`;
    el.signWord.textContent = q.text;
    el.signWord.classList.toggle("long", [...q.text].length > 9);
    el.signLang.textContent = final ? "？？？" : q.lang;
    el.sign.classList.remove("flip"); void el.sign.offsetWidth; el.sign.classList.add("flip");
  }

  function setButtons(on) { el.btnNine.disabled = el.btnNot.disabled = !on; }

  // ───────── 進行 ─────────
  async function nextQuestion() {
    hide(el.result);
    resetScene();
    state.q = chooseQuestion();
    if (isFinal()) {
      el.glass.hidden = false;
      setButtons(false);
      show(el.finalIntro);
      sound.drum();
      await sleep(2600);
      hide(el.finalIntro);
    } else {
      el.glass.hidden = true;
    }
    showQuestion();
    state.locked = false;
    setButtons(true);
    renderProgress();
    if (isFinal()) startTimer();
  }

  function startGame() {
    hide(el.title); hide(el.clear);
    state.round = 0; state.streak = 0; state.used.clear();
    nextQuestion();
  }

  function startTimer() {
    let left = FINAL_SECONDS;
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
      el.timerFg.style.strokeDashoffset = String(C * (1 - left / FINAL_SECONDS));
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

    if (!correct) { setMood("sad"); sound.ng(); fail(false); return; }

    state.streak++;
    if (state.streak > state.best) { state.best = state.streak; store.set("qiy-best", state.best); }
    sound.ok();
    renderProgress();

    if (isFinal()) {
      el.timer.hidden = true;
      await diveThroughGlass();
      showClear();
      return;
    }
    if (!saysNine) { el.kuiya.classList.add("happy"); }
    showResult(true);
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
    el.resultWord.textContent = q.text;
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
    el.resultBtn.focus({ preventScroll: true });
  }

  function onResultNext() {
    if (state.lastCorrect) state.round++;
    else { state.round = 0; state.used.clear(); }
    nextQuestion();
  }

  function fillClear() {
    el.clearWord.textContent = state.q.text;
    el.clearDetail.innerHTML = describe(state.q);
  }

  function showClear() {
    fillClear();
    el.clearUnlock.hidden = state.cleared;
    unlockZukan();
    show(el.clear);
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
    await sleep(350);
    // 穴からぴょこっと戻ってくる
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

  // 最終問題成功：クイヤがガラスを突き破って飛び込む
  async function diveThroughGlass() {
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

    geo.shards.forEach((s) => {
      const sh = document.createElement("div");
      sh.className = "shard";
      sh.style.clipPath = `polygon(${s.pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
      sh.style.transformOrigin = `${s.c[0]}px ${s.c[1]}px`;
      layer.appendChild(sh);
      const dist = rand(0.6, 1.4) * (s.inner ? 900 : 500);
      const tx = s.dir[0] * dist, ty = s.dir[1] * dist;
      sh.animate([
        { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
        { transform: `translate(${tx * 0.6}px, ${ty * 0.6}px) rotate(${rand(-120, 120)}deg) scale(${rand(1.1, 1.5)})`, opacity: 0.95, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty + rand(300, 700)}px) rotate(${rand(-360, 360)}deg) scale(${rand(0.8, 1.6)})`, opacity: 0 },
      ], { duration: rand(900, 1500), easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
    });

    // クイヤが画面のこちら側へ飛び込んでくる
    setTimeout(() => { fillClear(); show(el.clear); }, 450);
    diver.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(3)`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(12)`, opacity: 0 },
    ], { duration: 700, easing: "ease-in", fill: "forwards" });

    await sleep(1500);
    layer.innerHTML = "";
    diver.remove();
    el.kuiya.classList.remove("hidden-for-dive");
    el.app.classList.remove("shake-screen");
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

  const NINE_GLYPHS = [...new Set(DATA.filter((e) => e.n === 9 && [...e.text].length <= 4).map((e) => e.text))];

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
    show(el.zukan);
  }

  function buildZukan() {
    const nines = DATA.filter((e) => e.n === 9);
    const langs = new Set(nines.map((e) => e.lang));
    el.zukanCount.textContent = `「9」を表す言葉・記号 ${nines.length} 種類（${langs.size} の言語・表記）を収録`;
    el.zukanList.innerHTML = nines.map((e) => `
      <div class="zukan-item">
        <div class="zw">${escapeHtml(e.text)}</div>
        <div class="zl">${escapeHtml(e.lang)}・${escapeHtml(e.rom)}</div>
      </div>`).join("");
  }

  // ───────── 汎用 ─────────
  function show(node) { node.hidden = false; }
  function hide(node) { node.hidden = true; }

  function titleTicker() {
    const glyphs = DATA.filter((e) => e.n === 9 && [...e.text].length <= 3).map((e) => e.text);
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
  el.startBtn.addEventListener("click", () => { sound.unlock(); startGame(); });
  el.btnNine.addEventListener("click", () => answer(true));
  el.btnNot.addEventListener("click", () => answer(false));
  el.resultBtn.addEventListener("click", onResultNext);
  el.clearBtn.addEventListener("click", startGame);
  el.zukanBtn.addEventListener("click", openZukan);
  el.clearZukan.addEventListener("click", openZukan);
  el.zukanClose.addEventListener("click", () => hide(el.zukan));
  el.zukan.addEventListener("click", (e) => { if (e.target === el.zukan) hide(el.zukan); });
  const syncMute = () => { el.mute.textContent = sound.muted ? "🔇" : "🔊"; };
  el.mute.addEventListener("click", () => { sound.toggle(); syncMute(); });

  document.addEventListener("keydown", (e) => {
    if (!el.zukan.hidden) { if (e.key === "Escape") hide(el.zukan); return; }
    if (!el.title.hidden && e.key === "Enter") { e.preventDefault(); el.startBtn.click(); return; }
    if (!el.result.hidden && e.key === "Enter") { e.preventDefault(); onResultNext(); return; }
    if (!el.clear.hidden && e.key === "Enter") { e.preventDefault(); startGame(); return; }
    if (e.key === "ArrowLeft" || e.key === "1") answer(true);
    if (e.key === "ArrowRight" || e.key === "2") answer(false);
  });

  syncMute();
  setButtons(false);
  resetScene();
  renderProgress();
  buildZukan();
  syncZukanBtn();
  titleTicker();
})();
