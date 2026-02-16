-- CreateTable
CREATE TABLE "Scan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "depot" TEXT NOT NULL,
    "inventaireId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scan_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Scan_barcode_inventaireId_key" ON "Scan"("barcode", "inventaireId");
