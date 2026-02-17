// app/api/inventaire/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Interface pour le résumé envoyé au frontend
interface InventaireResume {
  id: number;
  date: Date;
  createdAt: Date;
  nbScans: number; // nombre d'appareils scannés dans cet inventaire
}

export async function GET() {
  try {
    const inventaires = await prisma.inventaire.findMany({
      select: {
        id: true,
        date: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }, // plus récents en premier
    });

    // Calcul dynamique du nombre de scans par inventaire
    const inventairesAvecNbScans = await Promise.all(
      inventaires.map(async (inv) => {
        const nbScans = await prisma.inventaireItem.count({
          where: { inventaireId: inv.id },
        });
        return {
          ...inv,
          nbScans,
        };
      })
    );

    return NextResponse.json({
      success: true,
      inventaires: inventairesAvecNbScans,
    });
  } catch (error) {
    console.error('Erreur liste inventaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const inventaire = await prisma.inventaire.create({
      data: {
        date: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: inventaire.id,
      date: inventaire.date.toISOString(),
      message: `Nouvel inventaire #${inventaire.id} créé`,
    });
  } catch (error) {
    console.error('Erreur création inventaire:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de l’inventaire' }, { status: 500 });
  }
}