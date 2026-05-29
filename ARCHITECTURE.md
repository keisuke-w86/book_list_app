# book_list_app アーキテクチャ解説書

> 初めてこのコードを見る人が全体を把握できることを目的とした解説書です。

---

## 1. アプリの概要

**My Bookshelf** は個人用の読書管理 Web アプリです。

| できること | 説明 |
|---|---|
| 本の登録 | 書名・著者・表紙・概要・評価・感想・タグを管理 |
| 本の検索（外部） | タイトル・著者・ISBN・発行年の複合検索（OpenBD / 国立国会図書館 / Google Books） |
| 本棚表示 | ステータス・タグ・キーワード・並び順でフィルタ |
| ローマ字検索 | 「yonezawa」「よねざわ」など複数表記に対応 |
| 統計 | 読了冊数・ステータス内訳・評価分布のグラフ |

### 技術スタック

```
フロントエンド: Next.js 16 (App Router) + React 19 + TypeScript
スタイル:      Tailwind CSS v4
グラフ:        Recharts
DB:            SQLite (Prisma ORM 経由)
実行環境:      Node.js (WSL2 / Linux)
```

---

## 2. フォルダ・ファイル構成

```
book_list_app/
├── src/proxy.ts                    # ルート保護（認証チェック）Next.js 16の「ミドルウェア」
├── prisma/                         # データベース関連
│   ├── schema.prisma               # DBスキーマ定義（テーブル設計）
│   ├── dev.db                      # SQLiteデータベース本体（バイナリ）
│   └── migrations/                 # スキーマ変更履歴
│       ├── 20260528084528_init/    # 初回テーブル作成
│       └── 20260529011944_add_author_reading/  # 著者読み追加
│
├── src/
│   ├── app/                        # Next.js App Router（ページ・API）
│   │   ├── layout.tsx              # 全ページ共通レイアウト（Navbar含む）
│   │   ├── globals.css             # グローバルCSS（Tailwindの設定）
│   │   ├── page.tsx                # TOPページ（本棚一覧）
│   │   ├── login/
│   │   │   └── page.tsx            # ログイン・サインアップページ
│   │   ├── stats/
│   │   │   └── page.tsx            # 統計ページ
│   │   ├── tags/
│   │   │   └── page.tsx            # タグ管理ページ（リネーム・削除）
│   │   ├── books/
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # 本の追加ページ
│   │   │   └── [id]/
│   │   │       └── page.tsx        # 本の詳細・編集ページ
│   │   └── api/                    # バックエンドAPI（サーバー側処理）
│   │       ├── books/
│   │       │   ├── route.ts        # GET（一覧）/ POST（登録）
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET（詳細）/ PATCH（更新）/ DELETE（削除）
│   │       ├── search/
│   │       │   └── route.ts        # 外部API経由の書籍検索
│   │       ├── auth/
│   │       │   ├── login/route.ts  # POST: ログイン → JWT Cookie 発行
│   │       │   ├── signup/route.ts # POST: 新規登録 → JWT Cookie 発行
│   │       │   └── logout/route.ts # POST: ログアウト → Cookie 削除
│   │       ├── stats/
│   │       │   └── route.ts        # 統計データ生成
│   │       └── tags/
│   │           ├── route.ts        # タグ一覧取得（GET）
│   │           └── [id]/
│   │               └── route.ts    # タグ更新（PATCH）/ 削除（DELETE）
│   │
│   ├── components/                 # 再利用UIコンポーネント
│   │   ├── Navbar.tsx              # ヘッダーナビゲーション（ユーザ名・ログアウト表示）
│   │   ├── LogoutButton.tsx        # ログアウトボタン（クライアントコンポーネント）
│   │   ├── BookCard.tsx            # 本棚グリッドの1枚カード
│   │   ├── BookCoverPlaceholder.tsx # 表紙画像がないときの代替カバー
│   │   ├── StarRating.tsx          # 星評価UI（クリック・表示両対応）
│   │   └── StatusBadge.tsx         # ステータスバッジ（読みたい/読んでる/読んだ）
│   │
│   ├── lib/                        # 共有ライブラリ
│   │   ├── types.ts                # TypeScript型定義（Book・Tag・SearchResultなど）
│   │   ├── prisma.ts               # Prismaクライアントのシングルトン生成
│   │   ├── session.ts              # JWT セッション管理（作成・取得・削除）
│   │   └── kana.ts                 # ローマ字⇔かな変換ユーティリティ
│   │
│   └── generated/
│       └── prisma/                 # Prismaが自動生成するクライアントコード（手動編集不可）
│
├── next.config.ts                  # Next.js設定（外部画像ドメインの許可など）
├── prisma.config.ts                # PrismaのDB接続設定
├── package.json                    # 依存パッケージ一覧
└── tsconfig.json                   # TypeScript設定
```

