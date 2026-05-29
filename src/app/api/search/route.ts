import { NextRequest, NextResponse } from "next/server";
import { toSearchableKana } from "@/lib/kana";

interface BookResult {
  title: string;
  author: string;
  authorReading: string | null;
  coverImage: string | null;
  description: string | null;
  publishedAt: string | null;
  isbn: string | null;
  source: string;
}

interface SearchParams {
  title?: string;
  author?: string;
  year?: string;
}

async function searchOpenBD(isbn: string): Promise<BookResult | null> {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;

    const summary = data[0].summary;
    const textContents: { TextType: string; Text: string }[] =
      data[0].onix?.CollateralDetail?.TextContent ?? [];
    const pickText = (type: string) =>
      textContents.find((c) => c.TextType === type)?.Text?.trim() || null;
    const description = pickText("03") ?? pickText("02");

    return {
      title: summary.title || "",
      author: summary.author?.replace(/,\s*/g, " ") || "",
      authorReading: null,
      coverImage: summary.cover || null,
      description,
      publishedAt: summary.pubdate || null,
      isbn: summary.isbn || isbn,
      source: "openbd",
    };
  } catch {
    return null;
  }
}

async function getOpenBDCover(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data[0]?.summary?.cover || null;
  } catch {
    return null;
  }
}

async function getRakutenCover(isbn: string): Promise<string | null> {
  try {
    const clean = isbn.replace(/[- ]/g, "");
    if (clean.length !== 13) return null;
    const url = `https://shop.r10s.jp/book/cabinet/${clean.slice(-4)}/${clean}.jpg`;
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

async function resolveCover(isbn: string | null): Promise<string | null> {
  if (!isbn) return null;
  const clean = isbn.replace(/[- ]/g, "");
  return (await getOpenBDCover(clean)) ?? (await getRakutenCover(clean));
}

async function searchGoogleBooks({ title, author, year }: SearchParams): Promise<BookResult[]> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : "";

    const parts: string[] = [];
    if (title) parts.push(`intitle:${title}`);
    if (author) parts.push(`inauthor:${author}`);
    if (!parts.length) return [];

    const encoded = encodeURIComponent(parts.join(" "));
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=40&langRestrict=ja${keyParam}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items) return [];

    const raw = data.items.map((item: any) => {
      const info = item.volumeInfo;
      const isbn13 = info.industryIdentifiers?.find((id: any) => id.type === "ISBN_13");
      const isbn10 = info.industryIdentifiers?.find((id: any) => id.type === "ISBN_10");
      const isbn = isbn13?.identifier || isbn10?.identifier || null;
      const thumbnail =
        info.imageLinks?.thumbnail?.replace("http://", "https://") || null;
      return {
        title: info.title || "",
        author: info.authors?.join(", ") || "",
        authorReading: null,
        _thumbnail: thumbnail,
        description: info.description || null,
        publishedAt: info.publishedDate || null,
        isbn,
        source: "google",
      };
    });

    let results = await Promise.all(
      raw.map(async ({ _thumbnail, isbn, ...rest }: any) => ({
        ...rest,
        isbn,
        coverImage: _thumbnail ?? (await resolveCover(isbn)),
      }))
    );

    if (year) {
      results = results.filter((r) => r.publishedAt?.startsWith(year));
    }

    return results;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  const m =
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, "s").exec(xml) ||
    new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s").exec(xml);
  return m ? m[1].trim() : null;
}

function extractIsbnFromDesc(desc: string): string | null {
  const cleaned = desc.replace(/[- ]/g, "");
  const m13 = /97[89]\d{10}/.exec(cleaned);
  if (m13) return m13[0];
  const m10 = /(?<!\d)\d{9}[\dX](?!\d)/.exec(cleaned);
  if (m10) return m10[0];
  return null;
}

function isJapaneseBook(isbn: string | null, title: string): boolean {
  // 角括弧付き言語表記 ([中国語]、[ハングル]、[英語] など) は外国語版
  if (/^\[[^\]]+\]/.test(title)) return false;
  // ISBN の国番号で判定（9784=日本、9787=中国、9788=韓国など）
  if (isbn) {
    const clean = isbn.replace(/[- ]/g, "");
    if (clean.length === 13 && !clean.startsWith("9784")) return false;
    if (clean.length === 10 && !clean.startsWith("4")) return false;
  }
  return true;
}

const NDL_PAGE = 100;
const NDL_MAX = 500;

function buildNDLParams(p: SearchParams, idx: number) {
  const params = new URLSearchParams({ cnt: String(NDL_PAGE), idx: String(idx) });
  if (p.title) params.set("title", p.title);
  if (p.author) params.set("creator", p.author);
  if (p.year) { params.set("from", `${p.year}-01-01`); params.set("until", `${p.year}-12-31`); }
  return params;
}

