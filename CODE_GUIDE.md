# コード解説書

各ファイルのコードを処理単位で解説します。ARCHITECTURE.md の概要を読んだ後にこちらを読むと理解が深まります。

---

## `src/app/page.tsx` — TOPページ（キーワード検索のデバウンス）

```ts
const [keyword, setKeyword] = useState("");
const [debouncedKeyword, setDebouncedKeyword] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedKeyword(keyword), 400);
  return () => clearTimeout(timer);
}, [keyword]);
```
`keyword` は入力のたびに即座に更新され、入力欄の表示に使います。`debouncedKeyword` は入力が止まってから 400ms 後にだけ更新されます。`useEffect` の返り値（クリーンアップ関数）として `clearTimeout` を渡すことで、次の文字を入力したときに前のタイマーをキャンセルします。`fetchBooks` の依存配列には `debouncedKeyword` を使うため、実際のAPI呼び出しは入力完了後の1回だけになります。

---

## `src/app/books/[id]/page.tsx` / `src/app/books/new/page.tsx` — ステータスと読了日の連動

```ts
onChange={(e) => {
  const s = e.target.value as BookStatus;
  const today = new Date().toISOString().slice(0, 10);
  setForm((f) => ({
    ...f,
    status: s,
    readAt: s === "read" && !f.readAt ? today
          : s !== "read"             ? ""
          :                            f.readAt,
  }));
}}
```
3段階の三項演算子で読了日を制御します：
- "read" に変更 かつ 読了日が未設定 → 今日の日付を自動入力
- "want" / "reading" に変更 → 読了日をクリア
- "read" のまま（他の項目を操作した場合）→ 読了日を維持

`new Date().toISOString()` は `"2026-05-29T00:00:00.000Z"` の形式を返すので `.slice(0, 10)` で `"2026-05-29"` だけを取り出します。

---

## `src/app/tags/page.tsx` — タグ管理ページ

### インライン編集の制御

```ts
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (editingId) inputRef.current?.focus();
}, [editingId]);
```
`editingId` が変わったとき（＝編集モードに入ったとき）に入力欄にフォーカスを移します。`useRef` で DOM 要素を直接参照し、`focus()` を呼びます。`?.` はオプショナルチェーンで、ref が未アタッチの場合のエラーを防ぎます。

### onBlur でのリネーム確定

```ts
onBlur={() => handleRename(tag.id)}
```
入力欄からフォーカスが外れたとき（他の場所をクリックしたとき）も自動でリネームを確定します。`handleRename` 内で名前が変わっていない場合は API を呼ばずに編集モードを終了します。

### 未使用タグの一括削除

```ts
await Promise.all(unused.map((t) => fetch(`/api/tags/${t.id}`, { method: "DELETE" })));
```
`Promise.all` で未使用タグの DELETE リクエストを並列実行します。逐次処理より高速です。

---

## `src/app/api/tags/[id]/route.ts` — タグ更新・削除 API

```ts
try {
  const tag = await prisma.tag.update({ where: { id }, data: { name } });
  return NextResponse.json(tag);
} catch {
  return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
}
```
`Tag.name` は `@unique` 制約があるため、重複した名前を設定しようとすると Prisma がエラーをスローします。`try/catch` でそれを捕捉し、HTTP 409 Conflict を返します。フロントエンド側ではこの 409 レスポンスを検知してエラーメッセージをインライン表示します。

---

## `src/lib/types.ts` — 型定義

アプリ全体で使う TypeScript の型を一箇所にまとめたファイルです。

```ts
export type BookStatus = "want" | "reading" | "read";
```
ステータスは3つの文字列リテラルの和（Union 型）として定義します。これにより `"done"` などの誤った値をコンパイル時に弾けます。

```ts
export interface Book {
  id: string;
  title: string;
  author: string | null;
  authorReading: string | null;  // カタカナ読み（例: "ヨネザワ, ホノブ"）
  coverImage: string | null;     // 表紙画像URL（なければ null）
  ...
  tags: BookTag[];               // タグの配列（JOIN済みデータ）
}
```
`string | null` は「文字列か null のどちらか」を意味します。任意項目はすべて null 許容にしています。`tags` は DB の JOIN 結果をネストして持ちます。