---

## 3. データベース設計

### テーブル構成

```
User ────────────── Book ─────────────── BookTag ─── Tag
(ユーザ)            (本の情報)            (中間テーブル)   (タグ)
```

### Book テーブル（本の情報）

| カラム | 型 | 説明 |
|---|---|---|
| id | TEXT (PK) | cuid形式の一意ID（例: `cmpq5y389...`）|
| title | TEXT | タイトル（必須）|
| author | TEXT | 著者名（例: `米澤, 穂信`）|
| authorReading | TEXT | 著者名の読み（例: `ヨネザワ, ホノブ`）ローマ字検索用 |
| coverImage | TEXT | 表紙画像URL（OpenBD・楽天Books等）|
| description | TEXT | 概要・あらすじ |
| publishedAt | TEXT | 発行年月（例: `2014-03-20`）|
| isbn | TEXT | ISBN-13（例: `9784103014744`）|
| review | TEXT | ユーザーの感想 |
| readAt | DATETIME | 読了日 |
| status | TEXT | `want` / `reading` / `read` の3値 |
| rating | REAL | 評価（1〜5の数値）|
| createdAt | DATETIME | 登録日時（自動設定）|
| updatedAt | DATETIME | 更新日時（自動更新）|

### Tag テーブル（タグ）

| カラム | 型 | 説明 |
|---|---|---|
| id | TEXT (PK) | 一意ID |
| name | TEXT (UNIQUE) | タグ名（例: `ミステリ`）同じ名前は1つだけ |

### BookTag テーブル（本とタグの紐付け・中間テーブル）

| カラム | 型 | 説明 |
|---|---|---|
| bookId | TEXT (FK) | Bookのid |
| tagId | TEXT (FK) | Tagのid |

1冊の本に複数のタグ、1つのタグが複数の本に付けられる（多対多の関係）。
BookTagはその橋渡しをするテーブル。本を削除するとBookTagも自動削除（CASCADE）。

---

## 4. API一覧（バックエンド）

すべて `/api/` 以下に定義されています。

### `GET /api/books` — 本の一覧取得

ローカルDBから本を検索して返します。

**クエリパラメータ:**

| パラメータ | 例 | 説明 |
|---|---|---|
| `status` | `read` | ステータスでフィルタ（省略時は全件）|
| `q` | `yonezawa` | キーワード検索（タイトル・著者名・著者読みを検索）|
| `tag` | `ミステリ` | タグ名でフィルタ |
| `sort` | `rating` | 並び順のフィールド（デフォルト: `createdAt`）|
| `order` | `desc` | `asc` / `desc` |

**ポイント:** `q` にローマ字やひらがなを入力すると `kana.ts` の `expandKeyword` で複数の表記バリエーションに展開し、`authorReading`（カタカナ読み）も含めて検索します。

---

### `POST /api/books` — 本の登録

リクエストボディ（JSON）で受け取り、DBに保存します。
タグは名前で受け取り、未存在なら自動作成（`upsert`）して紐付けます。

