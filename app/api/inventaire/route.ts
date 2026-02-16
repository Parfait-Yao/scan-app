// app/api/inventaire/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Interface pour le résumé des inventaires (ce qu’on retourne au frontend)
interface InventaireResume {
  id: number;
  date: Date;
  createdAt: Date;
  nbScans: number;     // ← ajouté dynamiquement
}

export async function GET() {
  try {
    const inventaires = await prisma.inventaire.findMany({
      select: {
        id: true,
        date: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }, // Les plus récents en premier
    });

    // Ajout du nombre de scans pour chaque inventaire (calcul dynamique)
    const inventairesAvecNbScans = await Promise.all(
      inventaires.map(async (inv) => {
        const nbScans = await prisma.scan.count({
          where: { inventaireId: inv.id },
        });
        return {
          ...inv,
          nbScans, // ← c'est ce que le frontend attendait probablement à la place de totalA/B
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
    // Création d’un nouvel inventaire sans les anciens champs
    const inventaire = await prisma.inventaire.create({
      data: {
        date: new Date(),
        // Plus de totalA, totalB, totalGeneral ici
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