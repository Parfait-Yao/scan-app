/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/scan/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imei, inventaireId, produit } = body;

    if (!imei?.trim() || !inventaireId || !produit) {
      return NextResponse.json({ error: 'Données incomplètes (IMEI, inventaireId ou produit manquant)' }, { status: 400 });
    }

    const id = Number(inventaireId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inventaire invalide' }, { status: 400 });
    }

    // Vérifie si déjà scanné DANS CET INVENTAIRE
    const existing = await prisma.inventaireItem.findFirst({
      where: {
        imei: imei.trim(),
        inventaireId: id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Cet IMEI a déjà été scanné dans cet inventaire' },
        { status: 409 }
      );
    }

    // Création avec nettoyage des données
    const newScan = await prisma.inventaireItem.create({
      data: {
        imei: imei.trim(),
        brand: produit.brand?.trim() || 'Inconnu',
        model: produit.model?.trim() || 'Inconnu',
        capacity: produit.capacity?.trim() || 'Inconnu',
        color: produit.color?.trim() || 'Inconnu',
        revvoGrade: produit.revvoGrade?.trim() || 'N/A',
        status: produit.status?.trim() || 'Disponible',
        inventaireId: id,
        quantite: 1,
      },
    });

    return NextResponse.json({
      success: true,
      scan: newScan,
      message: `+1 (${produit.brand || 'Produit'} ${produit.model || imei})`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur scan:', error);

    // Gestion spécifique des erreurs Prisma (contrainte unique)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cet IMEI a déjà été scanné dans cet inventaire (contrainte base)' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Erreur serveur lors du scan' }, { status: 500 });
  }
}