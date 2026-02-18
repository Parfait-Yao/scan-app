// app/api/dashboard/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type FrequencyMap = Record<string, number>;
type ColorByGrade = Record<string, FrequencyMap>;   // grade → { couleur → somme quantités }
type ColorByModel = Record<string, FrequencyMap>;   // model → { couleur → somme quantités }

// Typage pour groupBy
interface GroupByResult {
  date: Date;
  _count: { id: number };
}

export async function GET() {
  try {
    // 1. Évolution inventaires par mois (12 derniers mois)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const inventairesPerMonthRaw = await prisma.inventaire.groupBy({
      by: ['date'],
      where: { date: { gte: twelveMonthsAgo } },
      _count: { id: true },
    });

    const inventairesEvolution: FrequencyMap = inventairesPerMonthRaw.reduce<FrequencyMap>(
      (acc, item) => {
        const month = item.date.toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + item._count.id;
        return acc;
      },
      {}
    );

    // 2. Tous les items (limite à 10 000 pour sécurité)
    const allItems = await prisma.inventaireItem.findMany({
      take: 10000,  // ← AJOUTÉ : sécurité contre trop de données
      select: {
        model: true,
        color: true,
        revvoGrade: true,
        quantite: true,
      },
    });

    // 3. Totaux par modèle
    const models = allItems.reduce<FrequencyMap>((acc, item) => {
      const model = item.model || 'Inconnu';
      acc[model] = (acc[model] || 0) + (item.quantite || 1);
      return acc;
    }, {});

    const sortedModels = Object.entries(models).sort((a, b) => b[1] - a[1]);
    const mostFrequentModel = sortedModels[0]?.[0] || 'N/A';
    const leastFrequentModel = sortedModels.at(-1)?.[0] || 'N/A';

    // 4. Couleurs globales
    const colorsGlobal = allItems.reduce<FrequencyMap>((acc, item) => {
      const color = item.color || 'Inconnu';
      acc[color] = (acc[color] || 0) + (item.quantite || 1);
      return acc;
    }, {});

    const sortedColorsGlobal = Object.entries(colorsGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentColor = sortedColorsGlobal[0]?.[0] || 'N/A';

    // 5. Totaux par grade + grade le plus fréquent
    const gradesGlobal = allItems.reduce<FrequencyMap>((acc, item) => {
      const grade = item.revvoGrade || 'Inconnu';
      acc[grade] = (acc[grade] || 0) + (item.quantite || 1);
      return acc;
    }, {});

    const sortedGradesGlobal = Object.entries(gradesGlobal).sort((a, b) => b[1] - a[1]);
    const mostFrequentGrade = sortedGradesGlobal[0]?.[0] || 'N/A';

    // 6. Couleurs par grade
    const colorsByGrade = allItems.reduce<ColorByGrade>((acc, item) => {
      const grade = item.revvoGrade || 'Inconnu';
      const color = item.color || 'Inconnu';
      acc[grade] = acc[grade] || {};
      acc[grade][color] = (acc[grade][color] || 0) + (item.quantite || 1);
      return acc;
    }, {});

    // 7. Couleurs par modèle
    const colorsByModel = allItems.reduce<ColorByModel>((acc, item) => {
      const model = item.model || 'Inconnu';
      const color = item.color || 'Inconnu';
      acc[model] = acc[model] || {};
      acc[model][color] = (acc[model][color] || 0) + (item.quantite || 1);
      return acc;
    }, {});

    // 8. Total global
    const totalQuantite = Object.values(models).reduce((sum, val) => sum + val, 0);

    // 9. Totaux par grade (pour cartes front)
    const gradeTotals: Record<string, number> = {
      'A+': gradesGlobal['A+'] || 0,
      'A': gradesGlobal['A'] || 0,
      'B': gradesGlobal['B'] || 0,
      'C': gradesGlobal['C'] || 0,
      'D': gradesGlobal['D'] || 0,
      'Inconnu': gradesGlobal['Inconnu'] || 0,
    };

    return NextResponse.json({
      inventairesEvolution,
      models,
      colorsByGrade,
      colorsByModel,
      mostFrequentModel,
      leastFrequentModel,
      mostFrequentColor,
      mostFrequentGrade,
      totalQuantite,
      gradeTotals,
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du chargement du dashboard' },
      { status: 500 }
    );
  }
}