/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/all-scans/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Typage pour InventaireItem
interface InventaireItemRow {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  createdAt: Date;
  inventaireId: number;
  inventaire?: { date: Date } | null;
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

    const allItems: InventaireItemRow[] = await prisma.inventaireItem.findMany({
      include: {
        inventaire: true,
      },
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Pas besoin de fetch produits séparément → tout est déjà dans InventaireItem

    // Formatage pour le frontend (même structure que ton ancien code)
    const formattedItems = allItems.map(item => ({
      imei: item.imei,
      marque: item.brand || 'N/A',
      model: item.model || 'N/A',
      capacity: item.capacity || 'N/A',
      couleur: item.color || 'N/A',
      depot: item.revvoGrade || 'N/A', // ← revvoGrade remplace depot
      depotVente: 'N/A',               // ← plus utilisé, tu peux supprimer si tu veux
      quantite: 1,                     // ← fixe car pas de quantité dans ton modèle
      prixUnitaire: 'N/A',             // ← pas dans ton modèle
      description: 'N/A',              // ← pas dans ton modèle
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