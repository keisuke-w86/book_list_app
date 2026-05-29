import Link from "next/link";
import Image from "next/image";
import { Book } from "@/lib/types";
import StarRating from "./StarRating";
import StatusBadge from "./StatusBadge";
import BookCoverPlaceholder from "./BookCoverPlaceholder";

export default function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/books/${book.id}`} className="group block">
      <div className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="relative aspect-[2/3] bg-gray-50">
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              fill
              className="object-cover group-hover:opacity-90 transition-opacity"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            />
          ) : (
            <BookCoverPlaceholder
              title={book.title}
              author={book.author}
              className="absolute inset-0 rounded-none"
            />
          )}
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          <StatusBadge status={book.status as any} />
          <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">
            {book.title}
          </p>
          <p className="text-xs text-gray-500 truncate min-h-[1rem]">
            {book.author ?? ""}
          </p>
          <StarRating value={book.rating} readOnly size="sm" />
        </div>
      </div>
    </Link>
  );
}
