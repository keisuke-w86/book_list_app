"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setIdentifier("");
    setEmail("");
    setUsername("");
    setPassword("");
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      mode === "login"
        ? { identifier, password }
        : { email, username, password };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "エラーが発生しました");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📚</div>
          <h1 className="text-2xl font-semibold text-gray-900">My Bookshelf</h1>
          <p className="text-sm text-gray-400 mt-1">あなたの読書記録</p>
        </div>

        {/* タブ */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === m
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "login" ? "ログイン" : "アカウント作成"}
            </button>
          ))}
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "login" ? (
            <div>
              <label className="label">メールアドレス または ユーザ名</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="例: test@example.com または username"
                required
                className="input"
                autoComplete="username"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="label">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="例: user@example.com"
                  required
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">ユーザ名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="表示名（例: 読書好き太郎）"
                  required
                  className="input"
                  autoComplete="username"
                />
              </div>
            </>
          )}

          <div>
            <label className="label">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "アカウントを作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
