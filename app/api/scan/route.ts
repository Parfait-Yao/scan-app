// app/api/scan/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imei, inventaireId, produit } = body;

    if (!imei || !inventaireId || !produit) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }

    const id = Number(inventaireId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inventaire invalide' }, { status: 400 });
    }

    // Vérifie doublon dans cet inventaire
    const exist = await prisma.inventaireItem.findFirst({
      where: {
        imei,
        inventaireId: id,
      },
    });

    if (exist) {
      return NextResponse.json({ error: 'Appareil déjà scanné dans cet inventaire' }, { status: 409 });
    }

    // Enregistre avec les vraies infos reçues du front
    await prisma.inventaireItem.create({
      data: {
        imei,
        brand: produit.brand || 'Inconnu',
        model: produit.model || 'Inconnu',
        capacity: produit.capacity || 'Inconnu',
        color: produit.color || 'Inconnu',
        revvoGrade: produit.revvoGrade || 'N/A',
        status: produit.status || 'N/A',
        inventaireId: id,
        quantite: 1,
      },
    });

    return NextResponse.json({
      success: true,
      produit,
      message: `+1 (${produit.brand || 'Produit'} ${produit.model || ''})`,
    });
  } catch (error) {
    console.error('Erreur scan:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}