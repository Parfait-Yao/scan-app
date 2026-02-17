// app/api/dashboard/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type FrequencyMap = Record<string, number>;
type ColorByGrade = Record<string, FrequencyMap>;   // grade → { couleur → count }
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
    const inventairesEvolution: FrequencyMap = inventairesPerMonthRaw.reduce((acc: FrequencyMap, item: { date: Date; _count: { id: number } }) => {
      const month = item.date.toISOString().slice(0, 7); // "YYYY-MM"
      acc[month] = (acc[month] || 0) + item._count.id;
      return acc;
    }, {});

    // 2. Tous les InventaireItem (scans)
    const allItems = await prisma.inventaireItem.findMany();

    // 3. Nombre total par modèle (tous les scans)
    const models: FrequencyMap = allItems.reduce((acc: FrequencyMap, item) => {
      const model = item.model || 'Inconnu';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {});

    const sortedModels = Object.entries(models).sort((a, b) => b[1] - a[1]);
    const mostFrequentModel = sortedModels[0]?.[0] || 'N/A';
    const leastFrequentModel = sortedModels[sortedModels.length - 1]?.[0] || 'N/A';

    // 4. Couleurs les plus fréquentes (global)
    const colorsGlobal: FrequencyMap = allItems.reduce((acc: FrequencyMap, item) => {
      const color = item.color || 'Inconnu';
      acc[color] = (acc[color] || 0) + 1;
      return acc;
    }, {});

    const sortedColorsGlobal = Object.entries(colorsGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentColor = sortedColorsGlobal[0]?.[0] || 'N/A';

    // 5. Grades les plus fréquents (global)
    const gradesGlobal: FrequencyMap = allItems.reduce((acc: FrequencyMap, item) => {
      const grade = item.revvoGrade || 'Inconnu';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    const sortedGradesGlobal = Object.entries(gradesGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentGrade = sortedGradesGlobal[0]?.[0] || 'N/A';

    // 6. Répartition des couleurs par grade
    const colorsByGrade: ColorByGrade = allItems.reduce((acc: ColorByGrade, item) => {
      const grade = item.revvoGrade || 'Inconnu';
      const color = item.color || 'Inconnu';
      acc[grade] = acc[grade] || {};
      acc[grade][color] = (acc[grade][color] || 0) + 1;
      return acc;
    }, {});

    // 7. Répartition des couleurs par modèle
    const colorsByModel: ColorByModel = allItems.reduce((acc: ColorByModel, item) => {
      const model = item.model || 'Inconnu';
      const color = item.color || 'Inconnu';
      acc[model] = acc[model] || {};
      acc[model][color] = (acc[model][color] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      inventairesEvolution,
      models,
      colorsByGrade,
      colorsByModel,
      mostFrequentModel,
      leastFrequentModel,
      mostFrequentColor,
      mostFrequentGrade,
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}