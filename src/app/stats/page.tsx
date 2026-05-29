"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface StatsData {
  statusCount: { want: number; reading: number; read: number };
  ratingDist: { star: number; count: number }[];
  monthlyRead: { month: string; count: number }[];
  total: number;
}

const CARDS = [
  { id: "total",   label: "合計",      color: "#64748b" },
  { id: "read",    label: "読んだ",    color: "#6366f1" },
  { id: "reading", label: "読んでる",  color: "#f59e0b" },
  { id: "want",    label: "読みたい",  color: "#94a3b8" },
] as const;

function StatCard({ label, value, color, light }: { label: string; value: number; color: string; light: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-1 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: color }} />
      <span className="text-4xl font-bold tracking-tight" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value}冊</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p>{payload[0].name}：{payload[0].value}冊</p>
    </div>
  );
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const pieData = CARDS
    .filter((c) => c.id !== "total")
    .map((c) => ({ name: c.label, value: stats.statusCount[c.id], color: c.color }))
    .filter((d) => d.value > 0);

  const maxRating = Math.max(...stats.ratingDist.map((d) => d.count), 1);
  const hasRating = stats.ratingDist.some((d) => d.count > 0);
  const avgRating = hasRating
    ? stats.ratingDist.reduce((sum, d) => sum + d.star * d.count, 0) /
      stats.ratingDist.reduce((sum, d) => sum + d.count, 0)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">読書統計</h1>
        <p className="text-sm text-gray-400 mt-1">これまでの読書の記録</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <StatCard
            key={c.id}
            label={c.label}
            value={c.id === "total" ? stats.total : stats.statusCount[c.id]}
            color={c.color}
            light="#ffffff"
          />
        ))}
      </div>

      {/* 月別読了数 */}
      {stats.monthlyRead.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">月別読了数</h2>
          <p className="text-xs text-gray-400 mb-5">過去24ヶ月</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyRead} barCategoryGap="35%">
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => v.slice(2).replace("-", "/")}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={20}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* ステータス内訳 */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">ステータス内訳</h2>
            <p className="text-xs text-gray-400 mb-4">登録冊数の割合</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={65}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 text-xs">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{d.value}<span className="text-xs text-gray-400 font-normal ml-0.5">冊</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 評価分布 */}
        {hasRating && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">評価分布</h2>
            {avgRating && (
              <p className="text-xs text-gray-400 mb-4">
                平均評価　<span className="text-amber-500 font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-amber-400 ml-1">{"★".repeat(Math.round(avgRating))}</span>
              </p>
            )}
            <div className="space-y-3">
              {[...stats.ratingDist].reverse().map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-amber-400 w-16 text-right tracking-wider flex-shrink-0">
                    {"★".repeat(star)}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxRating) * 100}%`,
                        background: count > 0 ? "#f59e0b" : "transparent",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
