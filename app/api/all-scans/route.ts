/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/all-scans/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Typage propre et cohérent avec le reste de l’app
interface ScanResponse {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  quantite: number;
  dateScan: string;
  inventaireId: number;
  inventaireDate: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model')?.trim() || undefined;
    const dateStr = searchParams.get('date');

    // Clause where typée
    const where: any = {};

    if (model) {
      where.model = {
        contains: model,
        mode: 'insensitive',
      };
    }

    if (dateStr) {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateStr);
      end.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // Requête optimisée : select seulement les champs nécessaires
    const items = await prisma.inventaireItem.findMany({
      where,
      select: {
        imei: true,
        brand: true,
        model: true,
        capacity: true,
        color: true,
        revvoGrade: true,
        status: true,
        quantite: true,
        createdAt: true,
        inventaire: {
          select: {
            id: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      // Optionnel : limite pour éviter de tout charger d’un coup
      // take: 500,
    });

    // Formatage propre pour le frontend
    const formatted: ScanResponse[] = items.map(item => ({
      imei: item.imei,
      brand: item.brand || 'N/A',
      model: item.model || 'N/A',
      capacity: item.capacity || 'N/A',
      color: item.color || 'N/A',
      revvoGrade: item.revvoGrade || 'N/A',
      status: item.status || 'N/A',
      quantite: item.quantite ?? 1,          // null/undefined → 1
      dateScan: item.createdAt.toISOString(),
      inventaireId: item.inventaire?.id ?? 0,
      inventaireDate: item.inventaire?.date.toISOString() ?? 'N/A',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erreur /api/all-scans:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des scans' },
      { status: 500 }
    );
  }
}