```ts
export interface SearchResult {
  title: string;
  author: string;
  authorReading: string | null;
  coverImage: string | null;
  ...
  source: string;  // "openbd" / "google" / "ndl" — どのAPIからの結果かを示す
}
```
外部検索 API の結果を表す型。`Book` と似ていますが `id` や `review` がなく、代わりに `source` があります。

```ts
export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "読みたい",
  reading: "読んでる",
  read: "読んだ",
};
```
`Record<K, V>` は「K をキー、V を値とするオブジェクト型」です。`BookStatus` の全値がキーとして強制されるので、新しいステータスを追加した際に対応ラベルの追加漏れをコンパイルエラーで検知できます。

---

## `src/lib/prisma.ts` — DB クライアント

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**なぜ `globalThis` を使うのか:**
Next.js の開発モードでは、ファイルを変更するたびにモジュールが再評価（ホットリロード）されます。単純に `const prisma = new PrismaClient()` と書くと、リロードごとに新しい接続が作られ続けてしまいます。`globalThis`（Node.js プロセス全体で共有されるグローバルオブジェクト）に保存することで、モジュールが再評価されても既存の接続を再利用します。

`??` は「左辺が null または undefined なら右辺を使う」Nullish Coalescing 演算子です。初回だけ `createPrismaClient()` が呼ばれ、2回目以降は保存済みの値を返します。

本番環境（`NODE_ENV === "production"`）では Next.js がモジュールを再評価しないので、グローバル保存は不要です。

---

## `src/lib/kana.ts` — かな変換ユーティリティ

### `romajiToHiragana(input)` — ローマ字をひらがなに変換

```ts
const s = input.toLowerCase().replace(/[\s\-']/g, "");
```
まずすべて小文字にし、スペース・ハイフン・アポストロフィを除去します。`"yonezawa honobu"` → `"yonezawahonobu"` のように結合します。

```ts
// っ（促音）の処理: 同じ子音が2つ続いたら「っ」を出力して1文字だけ進む
if (i + 1 < s.length && !VOWELS.has(s[i]) && s[i] !== "n" && s[i] === s[i + 1]) {
  result += "っ"; i++; continue;
}
```
`"kk"` を見つけたとき、最初の `"k"` を「っ」に変換して次のループで `"ka"` → 「か」と処理させます。`n` だけ特別扱いするのは、`"nn"` を「っ」+「ん」ではなく「ん」+次の処理として扱うためです。

```ts
// ん の処理: n の後に「な行」「にゃ行」などに続かない場合は「ん」
if (s[i] === "n") {
  const hasLonger = ROMAJI_TABLE.some(([r]) => r.length > 1 && r[0] === "n" && s.startsWith(r, i));
  if (!hasLonger) { result += "ん"; i++; continue; }
}
```
現在位置から "na", "ni", "nya" 等で始まるテーブルエントリが存在するか確認します。存在しなければ「ん」として確定します。これにより `"na"` → 「な」、`"n"` + 子音 → 「ん」の正しい分岐が実現されます。

```ts
// テーブル照合: 3文字 → 2文字 → 1文字の順に先頭から試す
const match = ROMAJI_TABLE.find(([r]) => s.startsWith(r, i));
if (match) { result += match[1]; i += match[0].length; }
```
`ROMAJI_TABLE` は長い順に定義されているため（`"sha"` が `"s"` より先にある）、`find` は必ず最長一致を返します。`"sha"` → 「しゃ」が `"s"` → 「す」よりも先にマッチします。

### `expandKeyword(keyword)` — DB 検索用の表記展開

```ts
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
```
`"yonezawa"` を入力すると `["yonezawa", "よねざわ", "ヨネザワ"]` を返します。DB の `authorReading` カラムはカタカナで格納されているため、ひらがな入力からカタカナに変換したものも検索対象に加えることで「よねざわ」でも「ヨネザワ, ホノブ」にマッチします。`Set` を使うのは重複排除のためです（同一の文字列が複数回入るのを防ぐ）。

---

## `src/app/layout.tsx` — 全体レイアウト