---

### `GET /api/books/[id]` — 本の詳細取得

指定IDの本をタグ情報込みで返します。

---

### `PATCH /api/books/[id]` — 本の更新

既存のタグ紐付けを一度全削除してから、送られてきたタグで再作成します（差分更新より単純で確実）。

---

### `DELETE /api/books/[id]` — 本の削除

本を削除します。BookTagはCASCADE設定のため自動削除されます。

---

### `GET /api/search` — 外部API書籍検索

ローカルDBではなく、外部の書籍データベースを検索します。本の追加画面で使います。

**クエリパラメータ:**

| パラメータ | 例 | 説明 |
|---|---|---|
| `title` | `満願` | タイトルまたはISBN |
| `author` | `米澤穂信` | 著者名（漢字・かな・ローマ字可）|
| `year` | `2014` | 発行年 |

**検索フロー（詳細は後述）:**

```
ISBNが入力された？
  → YES: OpenBD で検索 → 表紙がなければ楽天でも確認 → 結果を返す
  → NO:  Google Books と NDL を並列実行 → マージして返す
```

---

### `GET /api/stats` — 統計データ

DB内の全本を集計して返します。

```json
{
  "statusCount": { "want": 6, "reading": 1, "read": 7 },
  "ratingDist": [{ "star": 5, "count": 3 }, ...],
  "monthlyRead": [{ "month": "2026-01", "count": 2 }, ...],
  "total": 14
}
```

---

### `GET /api/tags` — タグ一覧

全タグを名前順で返します。各タグに紐付き冊数も含みます。

---

### `PATCH /api/tags/[id]` — タグのリネーム

`{ name: "新しい名前" }` を受け取り、タグ名を更新します。同名のタグが既に存在する場合は 409 を返します。

---

### `DELETE /api/tags/[id]` — タグの削除

タグを削除します。そのタグが付いていた本からも自動的にタグが外れます（BookTag が CASCADE 削除）。

---

## 5. 外部書籍検索の詳細フロー

`/api/search/route.ts` の中核処理です。

### 5-1. ISBN入力の場合

```
入力: "9784101287843"
  ↓
OpenBD API に問い合わせ
  ├─ データあり → 表紙URLを確認
  │    ├─ 表紙あり → そのまま返す
  │    └─ 表紙なし → 楽天Books CDN で確認（HEAD リクエスト）
  └─ データなし → 結果なし
```

OpenBD は日本の書籍専用データベース（無料・登録不要）。

### 5-2. タイトル・著者検索の場合

Google Books と NDL（国立国会図書館）を**並列実行**してマージします。

```
著者入力をひらがな変換（NDL用）
  "yonezawa" → "よねざわほのぶ"（kana.ts で変換）

         ┌──────────────────┐  ┌──────────────────────────────┐
         │   Google Books   │  │   国立国会図書館 (NDL)        │
         │  maxResults=40   │  │   cnt=100 × 複数ページ        │
         │  langRestrict=ja │  │   （最大500件、並列ページ取得）│
         │  intitle:xxx     │  │   title=xxx                  │
         │  inauthor:xxx    │  │   creator=よねざわほのぶ      │
         └────────┬─────────┘  └──────────────┬───────────────┘
                  │                            │
                  └──────────┬─────────────────┘
                             ↓
                    ISO重複排除（ISBNをキー）
                    表紙画像あり優先でマージ
                             ↓
                    外国語書籍フィルタ（isJapaneseBook）
                    ├─ [中国語]タイトル → 除外
                    └─ ISBN が 9784（日本）以外 → 除外
                             ↓
                    表紙画像を並列取得（同時10件）
                    OpenBD → 楽天Books CDN の順で試行
                             ↓
                    結果を返す
```

### 5-3. 表紙画像の取得優先順位

