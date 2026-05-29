export type BookStatus = "want" | "reading" | "read";

export interface Tag {
  id: string;
  name: string;
}

export interface BookTag {
  bookId: string;
  tagId: string;
  tag: Tag;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  authorReading: string | null;
  coverImage: string | null;
  description: string | null;
  publishedAt: string | null;
  isbn: string | null;
  review: string | null;
  readAt: string | null;
  status: BookStatus;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  tags: BookTag[];
}

export interface SearchResult {
  title: string;
  author: string;
  authorReading: string | null;
  coverImage: string | null;
  description: string | null;
  publishedAt: string | null;
  isbn: string | null;
  source: string;
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "読みたい",
  reading: "読んでる",
  read: "読んだ",
};
