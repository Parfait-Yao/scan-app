/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Product";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Inventaire" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalA" INTEGER NOT NULL DEFAULT 0,
    "totalB" INTEGER NOT NULL DEFAULT 0,
    "totalGeneral" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "depot" TEXT,
    "depotVente" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" REAL,
    "description" TEXT,
    "inventaireId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produit_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Produit_barcode_key" ON "Produit"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_model_capacity_couleur_depot_key" ON "Produit"("model", "capacity", "couleur", "depot");
