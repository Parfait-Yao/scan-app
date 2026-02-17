/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/all-scans/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Typage complet pour InventaireItem (basé sur ton schema.prisma)
interface InventaireItemRow {
  id: number;
  imei: string;
  brand: string;
  model: string;
  status: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  inventaireId: number;
  createdAt: Date;
  updatedAt: Date;
  inventaire?: {
    id: number;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model') || undefined;
    const date = searchParams.get('date') || undefined;

    const whereClause: any = {};

    if (model) {
      whereClause.model = { contains: model, mode: 'insensitive' };
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    // Récupère les InventaireItem avec leur relation inventaire
    const allItems: InventaireItemRow[] = await prisma.inventaireItem.findMany({
      include: {
        inventaire: true,
      },
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Formatage pour le frontend (structure similaire à ton ancien code)
    const formattedItems = allItems.map((item: InventaireItemRow) => ({
      imei: item.imei,
      marque: item.brand || 'N/A',
      model: item.model || 'N/A',
      capacity: item.capacity || 'N/A',
      couleur: item.color || 'N/A',
      depot: item.revvoGrade || 'N/A',      // revvoGrade remplace depot
      depotVente: 'N/A',                     // non présent dans ton modèle
      quantite: 1,                           // fixe (pas de quantité)
      prixUnitaire: 'N/A',                   // non présent
      description: 'N/A',                    // non présent
      dateScan: item.createdAt.toISOString(),
      inventaireId: item.inventaireId,
      inventaireDate: item.inventaire?.date.toISOString() || 'N/A',
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Erreur fetch all scans:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}