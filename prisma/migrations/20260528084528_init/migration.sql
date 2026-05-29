-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "coverImage" TEXT,
    "description" TEXT,
    "publishedAt" TEXT,
    "isbn" TEXT,
    "review" TEXT,
    "readAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'want',
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BookTag" (
    "bookId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("bookId", "tagId"),
    CONSTRAINT "BookTag_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
