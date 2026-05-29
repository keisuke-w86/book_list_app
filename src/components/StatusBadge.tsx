import { BookStatus, STATUS_LABELS } from "@/lib/types";

const colors: Record<BookStatus, string> = {
  want: "bg-slate-100 text-slate-600",
  reading: "bg-blue-100 text-blue-700",
  read: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }: { status: BookStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