async function searchNDL({ title, author, year }: SearchParams): Promise<BookResult[]> {
  try {
    if (!title && !author && !year) return [];

    // 1ページ目を取得しつつ総件数を把握
    const firstRes = await fetch(
      `https://ndlsearch.ndl.go.jp/api/opensearch?${buildNDLParams({ title, author, year }, 1)}`
    );
    if (!firstRes.ok) return [];
    const firstXml = await firstRes.text();

    const totalMatch = /<openSearch:totalResults>(\d+)<\/openSearch:totalResults>/.exec(firstXml);
    const total = Math.min(totalMatch ? parseInt(totalMatch[1]) : 0, NDL_MAX);

    // 2ページ目以降を並列取得
    const extraXmls: string[] = [];
    if (total > NDL_PAGE) {
      const pageCount = Math.ceil(total / NDL_PAGE) - 1;
      const extras = await Promise.all(
        Array.from({ length: pageCount }, (_, i) =>
          fetch(`https://ndlsearch.ndl.go.jp/api/opensearch?${buildNDLParams({ title, author, year }, (i + 1) * NDL_PAGE + 1)}`)
            .then((r) => (r.ok ? r.text() : ""))
        )
      );
      extraXmls.push(...extras);
    }

    const allXml = [firstXml, ...extraXmls].join("");
    const itemXmls = [...allXml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

    // メタデータを先に収集（カバー取得は後でまとめて並列実行）
    type Candidate = Omit<BookResult, "coverImage"> & { isbn: string | null };
    const candidates: Candidate[] = [];
    const seenIsbns = new Set<string>();

    for (const item of itemXmls) {
      const cats = [...item.matchAll(/<category>(.*?)<\/category>/g)].map((m) => m[1]);
      if (!cats.includes("図書")) continue;

      const titleVal = extractTag(item, "title");
      if (!titleVal) continue;

      const authorVal = extractTag(item, "author") || extractTag(item, "dc:creator") || "";
      const authorReadingVal = extractTag(item, "dcndl:creatorTranscription");
      const pubDate = extractTag(item, "dc:date");
      const descRaw = extractTag(item, "description") || "";
      const descText = descRaw.replace(/<[^>]+>/g, "").trim();

      const isbn = extractIsbnFromDesc(descText);
      if (!isJapaneseBook(isbn, titleVal)) continue;

      // ISBN重複排除
      const key = isbn ?? titleVal;
      if (seenIsbns.has(key)) continue;
      seenIsbns.add(key);

      candidates.push({
        title: titleVal,
        author: authorVal.replace(/,\s*\d{4}-(\d{4})?/g, "").trim(),
        authorReading: authorReadingVal
          ? authorReadingVal.replace(/,\s*\d{4}-(\d{4})?/g, "").trim()
          : null,
        description: null,
        publishedAt: pubDate || null,
        isbn,
        source: "ndl",
      });
    }

    // カバー画像を並列取得（同時実行数を10に制限）
    const CONCURRENCY = 10;
    const books: BookResult[] = new Array(candidates.length);
    let idx = 0;
    async function worker() {
      while (idx < candidates.length) {
        const i = idx++;
        books[i] = { ...candidates[i], coverImage: await resolveCover(candidates[i].isbn) };
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return books;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim() || "";
  const author = req.nextUrl.searchParams.get("author")?.trim() || "";
  const year = req.nextUrl.searchParams.get("year")?.trim() || "";

  if (!title && !author && !year) {
    return NextResponse.json({ results: [] });
  }

  // ローマ字・ひらがな入力をNDL用のひらがなクエリに変換
  const kanaAuthor = toSearchableKana(author);
  const ndlAuthor = kanaAuthor ?? author; // 変換できた場合はひらがな、漢字はそのまま

  // ISBN検索
  if (title && /^[\d\-\s]{10,17}$/.test(title)) {
    const cleanIsbn = title.replace(/[\-\s]/g, "");
    const result = await searchOpenBD(cleanIsbn);
    if (result) {
      if (!result.coverImage) result.coverImage = await getRakutenCover(cleanIsbn);
      return NextResponse.json({ results: [result] });
    }
  }

  // Google Books と NDL を並列実行
  const [googleResults, ndlResults] = await Promise.all([
    searchGoogleBooks({ title, author, year }),
    searchNDL({ title, author: ndlAuthor, year }),
  ]);

  // ISBNをキーに重複排除しながらマージ（カバー画像があるものを優先）
  const seen = new Map<string, number>(); // key → merged配列のindex
  const merged: BookResult[] = [];

  for (const result of [...googleResults, ...ndlResults]) {
    const key = result.isbn ?? `${result.title}\t${result.author}`;
    if (!seen.has(key)) {
      seen.set(key, merged.length);
      merged.push(result);
    } else if (result.coverImage && !merged[seen.get(key)!].coverImage) {
      // 既存エントリにカバー画像がなく今回あれば差し替え
      merged[seen.get(key)!] = result;
    }
  }

  return NextResponse.json({ results: merged });
}
