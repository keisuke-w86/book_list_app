"use client";

import { useState } from "react";

interface Props {
  value: number | null;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export default function StarRating({ value, onChange, readOnly, size = "md" }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const stars = [1, 2, 3, 4, 5];
  const current = hovered ?? value ?? 0;
  const px = size === "sm" ? "text-base" : "text-2xl";

  return (
    <div className="flex gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${px} leading-none transition-transform ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          onClick={() => !readOnly && onChange?.(star)}
          aria-label={`${star}星`}
        >
          <span className={star <= current ? "text-amber-400" : "text-gray-200"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
