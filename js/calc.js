// クイヤ計算モード：いろいろな言語の数詞と、特殊な計算を混ぜた式を自動で作る
// window.QIY_CALC.make(level, wantNine) → 問題
//   level 1 = かんたん（ひらがな・漢字・大字・中国語・英語／四則・累乗・階乗・n進法）
//   level 2 = ふつう（英語以外のアルファベットの言語／三角関数・逆三角関数・対数・方程式など）
//   level 3 = むずかしい（特殊なアルファベットや非ラテン文字／微分・定積分・整数問題）
//   level 4 = 超むずかしい（超難関モードの言葉／大学数学・とにかく長い式）
// 各テンプレートは数を選んで答えを厳密に計算し、同じ式を「言葉」と「数字（ヒント用）」の両方で描く。
// check は検証用の式（テストで数値的に確かめる）。
(() => {
  "use strict";

  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ───────── 数詞 ─────────
  const list = (arr) => (v) => (Number.isInteger(v) && v >= 0 && v < arr.length && arr[v] != null ? arr[v] : null);
  // 0〜9 が連続して並ぶ数字（何桁でも書ける）
  const digits = (zero, maxLen = 9) => (v) =>
    Number.isInteger(v) && v >= 0 && String(v).length <= maxLen ? String(v).replace(/[0-9]/g, (d) => String.fromCodePoint(zero + +d)) : null;

  // 日本語・中国語・英語
  const KANJI = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  function kanji(v) {
    if (v === 0) return "零";
    if (!(v > 0 && v < 1000)) return null;
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return (h ? (h > 1 ? KANJI[h] : "") + "百" : "") + (t ? (t > 1 ? KANJI[t] : "") + "十" : "") + KANJI[u];
  }
  const DAIJI = ["", "壱", "弐", "参", "肆", "伍", "陸", "漆", "捌", "玖"];
  function daiji(v) {
    if (v === 0) return "零";
    if (!(v > 0 && v < 1000)) return null;
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return (h ? DAIJI[h] + "佰" : "") + (t ? (t > 1 ? DAIJI[t] : "") + "拾" : "") + DAIJI[u];
  }
  const HIRA = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
  const HIRA_100 = ["", "ひゃく", "にひゃく", "さんびゃく", "よんひゃく", "ごひゃく", "ろっぴゃく", "ななひゃく", "はっぴゃく", "きゅうひゃく"];
  function hira(v) {
    if (v === 0) return "ぜろ";
    if (!(v > 0 && v < 1000)) return null;
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return HIRA_100[h] + (t ? (t > 1 ? HIRA[t] : "") + "じゅう" : "") + HIRA[u];
  }
  const PY = ["líng", "yī", "èr", "sān", "sì", "wǔ", "liù", "qī", "bā", "jiǔ"];
  function pinyin(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v < 10) return PY[v];
    if (v === 100) return "yìbǎi";
    const t = Math.floor(v / 10), u = v % 10;
    return (t > 1 ? PY[t] : "") + "shí" + (u ? PY[u] : "");
  }
  const EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const EN_T = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function english(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 1000)) return null;
    if (v < 20) return EN[v];
    if (v < 100) return EN_T[Math.floor(v / 10)] + (v % 10 ? "-" + EN[v % 10] : "");
    const r = v % 100;
    return EN[Math.floor(v / 100)] + " hundred" + (r ? " " + english(r) : "");
  }

  // ヨーロッパの言語
  const DE = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf",
    "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
  const DE_T = ["", "zehn", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
  function german(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 1000)) return null;
    if (v >= 100) { const r = v % 100; return (Math.floor(v / 100) > 1 ? DE[Math.floor(v / 100)] : "") + "hundert" + (r ? german(r) : ""); }
    if (v < 20) return DE[v];
    const t = Math.floor(v / 10), u = v % 10;
    return u ? (u === 1 ? "ein" : DE[u]) + "und" + DE_T[t] : DE_T[t];
  }
  const FR = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
    "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const FR_T = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];
  function french(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "cent";
    if (v < 20) return FR[v];
    if (v < 70) { const t = Math.floor(v / 10), u = v % 10; return FR_T[t] + (u === 1 ? " et un" : u ? "-" + FR[u] : ""); }
    if (v < 80) return "soixante" + (v === 71 ? " et onze" : "-" + FR[v - 60]);
    return v === 80 ? "quatre-vingts" : "quatre-vingt-" + FR[v - 80];
  }
  const ES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce",
    "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
    "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const ES_T = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  function spanish(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "cien";
    if (v < 30) return ES[v];
    const t = Math.floor(v / 10), u = v % 10;
    return ES_T[t] + (u ? " y " + ES[u] : "");
  }
  const IT = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici",
    "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
  const IT_T = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];
  function italian(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "cento";
    if (v < 20) return IT[v];
    const t = Math.floor(v / 10), u = v % 10;
    if (!u) return IT_T[t];
    const tens = u === 1 || u === 8 ? IT_T[t].slice(0, -1) : IT_T[t]; // ventuno, ventotto
    return tens + (u === 3 ? "tré" : IT[u]);
  }
  const ID = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
  function indonesian(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "seratus";
    if (v < 10) return ID[v];
    if (v === 10) return "sepuluh";
    if (v === 11) return "sebelas";
    if (v < 20) return ID[v - 10] + " belas";
    const t = Math.floor(v / 10), u = v % 10;
    return ID[t] + " puluh" + (u ? " " + ID[u] : "");
  }
  const portuguese = list(["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze",
    "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"]);
  const dutch = list(["nul", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf",
    "dertien", "veertien", "vijftien", "zestien", "zeventien", "achttien", "negentien", "twintig"]);
  const swedish = list(["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv",
    "tretton", "fjorton", "femton", "sexton", "sjutton", "arton", "nitton", "tjugo"]);
  const latin = list([null, "ūnus", "duo", "trēs", "quattuor", "quīnque", "sex", "septem", "octō", "novem", "decem", "ūndecim",
    "duodecim", "tredecim", "quattuordecim", "quīndecim", "sēdecim", "septendecim", "duodēvīgintī", "ūndēvīgintī", "vīgintī"]);
  const polish = list(["zero", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć", "dziesięć",
    "jedenaście", "dwanaście"]);

  // むずかしい：特殊なアルファベット・非ラテン文字
  const EO = ["nul", "unu", "du", "tri", "kvar", "kvin", "ses", "sep", "ok", "naŭ"];
  function esperanto(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 1000)) return null;
    if (v < 10) return EO[v];
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return [h ? (h > 1 ? EO[h] : "") + "cent" : "", t ? (t > 1 ? EO[t] : "") + "dek" : "", u ? EO[u] : ""].filter(Boolean).join(" ");
  }
  const TR = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  const TR_T = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  function turkish(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 1000)) return null;
    if (v < 10) return TR[v];
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return [h ? (h > 1 ? TR[h] + " " : "") + "yüz" : "", t ? TR_T[t] : "", u ? TR[u] : ""].filter(Boolean).join(" ");
  }
  const KO = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  function korean(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 1000)) return null;
    if (v < 10) return KO[v];
    const h = Math.floor(v / 100), t = Math.floor((v % 100) / 10), u = v % 10;
    return (h ? (h > 1 ? KO[h] : "") + "백" : "") + (t ? (t > 1 ? KO[t] : "") + "십" : "") + (u ? KO[u] : "");
  }
  const SW = ["sifuri", "moja", "mbili", "tatu", "nne", "tano", "sita", "saba", "nane", "tisa"];
  const SW_T = ["", "kumi", "ishirini", "thelathini", "arobaini", "hamsini", "sitini", "sabini", "themanini", "tisini"];
  function swahili(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "mia moja";
    if (v < 10) return SW[v];
    const t = Math.floor(v / 10), u = v % 10;
    return SW_T[t] + (u ? " na " + SW[u] : "");
  }
  const FI = ["nolla", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "seitsemän", "kahdeksan", "yhdeksän"];
  function finnish(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "sata";
    if (v < 10) return FI[v];
    if (v === 10) return "kymmenen";
    if (v < 20) return FI[v - 10] + "toista";
    const t = Math.floor(v / 10), u = v % 10;
    return FI[t] + "kymmentä" + (u ? FI[u] : "");
  }
  const HU = ["nulla", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc"];
  const HU_T = ["", "tíz", "húsz", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"];
  function hungarian(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "száz";
    if (v < 10) return HU[v];
    const t = Math.floor(v / 10), u = v % 10;
    if (!u) return HU_T[t];
    return (t === 1 ? "tizen" : t === 2 ? "huszon" : HU_T[t]) + HU[u];
  }
  const VI = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  function vietnamese(v) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) return null;
    if (v === 100) return "một trăm";
    if (v < 10) return VI[v];
    const t = Math.floor(v / 10), u = v % 10;
    const unit = !u ? "" : " " + (u === 5 ? "lăm" : u === 1 && t > 1 ? "mốt" : VI[u]);
    return (t === 1 ? "mười" : VI[t] + " mươi") + unit;
  }
  const MI = [null, "tahi", "rua", "toru", "whā", "rima", "ono", "whitu", "waru", "iwa"];
  function maori(v) {
    if (!(Number.isInteger(v) && v >= 1 && v < 100)) return null;
    if (v < 10) return MI[v];
    const t = Math.floor(v / 10), u = v % 10;
    return (t > 1 ? MI[t] + " " : "") + "tekau" + (u ? " mā " + MI[u] : "");
  }
  const TH = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  function thai(v) {
    if (!(Number.isInteger(v) && v >= 0 && v < 100)) return null;
    if (v < 10) return TH[v];
    const t = Math.floor(v / 10), u = v % 10;
    return (t === 1 ? "" : t === 2 ? "ยี่" : TH[t]) + "สิบ" + (u === 1 ? "เอ็ด" : u ? TH[u] : "");
  }
  const hawaiian = list([null, "ʻekahi", "ʻelua", "ʻekolu", "ʻehā", "ʻelima", "ʻeono", "ʻehiku", "ʻewalu", "ʻeiwa", "ʻumi"]);
  const arabic = list(["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"]);
  const ukrainian = list(["нуль", "один", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять", "десять"]);
  const russian = list(["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять"]);
  const greek = list(["μηδέν", "ένα", "δύο", "τρία", "τέσσερα", "πέντε", "έξι", "επτά", "οκτώ", "εννέα", "δέκα"]);
  const hebrew = list(["אפס", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר"]);
  const hindi = list(["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस"]);
  const georgian = list(["ნული", "ერთი", "ორი", "სამი", "ოთხი", "ხუთი", "ექვსი", "შვიდი", "რვა", "ცხრა", "ათი"]);

  // 超むずかしい：超難関モードの言葉・文字を数に使う表記・少数文字の数字
  const sumerian = list([null, "diš", "min", "eš", "limmu", "ia", "aš", "imin", "ussu", "ilimmu", "u"]);
  const gothicWord = list([null, "ains", "twai", "þreis", "fidwor", "fimf", "saihs", "sibun", "ahtau", "niun", "taihun"]);
  const pie = list([null, "*óynos", "*dwóh₁", "*tréyes", "*kʷetwóres", "*pénkʷe", "*swéḱs", "*septḿ̥", "*oḱtṓw", "*h₁néwn̥", "*déḱm̥t"]);
  const ainu = list([null, "sinep", "tup", "rep", "inew", "asikne", "iwan", "arwan", "tupesan", "sinepesan", "wan"]);
  const nahuatl = list([null, "cē", "ōme", "ēyi", "nāhui", "mācuīlli", "chicuacē", "chicōme", "chicuēyi", "chiucnāhui", "mahtlactli"]);
  const glagolitic = list([null, "Ⰰ", "Ⰱ", "Ⰲ", "Ⰳ", "Ⰴ", "Ⰵ", "Ⰶ", "Ⰷ", "Ⰸ"]);
  const abjad = list([null, "ا", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ي"]);
  const armenian = list([null, "Ա", "Բ", "Գ", "Դ", "Ե", "Զ", "Է", "Ը", "Թ", "Ժ"]);
  // ギリシャの文字数字（999 まで）
  const GR_U = ["", "α", "β", "γ", "δ", "ε", "ϛ", "ζ", "η", "θ"];
  const GR_T = ["", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ϟ"];
  const GR_H = ["", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϡ"];
  function greekNumeral(v) {
    if (!(Number.isInteger(v) && v > 0 && v < 1000)) return null;
    return GR_H[Math.floor(v / 100)] + GR_T[Math.floor((v % 100) / 10)] + GR_U[v % 10] + "ʹ";
  }
  // ヘブライ数字（99 まで。15・16 は神名を避けた特別な書き方）
  const HE_U = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const HE_T = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  function hebrewNumeral(v) {
    if (!(Number.isInteger(v) && v > 0 && v < 100)) return null;
    const s = v === 15 ? "טו" : v === 16 ? "טז" : HE_T[Math.floor(v / 10)] + HE_U[v % 10];
    return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
  }
  // ゲエズ数字（99 まで。ゼロはない）
  function geez(v) {
    if (!(Number.isInteger(v) && v > 0 && v < 100)) return null;
    const t = Math.floor(v / 10), u = v % 10;
    return (t ? String.fromCodePoint(0x1371 + t) : "") + (u ? String.fromCodePoint(0x1368 + u) : "");
  }
  const glyph = (kind, max) => (v) => (Number.isInteger(v) && v >= 1 && v <= max ? { svg: window.QIY_GLYPH(kind, v) } : null);

  const V = (name, f) => ({ name, f });
  const VOCAB = {
    1: [V("ひらがな", hira), V("漢字", kanji), V("大字", daiji), V("中国語", pinyin), V("英語", english), V("n進法", null)],
    2: [V("ドイツ語", german), V("フランス語", french), V("スペイン語", spanish), V("イタリア語", italian), V("ポルトガル語", portuguese),
      V("オランダ語", dutch), V("スウェーデン語", swedish), V("ラテン語", latin), V("ポーランド語", polish), V("インドネシア語", indonesian)],
    3: [V("エスペラント", esperanto), V("スワヒリ語", swahili), V("ハワイ語", hawaiian), V("トルコ語", turkish), V("フィンランド語", finnish),
      V("ハンガリー語", hungarian), V("ベトナム語", vietnamese), V("マオリ語", maori), V("アラビア語", arabic), V("ウクライナ語", ukrainian),
      V("ロシア語", russian), V("ギリシャ語", greek), V("ヘブライ語", hebrew), V("ヒンディー語", hindi), V("タイ語", thai), V("韓国語", korean),
      V("ジョージア語", georgian), V("デーヴァナーガリー数字", digits(0x966)), V("タイ数字", digits(0xE50)), V("ベンガル数字", digits(0x9E6)),
      V("アラビア文字の数字", digits(0x660)), V("クメール数字", digits(0x17E0)), V("チベット数字", digits(0xF20))],
    4: [V("シュメール語", sumerian), V("ゴート語", gothicWord), V("印欧祖語", pie), V("アイヌ語", ainu), V("ナワトル語", nahuatl),
      V("グラゴル文字", glagolitic), V("アブジャド数字", abjad), V("アルメニア数字", armenian), V("ギリシャ数字", greekNumeral),
      V("ヘブライ数字", hebrewNumeral), V("ゲエズ数字", geez), V("ブラーフミー数字", digits(0x11066)), V("パハウ・フモン数字", digits(0x16B50)),
      V("オスマニャ数字", digits(0x104A0)), V("オルチキ数字", digits(0x1C50)), V("ンコ数字", digits(0x7C0, 1)), V("アドラム数字", digits(0x1E950, 1)),
      V("マヤ数字", glyph("mayan", 19)), V("キープ", glyph("quipu", 9))],
  };

  // n進法（かんたん）：例 11(4) = 5
  function baseForm(v) {
    if (!(Number.isInteger(v) && v >= 2 && v <= 80)) return null;
    const b = rint(2, Math.min(9, v));
    return { html: `${v.toString(b)}<span class="base">(${b})</span>` };
  }

  // 値 v を、その難易度のランダムな言語で書く
  function wordFor(level) {
    return (v) => {
      if (level === 1 && Math.random() < 0.2) { const b = baseForm(v); if (b) return `<span class="w">${b.html}</span>`; }
      const cands = VOCAB[level].filter((x) => x.f).map((x) => x.f(v)).filter((w) => w != null);
      if (!cands.length) return `<span class="w">${v}</span>`;
      const w = pick(cands);
      if (typeof w === "object") return `<span class="w g">${w.svg}</span>`;
      return `<bdi class="w">${esc(w)}</bdi>`;
    };
  }
  const plainNum = (v) => `<span class="w">${v}</span>`;

  // ───────── 式の部品 ─────────
  // 変数（数詞とくっついて読めないように少し離す：rua + k → "ruak" にならないように）
  const X = `<i class="v">x</i>`;
  const K = `<i class="v">k</i>`;
  const I = `<i class="v">i</i>`;
  const sup = (s) => `<sup>${s}</sup>`;
  const lims = (top, bottom) => `<span class="lims"><span>${top}</span><span>${bottom}</span></span>`;
  const integral = (lo, hi, body, dv = "dx") => `∫${lims(hi, lo)}${body} ${dv}`;
  const sigma = (lo, hi, k = "k") => `Σ${lims(hi, `${k}=${lo}`)}`;
  const limit = (under) => `<span class="lim">lim<span>${under}</span></span>`;
  const mat = (cells, cols = 2) => `<span class="mat" style="--cols:${cols}">${cells.map((c) => `<span>${c}</span>`).join("")}</span>`;
  const sqrt = (s) => `√<span class="rad">${s}</span>`;
  const sgn = (n, N) => (n >= 0 ? `+ ${N(n)}` : `− ${N(-n)}`);

  // 9 でないときの答え（9 に近いものを多めに）
  const NEAR = [8, 10, 6, 12, 7, 18, 27, 3];
  const decoy = (allowed = NEAR) => pick(allowed);

  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const ndiv = (n) => { let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c; };
  const comb = (n, r) => fact(n) / (fact(r) * fact(n - r));
  const phi = (n) => { let c = 0; for (let i = 1; i <= n; i++) if (gcd(i, n) === 1) c++; return c; };

  // 条件に合う組み合わせが見つかるまで試す
  function search(gen, ok, tries = 400) {
    for (let i = 0; i < tries; i++) { const r = gen(); if (r && ok(r.value)) return r; }
    return null;
  }
  const want = (nine) => (v) => (nine ? v === 9 : v !== 9 && Number.isFinite(v));

  // ───────── テンプレート ─────────
  // 各テンプレート (nine) → { value, vt?, check, html(N) }
  const T1 = [
    function power(nine) { // さん^two
      const [a, b] = nine ? [3, 2] : pick([[2, 3], [4, 2], [3, 3], [2, 2], [2, 4]]);
      return { value: a ** b, check: `${a}**${b}`, html: (N) => `${N(a)}^${N(b)}` };
    },
    function add(nine) {
      const t = nine ? 9 : decoy([8, 10, 7, 11]);
      const a = rint(1, t - 1);
      return { value: t, check: `${a}+${t - a}`, html: (N) => `${N(a)} + ${N(t - a)}` };
    },
    function baseAdd(nine) { // 11(4)+11(3)
      const t = nine ? 9 : decoy([8, 10, 11, 7]);
      const a = rint(2, t - 2), b = t - a;
      const B = (v) => { const base = rint(2, Math.min(9, v)); return `<span class="w">${v.toString(base)}<span class="base">(${base})</span></span>`; };
      return { value: t, check: `${a}+${b}`, html: (N) => (N === plainNum ? `${N(a)} + ${N(b)}` : `${B(a)} + ${B(b)}`) };
    },
    function divParen(nine) { // 拾捌÷(さん-壱)
      const t = nine ? 9 : decoy([6, 8, 10, 12]);
      const d = rint(2, 4), c = rint(1, 5), b = c + d, a = t * d;
      return { value: t, check: `${a}/(${b}-${c})`, html: (N) => `${N(a)} ÷ (${N(b)} − ${N(c)})` };
    },
    function factorial(nine) {
      const opts = nine
        ? [[3, "+", 3], [4, "−", 15], [3, "+", 3]]
        : [[3, "+", 4], [3, "+", 2], [4, "−", 14], [4, "−", 16], [3, "+", 6]];
      const [a, op, b] = pick(opts);
      const v = op === "+" ? fact(a) + b : fact(a) - b;
      return { value: v, check: `fact(${a})${op === "+" ? "+" : "-"}${b}`, html: (N) => `${N(a)}! ${op} ${N(b)}` };
    },
    function mulSub(nine) {
      return search(() => {
        const a = rint(2, 6), b = rint(2, 6), c = a * b - (nine ? 9 : decoy([8, 10, 12, 6]));
        if (c < 1) return null;
        return { value: a * b - c, check: `${a}*${b}-${c}`, html: (N) => `${N(a)} × ${N(b)} − ${N(c)}` };
      }, want(nine));
    },
    function mix(nine) {
      return search(() => {
        const a = rint(1, 6), b = rint(1, 6), c = rint(2, 4), d = rint(0, 20);
        const v = (a + b) * c - d;
        return { value: v, check: `(${a}+${b})*${c}-${d}`, html: (N) => `(${N(a)} + ${N(b)}) × ${N(c)} − ${N(d)}` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 5 && v <= 14);
    },
    function squareDiff(nine) {
      const diff = nine ? 3 : pick([2, 4]);
      const b = rint(1, 9), a = b + diff;
      return { value: diff ** 2, check: `(${a}-${b})**2`, html: (N) => `(${N(a)} − ${N(b)})^${N(2)}` };
    },
  ];

  const T2 = [
    function sqrtOf(nine) {
      const v = nine ? 9 : decoy([8, 10, 7, 6]);
      return { value: v, check: `Math.sqrt(${v * v})`, html: (N) => sqrt(N(v * v)) };
    },
    function sqrtMul(nine) {
      const [a, b] = nine ? pick([[3, 27], [1, 81], [27, 3]]) : pick([[2, 32], [5, 20], [2, 18], [4, 16]]);
      return { value: Math.sqrt(a * b), check: `Math.sqrt(${a})*Math.sqrt(${b})`, html: (N) => `${sqrt(N(a))} × ${sqrt(N(b))}` };
    },
    function sinMul(nine) {
      const t = nine ? 9 : decoy([8, 10, 6, 7]);
      const [deg, f, k] = pick([[30, "sin", 2], [60, "cos", 2], [90, "sin", 1], [0, "cos", 1]]);
      const a = t * k;
      return { value: t, check: `${a}*Math.${f}(${deg}*Math.PI/180)`, html: (N) => `${N(a)} · ${f} ${N(deg)}°` };
    },
    function tanAdd(nine) {
      const t = nine ? 9 : decoy([8, 10, 7, 11]);
      const a = rint(1, t - 1);
      return { value: t, check: `${a}*Math.tan(Math.PI/4)+${t - a}`, html: (N) => `${N(a)} · tan ${N(45)}° + ${N(t - a)}` };
    },
    function pythagorean(nine) { // sin²θ + cos²θ = 1
      const t = nine ? 9 : decoy([8, 10, 6]);
      const th = rint(1, 89);
      return { value: t, check: `${t}*(Math.sin(${th})**2+Math.cos(${th})**2)`,
        html: (N) => `${N(t)} · (sin${sup(2)}${N(th)}° + cos${sup(2)}${N(th)}°)` };
    },
    function arcTrig(nine) { // arcsin・arccos・arctan
      const t = nine ? 9 : decoy([8, 10, 6]);
      const [f, arg, div] = pick([["arcsin", 1, 2], ["arccos", 0, 2], ["arctan", 1, 4]]);
      const a = t * div;
      return { value: t, check: `${a}*Math.a${f.slice(3)}(${arg})/Math.PI`, html: (N) => `${N(a)} · ${f}(${N(arg)}) ÷ π` };
    },
    function logarithm(nine) {
      const [b, x] = nine ? pick([[2, 512], [3, 19683], [4, 262144]]) : pick([[2, 256], [2, 1024], [3, 729], [3, 6561], [2, 128]]);
      const v = Math.round(Math.log(x) / Math.log(b));
      return { value: v, check: `Math.log(${x})/Math.log(${b})`, html: (N) => `log<sub>${N(b)}</sub> ${x}` };
    },
    function equation(nine) {
      const t = nine ? 9 : decoy([8, 10, 6, 7]);
      const a = rint(2, 5), b = rint(1, 12), c = a * t - b;
      return { value: t, check: `(${c}+${b})/${a}`, html: (N) => `${N(a)}${X} − ${N(b)} = ${N(c)} のときの ${X}` };
    },
    function absDiff(nine) {
      const t = nine ? 9 : decoy([8, 10, 11, 7]);
      const a = rint(1, 10);
      return { value: t, check: `Math.abs(${a}-${a + t})`, html: (N) => `|${N(a)} − ${N(a + t)}|` };
    },
    function fraction(nine) {
      return search(() => {
        const c = rint(2, 6), t = nine ? 9 : decoy([8, 10, 6, 12]), p = t * c;
        const divs = []; for (let i = 2; i < p; i++) if (p % i === 0 && p / i <= 20 && i <= 20) divs.push(i);
        if (!divs.length) return null;
        const a = pick(divs), b = p / a;
        return { value: (a * b) / c, check: `${a}*${b}/${c}`, html: (N) => `${N(a)} × ${N(b)} ÷ ${N(c)}` };
      }, want(nine));
    },
  ];

  const T3 = [
    function derivative(nine) { // f(x) = c·x^n のとき f'(a)
      return search(() => {
        const c = rint(1, 9), n = rint(1, 9), root3 = Math.random() < 0.15;
        const a = root3 ? Math.sqrt(3) : rint(1, 3);
        const v = c * n * a ** (n - 1);
        const r = Math.round(v);
        if (Math.abs(v - r) > 1e-9 || r > 40) return null;
        return { value: r, check: `deriv(x=>${c}*x**${n}, ${root3 ? "Math.sqrt(3)" : a})`,
          html: (N) => `f(${X}) = ${c === 1 ? "" : N(c)}${X}${sup(N(n))} のとき f′(${root3 ? sqrt(N(3)) : N(a)})` };
      }, want(nine));
    },
    function definite(nine) { // ∫ c·x^n dx
      return search(() => {
        const lo = rint(0, 1), hi = rint(lo + 1, 4), c = rint(1, 9), n = rint(0, 3);
        const num = c * (hi ** (n + 1) - lo ** (n + 1)), den = n + 1;
        if (num % den) return null;
        const v = num / den;
        if (v > 40) return null;
        const body = n === 0 ? N0(c) : (N) => `${c === 1 ? "" : N(c)}${X}${n > 1 ? sup(N(n)) : ""}`;
        return { value: v, check: `integ(x=>${c}*x**${n}, ${lo}, ${hi})`, html: (N) => integral(N(lo), N(hi), body(N)) };
      }, want(nine));
    },
    function divisors(nine) {
      const n = nine ? pick([36, 100, 196, 225, 256]) : pick([24, 30, 48, 60, 64, 80, 72, 81, 49, 16]);
      return { value: ndiv(n), check: `ndiv(${n})`, html: (N) => `${N(n)} の約数の個数` };
    },
    function remainder(nine) {
      return search(() => {
        const m = rint(5, 15), r = nine ? 9 : decoy([8, 7, 10, 6, 3]);
        if (r >= m) return null;
        const a = m * rint(2, 7) + r;
        return { value: a % m, check: `${a}%${m}`, html: (N) => `${N(a)} を ${N(m)} で割った余り` };
      }, want(nine));
    },
    function gcdOf(nine) {
      return search(() => {
        const t = nine ? 9 : decoy([8, 6, 12, 10, 3]), p = rint(2, 7), q = rint(2, 7);
        if (p === q || gcd(p, q) !== 1) return null;
        return { value: t, check: `gcd(${t * p},${t * q})`, html: (N) => `gcd(${N(t * p)}, ${N(t * q)})` };
      }, want(nine));
    },
    function sumOdd(nine) { // Σ (2k−1) = n²
      const n = nine ? 3 : pick([2, 4]);
      return { value: n * n, check: `sumTo(k=>2*k-1,1,${n})`, html: (N) => `${sigma(N(1), N(n))}(${N(2)}${K} − ${N(1)})` };
    },
    function sumRange(nine) { // Σ k
      return search(() => {
        const lo = rint(1, 5), hi = rint(lo, 6);
        let v = 0; for (let k = lo; k <= hi; k++) v += k;
        return { value: v, check: `sumTo(k=>k,${lo},${hi})`, html: (N) => `${sigma(N(lo), N(hi))}${K}` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 5 && v <= 15);
    },
    function combination(nine) {
      const [n, r] = nine ? pick([[9, 1], [9, 8]]) : pick([[5, 2], [10, 1], [4, 2], [8, 1], [8, 7], [6, 1]]);
      return { value: comb(n, r), check: `C(${n},${r})`, html: (N) => `<sub>${N(n)}</sub>C<sub>${N(r)}</sub>` };
    },
    function hardArith(nine) {
      return search(() => {
        const a = rint(2, 9), b = rint(2, 9), c = rint(1, 9), d = rint(1, 9);
        const v = a * b - c * d;
        return { value: v, check: `${a}*${b}-${c}*${d}`, html: (N) => `${N(a)} × ${N(b)} − ${N(c)} × ${N(d)}` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 3 && v <= 15);
    },
  ];
  function N0(c) { return (N) => N(c); }

  const T4 = [
    function limSin(nine) {
      const [a, b] = nine ? pick([[9, 1], [18, 2], [27, 3]]) : pick([[8, 1], [10, 1], [16, 2], [3, 1], [9, 3]]);
      return { value: a / b, check: `lim0(x=>Math.sin(${a}*x)/(${b}*x))`,
        html: (N) => `${limit(`${X}→0`)} sin(${N(a)}${X}) ÷ ${b === 1 ? X : `(${N(b)}${X})`}` };
    },
    function limExp(nine) {
      const a = nine ? 9 : decoy([8, 10, 3]);
      return { value: a, check: `lim0(x=>(Math.exp(${a}*x)-1)/x)`, html: (N) => `${limit(`${X}→0`)} (e${sup(`${N(a)}${X}`)} − ${N(1)}) ÷ ${X}` };
    },
    function limE(nine) {
      if (nine) return { value: 9, check: `limInf(n=>n*Math.log(1+9/n))`, html: (N) => `${limit("n→∞")} n · log(${N(1)} + ${N(9)}/n)` };
      return { value: Math.exp(9), vt: "e⁹（約 8103）", check: `limInf(n=>(1+9/n)**n)`, html: (N) => `${limit("n→∞")} (${N(1)} + ${N(9)}/n)${sup("n")}` };
    },
    function determinant(nine) {
      return search(() => {
        const [a, b, c, d] = [rint(1, 9), rint(1, 9), rint(1, 9), rint(1, 9)];
        return { value: a * d - b * c, check: `det2(${a},${b},${c},${d})`, html: (N) => `det ${mat([N(a), N(b), N(c), N(d)])}` };
      }, nine ? want(true) : (v) => v !== 9 && Math.abs(v - 9) <= 4);
    },
    function eigen(nine) {
      return search(() => {
        const a = rint(1, 8), b = rint(1, 8);
        return { value: a + b, check: `eigmax(${a},${b})`, html: (N) => `${mat([N(a), N(b), N(b), N(a)])} の最大固有値` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 6 && v <= 12);
    },
    function dimension(nine) {
      const opts = nine
        ? [["M", 3, 9], ["R", 9, 9], ["P", 8, 9]]
        : [["M", 2, 4], ["P", 9, 10], ["P", 7, 8], ["R", 8, 8], ["S", 3, 6]];
      const [k, n, v] = pick(opts);
      const html = {
        M: (N) => `dim M<sub>${N(n)}</sub>(ℝ)`,
        R: (N) => `dim ℝ${sup(N(n))}`,
        P: (N) => `${N(n)}次以下の実係数多項式の空間の次元`,
        S: (N) => `${N(n)}次実対称行列の空間の次元`,
      }[k];
      return { value: v, check: { M: `${n}*${n}`, R: `${n}`, P: `${n}+1`, S: `${n}*(${n}+1)/2` }[k], html };
    },
    function geometric(nine) { // Σ (a/b)^n = b/(b−a)
      const [a, b] = nine ? [8, 9] : pick([[7, 8], [9, 10], [2, 3], [5, 6]]);
      return { value: b / (b - a), check: `sumTo(n=>(${a}/${b})**n,0,6000)`, html: (N) => `${sigma(N(0), "∞", "n")}(${N(a)}/${N(b)})${sup("n")}` };
    },
    function complexAbs(nine) {
      if (nine) return pick([
        { value: 9, check: `Math.abs(-9)`, html: (N) => `|(${N(3)}${I})${sup(N(2))}|` },
        { value: 9, check: `9`, html: (N) => `|${N(9)} e${sup(`${I}${N(7)}`)}|` },
      ]);
      return pick([
        { value: -9, vt: "−9", check: `-9`, html: (N) => `(${N(3)}${I})${sup(N(2))}` },
        { value: 10, check: `Math.hypot(6,8)`, html: (N) => `|${N(6)} + ${N(8)}${I}|` },
        { value: 5, check: `Math.hypot(3,4)`, html: (N) => `|${N(3)} + ${N(4)}${I}|` },
      ]);
    },
    function doubleIntegral(nine) {
      return search(() => {
        const a = rint(1, 9), b = rint(1, 9);
        return { value: a * b, check: `${a}*${b}`, html: (N) => `${integral(N(0), N(a), integral(N(0), N(b), N(1), "dy"), "dx")}` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 4 && v <= 16);
    },
    function gamma(nine) {
      return search(() => {
        const a = rint(2, 4), b = rint(1, 9);
        return { value: fact(a - 1) + b, check: `fact(${a - 1})+${b}`, html: (N) => `Γ(${N(a)}) + ${N(b)}` };
      }, nine ? want(true) : (v) => v !== 9 && v >= 5 && v <= 13);
    },
    function totient(nine) {
      const [n, d] = nine ? pick([[19, 2], [27, 2]]) : pick([[20, 1], [11, 1], [9, 1], [21, 2], [17, 2]]);
      return { value: phi(n) / d, check: `phi(${n})/${d}`, html: (N) => `φ(${N(n)})${d > 1 ? ` ÷ ${N(d)}` : ""}` };
    },
    function taylor(nine) {
      if (nine) return pick([
        { value: 9, check: `deriv(x=>Math.exp(9*x),0)`, html: (N) => `e${sup(`${N(9)}${X}`)} のマクローリン展開の ${X} の係数` },
        { value: 9, check: `deriv(x=>Math.sin(9*x),0)`, html: (N) => `sin(${N(9)}${X}) のマクローリン展開の ${X} の係数` },
      ]);
      return pick([
        { value: 4.5, vt: "9/2", check: `deriv2(x=>Math.exp(3*x),0)/2`, html: (N) => `e${sup(`${N(3)}${X}`)} のマクローリン展開の ${X}${sup(N(2))} の係数` },
        { value: 8, check: `deriv(x=>Math.exp(8*x),0)`, html: (N) => `e${sup(`${N(8)}${X}`)} のマクローリン展開の ${X} の係数` },
      ]);
    },
    function longChain(nine) { // とにかく長い式
      const target = nine ? 9 : decoy([8, 10, 7, 11, 12]);
      return search(() => {
        const v0 = rint(1, 9);
        let v = v0, html = (N) => N(v0), check = `${v0}`;
        const steps = rint(8, 11);
        for (let i = 0; i < steps; i++) {
          const op = pick(["+", "+", "−", "×", "÷", "!", "^"]);
          const prev = html, prevCheck = check;
          if (op === "+") { const n = rint(1, 9); v += n; html = (N) => `${prev(N)} + ${N(n)}`; check = `${prevCheck}+${n}`; }
          else if (op === "−") { const n = rint(1, 9); if (v - n < 0) continue; v -= n; html = (N) => `${prev(N)} − ${N(n)}`; check = `${prevCheck}-${n}`; }
          else if (op === "×") { const n = rint(2, 3); if (v * n > 60) continue; v *= n; html = (N) => `(${prev(N)}) × ${N(n)}`; check = `(${prevCheck})*${n}`; }
          else if (op === "÷") { const ds = [2, 3, 4, 5].filter((d) => v % d === 0 && v > 0); if (!ds.length) continue; const n = pick(ds); v /= n; html = (N) => `(${prev(N)}) ÷ ${N(n)}`; check = `(${prevCheck})/${n}`; }
          else if (op === "!") { const n = rint(2, 3); v += fact(n); html = (N) => `${prev(N)} + ${N(n)}!`; check = `${prevCheck}+fact(${n})`; }
          else { const n = rint(1, 3); v += n * n; html = (N) => `${prev(N)} + ${N(n)}^${N(2)}`; check = `${prevCheck}+${n}**2`; }
        }
        const k = target - v;
        if (Math.abs(k) > 9) return null;
        const body = html, c = check;
        if (k !== 0) { html = (N) => `${body(N)} ${sgn(k, N)}`; check = `${c}${k > 0 ? "+" : ""}${k}`; }
        return { value: target, check, html, long: true };
      }, () => true, 2000);
    },
  ];

  const TEMPLATES = { 1: T1, 2: T2, 3: T3, 4: T4 };
  const LABEL = { 1: "かんたん", 2: "ふつう", 3: "むずかしい", 4: "超むずかしい" };

  const fmt = (v) => (Number.isInteger(v) ? (v < 0 ? "−" + -v : String(v)) : String(Math.round(v * 1000) / 1000));

  function make(level, wantNine, avoid = new Set()) {
    const T = TEMPLATES[level];
    for (let tries = 0; tries < 300; tries++) {
      const tpl = pick(T);
      if (avoid.has(tpl.name) && tries < 150) continue;
      const r = tpl(wantNine);
      if (!r || (Math.abs(r.value - 9) < 1e-9) !== wantNine) continue;
      return {
        calc: true, t: level, id: tpl.name, lang: LABEL[level],
        html: r.html(wordFor(level)), hintHtml: r.html(plainNum),
        n: Math.abs(r.value - 9) < 1e-9 ? 9 : r.value, valueText: r.vt || fmt(r.value),
        check: r.check, long: !!r.long, rom: "",
      };
    }
    throw new Error("calc: 問題を作れませんでした " + level);
  }

  window.QIY_CALC = { make, LABEL, TEMPLATES };
})();
