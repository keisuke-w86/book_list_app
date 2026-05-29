"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SearchResult, BookStatus, STATUS_LABELS } from "@/lib/types";
import StarRating from "@/components/StarRating";
import BookCoverPlaceholder from "@/components/BookCoverPlaceholder";
import Toast from "@/components/Toast";

const INITIAL_FORM = {
  title: "", author: "", authorReading: "", coverImage: "",
  description: "", publishedAt: "", isbn: "", review: "", readAt: "",
  status: "want" as BookStatus, rating: null as number | null,
  tags: [] as string[], tagInput: "",
};

type PageSnapshot = {
  queryTitle: string; queryAuthor: string; queryYear: string;
  results: SearchResult[]; form: typeof INITIAL_FORM;
};

export default function NewBookPage() {
  const router = useRouter();

  const [queryTitle, setQueryTitle] = useState("");
  const [queryAuthor, setQueryAuthor] = useState("");
  const [queryYear, setQueryYear] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshots, setSnapshots] = useState<PageSnapshot[]>([]);
  const [showToast, setShowToast] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  function pushSnapshot() {
    setSnapshots((prev) => [
      ...prev,
      { queryTitle, queryAuthor, queryYear, results, form: { ...form } },
    ]);
  }

  function handleBack() {
    if (snapshots.length > 0) {
      const prev = snapshots[snapshots.length - 1];
      setSnapshots((s) => s.slice(0, -1));
      setQueryTitle(prev.queryTitle);
      setQueryAuthor(prev.queryAuthor);
      setQueryYear(prev.queryYear);
      setResults(prev.results);
      setForm(prev.form);
    } else {
      router.back();
    }
  }

  async function handleSearch() {
    if (!queryTitle.trim() && !queryAuthor.trim() && !queryYear.trim()) return;
    pushSnapshot();
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

  function applyResult(r: SearchResult) {
    pushSnapshot();
    setForm((f) => ({
      ...f,
      title: r.title,
      author: r.author,
      authorReading: r.authorReading || "",
      coverImage: r.coverImage || "",
      description: r.description || "",
      publishedAt: r.publishedAt || "",
      isbn: r.isbn || "",
    }));
    setResults([]);
    setQueryTitle("");
    setQueryAuthor("");
    setQueryYear("");
  }

  function addTag() {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    }
  }

  function removeTag(t: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        author: form.author || null,
        authorReading: form.authorReading || null,
        coverImage: form.coverImage || null,
        description: form.description || null,
        publishedAt: form.publishedAt || null,
        isbn: form.isbn || null,
        review: form.review || null,
        readAt: form.readAt || null,
        status: form.status,
        rating: form.rating,
        tags: form.tags,
      }),
    });
    setSaving(false);
    setShowToast(true);
    await new Promise((r) => setTimeout(r, 1200));
    if (snapshots.length > 0) {
      const prev = snapshots[snapshots.length - 1];
      setSnapshots([]);
      setQueryTitle(prev.queryTitle);
      setQueryAuthor(prev.queryAuthor);
      setQueryYear(prev.queryYear);
      setResults(prev.results);
      setForm(INITIAL_FORM);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {showToast && (
        <Toast message="保存しました" onClose={() => setShowToast(false)} />
      )}
      <button
        onClick={handleBack}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
      >
        ← 戻る
      </button>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">本を追加</h1>

      {/* Book search */}
      <div className="mb-8">
        <p className="block text-sm font-medium text-gray-700 mb-3">本を検索</p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={queryTitle}
              onChange={(e) => setQueryTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="タイトル / ISBN"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="text"
              value={queryAuthor}
              onChange={(e) => setQueryAuthor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="著者名"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="text"
              value={queryYear}
              onChange={(e) => setQueryYear(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="発行年"
              maxLength={4}
              className="w-24 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {searching ? "検索中..." : "検索"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyResult(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0 border-gray-100"
              >
                {r.coverImage ? (
                  <Image
                    src={r.coverImage}
                    alt={r.title}
                    width={36}
                    height={50}
                    className="object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <BookCoverPlaceholder
                    title={r.title}
                    author={r.author}
                    className="w-9 h-12 rounded flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.author}</p>
                  {r.publishedAt && (
                    <p className="text-xs text-gray-400">{r.publishedAt}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Cover preview */}
          {form.coverImage && (
            <div className="col-span-2 flex justify-center">
              <Image
                src={form.coverImage}
                alt="表紙"
                width={100}
                height={140}
                className="rounded-lg object-cover shadow"
              />
            </div>
          )}

          <div className="col-span-2">
            <label className="label">タイトル *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <label className="label">著者</label>
            <input
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">発行年月</label>
            <input
              value={form.publishedAt}
              onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
              className="input"
              placeholder="例：2024-03"
            />
          </div>
          <div>
            <label className="label">ISBN</label>
            <input
              value={form.isbn}
              onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <label className="label">概要</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="label">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => {
                const s = e.target.value as BookStatus;
                const today = new Date().toISOString().slice(0, 10);
                setForm((f) => ({
                  ...f,
                  status: s,
                  readAt: s === "read" && !f.readAt ? today : s !== "read" ? "" : f.readAt,
                }));
              }}
              className="input bg-white"
            >
              {(["want", "reading", "read"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">読んだ日</label>
            <input
              type="date"
              value={form.readAt}
              onChange={(e) => setForm((f) => ({ ...f, readAt: e.target.value }))}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <label className="label">評価</label>
            <StarRating
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </div>
          <div className="col-span-2">
            <label className="label">感想</label>
            <textarea
              rows={4}
              value={form.review}
              onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))}
              className="input resize-none"
              placeholder="読んだ感想を自由に..."
            />
          </div>
          <div className="col-span-2">
            <label className="label">タグ</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={form.tagInput}
                onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="タグを入力してEnter"
                className="flex-1 input"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                追加
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