```ts
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
```
Google Fonts から Geist フォントを取得し、CSS カスタムプロパティ `--font-geist-sans` として登録します。

```ts
<html lang="ja" className={`${geist.variable} h-full antialiased`}>
  <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
    <Navbar />
    <main className="flex-1">{children}</main>
  </body>
</html>
```
- `h-full` / `min-h-full`: html・body を画面全体の高さに伸ばす
- `flex flex-col`: Navbar を上、main を残り全体に stretch させる
- `flex-1`: main が残りのスペースをすべて占有する
- `{children}`: ここに各ページの内容が差し込まれる（Next.js App Router の仕組み）
- `antialiased`: フォントのアンチエイリアスを有効化（文字を滑らかに表示）

---

## `src/app/globals.css` — グローバルスタイル

```css
@import "tailwindcss";
```
Tailwind v4 の書き方。v3 の `@tailwind base; @tailwind components; @tailwind utilities;` とは異なります。

```css
@layer utilities {
  .label { @apply block text-sm font-medium text-gray-700 mb-1.5; }
  .input  { @apply w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-gray-300 transition-shadow; }
}
```
フォームの `label` と `input` に使う共通スタイルを定義しています。これにより各フォームで毎回同じ長い `className` を書かなくて済みます。`@apply` は Tailwind のユーティリティクラスをまとめてカスタムクラスに適用する命令です。

---

## `src/app/page.tsx` — TOP ページ（本棚）

### 状態管理

```ts
const [books, setBooks] = useState<Book[]>([]);
const [loading, setLoading] = useState(true);
const [status, setStatus] = useState<BookStatus | "all">("all");
const [keyword, setKeyword] = useState("");
const [sort, setSort] = useState("createdAt:desc");
const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
const [selectedTag, setSelectedTag] = useState("");
```
`sort` は `"createdAt:desc"` のように「フィールド名:順序」を1つの文字列で管理し、後でコロンで分割して API パラメータに使います。

### データ取得

```ts
const fetchBooks = useCallback(async () => {
  setLoading(true);
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (keyword) params.set("q", keyword);
  if (selectedTag) params.set("tag", selectedTag);
  const [sortField, sortOrder] = sort.split(":");
  params.set("sort", sortField);
  params.set("order", sortOrder);
  const res = await fetch(`/api/books?${params}`);
  setBooks(await res.json());
  setLoading(false);
}, [status, keyword, sort, selectedTag]);

useEffect(() => {
  fetchBooks();
}, [fetchBooks]);
```

- `useCallback`: `status` 等の依存値が変わったときだけ `fetchBooks` 関数を再生成します。これがないと `useEffect` が毎レンダーで走ってしまいます
- 依存配列 `[status, keyword, sort, selectedTag]`: どれか1つ変わると `fetchBooks` が再生成 → `useEffect` が再実行 → API が呼ばれる

### スケルトンローディング

```ts
{loading ? (
  <div className="grid ...">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[2/3]" />
    ))}
  </div>
```
データ取得中は10個のグレーの矩形を表示します。`animate-pulse` は Tailwind の点滅アニメーションです。`aspect-[2/3]` は縦横比を本の表紙と同じ 2:3 に固定します。

---

## `src/app/books/new/page.tsx` — 本の追加ページ

### スナップショット（状態履歴）の仕組み

```ts
const INITIAL_FORM = { title: "", author: "", ... };

type PageSnapshot = {
  queryTitle: string; queryAuthor: string; queryYear: string;
  results: SearchResult[]; form: typeof INITIAL_FORM;
};

const [snapshots, setSnapshots] = useState<PageSnapshot[]>([]);
```

`INITIAL_FORM` をコンポーネントの外（モジュールスコープ）に置く理由：コンポーネント内に書くと毎レンダーで新しいオブジェクトが作られ、`useState` の初期値として渡しても問題はありませんが、`typeof INITIAL_FORM` で型参照するため定数として安定させる必要があります。

```ts
function pushSnapshot() {
  setSnapshots((prev) => [
    ...prev,
    { queryTitle, queryAuthor, queryYear, results, form: { ...form } },
  ]);
}
```
`form: { ...form }` とスプレッド展開してコピーするのが重要です。`form: form` だと参照コピーになり、後でフォームが変更されたときスナップショットも変わってしまいます。