```
1. 検索APIのレスポンスに含まれる表紙URL（Google Books サムネイル等）
2. OpenBD の表紙URL（日本の書籍に多い）
3. 楽天Books CDN（https://shop.r10s.jp/book/cabinet/{末4桁}/{isbn13}.jpg）
4. なし → BookCoverPlaceholder で自動生成したグラデーション表紙を表示
```

---

## 6. ページ・コンポーネント解説

### `src/app/layout.tsx` — 全体レイアウト

全ページに適用される共通の外枠です。`Navbar` を上部に配置し、その下に各ページの内容（`children`）を差し込む構造です。フォントとして Geist（英数字）と Hiragino Sans（日本語）を使用しています。

---

### `src/app/page.tsx` — TOPページ（本棚）

ユーザーが登録した本をグリッド形式で表示するメインページです。

**状態管理（useState）:**
- `books`: 表示する本の配列
- `status`: フィルタ中のステータス（`all` / `want` / `reading` / `read`）
- `keyword`: 検索キーワード
- `sort`: 並び順
- `tags`: タグ一覧（ドロップダウン用）
- `selectedTag`: 選択中のタグ

**データ取得:**
- `status`・`keyword`・`sort`・`selectedTag` のいずれかが変わると `fetchBooks` が実行され、`/api/books` に問い合わせます（`useCallback` + `useEffect`）。
- タグ一覧は初回のみ `/api/tags` から取得。

**表示:**
- 読み込み中: スケルトン（灰色の枠がゆらゆら）
- 本がない: 空の旨のメッセージ
- 本あり: `BookCard` コンポーネントのグリッド

---

### `src/app/books/new/page.tsx` — 本の追加ページ

本を検索して選択し、詳細情報を入力して登録するページです。

**ステート履歴（スナップショット機能）:**

「← 戻る」ボタンで1操作前に戻れる仕組みを実装しています。

```
操作するたびに現在の状態をスタック（snapshots配列）に積む
  ↓
「← 戻る」押下時:
  スタックに履歴あり → スタックから取り出して状態を戻す
  スタックが空      → router.back()（ブラウザ履歴を戻る）
```

**検索フォーム:**
- 「タイトル/ISBN」「著者名」「発行年」の3フィールド
- いずれか1つ以上入力して「検索」→ `/api/search` を呼ぶ
- 結果をリスト表示（スクロール可能な最大高さ固定のドロップダウン）
- 項目をクリック → フォームに自動入力（`applyResult`）

**保存後の動作:**
- 検索→選択→保存の流れ（スナップショットあり）→ 検索結果一覧に戻る
- 直接手入力で保存（スナップショットなし）→ TOPページに戻る

---

### `src/app/books/[id]/page.tsx` — 本の詳細・編集ページ

`[id]` はURLの動的パラメータです。例えば `/books/abc123` にアクセスすると `id = "abc123"` として扱われます。

**表示モード:** 詳細表示（閲覧）と編集フォームを同一ページで切り替えます（`editing` state）。

**編集可能フィールド:** 概要・ステータス・読了日・評価・感想・タグ（タイトル・著者は閲覧専用）。

**削除:** `confirm()` で確認後、`DELETE /api/books/[id]` を呼んでTOPへリダイレクト。

---

### `src/app/tags/page.tsx` — タグ管理ページ

登録済みタグの一覧・リネーム・削除を行うページです。

- タグ名をクリック → インライン入力欄が出現 → Enter で保存・Escape でキャンセル
- 削除ボタン → 紐付き本がある場合は確認ダイアログを表示
- 「未使用 N 件を削除」ボタン → `_count.books === 0` のタグを一括削除
- 0冊のタグは赤いバッジで視覚的に区別

---

### `src/app/stats/page.tsx` — 統計ページ

`/api/stats` からデータを取得し、Recharts でグラフを描画します。

