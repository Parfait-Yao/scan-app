// app/api/summary/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Types adaptés à InventaireItem
type ItemSelected = {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  createdAt: Date;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inventaireIdParam = searchParams.get('inventaireId');

    let inventaireId: number;

    if (inventaireIdParam) {
      inventaireId = Number(inventaireIdParam);
      if (isNaN(inventaireId)) {
        return NextResponse.json({ error: 'ID inventaire invalide' }, { status: 400 });
      }
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const lastInventaire = await prisma.inventaire.findFirst({
        where: { date: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastInventaire) {
        return NextResponse.json({ error: 'Aucun inventaire actif aujourd’hui' }, { status: 404 });
      }

      inventaireId = lastInventaire.id;
    }

    // Récupère les InventaireItem de cet inventaire
    const items: ItemSelected[] = await prisma.inventaireItem.findMany({
      where: { inventaireId },
      select: {
        imei: true,
        brand: true,
        model: true,
        capacity: true,
        color: true,
        revvoGrade: true,
        status: true,
        createdAt: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json({
        produits: [],
        scans: [], // ou items: []
        grandTotalA: 0,
        grandTotalB: 0,
        grandTotal: 0,
        date: new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        message: 'Aucun appareil scanné dans cet inventaire',
        inventaireId,
      });
    }

    // Groupement pour le tableau (par model, capacity, color, revvoGrade)
    const grouped = items.reduce((acc: Record<string, {
      model: string;
      capacity: string;
      color: string;
      revvoGrade: string;
      nbAppareils: number;
    }>, item) => {
      const key = `${item.model || 'Inconnu'}-${item.capacity || 'Inconnu'}-${item.color || 'Inconnu'}-${item.revvoGrade || 'Inconnu'}`;

      if (!acc[key]) {
        acc[key] = {
          model: item.model || 'Inconnu',
          capacity: item.capacity || 'Inconnu',
          color: item.color || 'Inconnu',
          revvoGrade: item.revvoGrade || 'Inconnu',
          nbAppareils: 0,
        };
      }

      acc[key].nbAppareils += 1;

      return acc;
    }, {});

    // Calcul des grands totaux (basé sur revvoGrade)
    let grandTotalA = 0;
    let grandTotalB = 0;
    let grandTotalAppareils = items.length;

    Object.values(grouped).forEach(g => {
      if (g.revvoGrade === 'A') grandTotalA += g.nbAppareils;
      if (g.revvoGrade === 'B') grandTotalB += g.nbAppareils;
    });

    const grandTotal = grandTotalA + grandTotalB;

    // Liste détaillée pour export Excel si besoin
    const itemsAvecDetails = items.map(item => ({
      imei: item.imei,
      brand: item.brand,
      model: item.model,
      capacity: item.capacity,
      color: item.color,
      revvoGrade: item.revvoGrade,
      status: item.status,
      dateScan: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      produits: Object.values(grouped),
      scans: itemsAvecDetails, // ou items si tu préfères garder le nom
      grandTotalA,
      grandTotalB,
      grandTotal,
      grandTotalAppareils,
      date: new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      inventaireId,
    });
  } catch (error) {
    console.error('Erreur summary:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}