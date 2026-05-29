"use client";

import { useEffect, useState, useCallback } from "react";
import BookCard from "@/components/BookCard";
import { Book, BookStatus, STATUS_LABELS } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "登録日（新しい順）" },
  { value: "createdAt:asc", label: "登録日（古い順）" },
  { value: "readAt:desc", label: "読了日（新しい順）" },
  { value: "title:asc", label: "タイトル順" },
  { value: "rating:desc", label: "評価（高い順）" },
];

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BookStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTag, setSelectedTag] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (debouncedKeyword) params.set("q", debouncedKeyword);
    if (selectedTag) params.set("tag", selectedTag);
    const [sortField, sortOrder] = sort.split(":");
    params.set("sort", sortField);
    params.set("order", sortOrder);
    const res = await fetch(`/api/books?${params}`);
    setBooks(await res.json());
    setLoading(false);
  }, [status, debouncedKeyword, sort, selectedTag]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", "want", "reading", "read"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "すべて" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <input
            type="search"
            placeholder="タイトル・著者で検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">タグ：すべて</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[2/3]" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">📭</p>
          <p>本がまだ登録されていません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
