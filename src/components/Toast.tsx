"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 2500 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
      <span className="text-emerald-400 text-base">✓</span>
      {message}
    </div>
  );
}
