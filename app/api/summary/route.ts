// app/api/summary/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Type qui correspond EXACTEMENT aux champs sélectionnés dans la requête
type ScanSelected = {
  barcode: string;
  depot: string;
  createdAt: Date;
};

// Type qui correspond EXACTEMENT aux champs sélectionnés pour Produit
type ProduitSelected = {
  barcode: string;
  marque: string;
  model: string;
  capacity: string;
  couleur: string;
  depot: string | null;
  depotVente: string | null;
  quantite: number;
  prixUnitaire: number | null;
  description: string | null;
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

    // Récupère les scans
    const scans: ScanSelected[] = await prisma.scan.findMany({
      where: { inventaireId },
      select: {
        barcode: true,
        depot: true,
        createdAt: true,
      },
    });

    if (scans.length === 0) {
      return NextResponse.json({
        produits: [],
        scans: [],
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

    // Récupère les produits – typage précis
    const barcodes = scans.map((s: ScanSelected) => s.barcode);  // ← CORRECTION ICI

    const produits: ProduitSelected[] = await prisma.produit.findMany({
      where: { barcode: { in: barcodes } },
      select: {
        barcode: true,
        marque: true,
        model: true,
        capacity: true,
        couleur: true,
        depot: true,
        depotVente: true,
        quantite: true,
        prixUnitaire: true,
        description: true,
      },
    });

    // Associe chaque scan à son produit complet
    const scansAvecDetails = scans.map((scan: ScanSelected) => {
      const produit = produits.find(p => p.barcode === scan.barcode);
      return {
        barcode: scan.barcode,
        marque: produit?.marque || 'N/A',
        model: produit?.model || 'Inconnu',
        capacity: produit?.capacity || 'Inconnu',
        couleur: produit?.couleur || 'Inconnu',
        depot: scan.depot || produit?.depot || 'Inconnu',
        depotVente: produit?.depotVente || 'N/A',
        quantite: produit?.quantite || 1,
        prixUnitaire: produit?.prixUnitaire || null,
        description: produit?.description || null,
        dateScan: scan.createdAt.toISOString(),
      };
    });

    // Groupement pour le tableau
    const grouped = produits.reduce((acc: Record<string, {
      model: string;
      capacity: string;
      couleur: string;
      depot: string;
      quantiteTotale: number;
      nbAppareils: number;
    }>, p: ProduitSelected) => {
      const key = `${p.model || 'Inconnu'}-${p.capacity || 'Inconnu'}-${p.couleur || 'Inconnu'}-${p.depot || 'Inconnu'}`;

      if (!acc[key]) {
        acc[key] = {
          model: p.model || 'Inconnu',
          capacity: p.capacity || 'Inconnu',
          couleur: p.couleur || 'Inconnu',
          depot: p.depot || 'Inconnu',
          quantiteTotale: 0,
          nbAppareils: 0,
        };
      }

      acc[key].quantiteTotale += Number(p.quantite) || 0;
      acc[key].nbAppareils += 1;

      return acc;
    }, {});

    // Calcul des grands totaux
    let grandTotalA = 0;
    let grandTotalB = 0;
    let grandTotalAppareils = 0;

    Object.values(grouped).forEach(g => {
      if (g.depot === 'A') grandTotalA += g.quantiteTotale;
      if (g.depot === 'B') grandTotalB += g.quantiteTotale;
      grandTotalAppareils += g.nbAppareils;
    });

    const grandTotal = grandTotalA + grandTotalB;

    return NextResponse.json({
      produits: Object.values(grouped),
      scans: scansAvecDetails,
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