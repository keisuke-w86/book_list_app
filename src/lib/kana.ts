const ROMAJI_TABLE: [string, string][] = [
  ["sha","しゃ"],["shi","し"],["shu","しゅ"],["sho","しょ"],
  ["chi","ち"],["cha","ちゃ"],["chu","ちゅ"],["cho","ちょ"],
  ["tsu","つ"],
  ["kya","きゃ"],["kyu","きゅ"],["kyo","きょ"],
  ["nya","にゃ"],["nyu","にゅ"],["nyo","にょ"],
  ["hya","ひゃ"],["hyu","ひゅ"],["hyo","ひょ"],
  ["mya","みゃ"],["myu","みゅ"],["myo","みょ"],
  ["rya","りゃ"],["ryu","りゅ"],["ryo","りょ"],
  ["gya","ぎゃ"],["gyu","ぎゅ"],["gyo","ぎょ"],
  ["bya","びゃ"],["byu","びゅ"],["byo","びょ"],
  ["pya","ぴゃ"],["pyu","ぴゅ"],["pyo","ぴょ"],
  ["ja","じゃ"],["ji","じ"],["ju","じゅ"],["jo","じょ"],
  ["ka","か"],["ki","き"],["ku","く"],["ke","け"],["ko","こ"],
  ["sa","さ"],["si","し"],["su","す"],["se","せ"],["so","そ"],
  ["ta","た"],["ti","ち"],["tu","つ"],["te","て"],["to","と"],
  ["na","な"],["ni","に"],["nu","ぬ"],["ne","ね"],["no","の"],
  ["ha","は"],["hi","ひ"],["fu","ふ"],["hu","ふ"],["he","へ"],["ho","ほ"],
  ["ma","ま"],["mi","み"],["mu","む"],["me","め"],["mo","も"],
  ["ya","や"],["yu","ゆ"],["yo","よ"],
  ["ra","ら"],["ri","り"],["ru","る"],["re","れ"],["ro","ろ"],
  ["wa","わ"],["wo","を"],["wi","ゐ"],["we","ゑ"],
  ["ga","が"],["gi","ぎ"],["gu","ぐ"],["ge","げ"],["go","ご"],
  ["za","ざ"],["zi","じ"],["zu","ず"],["ze","ぜ"],["zo","ぞ"],
  ["da","だ"],["di","ぢ"],["du","づ"],["de","で"],["do","ど"],
  ["ba","ば"],["bi","び"],["bu","ぶ"],["be","べ"],["bo","ぼ"],
  ["pa","ぱ"],["pi","ぴ"],["pu","ぷ"],["pe","ぺ"],["po","ぽ"],
  ["a","あ"],["i","い"],["u","う"],["e","え"],["o","お"],
];
const VOWELS = new Set(["a","i","u","e","o"]);

export function romajiToHiragana(input: string): string {
  const s = input.toLowerCase().replace(/[\s\-']/g, "");
  let result = "";
  let i = 0;
  while (i < s.length) {
    if (i + 1 < s.length && !VOWELS.has(s[i]) && s[i] !== "n" && s[i] === s[i + 1]) {
      result += "っ"; i++; continue;
    }
    if (s[i] === "n") {
      const hasLonger = ROMAJI_TABLE.some(([r]) => r.length > 1 && r[0] === "n" && s.startsWith(r, i));
      if (!hasLonger) { result += "ん"; i++; continue; }
    }
    const match = ROMAJI_TABLE.find(([r]) => s.startsWith(r, i));
    if (match) { result += match[1]; i += match[0].length; }
    else { result += s[i]; i++; }
  }
  return result;
}

export function hiraganaToKatakana(str: string): string {
  return str.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function looksLikeRomaji(str: string): boolean {
  return /^[a-zA-Z\s\-']+$/.test(str.trim());
}

export function looksLikeKana(str: string): boolean {
  return /[ぁ-ん]/.test(str);
}

/** ローマ字・ひらがな入力をNDL検索用のひらがなに変換。漢字はnullを返す */
export function toSearchableKana(author: string): string | null {
  if (looksLikeRomaji(author)) return romajiToHiragana(author);
  if (looksLikeKana(author)) return author.replace(/\s/g, "");
  return null;
}

/**
 * キーワードから検索に使う表記バリエーションを返す。
 * ローマ字 → ひらがな・カタカナを追加
 * ひらがな → カタカナを追加
 */
export function expandKeyword(keyword: string): string[] {
  const terms = new Set([keyword]);
  if (looksLikeRomaji(keyword)) {
    const hira = romajiToHiragana(keyword);
    terms.add(hira);
    terms.add(hiraganaToKatakana(hira));
  } else if (looksLikeKana(keyword)) {
    terms.add(hiraganaToKatakana(keyword));
  }
  return [...terms];
}