```ts
function handleBack() {
  if (snapshots.length > 0) {
    const prev = snapshots[snapshots.length - 1]; // スタックの一番上を見る
    setSnapshots((s) => s.slice(0, -1));          // スタックから取り出す
    setQueryTitle(prev.queryTitle);
    setQueryAuthor(prev.queryAuthor);
    setQueryYear(prev.queryYear);
    setResults(prev.results);
    setForm(prev.form);
  } else {
    router.back(); // 履歴がなければブラウザの戻る
  }
}
```
`slice(0, -1)` は「最後の1要素を除いた新しい配列」を返します。配列末尾をスタックの先頭として扱う Last-In-First-Out（LIFO）構造です。

### 検索実行

```ts
async function handleSearch() {
  if (!queryTitle.trim() && !queryAuthor.trim() && !queryYear.trim()) return;
  pushSnapshot(); // 検索前の状態を保存（戻れるように）
  setSearching(true);
  const params = new URLSearchParams();
  if (queryTitle) params.set("title", queryTitle);
  if (queryAuthor) params.set("author", queryAuthor);
  if (queryYear) params.set("year", queryYear);
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();
  setResults(data.results);
  setSearching(false);
}
```
空文字は `URLSearchParams.set` しないことで、未入力フィールドをクエリパラメータから除外します。

### 保存後の分岐

```ts
setSaving(false);
if (snapshots.length > 0) {
  // 検索→選択→保存の流れ: 検索結果一覧に戻る
  const prev = snapshots[snapshots.length - 1];
  setSnapshots([]);           // 全履歴クリア
  setResults(prev.results);   // 検索結果を復元
  setForm(INITIAL_FORM);      // フォームはリセット
} else {
  router.push("/");           // 手入力での登録: TOPへ
}
```
`snapshots[snapshots.length - 1]` は「本を選択した直前の状態」、つまり検索結果が表示されている状態です。

---

## `src/app/books/[id]/page.tsx` — 詳細・編集ページ

### 動的ルートパラメータの取得

```ts
export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
```
Next.js 16 では `params` が Promise になりました。`use()` は React 19 の新フックで、コンポーネント内で Promise を同期的に解決します。以前の `params.id` の直接アクセスとは異なる書き方です。

### 編集フォームの初期化

```ts
useEffect(() => {
  fetch(`/api/books/${id}`)
    .then((r) => r.json())
    .then((data: Book) => {
      setBook(data);
      setForm({
        description: data.description || "",
        review: data.review || "",
        readAt: data.readAt ? data.readAt.slice(0, 10) : "",
        // ...
      });
    });
}, [id]);
```
`data.readAt` は DB から `"2026-01-15T00:00:00.000Z"` の形式で来ます。`.slice(0, 10)` で `"2026-01-15"` に切り出すことで、`<input type="date">` の value として正しく表示されます。

### タグの保存方法（差分更新ではなく全置換）

```ts
// PATCH リクエストのボディ
body: JSON.stringify({
  description: form.description || null,
  status: form.status,
  rating: form.rating,
  tags: form.tags,  // タグは名前の配列で送る
})
```

API 側（`/api/books/[id]/route.ts`）での処理：
```ts
await prisma.bookTag.deleteMany({ where: { bookId: id } });
// → 既存のタグ紐付けを全削除

data: {
  ...data,
  tags: tags?.length ? {
    create: await Promise.all(
      tags.map(async (name) => {
        const tag = await prisma.tag.upsert({
          where: { name },
          update: {},         // 既存タグはそのまま
          create: { name },   // 新規タグは作成
        });
        return { tagId: tag.id };
      })
    ),
  } : undefined,
}
```
「差分更新」（追加分だけ INSERT、削除分だけ DELETE）の代わりに「全削除してから再作成」を選んでいます。実装がシンプルで、タグの順序変更や重複を気にする必要がありません。`upsert` は「あれば何もしない、なければ作る」操作で、タグのグローバルな重複を防ぎます。