| グラフ | ライブラリ | 説明 |
|---|---|---|
| サマリーカード | 素のHTML | 合計・読んだ・読んでる・読みたいの冊数 |
| 月別読了数 | BarChart | 過去24ヶ月の読了冊数（readAtが設定された本のみ）|
| ステータス内訳 | PieChart | ドーナツグラフ + 右側に自前の凡例 |
| 評価分布 | 自前 | 星表示 + プログレスバー + 平均評価 |

---

## 7. コンポーネント解説

### `BookCard.tsx`

本棚グリッドの1枚のカードです。クリックで `/books/[id]` へ遷移します。

```
+------------------+
| [表紙画像]       |  ← coverImageがあれば next/Image、なければ BookCoverPlaceholder
|                  |
+------------------+
| 読んだ           |  ← StatusBadge
| タイトル（2行）  |
| 著者名           |
| ★★★★☆         |  ← StarRating（readOnly）
+------------------+
```

---

### `BookCoverPlaceholder.tsx`

表紙画像URLがない本に使うダミーカバーです。タイトル文字列をハッシュ化して9色のグラデーションパレットからカラーを選びます。同じ本は常に同じ色になります。

---

### `StarRating.tsx`

星評価コンポーネントです。`readOnly` プロパティで表示専用モード（本棚・詳細）と入力モード（フォーム）を切り替えます。ホバー時にプレビュー表示します。

---

### `StatusBadge.tsx`

ステータスを色付きバッジで表示します。

| ステータス | 表示 | 色 |
|---|---|---|
| `want` | 読みたい | グレー |
| `reading` | 読んでる | ブルー |
| `read` | 読んだ | グリーン |

---

## 8. 共有ライブラリ解説

### `src/lib/types.ts`

フロントエンド・バックエンド双方で使う TypeScript の型定義ファイルです。

| 型名 | 説明 |
|---|---|
| `Book` | DBから取得した本のデータ（タグ配列含む）|
| `Tag` | タグ（id・name）|
| `BookTag` | 本とタグの紐付け（tagオブジェクト含む）|
| `SearchResult` | 外部検索APIの結果1件 |
| `BookStatus` | `"want" \| "reading" \| "read"` |
| `STATUS_LABELS` | ステータスコードと日本語ラベルのマップ |

---

### `src/lib/prisma.ts`

Prisma クライアントのシングルトンです。

**なぜシングルトンが必要か:** Next.js の開発モードではホットリロードのたびにモジュールが再評価されます。毎回新しい Prisma クライアントを作ると接続数が増え続けるため、`globalThis` に保存して再利用します（本番環境では通常の変数で十分）。

---

### `src/lib/kana.ts`

ローマ字・ひらがな・カタカナの変換ユーティリティです。

| 関数 | 入力 | 出力 | 用途 |
|---|---|---|---|
| `romajiToHiragana` | `"yonezawa"` | `"よねざわ"` | NDL検索クエリ変換 |
| `hiraganaToKatakana` | `"よねざわ"` | `"ヨネザワ"` | DB検索用カタカナ変換 |
| `looksLikeRomaji` | `"yonezawa"` | `true` | 入力種別判定 |
| `looksLikeKana` | `"よねざわ"` | `true` | 入力種別判定 |
| `toSearchableKana` | `"yonezawa"` | `"よねざわ"` | NDL用著者クエリ生成 |
| `expandKeyword` | `"yonezawa"` | `["yonezawa","よねざわ","ヨネザワ"]` | DB全文検索の表記展開 |

`romajiToHiragana` の変換アルゴリズム：
1. 3文字（`sha`→しゃ）→ 2文字（`ka`→か）→ 1文字（`a`→あ）の長さ優先マッチ
2. 子音重複（`kk`）→ 促音「っ」
3. `n` の後に母音・`y` 以外 → 撥音「ん」

---

## 9. 設定ファイル解説

### `next.config.ts`

Next.js の設定ファイルです。`next/image` コンポーネントが外部URLの画像を表示するには、許可するドメインをここに登録する必要があります。

