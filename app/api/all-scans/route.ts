/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/all-scans/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model') || undefined;
    const date = searchParams.get('date') || undefined;

    const whereClause: any = {};

    if (model) {
      whereClause.produit = { model: { contains: model, mode: 'insensitive' } };
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    const allScans = await prisma.scan.findMany({
      include: {
        inventaire: true,  // ← seulement cette relation existe
      },
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les produits séparément via barcodes
    const barcodes = [...new Set(allScans.map(s => s.barcode))];
    const produits = await prisma.produit.findMany({
      where: { barcode: { in: barcodes } },
    });

    // Map barcode → produit
    const produitMap = produits.reduce((acc: Record<string, any>, p) => {
      acc[p.barcode] = p;
      return acc;
    }, {});

    // Mapper les données pour le frontend
    const formattedScans = allScans.map(scan => ({
      barcode: scan.barcode,
      marque: produitMap[scan.barcode]?.marque || 'N/A',
      model: produitMap[scan.barcode]?.model || 'N/A',
      capacity: produitMap[scan.barcode]?.capacity || 'N/A',
      couleur: produitMap[scan.barcode]?.couleur || 'N/A',
      depot: scan.depot || 'N/A',
      depotVente: produitMap[scan.barcode]?.depotVente || 'N/A',
      quantite: produitMap[scan.barcode]?.quantite || 1,
      prixUnitaire: produitMap[scan.barcode]?.prixUnitaire || 'N/A',
      description: produitMap[scan.barcode]?.description || 'N/A',
      dateScan: scan.createdAt.toISOString(),
      inventaireId: scan.inventaireId,
      inventaireDate: scan.inventaire?.date.toISOString() || 'N/A',
    }));

    return NextResponse.json(formattedScans);
  } catch (error) {
    console.error('Erreur fetch all scans:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}