---

## `src/app/api/books/route.ts` — 本の一覧・登録 API

### GET: 検索クエリの構築

```ts
...(keyword
  ? {
      OR: expandKeyword(keyword).flatMap((term) => [
        { title: { contains: term } },
        { author: { contains: term } },
        { authorReading: { contains: term } },
      ]),
    }
  : {}),
```
`expandKeyword("yonezawa")` が `["yonezawa", "よねざわ", "ヨネザワ"]` を返すため、`flatMap` で展開すると9つの OR 条件が生成されます。SQLite の `LIKE` 検索でこれらのいずれかにマッチする本を返します。

スプレッド演算子 `...(condition ? { key: val } : {})` は条件付きでオブジェクトのフィールドを追加する慣用句です。`condition` が false のとき空オブジェクト `{}` をスプレッドしても何も追加されません。

### POST: タグの upsert と紐付け

```ts
tags: tags?.length
  ? {
      create: await Promise.all(
        tags.map(async (name: string) => {
          const tag = await prisma.tag.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          return { tagId: tag.id };
        })
      ),
    }
  : undefined,
```
`tags?.length` は「tags が存在し、かつ要素数が1以上」を意味します。`undefined` を渡すと Prisma はそのフィールドをスキップします（空配列 `[]` を渡すのと異なり、タグなしで作成したい場合に適切です）。

---

## `src/app/api/search/route.ts` — 外部書籍検索 API

### OpenBD の概要テキスト取得

```ts
const textContents: { TextType: string; Text: string }[] =
  data[0].onix?.CollateralDetail?.TextContent ?? [];
const pickText = (type: string) =>
  textContents.find((c) => c.TextType === type)?.Text?.trim() || null;
const description = pickText("03") ?? pickText("02");
```
ONIX 規格の `TextType` コードの意味：
- `"03"` — 詳細な説明文（あらすじ等）
- `"02"` — 短い説明文
- `"04"` — 目次（このアプリでは不要なので無視）

`??` で優先順位を表現しています（`"03"` がなければ `"02"` を使う）。`?.` はオプショナルチェーン（途中が null/undefined でもエラーにならない）です。

### 楽天 Books の表紙 URL 構築

```ts
async function getRakutenCover(isbn: string): Promise<string | null> {
  const clean = isbn.replace(/[- ]/g, "");
  if (clean.length !== 13) return null;
  const url = `https://shop.r10s.jp/book/cabinet/${clean.slice(-4)}/${clean}.jpg`;
  const res = await fetch(url, { method: "HEAD" });
  return res.ok ? url : null;
}
```
楽天 Books の CDN URL の法則：`ISBN末尾4桁/ISBN13.jpg`（例: `7843/9784101287843.jpg`）。HEAD リクエストは画像の中身をダウンロードせずに「存在するか」だけ確認します。`res.ok` は HTTP ステータス 200-299 のとき true です。

### 日本語書籍フィルタ

```ts
function isJapaneseBook(isbn: string | null, title: string): boolean {
  if (/^\[[^\]]+\]/.test(title)) return false;
  if (isbn) {
    const clean = isbn.replace(/[- ]/g, "");
    if (clean.length === 13 && !clean.startsWith("9784")) return false;
    if (clean.length === 10 && !clean.startsWith("4")) return false;
  }
  return true;
}
```
- 正規表現 `/^\[[^\]]+\]/`：文字列の先頭が `[` で始まり `]` で終わるパターン（`[中国語]`、`[ハングル]` など）にマッチ
- ISBN の国番号：`9784` は日本の出版社グループ、`9787` は中国、`9788` は韓国

### NDL の全件取得（ページネーション）

```ts
// 1ページ目を取得して総件数を確認
const firstRes = await fetch(`...?${buildNDLParams({ title, author, year }, 1)}`);
const firstXml = await firstRes.text();

const totalMatch = /<openSearch:totalResults>(\d+)<\/openSearch:totalResults>/.exec(firstXml);
const total = Math.min(totalMatch ? parseInt(totalMatch[1]) : 0, NDL_MAX);

