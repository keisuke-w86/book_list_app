"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Book, BookStatus, STATUS_LABELS } from "@/lib/types";
import StarRating from "@/components/StarRating";
import StatusBadge from "@/components/StatusBadge";
import BookCoverPlaceholder from "@/components/BookCoverPlaceholder";
import Toast from "@/components/Toast";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [form, setForm] = useState({
    description: "",
    review: "",
    readAt: "",
    status: "want" as BookStatus,
    rating: null as number | null,
    tags: [] as string[],
    tagInput: "",
  });

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then((r) => r.json())
      .then((data: Book) => {
        setBook(data);
        setForm({
          description: data.description || "",
          review: data.review || "",
          readAt: data.readAt ? data.readAt.slice(0, 10) : "",
          status: data.status,
          rating: data.rating,
          tags: data.tags.map((bt) => bt.tag.name),
          tagInput: "",
        });
      });
  }, [id]);

  function addTag() {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    }
  }

  function removeTag(t: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description || null,
        review: form.review || null,
        readAt: form.readAt || null,
        status: form.status,
        rating: form.rating,
        tags: form.tags,
      }),
    });
    const updated: Book = await res.json();
    setBook(updated);
    setEditing(false);
    setSaving(false);
    setShowToast(true);
  }

  async function handleDelete() {
    if (!confirm("この本を削除しますか？")) return;
    setDeleting(true);
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (!book) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {showToast && (
        <Toast message="保存しました" onClose={() => setShowToast(false)} />
      )}
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
      >
        ← 本棚へ戻る
      </button>

      <div className="flex gap-6 mb-8">
        {/* Cover */}
        <div className="flex-shrink-0">
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              width={110}
              height={155}
              className="rounded-lg object-cover shadow"
            />
          ) : (
            <BookCoverPlaceholder
              title={book.title}
              author={book.author}
              className="w-[110px] h-[155px] rounded-lg shadow"
            />
          )}
        </div>
        {/* Meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">{book.title}</h1>
          {book.author && <p className="text-sm text-gray-500">{book.author}</p>}
          {book.publishedAt && (
            <p className="text-xs text-gray-400">発行：{book.publishedAt}</p>
          )}
          <div className="flex items-center gap-3">
            <StatusBadge status={book.status} />
            {book.rating && <StarRating value={book.rating} readOnly size="sm" />}
          </div>
          {book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {book.tags.map((bt) => (
                <span
                  key={bt.tagId}
                  className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full"
                >
                  {bt.tag.name}
                </span>
              ))}
            </div>
          )}
          {book.readAt && (
            <p className="text-xs text-gray-400">
              読了日：{new Date(book.readAt).toLocaleDateString("ja-JP")}
            </p>
          )}
        </div>
      </div>

      {!editing && book.description && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">概要</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {book.description}
          </p>
        </div>
      )}

      {/* Review section */}
      {!editing ? (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">感想</h2>
          {book.review ? (
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
              {book.review}
            </p>
          ) : (
            <p className="text-sm text-gray-400">感想はまだありません</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <div>
            <label className="label">概要</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none"
              placeholder="本の概要・あらすじ"
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
          <div>
            <label className="label">評価</label>
            <StarRating
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </div>
          <div>
            <label className="label">感想</label>
            <textarea
              rows={5}
              value={form.review}
              onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))}
              className="input resize-none"
            />
          </div>
          <div>
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
      )}

      <div className="flex gap-3">
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              削除
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
            >
              編集する
            </button>
          </>
        )}
      </div>
    </div>
  );
}
