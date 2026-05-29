"use client";

import { useEffect, useRef, useState } from "react";

interface Tag {
  id: string;
  name: string;
  _count: { books: number };
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleRename(id: string) {
    const name = editName.trim();
    if (!name) { cancelEdit(); return; }
    const existing = tags.find((t) => t.id === id);
    if (name === existing?.name) { cancelEdit(); return; }

    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "変更に失敗しました");
      return;
    }
    setTags((prev) => prev.map((t) => t.id === id ? { ...t, name } : t));
    setEditingId(null);
    setError(null);
  }

  async function handleDelete(tag: Tag) {
    const msg = tag._count.books > 0
      ? `「${tag.name}」が付いた本が ${tag._count.books} 冊あります。削除するとそれらの本からもタグが外れます。削除しますか？`
      : `「${tag.name}」を削除しますか？`;
    if (!confirm(msg)) return;

    await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  async function handleDeleteUnused() {
    const unused = tags.filter((t) => t._count.books === 0);
    if (unused.length === 0) return;
    if (!confirm(`使用されていない ${unused.length} 件のタグをすべて削除しますか？`)) return;
    await Promise.all(unused.map((t) => fetch(`/api/tags/${t.id}`, { method: "DELETE" })));
    setTags((prev) => prev.filter((t) => t._count.books > 0));
  }

  const unusedCount = tags.filter((t) => t._count.books === 0).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">タグ管理</h1>
          <p className="text-sm text-gray-400 mt-1">{tags.length} 件のタグ</p>
        </div>
        {unusedCount > 0 && (
          <button
            onClick={handleDeleteUnused}
            className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            未使用 {unusedCount} 件を削除
          </button>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🏷️</p>
          <p>タグはまだありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
            >
              {editingId === tag.id ? (
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(tag.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onBlur={() => handleRename(tag.id)}
                    className="text-sm px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full"
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
              ) : (
                <button
                  className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors"
                  onClick={() => startEdit(tag)}
                  title="クリックで名前を変更"
                >
                  {tag.name}
                </button>
              )}

              <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-full ${
                tag._count.books > 0
                  ? "bg-gray-100 text-gray-500"
                  : "bg-red-50 text-red-400"
              }`}>
                {tag._count.books} 冊
              </span>

              <button
                onClick={() => handleDelete(tag)}
                className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        タグ名をクリックすると名前を変更できます
      </p>
    </div>
  );
}
