/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/dashboard/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type FrequencyMap = Record<string, number>;
type ColorByDepot = Record<string, FrequencyMap>;   // depot → { couleur → count }
type ColorByModel = Record<string, FrequencyMap>;   // model → { couleur → count }

export async function GET() {
  try {
    // 1. Nombre d'inventaires créés par mois (12 derniers mois)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const inventairesPerMonthRaw = await prisma.inventaire.groupBy({
      by: ['date'],
      where: { date: { gte: twelveMonthsAgo } },
      _count: { id: true },
    });

    // Agrégation par mois (YYYY-MM)
    const inventairesEvolution: FrequencyMap = inventairesPerMonthRaw.reduce((acc: FrequencyMap, item) => {
      const month = item.date.toISOString().slice(0, 7); // "YYYY-MM"
      acc[month] = (acc[month] || 0) + item._count.id;
      return acc;
    }, {});

    // 2. Tous les scans
    const allScans = await prisma.scan.findMany();

    // 3. Tous les produits scannés (via barcodes uniques)
    const barcodes = [...new Set(allScans.map(s => s.barcode))];
    const allProduits = await prisma.produit.findMany({
      where: { barcode: { in: barcodes } },
    });

    // Map barcode → produit
    const produitMap = allProduits.reduce<Record<string, any>>((acc, p) => {
      acc[p.barcode] = p;
      return acc;
    }, {});

    // 4. Nombre total par modèle (tous les scans)
    const models: FrequencyMap = allScans.reduce((acc: FrequencyMap, scan) => {
      const model = produitMap[scan.barcode]?.model || 'Inconnu';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {});

    const sortedModels = Object.entries(models).sort((a, b) => b[1] - a[1]);
    const mostFrequentModel = sortedModels[0]?.[0] || 'N/A';
    const leastFrequentModel = sortedModels[sortedModels.length - 1]?.[0] || 'N/A';

    // 5. Couleurs les plus fréquentes (global)
    const colorsGlobal: FrequencyMap = allScans.reduce((acc: FrequencyMap, scan) => {
      const color = produitMap[scan.barcode]?.couleur || 'Inconnu';
      acc[color] = (acc[color] || 0) + 1;
      return acc;
    }, {});

    const sortedColorsGlobal = Object.entries(colorsGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentColor = sortedColorsGlobal[0]?.[0] || 'N/A';

    // 6. Dépôts les plus fréquents (global)
    const depotsGlobal: FrequencyMap = allScans.reduce((acc: FrequencyMap, scan) => {
      const depot = scan.depot || 'Inconnu';
      acc[depot] = (acc[depot] || 0) + 1;
      return acc;
    }, {});

    const sortedDepotsGlobal = Object.entries(depotsGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentDepot = sortedDepotsGlobal[0]?.[0] || 'N/A';

    // 7. Répartition des couleurs par grade (dépôt)
    const colorsByDepot: ColorByDepot = allScans.reduce((acc: ColorByDepot, scan) => {
      const depot = scan.depot || 'Inconnu';
      const color = produitMap[scan.barcode]?.couleur || 'Inconnu';
      acc[depot] = acc[depot] || {};
      acc[depot][color] = (acc[depot][color] || 0) + 1;
      return acc;
    }, {});

    // 8. Répartition des couleurs par modèle
    const colorsByModel: ColorByModel = allScans.reduce((acc: ColorByModel, scan) => {
      const model = produitMap[scan.barcode]?.model || 'Inconnu';
      const color = produitMap[scan.barcode]?.couleur || 'Inconnu';
      acc[model] = acc[model] || {};
      acc[model][color] = (acc[model][color] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      inventairesEvolution,   // { "YYYY-MM": count }
      models,                 // { "Model1": count, ... }
      colorsByDepot,          // { "DepotA": { "Noir": count, ... } }
      colorsByModel,          // { "Model1": { "Noir": count, ... } }
      mostFrequentModel,
      leastFrequentModel,
      mostFrequentColor,
      mostFrequentDepot,
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}