```ts
remotePatterns: [
  "books.google.com",        // Google Books サムネイル
  "*.googleusercontent.com", // Google コンテンツCDN
  "cover.openbd.jp",         // OpenBD 表紙画像
  "shop.r10s.jp",            // 楽天Books 表紙画像
]
```

### `prisma.config.ts`

Prisma がDBファイルの場所を解決するための設定です。`prisma/dev.db` を絶対パスで指定しています。

### `prisma/schema.prisma`

DBのテーブル設計書です。ここを変更したら `npx prisma migrate dev` を実行してDBに反映する必要があります。Prismaクライアントのコード（`src/generated/prisma/`）も自動生成されます。

---

## 10. データの流れ（主要シナリオ）

### シナリオ A: 本棚を開く

```
ブラウザ → GET /              → page.tsx がレンダリング
         → GET /api/books     → route.ts → Prisma → dev.db → JSON
         → GET /api/tags      → route.ts → Prisma → dev.db → JSON
                                    ↓
                              BookCard × N冊 を表示
```

### シナリオ B: 本を検索して追加する

```
ブラウザ → GET /books/new

[検索フォームに「米澤穂信」を入力して「検索」]

ブラウザ → GET /api/search?author=米澤穂信
                ↓
         kana.ts: 「米澤穂信」は漢字 → NDLにそのまま渡す
                ↓
         Promise.all([
           Google Books: inauthor:米澤穂信 (最大40件)
           NDL: creator=米澤穂信 (ページ数分並列、最大500件)
         ])
                ↓
         ISBNでマージ・重複排除
                ↓
         各本の表紙を並列取得(10件同時)
           OpenBD → 楽天CDN の順
                ↓
         isJapaneseBook フィルタ（中国語・韓国語除外）
                ↓
         結果をブラウザに返す

[「満願」を選択]
  → applyResult() が呼ばれ、フォームに自動入力
  → 現在のステート（検索結果含む）をスナップショットに保存

[「保存する」を押す]
  → POST /api/books にフォーム内容を送信
  → route.ts → Prisma → dev.db に保存
  → スナップショットがある → 検索結果一覧の画面に戻る
```

### シナリオ C: TOPページでローマ字検索

```
[検索欄に「yonezawa」と入力]

ブラウザ → GET /api/books?q=yonezawa
                ↓
         kana.ts.expandKeyword("yonezawa")
           → ["yonezawa", "よねざわ", "ヨネザワ"]
                ↓
         Prisma: WHERE
           title LIKE "%yonezawa%" OR
           title LIKE "%よねざわ%" OR
           title LIKE "%ヨネザワ%" OR
           author LIKE "%yonezawa%" OR
           author LIKE "%よねざわ%" OR
           author LIKE "%ヨネザワ%" OR
           authorReading LIKE "%yonezawa%" OR
           authorReading LIKE "%よねざわ%" OR
           authorReading LIKE "%ヨネザワ%"   ← ここでヒット！
```

---

## 11. 開発時の主要コマンド

```bash
# 開発サーバー起動
npm run dev

# DBスキーマ変更後（schema.prisma を編集したら必ず実行）
npx prisma migrate dev --name <変更内容の名前>
npx prisma generate

# DBの中身をGUIで確認（ブラウザが開く）
npx prisma studio
```

---

## 12. 依存パッケージ一覧

| パッケージ | 用途 |
|---|---|
| `next` | Webフレームワーク（ルーティング・SSR・API Routes）|
| `react` / `react-dom` | UIライブラリ |
| `prisma` / `@prisma/client` | ORM（DBアクセス）|
| `better-sqlite3` | SQLiteドライバー |
| `@prisma/adapter-libsql` | Prisma と SQLite の接続アダプター |
| `recharts` | グラフ描画ライブラリ |
| `tailwindcss` | CSSユーティリティフレームワーク |
| `typescript` | 型安全なJavaScript |