// 2ページ目以降を並列取得
if (total > NDL_PAGE) {
  const pageCount = Math.ceil(total / NDL_PAGE) - 1;
  const extras = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      fetch(`...?${buildNDLParams(..., (i + 1) * NDL_PAGE + 1)}`)
        .then((r) => (r.ok ? r.text() : ""))
    )
  );
}
```
NDL の OpenSearch API はレスポンスの XML 内に `<openSearch:totalResults>206</openSearch:totalResults>` のように総件数を返します。1ページ目の取得と同時に総件数を取得し、2ページ目以降は `Promise.all` で並列取得します（逐次だと 3 ページ × 300ms = 900ms かかるところを約 300ms に短縮）。

### NDL の表紙取得における並列制限

```ts
const CONCURRENCY = 10;
const books: BookResult[] = new Array(candidates.length);
let idx = 0;

async function worker() {
  while (idx < candidates.length) {
    const i = idx++;      // ← 現在の idx を取得してから1増やす
    books[i] = { ...candidates[i], coverImage: await resolveCover(candidates[i].isbn) };
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
```
10個の `worker` 関数を同時に起動します。各 worker は `idx` をインクリメントしながら候補を消費します（`idx++` はポストインクリメントなので「取得してから増やす」）。全 worker が終わると `Promise.all` が解決します。これにより最大10並列に制限しつつ、候補が尽きたら worker は自然終了します。

### 検索結果のマージと重複排除

```ts
const seen = new Map<string, number>(); // key → merged配列のindex
const merged: BookResult[] = [];

for (const result of [...googleResults, ...ndlResults]) {
  const key = result.isbn ?? `${result.title}\t${result.author}`;
  if (!seen.has(key)) {
    seen.set(key, merged.length);
    merged.push(result);
  } else if (result.coverImage && !merged[seen.get(key)!].coverImage) {
    merged[seen.get(key)!] = result; // 表紙あり版で差し替え
  }
}
```
- `key` は ISBN が優先。ISBN がない場合はタイトル+著者名のタブ区切り文字列（タブ文字は通常のタイトルに含まれないため区切り文字として安全）
- `Map` に index を記録することで、後から差し替えが O(1) で行える
- `!` はTypeScript の non-null assertion（`seen.get(key)` が必ず値を持つとコンパイラに伝える）

---

## `src/app/api/stats/route.ts` — 統計 API

```ts
const books = await prisma.book.findMany({
  select: { status: true, rating: true, readAt: true, createdAt: true },
});
```
`select` で必要なカラムだけを取得します（`title` や `coverImage` 等は不要なので除外）。DB→アプリ間のデータ転送量を減らせます。

```ts
for (const book of books) {
  statusCount[book.status as keyof typeof statusCount]++;

  if (book.rating) {
    const rounded = Math.round(book.rating);
    ratingDist[rounded] = (ratingDist[rounded] || 0) + 1;
  }

  if (book.status === "read" && book.readAt) {
    const key = book.readAt.toISOString().slice(0, 7); // "2026-01"
    monthlyRead[key] = (monthlyRead[key] || 0) + 1;
  }
}
```
1回のループで3種類の集計を行います。`toISOString().slice(0, 7)` で日時から「年月」だけを抽出します（例: `"2026-01-15T00:00:00.000Z"` → `"2026-01"`）。

```ts
const sortedMonths = Object.entries(monthlyRead)
  .sort(([a], [b]) => a.localeCompare(b))
  .slice(-24)
  .map(([month, count]) => ({ month, count }));
```
`Object.entries` でオブジェクトを `[key, value]` の配列に変換し、年月の文字列昇順にソート、最新24ヶ月だけを取り出します。

---

## `src/components/BookCard.tsx`

```tsx
<Link href={`/books/${book.id}`} className="group block">
  <div className="... hover:shadow-md transition-shadow">
    <div className="relative aspect-[2/3] bg-gray-50">
      {book.coverImage ? (
        <Image
          src={book.coverImage}
          alt={book.title}
          fill                    // 親要素を基準に100%で埋める
          className="object-cover group-hover:opacity-90 transition-opacity"
          sizes="(max-width: 640px) 50vw, ..."  // レスポンシブ最適化
        />
      ) : (
        <BookCoverPlaceholder ... className="absolute inset-0 rounded-none" />
      )}
    </div>
```
- `group` クラスを Link に付けると、子要素で `group-hover:` プレフィックスが使えます（Link にホバーしたとき子要素のスタイルを変えられる）
- `aspect-[2/3]` で縦横比を固定しつつ、`fill` の Image がその枠を埋める構造
- `object-cover` は画像のアスペクト比を保ちながら枠を埋めます（はみ出た部分はクリップ）

---

## `src/components/BookCoverPlaceholder.tsx`

```ts
const PALETTES = [
  "from-slate-500 to-slate-700",
  "from-amber-600 to-amber-800",
  // ... 9色
];

function hashTitle(title: string): number {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h;
}
```
`h * 31 + charCode` は文字列ハッシュの古典的な計算式です（Java の `String.hashCode()` と同じ手法）。`& 0xffff` でビット AND をとり、数値を 0〜65535 の範囲に収めます（オーバーフロー防止）。同じタイトルは常に同じカラーになるため、ページをリロードしても色が変わりません。

```tsx
<div className={`bg-gradient-to-b ${palette} flex flex-col items-center justify-center p-3 text-center ${className}`}>
  <p className="text-white text-xs font-medium leading-tight line-clamp-4 mb-1.5">{title}</p>
  {author && (
    <p className="text-white/60 text-[10px] leading-tight line-clamp-2">{author}</p>
  )}
</div>
```
`line-clamp-4` は最大4行でテキストを省略します。`text-white/60` は白色の60%不透明（Tailwind の透明度構文）です。

---

## `src/components/StarRating.tsx`

```tsx
const [hovered, setHovered] = useState<number | null>(null);
const current = hovered ?? value ?? 0;
```
表示する星の数を決めるロジックです：
1. マウスオーバー中の星数（`hovered`）
2. なければ保存済みの評価（`value`）
3. どちらもなければ 0

```tsx
<button
  disabled={readOnly}
  onMouseEnter={() => !readOnly && setHovered(star)}
  onMouseLeave={() => !readOnly && setHovered(null)}
  onClick={() => !readOnly && onChange?.(star)}
>
  <span className={star <= current ? "text-amber-400" : "text-gray-200"}>★</span>
</button>
```
`onChange?.()` はオプショナルチェーンの関数呼び出し。`onChange` が undefined（`readOnly` 時に省略）でもエラーにならず何もしません。`star <= current` で現在値以下の星を塗りつぶします。

---

## `prisma/schema.prisma` — DB スキーマ

```prisma
model Book {
  id    String @id @default(cuid())
```
`cuid()` は衝突耐性のある ID 生成アルゴリズム。UUID より短く、並び替えに使える時刻成分を含みます（例: `cmpq5y3890002gvfq167kjf5m`）。

```prisma
  tags BookTag[]
}

model Tag {
  books BookTag[]
}

model BookTag {
  bookId String
  tagId  String
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([bookId, tagId])
}
```
多対多の関係を中間テーブルで表現しています。`@@id([bookId, tagId])` は複合主キー（同じ本に同じタグを2回付けられない）。`onDelete: Cascade` は親（Book または Tag）が削除されたとき、対応する BookTag も自動削除されます。

---

## `next.config.ts` — Next.js 設定

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "cover.openbd.jp" },
    { protocol: "https", hostname: "shop.r10s.jp" },
    // ...
  ],
},
```
`next/image` コンポーネントは外部画像をそのまま表示できません。許可したいドメインをここに登録する必要があります。未登録ドメインの画像を `<Image>` に渡すとビルドエラーになります。これはセキュリティ上の配慮（任意の外部ドメインを介した攻撃を防ぐ）です。

---

## `prisma.config.ts` — Prisma 設定

```ts
const dbPath = path.join(process.cwd(), "prisma", "dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: `file:${dbPath}`,
  },
});
```
`process.cwd()` はプロセスの実行ディレクトリ（プロジェクトルート）を返します。`path.join` で OS に依存しない絶対パスを構築します。`file:` プレフィックスは SQLite の接続文字列の形式です。
