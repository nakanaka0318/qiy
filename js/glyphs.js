// 文字コード（Unicode）がない、または表示できる環境がほとんどない数の表し方を SVG で描く
// window.QIY_GLYPH(kind, value) → SVG 文字列（色は currentColor）
(() => {
  "use strict";

  const svg = (w, h, body) =>
    `<svg class="glyph" viewBox="0 0 ${w} ${h}" style="aspect-ratio:${w}/${h}" role="img" aria-label="図">${body}</svg>`;

  // マヤ数字：点＝1、横棒＝5（点が上、棒が下）
  function mayan(v) {
    const bars = Math.floor(v / 5), dots = v % 5;
    const W = 100, dotH = dots ? 24 : 0, H = dotH + bars * 22 + 4;
    let b = "";
    const gap = 20, x0 = W / 2 - ((dots - 1) * gap) / 2;
    for (let i = 0; i < dots; i++) b += `<circle cx="${x0 + i * gap}" cy="12" r="8" fill="currentColor"/>`;
    for (let i = 0; i < bars; i++) b += `<rect x="8" y="${dotH + 2 + i * 22}" width="84" height="15" rx="6" fill="currentColor"/>`;
    return svg(W, H, b);
  }

  // バビロニア数字：縦のくさび（楔形文字）を並べる
  function babylonian(v) {
    const rows = { 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3] }[v];
    const cols = Math.max(...rows), W = cols * 22 + 8, H = rows.length * 36 + 4;
    let b = "";
    rows.forEach((n, r) => {
      const x0 = W / 2 - ((n - 1) * 22) / 2;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 22, y = 4 + r * 36;
        b += `<path d="M${x - 9} ${y} L${x + 9} ${y} L${x + 2} ${y + 11} L${x + 1.2} ${y + 31} L${x - 1.2} ${y + 31} L${x - 2} ${y + 11}Z" fill="currentColor"/>`;
      }
    });
    return svg(W, H, b);
  }

  // ヒエログリフの数字：縦線（一の位の棒）を並べる
  function egyptian(v) {
    const rows = { 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [5, 4] }[v];
    const W = Math.max(...rows) * 16 + 8, H = rows.length * 38 + 4;
    let b = "";
    rows.forEach((n, r) => {
      const x0 = W / 2 - ((n - 1) * 16) / 2;
      for (let i = 0; i < n; i++) b += `<rect x="${x0 + i * 16 - 3.5}" y="${4 + r * 38}" width="7" height="32" rx="3.5" fill="currentColor"/>`;
    });
    return svg(W, H, b);
  }

  // 算木（一の位・縦式）：1〜5 は縦棒、6〜9 は上に横棒（＝5）＋縦棒
  function rods(v) {
    const top = v > 5, n = top ? v - 5 : v;
    const W = Math.max(n * 16 + 16, 64), H = top ? 70 : 52;
    let b = "";
    if (top) b += `<rect x="${W / 2 - 28}" y="4" width="56" height="8" rx="4" fill="currentColor"/>`;
    const x0 = W / 2 - ((n - 1) * 16) / 2, y = top ? 20 : 4;
    for (let i = 0; i < n; i++) b += `<rect x="${x0 + i * 16 - 4}" y="${y}" width="8" height="46" rx="4" fill="currentColor"/>`;
    return svg(W, H, b);
  }

  // そろばん（1桁）：梁に寄せた玉を数える。上の玉＝5、下の玉＝1
  function soroban(v) {
    const W = 70, H = 150, cx = 35, beam = 46;
    const five = v >= 5, ones = v % 5;
    const bead = (y) => `<path d="M${cx - 24} ${y} L${cx} ${y - 9} L${cx + 24} ${y} L${cx} ${y + 9}Z" fill="currentColor"/>`;
    let b = `<rect x="3" y="3" width="64" height="144" rx="4" fill="none" stroke="currentColor" stroke-width="5"/>`;
    b += `<line x1="${cx}" y1="5" x2="${cx}" y2="145" stroke="currentColor" stroke-width="3" opacity=".5"/>`;
    b += `<rect x="3" y="${beam - 3}" width="64" height="6" fill="currentColor"/>`;
    b += bead(five ? beam - 13 : 15);
    for (let i = 0; i < 4; i++) {
      const up = i < ones;
      const y = up ? beam + 13 + i * 19 : 145 - 12 - (3 - i) * 19;
      b += bead(y);
    }
    return svg(W, H, b);
  }

  // 「正」の字で数える：5画で5。足りない画で残りを表す
  function tallySei(v) {
    const strokes = [
      [4, 5, 36, 5], [20, 5, 20, 37], [20, 21, 33, 21], [8, 21, 8, 37], [2, 37, 38, 37],
    ];
    const groups = [];
    for (let left = v; left > 0; left -= 5) groups.push(Math.min(5, left));
    const W = groups.length * 46 + 2, H = 42;
    let b = "";
    groups.forEach((n, g) => {
      for (let i = 0; i < n; i++) {
        const [x1, y1, x2, y2] = strokes[i];
        b += `<line x1="${x1 + g * 46 + 2}" y1="${y1}" x2="${x2 + g * 46 + 2}" y2="${y2}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
      }
    });
    return svg(W, H, b);
  }

  // 西洋式の画線法：縦4本＋斜線で5
  function tallyLatin(v) {
    let x = 6, b = "";
    for (let left = v; left > 0; left -= 5) {
      const n = Math.min(5, left);
      const start = x;
      for (let i = 0; i < Math.min(n, 4); i++) { b += `<line x1="${x}" y1="6" x2="${x}" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`; x += 11; }
      if (n === 5) b += `<line x1="${start - 6}" y1="44" x2="${x - 5}" y2="12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
      x += 12;
    }
    return svg(x, 56, b);
  }

  // インカのキープ（結縄）：一の位の「長い結び目」の巻き数が数を表す
  function quipu(v) {
    const W = 60, turn = 7, top = 24, H = top + v * turn + 40;
    let b = `<line x1="0" y1="6" x2="${W}" y2="6" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
    b += `<path d="M30 6 L30 ${top}" stroke="currentColor" stroke-width="3" fill="none"/>`;
    for (let i = 0; i < v; i++) {
      b += `<ellipse cx="30" cy="${top + 4 + i * turn}" rx="10" ry="4.6" fill="none" stroke="currentColor" stroke-width="2.6" transform="rotate(-14 30 ${top + 4 + i * turn})"/>`;
    }
    b += `<path d="M30 ${top + v * turn + 4} L30 ${H - 4}" stroke="currentColor" stroke-width="3" fill="none"/>`;
    return svg(W, H, b);
  }

  // アステカの数字：点ひとつが1
  function aztec(v) {
    const W = v * 17 + 6;
    let b = "";
    for (let i = 0; i < v; i++) b += `<circle cx="${11 + i * 17}" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/>`;
    return svg(W, 24, b);
  }

  // トランプ：スートのマーク（ピップ）の並びだけで数を読む
  function card(v) {
    const L = 22, R = 58, C = 40;
    const pos = {
      8: [[L, 18], [L, 50], [L, 82], [R, 18], [R, 50], [R, 82], [C, 34], [C, 66]],
      9: [[L, 16], [L, 39], [L, 62], [L, 85], [R, 16], [R, 39], [R, 62], [R, 85], [C, 50]],
    }[v];
    let b = `<rect x="2" y="2" width="76" height="98" rx="8" fill="#fff" stroke="currentColor" stroke-width="3"/>`;
    pos.forEach(([x, y], i) => {
      const flip = y > 55 ? ` transform="rotate(180 ${x} ${y})"` : "";
      b += `<path${flip} d="M${x} ${y - 9} C${x + 10} ${y - 1} ${x + 9} ${y + 6} ${x + 3} ${y + 5} L${x + 5} ${y + 10} L${x - 5} ${y + 10} L${x - 3} ${y + 5} C${x - 9} ${y + 6} ${x - 10} ${y - 1} ${x} ${y - 9}Z" fill="currentColor"/>`;
    });
    return svg(80, 102, b);
  }

  const KINDS = { mayan, babylonian, egyptian, rods, soroban, tallySei, tallyLatin, quipu, aztec, card };
  window.QIY_GLYPH = (kind, v) => KINDS[kind](v);
})();
